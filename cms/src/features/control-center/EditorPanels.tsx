import {
  IconLock,
  IconPlus,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import { Dialog } from "./primitives";
import type { ContentData, Revision, ReleaseReview } from "./api";
import {
  componentRegistry,
  compositionDiff,
  effectiveLayout,
  resetResponsive,
  setResponsiveLayout,
  type ComponentType,
  type CompositionNode,
  type NodeLayout,
  type Viewport,
} from "./composition";
const safeLink = (value: string, action = "internal") => {
  if (!value || value.startsWith("//") || /[\u0000-\u001f\\]/.test(value))
    return false;
  try {
    const url = new URL(value, "https://lakegroup.invalid/");
    return (
      ["http:", "https:"].includes(url.protocol) ||
      (action === "email" && url.protocol === "mailto:") ||
      (action === "telephone" && url.protocol === "tel:") ||
      (action === "anchor" && value.startsWith("#"))
    );
  } catch {
    return false;
  }
};
export function Inspector({
  node,
  viewport,
  tab,
  data,
  mutate,
}: {
  node: CompositionNode;
  viewport: Viewport;
  tab: "content" | "layout" | "style" | "advanced";
  data: ContentData;
  mutate: (fn: (node: CompositionNode) => void) => void;
}) {
  const protectedNode =
    node.locked || componentRegistry[node.type].category === "Advanced";
  const layout = effectiveLayout(node, viewport),
    override = viewport !== "desktop" && Boolean(node.responsive[viewport]);
  const field = (
    label: string,
    name: keyof CompositionNode["content"],
    multiline = false,
  ) => (
    <label>
      {label}
      {multiline ? (
        <textarea
          rows={5}
          value={String(node.content[name] ?? "")}
          onChange={(e) =>
            mutate((n) => {
              (n.content as Record<string, unknown>)[name] = e.target.value;
            })
          }
        />
      ) : (
        <input
          value={String(node.content[name] ?? "")}
          onChange={(e) =>
            mutate((n) => {
              (n.content as Record<string, unknown>)[name] = e.target.value;
            })
          }
        />
      )}
    </label>
  );
  return (
    <div className="control-inspector-content">
      <div className="composer-inspector-heading">
        <div>
          <small>{node.type}</small>
          <h2>{node.name}</h2>
        </div>
        {node.locked && <IconLock size={17} />}
      </div>
      {protectedNode && (
        <div className="protected-component-note">
          <IconLock size={15} />
          <strong>Protected component</strong>
          <p>
            Only approved content and visibility are editable. Geometry,
            animation and internal structure stay protected.
          </p>
        </div>
      )}
      {tab === "content" && (
        <>
          {(node.content.heading !== undefined ||
            [
              "section",
              "container",
              "image-text",
              "text-image",
              "cta",
              "contact-block",
            ].includes(node.type)) &&
            field("Heading", "heading")}
          {(node.content.body !== undefined ||
            [
              "section",
              "container",
              "image-text",
              "text-image",
              "cta",
              "contact-block",
            ].includes(node.type)) &&
            field("Body", "body", true)}
          {!protectedNode &&
            (node.content.text !== undefined ||
              ["heading", "paragraph", "rich-text"].includes(node.type)) &&
            field("Text", "text", true)}
          {node.type === "stat-card" && (
            <>
              {field("Value", "value")}
              {field("Label", "label")}
            </>
          )}
          {!protectedNode &&
            (node.content.src !== undefined ||
              ["image", "video", "image-card", "service-card"].includes(
                node.type,
              )) && (
              <>
                {field("Media URL", "src")}
                {field("Alternative text", "alt")}
              </>
            )}
          {node.type !== "stat-card" &&
            (node.content.label !== undefined ||
              ["button", "link", "cta"].includes(node.type)) && (
              <>
                <h3>Button / link</h3>
                {field("Label", "label")}
                <label>
                  Action
                  <select
                    value={node.content.action ?? "internal"}
                    onChange={(e) =>
                      mutate((n) => {
                        n.content.action = e.target.value as NonNullable<
                          typeof n.content.action
                        >;
                      })
                    }
                  >
                    {[
                      "internal",
                      "external",
                      "email",
                      "telephone",
                      "anchor",
                      "file",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                {field("Destination", "href")}
                {node.content.href &&
                  !safeLink(node.content.href, node.content.action) && (
                    <p className="composer-validation">
                      Enter a safe destination for this action.
                    </p>
                  )}
                <label>
                  Open
                  <select
                    value={node.content.target ?? "same"}
                    onChange={(e) =>
                      mutate((n) => {
                        n.content.target = e.target.value as "same" | "new";
                      })
                    }
                  >
                    <option value="same">Same tab</option>
                    <option value="new">New tab</option>
                  </select>
                </label>
              </>
            )}
          {!protectedNode && data.media.length > 0 && (
            <label>
              Choose page media
              <select
                value=""
                onChange={(e) =>
                  mutate((n) => {
                    n.content.src = e.target.value;
                  })
                }
              >
                <option value="">Select media…</option>
                {data.media.map((media, index) => (
                  <option key={`${media.src}-${index}`} value={media.src}>
                    {media.alt || media.src}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
      {tab === "layout" && !protectedNode && (
        <>
          <div className="composer-inheritance">
            <span>
              {viewport === "desktop"
                ? "Base layout"
                : override
                  ? "Override"
                  : "Inherited from desktop"}
            </span>
            {viewport !== "desktop" && override && (
              <button
                onClick={() => mutate((n) => resetResponsive(n, viewport))}
              >
                Reset to inherited
              </button>
            )}
          </div>
          <label className="control-check">
            <input
              type="checkbox"
              checked={
                viewport === "desktop"
                  ? node.visible
                  : !(node.responsive[viewport]?.hidden ?? !node.visible)
              }
              onChange={(event) =>
                mutate((target) => {
                  if (viewport === "desktop")
                    target.visible = event.target.checked;
                  else
                    target.responsive[viewport] = {
                      ...target.responsive[viewport],
                      hidden: !event.target.checked,
                    };
                })
              }
            />
            Show on {viewport}
          </label>
          <label>
            Grid span
            <select
              value={layout.span ?? 12}
              onChange={(e) =>
                mutate((n) =>
                  setResponsiveLayout(
                    n,
                    viewport,
                    "span",
                    Number(e.target.value),
                  ),
                )
              }
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((v) => (
                <option value={v} key={v}>
                  {v} / 12 · {Math.round((v / 12) * 100)}%
                </option>
              ))}
            </select>
          </label>
          <div className="inspector-grid-guide" aria-label="12 column layout">
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className={i < (layout.span ?? 12) ? "filled" : ""}
              />
            ))}
          </div>
          <label>
            Alignment
            <select
              value={layout.align ?? "start"}
              onChange={(e) =>
                mutate((n) =>
                  setResponsiveLayout(
                    n,
                    viewport,
                    "align",
                    e.target.value as NodeLayout["align"],
                  ),
                )
              }
            >
              {["start", "center", "end", "stretch"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Spacing
            <select
              value={layout.padding ?? "md"}
              onChange={(e) =>
                mutate((n) =>
                  setResponsiveLayout(
                    n,
                    viewport,
                    "padding",
                    e.target.value as NodeLayout["padding"],
                  ),
                )
              }
            >
              {["none", "xs", "sm", "md", "lg", "xl"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Columns
            <input
              type="number"
              min="1"
              max="12"
              value={layout.columns ?? 1}
              onChange={(e) =>
                mutate((n) =>
                  setResponsiveLayout(
                    n,
                    viewport,
                    "columns",
                    Number(e.target.value),
                  ),
                )
              }
            />
          </label>
          <label>
            Height
            <select
              value={layout.height ?? "fit"}
              onChange={(e) =>
                mutate((n) =>
                  setResponsiveLayout(
                    n,
                    viewport,
                    "height",
                    e.target.value as NodeLayout["height"],
                  ),
                )
              }
            >
              {["fit", "small", "medium", "large", "viewport", "custom"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </label>
          {layout.height === "custom" && (
            <label>
              Minimum height
              <input
                type="number"
                min="0"
                max="2000"
                value={layout.minHeight ?? 0}
                onChange={(e) =>
                  mutate((n) =>
                    setResponsiveLayout(
                      n,
                      viewport,
                      "minHeight",
                      Number(e.target.value),
                    ),
                  )
                }
              />
            </label>
          )}
          <label>
            Gap
            <select
              value={layout.gap ?? "md"}
              onChange={(e) =>
                mutate((n) =>
                  setResponsiveLayout(
                    n,
                    viewport,
                    "gap",
                    e.target.value as NodeLayout["gap"],
                  ),
                )
              }
            >
              {["none", "xs", "sm", "md", "lg", "xl"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </>
      )}
      {tab === "style" && !protectedNode && (
        <>
          <label>
            Approved background
            <select
              value={node.style.background}
              onChange={(e) =>
                mutate((n) => {
                  n.style.background = e.target
                    .value as typeof n.style.background;
                })
              }
            >
              {[
                "none",
                "white",
                "light",
                "deep-blue",
                "light-blue",
                "yellow",
                "brand-gradient",
                "image",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          {node.style.background === "image" && (
            <>
              <label>
                Background image
                <input
                  value={node.style.backgroundImage ?? ""}
                  onChange={(event) =>
                    mutate((target) => {
                      target.style.backgroundImage = event.target.value;
                    })
                  }
                />
              </label>
              <label>
                Overlay {Math.round((node.style.overlay ?? 0) * 100)}%
                <input
                  type="range"
                  min="0"
                  max="1"
                  step=".05"
                  value={node.style.overlay ?? 0}
                  onChange={(e) =>
                    mutate((n) => {
                      n.style.overlay = Number(e.target.value);
                    })
                  }
                />
              </label>
            </>
          )}
          <label>
            Radius
            <select
              value={node.style.radius}
              onChange={(e) =>
                mutate((n) => {
                  n.style.radius = e.target.value as typeof n.style.radius;
                })
              }
            >
              {["none", "sm", "md", "lg"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Media fit
            <select
              value={node.style.fit ?? "cover"}
              onChange={(e) =>
                mutate((n) => {
                  n.style.fit = e.target.value as "cover" | "contain";
                })
              }
            >
              <option>cover</option>
              <option>contain</option>
            </select>
          </label>
          <label>
            Focal point X
            <input
              type="range"
              min="0"
              max="100"
              value={node.style.focalX ?? 50}
              onChange={(e) =>
                mutate((n) => {
                  n.style.focalX = Number(e.target.value);
                })
              }
            />
          </label>
        </>
      )}
      {protectedNode && ["layout", "style", "advanced"].includes(tab) && (
        <label className="control-check">
          <input
            type="checkbox"
            checked={node.visible}
            onChange={() =>
              mutate((n) => {
                n.visible = !n.visible;
              })
            }
          />
          Show component
        </label>
      )}
      {tab === "advanced" && !protectedNode && (
        <>
          <label>
            Layer name
            <input
              value={node.name}
              onChange={(e) =>
                mutate((n) => {
                  n.name = e.target.value;
                })
              }
            />
          </label>
          <label>
            Element key
            <input
              value={node.key}
              onChange={(e) =>
                mutate((n) => {
                  n.key = e.target.value;
                })
              }
            />
          </label>
          <label className="control-check">
            <input
              type="checkbox"
              checked={node.visible}
              onChange={() =>
                mutate((n) => {
                  n.visible = !n.visible;
                })
              }
            />{" "}
            Visible
          </label>
          <label>
            Reusable instance key
            <input
              value={node.reusableKey ?? ""}
              onChange={(e) =>
                mutate((n) => {
                  n.reusableKey = e.target.value || undefined;
                })
              }
              placeholder="Optional shared component key"
            />
          </label>
          <h3>Global data reference</h3>
          <label>
            Canonical key
            <input
              value={node.content.reference?.key ?? ""}
              onChange={(e) =>
                mutate((n) => {
                  n.content.reference = e.target.value
                    ? {
                        key: e.target.value,
                        state: "linked",
                        snapshot: n.content.reference?.snapshot,
                      }
                    : undefined;
                })
              }
              placeholder="group.employee_count"
            />
          </label>
          {node.content.reference && (
            <label>
              Reference state
              <select
                value={node.content.reference.state}
                onChange={(e) =>
                  mutate((n) => {
                    if (n.content.reference)
                      n.content.reference.state = e.target
                        .value as typeof n.content.reference.state;
                  })
                }
              >
                {["linked", "override", "detached", "broken"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          )}
          <p className="control-inspector-hint">
            {node.locked
              ? "This production component is protected from deletion."
              : "Stored in the structured composition revision."}
          </p>
        </>
      )}
    </div>
  );
}

export function ComponentLibrary({
  query,
  setQuery,
  insert,
}: {
  query: string;
  setQuery: (v: string) => void;
  insert: (type: ComponentType) => void;
}) {
  const entries = (
    Object.entries(componentRegistry) as [
      ComponentType,
      (typeof componentRegistry)[ComponentType],
    ][]
  ).filter(
    ([, value]) =>
      value.category !== "Advanced" &&
      !value.defaults.locked &&
      value.label.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="component-library-panel">
      <label className="composer-search">
        <IconSearch size={17} />
        <input
          aria-label="Search components"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search components"
        />
      </label>
      {["Layout", "Content", "Lake components", "Media"].map((category) => (
        <div className="composer-library" key={category}>
          <h3>{category}</h3>
          <div>
            {entries
              .filter(([, value]) => value.category === category)
              .map(([type, value]) => (
                <button key={type} onClick={() => insert(type)}>
                  <span className="composer-thumbnail">
                    <IconPlus size={16} />
                  </span>
                  <strong>{value.label}</strong>
                  <small>{type}</small>
                </button>
              ))}
          </div>
        </div>
      ))}
      {!entries.length && (
        <p className="control-empty">No matching components</p>
      )}
      <p className="control-inspector-hint">
        Protected website systems are managed through their existing layers.
      </p>
    </div>
  );
}
export function InsertPanel({
  query,
  setQuery,
  insert,
  close,
}: {
  query: string;
  setQuery: (v: string) => void;
  insert: (type: ComponentType) => void;
  close: () => void;
}) {
  return (
    <Dialog title="Insert component" close={close}>
      <ComponentLibrary query={query} setQuery={setQuery} insert={insert} />
    </Dialog>
  );
}
export function Seo({
  data,
  setData,
}: {
  data: ContentData;
  setData: (d: ContentData) => void;
}) {
  const update = (field: keyof ContentData["seo"], value: string | boolean) =>
    setData({ ...data, seo: { ...data.seo, [field]: value } });
  return (
    <div className="control-inspector-content">
      <h2>Search appearance</h2>
      <label>
        Page title
        <input
          maxLength={160}
          value={data.seo.title}
          onChange={(e) => update("title", e.target.value)}
        />
      </label>
      <label>
        Description
        <textarea
          rows={5}
          maxLength={320}
          value={data.seo.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </label>
      <label>
        Canonical URL
        <input
          value={data.seo.canonical ?? ""}
          onChange={(e) => update("canonical", e.target.value)}
        />
      </label>
      <h3>Social sharing</h3>
      <label>
        Open Graph title
        <input
          maxLength={160}
          value={data.seo.ogTitle ?? ""}
          placeholder="Use page title"
          onChange={(e) => update("ogTitle", e.target.value)}
        />
      </label>
      <label>
        Open Graph description
        <textarea
          rows={3}
          maxLength={320}
          value={data.seo.ogDescription ?? ""}
          placeholder="Use page description"
          onChange={(e) => update("ogDescription", e.target.value)}
        />
      </label>
      <label>
        Social image URL
        <input
          value={data.seo.socialImage ?? ""}
          onChange={(e) => update("socialImage", e.target.value)}
        />
      </label>
      {data.media.length > 0 && (
        <label>
          Choose page image
          <select
            value=""
            onChange={(e) => update("socialImage", e.target.value)}
          >
            <option value="">Select media…</option>
            {data.media
              .filter((item) => item.role !== "download")
              .map((item, index) => (
                <option key={`${item.src}-${index}`} value={item.src}>
                  {item.alt || item.src}
                </option>
              ))}
          </select>
        </label>
      )}
      <h3>Indexability</h3>
      <label className="control-check">
        <input
          type="checkbox"
          checked={data.seo.index !== false}
          onChange={(e) => {
            if (
              !e.target.checked &&
              !window.confirm(
                "Exclude this page from search engines? The release review will flag this change.",
              )
            )
              return;
            update("index", e.target.checked);
          }}
        />{" "}
        Allow search engines to index this page
      </label>
      <p className="control-inspector-hint">
        Indexability is per page. The Home page cannot be published as noindex.
      </p>
    </div>
  );
}
export function History({
  versions,
  current,
  data,
  restore,
}: {
  versions: Revision[];
  current: string | null;
  data: ContentData;
  restore: (id: string) => Promise<void>;
}) {
  return (
    <div className="control-inspector-content">
      <h2>Composition history</h2>
      {versions.map((version) => {
        const changes = compositionDiff(
          version.data.composition,
          data.composition,
        );
        return (
          <div className="control-version" key={version.id}>
            <strong>{new Date(version.createdAt).toLocaleString()}</strong>
            <small>
              {changes.length
                ? `${changes.length} structured changes`
                : "Legacy content revision"}
            </small>
            {changes.slice(0, 3).map((c, i) => (
              <small key={i}>
                {c.kind}: {c.label}
              </small>
            ))}
            {version.id !== current && (
              <button onClick={() => void restore(version.id)}>
                <IconRefresh size={14} /> Restore as draft
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
export function Review({
  review,
  close,
  publish,
}: {
  review: ReleaseReview;
  close: () => void;
  publish: () => Promise<void>;
}) {
  return (
    <Dialog title="Review structured changes" close={close}>
      <div className="control-review-header">
        <div>
          <small>Release review</small>
          <h2>Review structured changes</h2>
          <p>{review.changedFields} changed fields</p>
        </div>
        <button onClick={close}>Close</button>
      </div>
      <div className="control-review-issues">
        {review.issues.map((issue, i) => (
          <p className={issue.severity} key={i}>
            <strong>{issue.severity}</strong> {issue.message}
          </p>
        ))}
      </div>
      <div className="control-review-changes">
        {review.changes.slice(0, 30).map((change) => (
          <div className="control-review-change" key={change.field}>
            <strong>{change.field}</strong>
            <div>
              <span>{change.before}</span>
              <span>{change.after}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="control-review-footer">
        <span>Creates an immutable, verified release.</span>
        <button
          className="control-button primary"
          disabled={!review.valid}
          onClick={() => void publish()}
        >
          Create release
        </button>
      </div>
    </Dialog>
  );
}
