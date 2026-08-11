/**
 * SECURITY_ROADMAP Phase 18 — structured security-event logging.
 *
 * Security events (LOGIN_SUCCESS, LOGIN_FAILED, ROLE_CHANGED, ...) get a
 * durable row in the AuditLog table (see lib/audit.js). This helper is the
 * complementary pino layer for events that are per-request and often
 * high-frequency (rate-limit trips, authorization denials, CSRF rejections):
 * each is emitted as a structured warn-level line tagged `security: true`
 * with the action, request identity (ip/method/path) and safe details.
 *
 * NO secrets ever: only ip/method/path and explicit `detail` fields are
 * included — never headers, cookies, tokens, or bodies.
 */
export function securityLog(logger, { action, req = null, detail = {} }) {
  const sink = req?.log || logger;
  if (!sink?.warn) return;
  const base = { security: true, action };
  if (req) {
    base.ip = req.ip || req.socket?.remoteAddress || null;
    base.method = req.method;
    base.path = req.originalUrl || req.url;
  }
  sink.warn({ ...base, ...detail }, `security: ${action}`);
}
