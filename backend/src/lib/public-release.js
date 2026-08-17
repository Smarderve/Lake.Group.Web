const RELEASE_ACTIONS = new Set(['PUBLISHED', 'UNPUBLISHED', 'ROLLED_BACK']);
const LEASE_MS = 5 * 60 * 1000;

function retryDelayMs(attempts) {
  return Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.max(0, attempts - 1));
}

function releaseState(event) {
  return event.metadata?.publicRelease ?? {};
}

function metadataWith(event, publicRelease) {
  return { ...(event.metadata ?? {}), publicRelease };
}

export function redactReleaseError(error, secrets = []) {
  let message = String(error?.message || error || 'Release trigger failed');
  for (const secret of secrets) {
    if (secret) message = message.split(String(secret)).join('[REDACTED]');
  }
  return message
    .replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, '[REDACTED]')
    .replace(/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, '[REDACTED]')
    .replace(/\bvercel_[A-Za-z0-9_-]{20,}\b/g, '[REDACTED]')
    .replace(/\bBearer\s+(?!\[REDACTED\])\S+/gi, 'Bearer [REDACTED]')
    .slice(0, 300);
}

export async function dispatchGithubRelease(event, {
  repository,
  token,
  apiBaseUrl,
  fetchImpl = fetch,
}) {
  const [owner, repo] = repository.split('/');
  if (!owner || !repo || !token) throw new Error('Public release trigger is not configured');
  let response;
  try {
    response = await fetchImpl(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/dispatches`,
      {
        method: 'POST',
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'user-agent': 'lake-group-cms-release-worker',
          'x-github-api-version': '2022-11-28',
        },
        body: JSON.stringify({
          event_type: 'cms-publication',
          client_payload: {
            idempotency_key: `publication-${event.id}`,
            publication_event_id: event.id,
            action: event.action,
            entity_type: event.entityType,
            entity_id: event.entityId,
            public_api_base_url: apiBaseUrl,
          },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch (error) {
    throw new Error(redactReleaseError(error, [token]));
  }
  if (!response.ok) throw new Error(`GitHub release trigger returned HTTP ${response.status}`);
  return { requestId: response.headers.get('x-github-request-id') ?? null };
}

export async function processPublicationEvents(db, {
  dispatch,
  now = new Date(),
  maxAttempts = 8,
  limit = 100,
} = {}) {
  const summary = { examined: 0, triggered: 0, retryScheduled: 0, failed: 0 };
  const events = [];
  const pageSize = 100;
  for (let skip = 0; events.length < limit; skip += pageSize) {
    const page = await db.publicationEvent.findMany({
      where: { action: { in: [...RELEASE_ACTIONS] } },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip,
    });
    for (const event of page) {
      const current = releaseState(event);
      if (current.status !== 'TRIGGERED' && current.status !== 'FAILED') events.push(event);
      if (events.length >= limit) break;
    }
    if (page.length < pageSize) break;
  }
  events.reverse();
  for (const event of events) {
    summary.examined += 1;
    const current = releaseState(event);
    if (current.status === 'TRIGGERED' || current.status === 'FAILED') continue;
    if (current.nextAttemptAt && new Date(current.nextAttemptAt) > now) continue;
    if (
      current.status === 'DISPATCHING' &&
      current.lastAttemptAt &&
      now.getTime() - new Date(current.lastAttemptAt).getTime() < LEASE_MS
    ) continue;
    const attempts = Number(current.attempts || 0) + 1;
    if (attempts > maxAttempts) {
      await db.publicationEvent.update({
        where: { id: event.id },
        data: { metadata: metadataWith(event, { ...current, status: 'FAILED', attempts: attempts - 1 }) },
      });
      summary.failed += 1;
      continue;
    }
    const dispatching = {
      ...current,
      status: 'DISPATCHING',
      attempts,
      idempotencyKey: `publication-${event.id}`,
      lastAttemptAt: now.toISOString(),
      nextAttemptAt: null,
    };
    await db.publicationEvent.update({
      where: { id: event.id },
      data: { metadata: metadataWith(event, dispatching) },
    });
    try {
      const result = await dispatch(event);
      await db.publicationEvent.update({
        where: { id: event.id },
        data: {
          metadata: metadataWith(event, {
            ...dispatching,
            status: 'TRIGGERED',
            requestId: result?.requestId ?? null,
            triggeredAt: now.toISOString(),
            lastError: null,
          }),
        },
      });
      summary.triggered += 1;
    } catch (err) {
      const exhausted = attempts >= maxAttempts;
      const nextAttemptAt = exhausted ? null : new Date(now.getTime() + retryDelayMs(attempts)).toISOString();
      await db.publicationEvent.update({
        where: { id: event.id },
        data: {
          metadata: metadataWith(event, {
            ...dispatching,
            status: exhausted ? 'FAILED' : 'RETRY_SCHEDULED',
            nextAttemptAt,
              lastError: redactReleaseError(err),
          }),
        },
      });
      if (exhausted) summary.failed += 1;
      else summary.retryScheduled += 1;
    }
  }
  return summary;
}

export function startPublicReleaseWorker({
  db,
  config,
  logger,
  fetchImpl = fetch,
}) {
  if (!db || !config.publicReleaseEnabled) return { stop() {} };
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const summary = await processPublicationEvents(db, {
        maxAttempts: config.publicReleaseMaxAttempts,
        dispatch: (event) => dispatchGithubRelease(event, {
          repository: config.publicReleaseGithubRepository,
          token: config.publicReleaseGithubToken,
          apiBaseUrl: config.publicReleaseApiBaseUrl,
          fetchImpl,
        }),
      });
      if (summary.triggered || summary.retryScheduled || summary.failed) {
        logger?.info?.({ publicRelease: summary }, 'public release worker completed');
      }
    } catch (err) {
      logger?.error?.({ err }, 'public release worker failed');
    } finally {
      running = false;
    }
  };
  const timer = setInterval(run, config.publicReleasePollMs);
  timer.unref?.();
  void run();
  return { stop: () => clearInterval(timer), run };
}
