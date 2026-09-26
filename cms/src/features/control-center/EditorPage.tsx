import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconDeviceFloppy,
  IconEye,
  IconLock,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { PhaseNote } from "./primitives";
import { Layer } from "./EditorLayers";
import {
  Inspector,
  ComponentLibrary,
  InsertPanel,
  Seo,
  History,
  Review,
} from "./EditorPanels";
import { publicSiteBase } from "./api";
import { apiErrorMessage, isApiError } from "../../services/api";
import {
  controlApi,
  type ContentData,
  type ControlPage,
  type ReleaseReview,
  type Revision,
} from "./api";
import {
  componentRegistry,
  compositionFromLegacy,
  duplicateNode,
  findNode,
  insertNode,
  makeNode,
  moveNode,
  parentList,
  removeNode,
  renderComposition,
  setResponsiveLayout,
  updateNode,
  type ComponentType,
  type Composition,
  type CompositionNode,
  type Viewport,
} from "./composition";

const copy = <T,>(value: T): T => structuredClone(value);

function reorder(composition: Composition, sourceId: string, targetId: string) {
  const next = copy(composition),
    source = parentList(next, sourceId),
    target = parentList(next, targetId);
  if (source !== target) return next;
  const from = source.findIndex((n) => n.id === sourceId),
    to = target.findIndex((n) => n.id === targetId);
  if (from < 0 || to < 0) return next;
  const [node] = source.splice(from, 1);
  source.splice(to, 0, node);
  return next;
}

