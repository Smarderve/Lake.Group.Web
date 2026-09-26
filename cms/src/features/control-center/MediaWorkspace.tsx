import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  IconLayoutGrid,
  IconList,
  IconPhoto,
  IconUpload,
  IconCopy,
} from "@tabler/icons-react";
import { mediaApi, mediaPreviewUrl, type MediaRow } from "../media/api";
import { walk } from "./composition";
import { usePageDocuments } from "./workspace-data";
import {
  Heading,
  PhaseNote,
  QueryState,
  EmptyState,
  SearchField,
  Dialog,
} from "./primitives";

const filename = (row: MediaRow) => row.url.split("/").pop() || row.url;
const dimensions = (row: MediaRow) =>
  row.width && row.height
    ? `${row.width} × ${row.height}`
    : "Dimensions unavailable";
export function MediaWorkspace() {
  const [params] = useSearchParams();
  const folders = useQuery({
    queryKey: ["control-media-folders"],
    queryFn: mediaApi.folders,
  });
  const [folder, setFolder] = useState("all");
  const query = useQuery({
      queryKey: ["control-media"],
      queryFn: mediaApi.list,
    }),
    documents = usePageDocuments();
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<MediaRow | null>(null),
    [upload, setUpload] = useState(false),
    [preview, setPreview] = useState(false),
    [message, setMessage] = useState("");
  const [alt, setAlt] = useState(""),
    [title, setTitle] = useState(""),
    [files, setFiles] = useState<string[]>([]);
  useEffect(() => {
    setAlt(selected?.altText ?? "");
    setTitle(selected?.caption ?? "");
  }, [selected]);
  useEffect(() => {
    const asset = query.data?.media.find(
      (row) => row.id === params.get("asset"),
    );
    if (asset) setSelected(asset);
  }, [query.data, params]);
  const rows = (query.data?.media ?? [])
    .filter(
      (row) =>
        folder === "all" ||
        (folder === "unfiled" ? !row.folderId : row.folderId === folder),
    )
    .filter(
      (row) =>
        `${row.url} ${row.altText} ${row.caption} ${(row.tags ?? []).join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (category === "all" || (row.mimeType ?? "").startsWith(category)),
    );
  const usages = useMemo(() => {
    const result: Array<{
      key: string;
      page: string;
      node: string;
      name: string;
    }> = [];
    if (!selected) return result;
    for (const entry of documents.data ?? []) {
      const composition =
        entry.document?.currentDraftRevision?.data.composition;
      if (composition)
        walk(composition.root.children, (node) => {
          if (
            node.content.src === selected.url ||
            node.style.backgroundImage === selected.url
          )
            result.push({
              key: entry.page.key,
              page: entry.page.label,
              node: node.id,
              name: node.name,
            });
        });
    }
    return result;
  }, [documents.data, selected]);
  const copyPath = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.url);
      setMessage("Asset path copied");
    } catch {
      setMessage(
        "Copy unavailable. Select the path below to copy it manually.",
      );
    }
  };
  return (
    <div className="control-page">
      <Heading
        eyebrow="Assets / Website library"
        title="Media"
        body="Find images and documents, inspect their details and check references."
        actions={
          <button
            className="control-button primary"
            onClick={() => setUpload(true)}
          >
            <IconUpload size={16} />
            Upload media
          </button>
        }
      />
      <PhaseNote />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      >
        <div className="workspace-split media-workspace">
          <section className="control-panel media-browser">
            <div className="media-browser-toolbar">
              <SearchField
                label="Search media"
                value={search}
                onChange={setSearch}
              />
              <div className="control-viewport">
                <button
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                >
                  <IconLayoutGrid size={18} />
                </button>
                <button
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <IconList size={18} />
                </button>
              </div>
            </div>
            <div
              className="workspace-category-nav"
              aria-label="Media categories"
            >
              {[
                ["all", "All assets"],
                ["image", "Images"],
                ["video", "Video"],
                ["application", "Documents"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="media-folder-filter">
              Folder
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              >
                <option value="all">All folders</option>
                <option value="unfiled">Unfiled assets</option>
                {folders.data?.mediaFolders.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {folders.error && <small>Folder list unavailable</small>}
            </label>
            <p className="workspace-count">{rows.length} assets</p>
            <div className={view === "grid" ? "media-grid" : "media-list"}>
              {rows.map((row) => (
                <button
                  key={row.id}
                  className={selected?.id === row.id ? "is-selected" : ""}
                  onClick={() => {
                    setSelected(row);
                    setMessage("");
                  }}
                >
                  {row.mimeType?.startsWith("image/") ? (
                    <img
                      loading="lazy"
                      src={mediaPreviewUrl(row)}
                      alt={row.altText || filename(row)}
                    />
                  ) : (
                    <span className="media-file-icon">
                      <IconPhoto size={26} />
                    </span>
                  )}
                  <span>
                    <strong>{filename(row)}</strong>
                    <small>
                      {row.mimeType || "File"} · {dimensions(row)}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            {!rows.length && (
              <EmptyState
                title={
                  query.data?.media.length
                    ? "No matching assets"
                    : "Your media library is empty"
                }
                body="Use Upload media to prepare new assets."
              />
            )}
          </section>
          <aside className="control-panel workspace-editor media-details">
            {selected ? (
              <>
                {selected.mimeType?.startsWith("image/") && (
                  <button
                    className="media-preview-button"
                    aria-label="Preview selected asset"
                    onClick={() => setPreview(true)}
                  >
                    <img
                      className="media-detail-preview"
                      src={mediaPreviewUrl(selected)}
                      alt={alt || filename(selected)}
                    />
                  </button>
                )}
                <h2>{filename(selected)}</h2>
                <dl className="workspace-metadata">
                  <div>
                    <dt>Type</dt>
                    <dd>{selected.mimeType || "Unavailable"}</dd>
                  </div>
                  <div>
                    <dt>Dimensions</dt>
                    <dd>{dimensions(selected)}</dd>
                  </div>
                  <div>
                    <dt>File size</dt>
                    <dd>
                      {selected.sizeBytes !== null
                        ? `${(selected.sizeBytes / 1024).toFixed(1)} KB`
                        : "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{selected.status}</dd>
                  </div>
                </dl>
                <label>
                  Title
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label>
                  Alternative text
                  <textarea
                    rows={3}
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                  />
                  <small>
                    Describe the image for visitors using screen readers.
                  </small>
                </label>
                <label>
                  Asset path
                  <input readOnly value={selected.url} />
                </label>
                <button
                  className="control-button"
                  onClick={() => void copyPath()}
                >
                  <IconCopy size={15} />
                  Copy path
                </button>
                <p role="status" className="control-save-state">
                  {message}
                </p>
                <h3>Composition references</h3>
                {documents.isLoading ? (
                  <p role="status">Checking references…</p>
                ) : (
                  usages.map((usage) => (
                    <Link
                      className="reference-row"
                      key={`${usage.key}:${usage.node}`}
                      to={`/control/pages/${usage.key}?select=${usage.node}`}
                    >
                      <span>
                        <strong>{usage.page}</strong>
                        <small>{usage.name}</small>
                      </span>
                    </Link>
                  ))
                )}
                {!documents.isLoading && !usages.length && (
                  <p className="control-inspector-hint">
                    No composition references found. Other website usages have
                    not been verified.
                  </p>
                )}
                {documents.error && (
                  <p className="control-error">Reference check unavailable.</p>
                )}
                <div className="workspace-actions">
                  <button disabled title="Phase 2: save media metadata">
                    Save details
                  </button>
                  <button
                    disabled
                    title="Phase 2: replace asset and review references"
                  >
                    Replace
                  </button>
                  <button
                    className="danger"
                    disabled
                    title="Phase 2: verify usages before deletion"
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <EmptyState
                title="Select an asset"
                body="Its preview, metadata and references appear here."
              />
            )}
          </aside>
        </div>
      </QueryState>
      {upload && (
        <Dialog title="Upload media" close={() => setUpload(false)}>
          <label className="media-upload-zone">
            <IconUpload size={30} />
            <strong>Choose website assets</strong>
            <span>Images, video or documents</span>
            <input
              aria-label="Choose files for upload preview"
              type="file"
              multiple
              onChange={(e) =>
                setFiles(
                  Array.from(e.target.files ?? []).map((file) => file.name),
                )
              }
            />
          </label>
          {files.map((file, index) => (
            <div className="reference-row" key={`${file}:${index}`}>
              {file}
              <small>Selected locally · not uploaded</small>
            </div>
          ))}
          <PhaseNote>
            Upload validation and storage will be connected in Phase 2. Selected
            files have not left your device.
          </PhaseNote>
          <button className="control-button primary" disabled>
            Upload selected files
          </button>
        </Dialog>
      )}
      {preview && selected && (
        <Dialog title="Asset preview" close={() => setPreview(false)}>
          <img
            className="media-full-preview"
            src={mediaPreviewUrl(selected)}
            alt={alt || filename(selected)}
          />
          <p>{filename(selected)}</p>
        </Dialog>
      )}
    </div>
  );
}
