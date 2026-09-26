import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { IconDatabase, IconArrowRight } from "@tabler/icons-react";
import {
  Heading,
  PhaseNote,
  QueryState,
  EmptyState,
  SearchField,
  Dialog,
} from "./primitives";
import {
  canonicalFields,
  useGlobal,
  usePageDocuments,
  type GlobalField,
} from "./workspace-data";
import { walk } from "./composition";

export function GlobalDataWorkspace() {
  const [params] = useSearchParams();
  const query = useGlobal(),
    documents = usePageDocuments();
  const [fields, setFields] = useState<GlobalField[]>([]),
    [selected, setSelected] = useState(""),
    [search, setSearch] = useState(""),
    [review, setReview] = useState(false);
  useEffect(() => {
    const data = query.data?.currentDraftRevision?.data;
    if (!data) return;
    const values = canonicalFields(data);
    setFields(values);
    setSelected(values[0]?.key ?? "");
  }, [query.data]);
  const current = fields.find((field) => field.key === selected);
  useEffect(() => {
    const field = params.get("field");
    if (field && fields.some((value) => value.key === field))
      setSelected(field);
  }, [params, fields]);
  const references = useMemo(() => {
    const result: Array<{
      page: string;
      key: string;
      node: string;
      name: string;
      state: string;
    }> = [];
    for (const entry of documents.data ?? []) {
      const composition =
        entry.document?.currentDraftRevision?.data.composition;
      if (composition)
        walk(composition.root.children, (node) => {
          if (node.content.reference?.key === selected)
            result.push({
              page: entry.page.label,
              key: entry.page.key,
              node: node.id,
              name: node.name,
              state: node.content.reference.state,
            });
        });
    }
    return result;
  }, [documents.data, selected]);
  const visible = fields.filter((field) =>
    `${field.label} ${field.key} ${field.value}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="control-page">
      <Heading
        eyebrow="Content / Shared information"
        title="Global data"
        body="One canonical value, wherever it is linked across the website."
      />
      <PhaseNote />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      >
        <div className="workspace-split">
          <section className="control-panel global-list">
            <div className="workspace-section-heading">
              <h2>Canonical values</h2>
              <span>{fields.length} fields</span>
            </div>
            <SearchField
              label="Search global values"
              value={search}
              onChange={setSearch}
            />
            {visible.length ? (
              visible.map((field) => (
                <button
                  key={field.key}
                  className={`global-field${selected === field.key ? " is-selected" : ""}`}
                  onClick={() => setSelected(field.key)}
                >
                  <IconDatabase size={17} />
                  <span>
                    <strong>{field.label}</strong>
                    <small>{field.key}</small>
                  </span>
                  <b>{field.value}</b>
                </button>
              ))
            ) : (
              <EmptyState
                title={
                  fields.length
                    ? "No matching values"
                    : "No canonical values yet"
                }
                body="Shared company information will appear here."
              />
            )}
          </section>
          <aside className="control-panel workspace-editor">
            {current ? (
              <>
                <p className="control-eyebrow">{current.type}</p>
                <h2>{current.label}</h2>
                <code className="workspace-key">{current.key}</code>
                <label>
                  Canonical value
                  <input
                    value={current.value}
                    onChange={(e) =>
                      setFields(
                        fields.map((field) =>
                          field.key === selected
                            ? { ...field, value: e.target.value }
                            : field,
                        ),
                      )
                    }
                  />
                  <small>
                    Preview changes stay local until persistence is connected.
                  </small>
                </label>
                <div className="workspace-section-heading">
                  <h3>Usages / references</h3>
                  <span>
                    {documents.isLoading
                      ? "Checking…"
                      : `${references.length} found`}
                  </span>
                </div>
                {documents.error ? (
                  <p className="control-error">
                    References could not be checked.
                  </p>
                ) : references.length ? (
                  references.map((ref) => (
                    <Link
                      key={`${ref.key}:${ref.node}`}
                      className="reference-row"
                      to={`/control/pages/${ref.key}?select=${ref.node}`}
                    >
                      <span>
                        <strong>{ref.page}</strong>
                        <small>{ref.name}</small>
                      </span>
                      <span className={`reference-state ${ref.state}`}>
                        {ref.state === "linked"
                          ? "GLOBAL / LINKED"
                          : ref.state.toUpperCase()}
                      </span>
                      <IconArrowRight size={15} />
                    </Link>
                  ))
                ) : (
                  <p className="control-inspector-hint">
                    No linked composition usages were found. Legacy and
                    unimported pages have not been verified.
                  </p>
                )}
                {documents.data?.some((entry) => !entry.document) && (
                  <p className="control-inspector-hint">
                    Some page documents are unavailable. Usage results are
                    partial.
                  </p>
                )}
                <button
                  className="control-button"
                  onClick={() => setReview(true)}
                >
                  Review impact
                </button>
                <h3>Value history</h3>
                <p className="control-inspector-hint">
                  Field-level history will be connected in Phase 2.
                </p>
              </>
            ) : (
              <EmptyState
                title="Select a global value"
                body="Inspect its value, type and linked usages."
              />
            )}
          </aside>
        </div>
        <section className="control-panel reference-legend">
          <h2>Reference states</h2>
          {[
            ["GLOBAL / LINKED", "Uses the canonical value"],
            ["OVERRIDE", "Keeps a local value"],
            ["DETACHED", "No longer follows global changes"],
            ["BROKEN", "Referenced field is unavailable"],
          ].map(([label, text]) => (
            <div key={label}>
              <strong>{label}</strong>
              <span>{text}</span>
            </div>
          ))}
        </section>
      </QueryState>
      {review && current && (
        <Dialog title="Review global change" close={() => setReview(false)}>
          <p>
            Changing <strong>{current.label}</strong> would affect the linked
            usages below.
          </p>
          <div className="impact-value">
            <small>Proposed local value</small>
            <strong>{current.value}</strong>
          </div>
          {references.map((ref) => (
            <div className="reference-row" key={`${ref.key}:${ref.node}`}>
              <span>
                {ref.page}
                <small>
                  {ref.name} · {ref.state}
                </small>
              </span>
            </div>
          ))}
          {!references.length && (
            <EmptyState title="No verified linked usages" />
          )}
          <PhaseNote>
            Propagation, overrides and transaction validation will be connected
            in Phase 2.
          </PhaseNote>
          <button className="control-button primary" disabled>
            Apply global change
          </button>
        </Dialog>
      )}
    </div>
  );
}