export function EditorPage() {
  const { key = "" } = useParams();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState<ControlPage | null>(null),
    [data, setData] = useState<ContentData | null>(null),
    [saved, setSaved] = useState<ContentData | null>(null);
  const [revisionId, setRevisionId] = useState<string | null>(null),
    [versions, setVersions] = useState<Revision[]>([]),
    [selected, setSelected] = useState("hero");
  const [tab, setTab] = useState<
      "content" | "layout" | "style" | "advanced" | "seo" | "history"
    >("content"),
    [viewport, setViewport] = useState<Viewport>("desktop");
  const [status, setStatus] = useState("Loading page…"),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [review, setReview] = useState<ReleaseReview | null>(null);
  const [source, setSource] = useState<{
      sourceUrl: string;
      html: string;
    } | null>(null),
    [frameReady, setFrameReady] = useState(0),
    [past, setPast] = useState<ContentData[]>([]),
    [future, setFuture] = useState<ContentData[]>([]);
  const [zoom, setZoom] = useState<number | "fit">("fit"),
    [leftTab, setLeftTab] = useState<"layers" | "insert">("layers"),
    [panel, setPanel] = useState<"canvas" | "layers" | "inspector">("canvas");
  const [expanded, setExpanded] = useState(new Set(["hero", "introduction"])),
    [layerSearch, setLayerSearch] = useState(""),
    [insertOpen, setInsertOpen] = useState(false),
    [insertSearch, setInsertSearch] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null),
    dirty = Boolean(
      data && saved && JSON.stringify(data) !== JSON.stringify(saved),
    );
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(600);
  const deviceWidth =
    viewport === "desktop" ? 1440 : viewport === "tablet" ? 768 : 390;
  const scale =
    zoom === "fit"
      ? Math.min(1, Math.max(0.1, (stageWidth - 56) / deviceWidth))
      : zoom / 100;
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver((entries) =>
      setStageWidth(entries[0].contentRect.width),
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [data, panel]);
  const composition =
      data?.composition ??
      (data && page ? compositionFromLegacy(page.label, data) : undefined),
    selectedNode = composition ? findNode(composition, selected) : undefined;
  const protectedSelection = !selectedNode || selectedNode.locked;
  const previewHtml = source?.html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(
      /<meta\b(?=[^>]*http-equiv\s*=\s*["'](?:Content-Security-Policy|refresh)["'])[^>]*>/gi,
      "",
    )
    .replace(
      /<head([^>]*)>/i,
      `<head$1><base href="${source.sourceUrl.replace(/"/g, "&quot;")}">`,
    );
  const commit = (
    next: Composition,
    message = "Unsaved composition changes",
  ) => {
    if (!data) return;
    setPast((items) => [...items.slice(-39), copy(data)]);
    setFuture([]);
    setData({ ...data, composition: next });
    setStatus(message);
  };
  const mutate = (id: string, fn: (node: CompositionNode) => void) =>
    composition && commit(updateNode(composition, id, fn));

  useEffect(() => {
    let live = true;
    setData(null);
    setPage(null);
    setSaved(null);
    setSource(null);
    setRevisionId(null);
    setVersions([]);
    setPast([]);
    setFuture([]);
    setReview(null);
    setStatus("Loading page�");
    setError("");
    void Promise.all([
      controlApi.pages(),
      controlApi.document(key),
      controlApi.versions(key),
      controlApi.pageSource(key),
    ])
      .then(([catalog, result, history, pageSource]) => {
        if (!live) return;
        const found = catalog.pages.find((item) => item.key === key) ?? null,
          draft = result.document.currentDraftRevision;
        setPage(found);
        if (draft?.data && found) {
          const original = copy(draft.data),
            next = copy(draft.data);
          next.composition ??= compositionFromLegacy(found.label, next);
          setData(next);
          setSaved(original);
          setRevisionId(draft.id);
          const requested = searchParams.get("select");
          setSelected(
            requested && findNode(next.composition, requested)
              ? requested
              : (next.composition.root.children[0]?.id ?? ""),
          );
          setStatus(
            original.composition ? "Saved draft" : "Local composition preview",
          );
        }
        setVersions(history.revisions);
        setSource(pageSource);
        if (!draft) setStatus("No imported draft");
      })
      .catch((cause) => live && setError(apiErrorMessage(cause)));
    return () => {
      live = false;
    };
  }, [key, searchParams]);
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc || !composition) return;
    renderComposition(
      doc,
      composition,
      viewport,
      setSelected,
      (id, field, value) =>
        mutate(id, (node) => {
          node.content[field] = value;
        }),
      selected,
      (id, change) =>
        mutate(id, (node) => {
          if (change.span !== undefined)
            setResponsiveLayout(node, viewport, "span", change.span);
          if (change.minHeight !== undefined) {
            setResponsiveLayout(node, viewport, "height", "custom");
            setResponsiveLayout(node, viewport, "minHeight", change.minHeight);
          }
        }),
      (sourceId, targetId) =>
        commit(reorder(composition, sourceId, targetId), "Reordered on canvas"),
    );
  }, [composition, viewport, selected, frameReady]);
  const save = async () => {
    if (!data || !dirty || saving) return;
    const snapshot = copy(data);
    setSaving(true);
    setError("");
    setStatus("Saving…");
    try {
      const result = await controlApi.save(key, snapshot, revisionId);
      setRevisionId(result.revision.id);
      setSaved(snapshot);
      setVersions((await controlApi.versions(key)).revisions);
      setStatus("Saved draft");
    } catch (cause) {
      setError(
        isApiError(cause) && cause.code === "REVISION_CONFLICT"
          ? "This draft changed elsewhere. Reload before saving."
          : apiErrorMessage(cause),
      );
      setStatus("Save failed");
    } finally {
      setSaving(false);
    }
  };
  const undo = () => {
      if (!data || !past.length) return;
      setFuture((items) => [copy(data), ...items]);
      setData(past.at(-1)!);
      setPast(past.slice(0, -1));
      setStatus("Undo applied");
    },
    redo = () => {
      if (!data || !future.length) return;
      setPast((items) => [...items, copy(data)]);
      setData(future[0]);
      setFuture(future.slice(1));
      setStatus("Redo applied");
    };
  const action = (name: string, id: string) => {
    if (!composition) return;
    const node = findNode(composition, id);
    if (node?.locked && name !== "visibility") {
      setError("Protected component: structural changes are unavailable.");
      return;
    }
    try {
      if (name === "visibility")
        commit(
          updateNode(composition, id, (n) => {
            n.visible = !n.visible;
          }),
        );
      if (name === "duplicate") commit(duplicateNode(composition, id));
      if (name === "delete") {
        commit(removeNode(composition, id));
        setSelected(composition.root.children[0]?.id ?? "");
      }
      if (name === "up") commit(moveNode(composition, id, -1));
      if (name === "down") commit(moveNode(composition, id, 1));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Composition change failed",
      );
    }
  };
  const insert = (type: ComponentType) => {
    if (!composition) return;
    const node = makeNode(type);
    try {
      const parent =
        selectedNode &&
        componentRegistry[selectedNode.type].children.includes(type)
          ? selectedNode.id
          : undefined;
      commit(insertNode(composition, node, parent));
      setSelected(node.id);
      if (parent) setExpanded((items) => new Set([...items, parent]));
      setInsertOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid nesting");
    }
  };
  const openReview = async () => {
      if (!revisionId || dirty) {
        setError("Save the draft before review.");
        return;
      }
      try {
        setReview((await controlApi.review(key, revisionId)).review);
      } catch (cause) {
        setError(apiErrorMessage(cause));
      }
    },
    publish = async () => {
      if (!revisionId || !review?.valid) return;
      try {
        await controlApi.publish(key, revisionId);
        setReview(null);
        setStatus(
          "CMS release created. Website deployment has not been checked.",
        );
      } catch (cause) {
        setError(apiErrorMessage(cause));
      }
    };
  const restore = async (id: string) => {
    try {
      const result = await controlApi.restore(key, id),
        next = copy(result.revision.data);
      if (page) next.composition ??= compositionFromLegacy(page.label, next);
      setData(next);
      setSaved(copy(next));
      setRevisionId(result.revision.id);
      setVersions((await controlApi.versions(key)).revisions);
      setStatus("Revision restored as a new draft");
    } catch (cause) {
      setError(apiErrorMessage(cause));
    }
  };
  const toggle = (id: string) =>
      setExpanded((items) => {
        const next = new Set(items);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      }),
    roots = useMemo(
      () =>
        composition?.root.children.filter(
          (node) =>
            !layerSearch ||
            JSON.stringify(node)
              .toLowerCase()
              .includes(layerSearch.toLowerCase()),
        ) ?? [],
      [composition, layerSearch],
    );
  if (!page && !error)
    return <div className="control-loading">Loading visual editor…</div>;
  if (!page)
    return (
      <div className="control-error">
        {error || "Page not found"}{" "}
        <Link to="/control/pages">Back to pages</Link>
      </div>
    );
  return (
    <div className="control-editor composer">
      <header className="control-editor-top">
        <div>
          <Link className="control-back" to="/control/pages">
            <IconArrowLeft size={16} />
            Pages
          </Link>
          <h1>{page.label}</h1>
          <span className={`control-save-state${dirty ? " is-dirty" : ""}`}>
            {status}
          </span>
        </div>
        <div className="control-editor-actions">
          <button
            className="control-button"
            aria-label="Undo"
            title="Undo local change"
            disabled={!past.length}
            onClick={undo}
          >
            ↶
          </button>
          <button
            className="control-button"
            aria-label="Redo"
            title="Redo local change"
            disabled={!future.length}
            onClick={redo}
          >
            ↷
          </button>
          <button
            className="control-button"
            disabled={!dirty || saving}
            onClick={() => void save()}
          >
            <IconDeviceFloppy size={16} />
            Save draft
          </button>
          <button
            className="control-button primary"
            disabled={dirty || !revisionId}
            onClick={() => void openReview()}
          >
            Review & publish
          </button>
        </div>
      </header>
      <PhaseNote>
        Canvas changes are local until you save the draft. Publishing uses the
        existing release review; further wiring is reserved for Phase 2.
      </PhaseNote>
      <div className="editor-panel-switch">
        {(["layers", "canvas", "inspector"] as const).map((value) => (
          <button
            key={value}
            aria-pressed={panel === value}
            onClick={() => setPanel(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {error && (
        <div className="control-error" role="alert">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      {!data || !composition ? (
        <div className="control-empty">No imported draft is available.</div>
      ) : (
        <div className={`control-editor-grid composer-grid show-${panel}`}>
          <aside className="control-editor-layers composer-layers">
            <div className="control-inspector-tabs left-panel-tabs">
              <button
                aria-pressed={leftTab === "layers"}
                className={leftTab === "layers" ? "is-active" : ""}
                onClick={() => setLeftTab("layers")}
              >
                Layers
              </button>
              <button
                aria-pressed={leftTab === "insert"}
                className={leftTab === "insert" ? "is-active" : ""}
                onClick={() => setLeftTab("insert")}
              >
                Insert
              </button>
            </div>
            {leftTab === "layers" ? (
              <>
                <div className="composer-pane-title">
                  <div>
                    <h2>Page structure</h2>
                    <p>{composition.root.children.length} sections</p>
                  </div>
                  <button
                    title="Insert component"
                    aria-label="Insert component"
                    onClick={() => setInsertOpen(true)}
                  >
                    <IconPlus size={18} />
                  </button>
                </div>
                <label className="composer-search">
                  <IconSearch size={15} />
                  <input
                    aria-label="Search layers"
                    value={layerSearch}
                    onChange={(e) => setLayerSearch(e.target.value)}
                    placeholder="Search layers"
                  />
                </label>
                <div className="composer-page-root">
                  <strong>Page · {page.label}</strong>
                  <div className="protected-shell-layer">
                    <IconLock size={13} />
                    Website header <small>Protected</small>
                  </div>
                  {roots.map((node) => (
                    <Layer
                      key={node.id}
                      node={node}
                      selected={selected}
                      expanded={expanded}
                      toggle={toggle}
                      select={setSelected}
                      action={action}
                      drop={(sourceId, targetId) => {
                        if (
                          !findNode(composition, sourceId)?.locked &&
                          !findNode(composition, targetId)?.locked
                        )
                          commit(reorder(composition, sourceId, targetId));
                      }}
                    />
                  ))}
                  {page.key === "home" && (
                    <button
                      className={`protected-shell-layer protected-globe-layer${selected === "website-globe" ? " is-selected" : ""}`}
                      onClick={() => {
                        setSelected("website-globe");
                        setTab("content");
                      }}
                    >
                      <IconLock size={13} />
                      Home globe <small>Protected</small>
                    </button>
                  )}
                </div>
                {!roots.length && (
                  <p className="control-empty">No matching layers</p>
                )}
                <div className="protected-shell-layer">
                  <IconLock size={13} />
                  Website footer <small>Protected</small>
                </div>
                <button
                  className="composer-add-section"
                  onClick={() => setLeftTab("insert")}
                >
                  <IconPlus size={16} /> Add section
                </button>
              </>
            ) : (
              <ComponentLibrary
                query={insertSearch}
                setQuery={setInsertSearch}
                insert={insert}
              />
            )}
          </aside>
          <section className="control-canvas">
            <div className="control-canvas-toolbar">
              <div>
                <strong>Website canvas</strong>
                <span>
                  Click to select · double click text to edit · drag sections to
                  reorder
                </span>
              </div>
              <div className="control-viewport">
                {(
                  [
                    ["desktop", IconDeviceDesktop],
                    ["tablet", IconDeviceTablet],
                    ["mobile", IconDeviceMobile],
                  ] as const
                ).map(([value, Icon]) => (
                  <button
                    key={value}
                    aria-label={`${value} preview`}
                    aria-pressed={viewport === value}
                    onClick={() => setViewport(value)}
                  >
                    <Icon size={18} />
                  </button>
                ))}
              </div>
              <label className="canvas-zoom">
                <span className="sr-only">Canvas zoom</span>
                <select
                  aria-label="Canvas zoom"
                  value={zoom}
                  onChange={(e) =>
                    setZoom(
                      e.target.value === "fit" ? "fit" : Number(e.target.value),
                    )
                  }
                >
                  <option value="fit">Fit</option>
                  {[50, 75, 100].map((value) => (
                    <option key={value} value={value}>
                      {value}%
                    </option>
                  ))}
                </select>
              </label>
              <a
                className="control-button"
                aria-label="Preview public page"
                href={`${publicSiteBase}/${page.route}`}
                target="_blank"
                rel="noreferrer"
              >
                <IconEye size={16} />
              </a>
            </div>
            <div className="canvas-device-label">
              {viewport} ·{" "}
              {viewport === "desktop"
                ? "1440"
                : viewport === "tablet"
                  ? "768"
                  : "390"}{" "}
              px · {Math.round(scale * 100)}%
            </div>
            <div ref={stageRef} className="control-canvas-stage composer-stage">
              {previewHtml ? (
                <iframe
                  ref={frameRef}
                  title={`${page.label} website composition`}
                  srcDoc={previewHtml}
                  style={{
                    width:
                      viewport === "desktop"
                        ? 1440
                        : viewport === "tablet"
                          ? 768
                          : 390,
                    flexShrink: 0,
                    zoom: scale,
                  }}
                  sandbox="allow-same-origin"
                  onLoad={() => setFrameReady((value) => value + 1)}
                  className={`control-site-frame ${viewport}`}
                />
              ) : (
                <div className="control-empty">Loading actual website…</div>
              )}
              <div className="composer-canvas-actions">
                <button
                  disabled={protectedSelection}
                  onClick={() => action("up", selected)}
                >
                  Move up
                </button>
                <button
                  disabled={protectedSelection}
                  onClick={() => action("down", selected)}
                >
                  Move down
                </button>
                <button
                  disabled={protectedSelection}
                  onClick={() => action("duplicate", selected)}
                >
                  Duplicate
                </button>
                <button
                  disabled={!selectedNode}
                  onClick={() => action("visibility", selected)}
                >
                  {selectedNode?.visible ? "Hide" : "Show"}
                </button>
                <button
                  disabled={protectedSelection}
                  onClick={() => action("delete", selected)}
                >
                  Delete
                </button>
              </div>
            </div>
          </section>
          <aside className="control-inspector composer-inspector">
            <div className="control-inspector-tabs composer-tabs">
              {(
                [
                  "content",
                  "layout",
                  "style",
                  "advanced",
                  "seo",
                  "history",
                ] as const
              ).map((value) => (
                <button
                  aria-pressed={tab === value}
                  key={value}
                  className={tab === value ? "is-active" : ""}
                  onClick={() => setTab(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            {selectedNode && tab !== "seo" && tab !== "history" && (
              <Inspector
                node={selectedNode}
                viewport={viewport}
                tab={tab}
                data={data}
                mutate={(fn) => mutate(selectedNode.id, fn)}
              />
            )}{" "}
            {tab === "seo" && (
              <Seo
                data={data}
                setData={(next) => {
                  setPast((items) => [...items, copy(data)]);
                  setData(next);
                }}
              />
            )}
            {selected === "website-globe" && (
              <div className="control-inspector-content">
                <p className="control-eyebrow">Lake Group component</p>
                <h2>Home globe</h2>
                <div className="protected-component-note">
                  <IconLock size={16} />
                  <strong>Protected component</strong>
                  <p>
                    The approved globe keeps its geometry, camera, routes,
                    textures, labels and animation. Generic layout and deletion
                    controls are unavailable.
                  </p>
                </div>
                <h3>Country content</h3>
                <p className="control-inspector-hint">
                  Approved country references and supporting copy will be
                  connected in Phase 2.
                </p>
                <Link className="control-button" to="/control/global-data">
                  Open global data
                </Link>
                <p className="control-inspector-hint">
                  Interactive website scripts are paused in the editing canvas.
                  Use Preview to inspect the live globe.
                </p>
              </div>
            )}
            {tab === "history" && (
              <History
                versions={versions}
                current={revisionId}
                data={data}
                restore={restore}
              />
            )}
          </aside>
        </div>
      )}
      {insertOpen && (
        <InsertPanel
          query={insertSearch}
          setQuery={setInsertSearch}
          insert={insert}
          close={() => setInsertOpen(false)}
        />
      )}{" "}
      {review && (
        <Review
          review={review}
          close={() => setReview(null)}
          publish={publish}
        />
      )}
    </div>
  );
}
