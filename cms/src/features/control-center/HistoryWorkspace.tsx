import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { controlApi } from "./api";
import { Heading, PhaseNote, QueryState, EmptyState } from "./primitives";

function flatten(
  value: unknown,
  prefix = "",
  result: Record<string, string> = {},
): Record<string, string> {
  if (value && typeof value === "object")
    for (const [key, child] of Object.entries(value))
      flatten(child, prefix ? `${prefix}.${key}` : key, result);
  else result[prefix] = value === undefined ? "—" : String(value ?? "");
  return result;
}
export function HistoryWorkspace() {
  const query = useQuery({
    queryKey: ["control-releases"],
    queryFn: controlApi.releases,
  });
  const [scope, setScope] = useState("releases");
  const pages = useQuery({
    queryKey: ["control-pages"],
    queryFn: controlApi.pages,
  });
  const revisions = useQuery({
    queryKey: ["control-versions", scope],
    queryFn: () => controlApi.versions(scope),
    enabled: scope !== "releases",
  });
  const page = pages.data?.pages.find((item) => item.key === scope);
  const [selected, setSelected] = useState(""),
    [compare, setCompare] = useState(false);
  const releases = (
    scope === "releases"
      ? (query.data?.releases ?? []).map((release) => ({
          ...release,
          author: "Not provided",
          state: "RELEASE",
          values:
            release.manifest?.documents ?? release.snapshot?.documents ?? {},
        }))
      : (revisions.data?.revisions ?? []).map((revision) => ({
          id: revision.id,
          publishedAt: revision.createdAt,
          key: page?.label ?? scope,
          integrity: "Not provided",
          author: revision.authorId ?? "Not provided",
          state:
            revision.id === page?.publishedRevisionId
              ? "PUBLISHED"
              : revision.id === page?.draftRevisionId
                ? "CURRENT DRAFT"
                : "REVISION",
          values: revision.data,
        }))
  ).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const index = Math.max(
      0,
      releases.findIndex((release) => release.id === selected),
    ),
    current = releases[index],
    previous = releases[index + 1];
  const before = flatten(previous?.values ?? {}),
    after = flatten(current?.values ?? {}),
    keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
      (key) => before[key] !== after[key],
    );
  return (
    <div className="control-page">
      <Heading
        eyebrow="System / Revisions"
        title="Version history"
        body="Review saved releases and compare the content they contain."
      />
      <PhaseNote>
        Restore and draft revision workflows will be connected in Phase 2.
      </PhaseNote>
      <div className="control-panel history-filter">
        <label>
          History for
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value);
              setSelected("");
              setCompare(false);
            }}
          >
            <option value="releases">Website releases</option>
            {pages.data?.pages.map((item) => (
              <option value={item.key} key={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <QueryState
        loading={scope === "releases" ? query.isLoading : revisions.isLoading}
        error={scope === "releases" ? query.error : revisions.error}
        retry={() => {
          if (scope === "releases") void query.refetch();
          else void revisions.refetch();
        }}
      >
        {releases.length ? (
          <div className="workspace-split">
            <section className="control-panel revision-timeline">
              <div className="workspace-section-heading">
                <h2>
                  {scope === "releases"
                    ? "Website releases"
                    : page?.label || "Page revisions"}
                </h2>
                <span>{releases.length} versions</span>
              </div>
              {releases.map((release, position) => (
                <button
                  className={`revision-item${release.id === current?.id ? " is-selected" : ""}`}
                  key={release.id}
                  onClick={() => {
                    setSelected(release.id);
                    setCompare(false);
                  }}
                >
                  <span className="revision-marker" />
                  <span>
                    <strong>
                      {new Date(release.publishedAt).toLocaleString()}
                    </strong>
                    <small>{release.key || "Website content"}</small>
                    <code>{release.id}</code>
                  </span>
                  <span className="reference-state">
                    {scope === "releases" && position === 0
                      ? "LATEST RELEASE"
                      : release.state}
                  </span>
                </button>
              ))}
            </section>
            <aside className="control-panel workspace-editor">
              <p className="control-eyebrow">Selected version</p>
              <h2>{current?.key || "Website content"}</h2>
              <dl className="workspace-metadata">
                <div>
                  <dt>{scope === "releases" ? "Published" : "Saved"}</dt>
                  <dd>
                    {current && new Date(current.publishedAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt>Author</dt>
                  <dd>{current?.author}</dd>
                </div>
                <div>
                  <dt>Integrity</dt>
                  <dd className="workspace-key">
                    {current?.integrity || "Not provided"}
                  </dd>
                </div>
              </dl>
              <div className="workspace-actions">
                <button
                  disabled={
                    !previous ||
                    !Object.keys(after).length ||
                    !Object.keys(before).length
                  }
                  onClick={() => setCompare(!compare)}
                >
                  {compare ? "Hide comparison" : "Compare with previous"}
                </button>
                <button
                  disabled
                  title="Release restore will be connected in Phase 2"
                >
                  Restore version
                </button>
              </div>
              <p className="control-inspector-hint">
                Comparison is available when both release snapshots are returned
                by the existing API. Deployment status has not been checked.
              </p>
            </aside>
          </div>
        ) : (
          <div className="control-panel">
            <EmptyState
              title={
                scope === "releases"
                  ? "No releases yet"
                  : "No saved page revisions"
              }
              body="Real website versions will appear here after publishing is connected."
            />
          </div>
        )}
        {compare && (
          <section className="control-panel version-comparison">
            <h2>Content comparison</h2>
            <div className="comparison-head">
              <span>Previous · {previous?.id}</span>
              <span>Selected · {current?.id}</span>
            </div>
            {keys.length ? (
              keys.map((key) => (
                <div className="comparison-field" key={key}>
                  <strong>{key}</strong>
                  <div>
                    <del>{before[key] ?? "Not present"}</del>
                    <ins>{after[key] ?? "Not present"}</ins>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No content differences" />
            )}
          </section>
        )}
      </QueryState>
    </div>
  );
}
