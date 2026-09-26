import { useEffect, useState } from "react";
import {
  IconChevronDown,
  IconChevronRight,
  IconGripVertical,
  IconPlus,
  IconArrowUp,
  IconArrowDown,
} from "@tabler/icons-react";
import { Heading, PhaseNote, QueryState, EmptyState } from "./primitives";
import { useGlobal, findNav, moveNav, type NavItem } from "./workspace-data";

// Existing public menu template. Used only as a local preview when no saved menu exists.
const menuTemplate: NavItem[] = [
  ["Home", "index.html"],
  ["About Us", "about.html"],
  ["Business Verticals", ""],
  ["Leadership", "leadership.html"],
  ["Corporate", "history.html"],
  ["Careers", "careers.html"],
  ["Contact Us", "contact.html"],
].map(([label, destination], index) => ({
  id: `template-${index}`,
  label,
  destination,
  type: destination ? "internal" : "parent",
  visible: true,
  desktop: true,
  mobile: true,
  children: [],
}));

export function NavigationWorkspace() {
  const query = useGlobal();
  const [items, setItems] = useState<NavItem[]>([]),
    [selected, setSelected] = useState("");
  const [preview, setPreview] = useState<"desktop" | "mobile">("desktop");
  useEffect(() => {
    const nav =
      query.data?.currentDraftRevision?.data.navigation ?? menuTemplate;
    setItems(structuredClone(nav));
    setSelected(nav[0]?.id ?? "");
  }, [query.data]);
  const current = findNav(items, selected);
  const update = (change: Partial<NavItem>) => {
    const next = structuredClone(items),
      item = findNav(next, selected);
    if (item) Object.assign(item, change);
    setItems(next);
  };
  const add = (child = false) => {
    const next = structuredClone(items),
      item: NavItem = {
        id: crypto.randomUUID(),
        label: "New menu item",
        destination: "",
        type: "parent",
        visible: true,
        desktop: true,
        mobile: true,
        children: [],
      };
    (child ? (findNav(next, selected)?.children ?? next) : next).push(item);
    setItems(next);
    setSelected(item.id);
  };
  const move = (source: string, target: string) => {
    const next = moveNav(items, source, target);
    if (next) setItems(next);
  };
  const remove = (list: NavItem[]): NavItem[] =>
    list
      .filter((item) => item.id !== selected)
      .map((item) => ({ ...item, children: remove(item.children) }));
  return (
    <div className="control-page">
      <Heading
        eyebrow="Website / Structure"
        title="Navigation"
        body="Arrange menus and check how visitors move through the website."
        actions={
          <button className="control-button" onClick={() => add()}>
            <IconPlus size={16} />
            Add item
          </button>
        }
      />
      <PhaseNote />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      >
        <div className="workspace-split">
          <section className="control-panel nav-builder">
            <div className="workspace-section-heading">
              <h2>Main menu</h2>
              <span>
                {query.data?.currentDraftRevision?.data.navigation
                  ? "Local editing"
                  : "Website menu template · local"}
              </span>
            </div>
            {items.length ? (
              items.map((item) => (
                <NavRow
                  key={item.id}
                  item={item}
                  selected={selected}
                  select={setSelected}
                  move={move}
                  siblings={items}
                />
              ))
            ) : (
              <EmptyState
                title="No menu items"
                body="Add an item to explore the navigation workspace."
              />
            )}
          </section>
          <aside className="control-panel workspace-editor">
            <h2>Menu item</h2>
            {current ? (
              <>
                <label>
                  Label
                  <input
                    value={current.label}
                    onChange={(e) => update({ label: e.target.value })}
                  />
                </label>
                <label>
                  Link type
                  <select
                    value={current.type}
                    onChange={(e) =>
                      update({ type: e.target.value as NavItem["type"] })
                    }
                  >
                    <option value="internal">Internal page</option>
                    <option value="external">External URL</option>
                    <option value="parent">Parent / no link</option>
                  </select>
                </label>
                {current.type !== "parent" && (
                  <label>
                    Destination
                    <input
                      placeholder={
                        current.type === "external" ? "https://…" : "about.html"
                      }
                      value={current.destination}
                      onChange={(e) => update({ destination: e.target.value })}
                    />
                  </label>
                )}
                <fieldset>
                  <legend>Visibility</legend>
                  {(["visible", "desktop", "mobile"] as const).map((field) => (
                    <label className="control-check" key={field}>
                      <input
                        type="checkbox"
                        checked={current[field]}
                        onChange={(e) => update({ [field]: e.target.checked })}
                      />
                      {field === "visible"
                        ? "Show menu item"
                        : `Show on ${field}`}
                    </label>
                  ))}
                </fieldset>
                <div className="workspace-actions">
                  <button onClick={() => add(true)}>Add child</button>
                  <button
                    className="danger"
                    onClick={() => {
                      setItems(remove(items));
                      setSelected("");
                    }}
                  >
                    Delete item
                  </button>
                </div>
                <button
                  className="control-button primary"
                  disabled
                  title="Navigation persistence is scheduled for Phase 2"
                >
                  Publish menu
                </button>
              </>
            ) : (
              <EmptyState
                title="Select a menu item"
                body="Its destination and visibility appear here."
              />
            )}
          </aside>
        </div>
        <section className="control-panel nav-preview">
          <header>
            <div>
              <h2>Menu preview</h2>
              <p>Only items visible on the selected device appear.</p>
            </div>
            <div className="control-viewport">
              {(["desktop", "mobile"] as const).map((mode) => (
                <button
                  key={mode}
                  aria-pressed={preview === mode}
                  onClick={() => setPreview(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </header>
          <nav className={preview} aria-label={`${preview} menu preview`}>
            {items
              .filter((item) => item.visible && item[preview])
              .map((item) => (
                <PreviewItem key={item.id} item={item} mode={preview} />
              ))}
          </nav>
        </section>
      </QueryState>
    </div>
  );
}
function PreviewItem({
  item,
  mode,
}: {
  item: NavItem;
  mode: "desktop" | "mobile";
}) {
  return (
    <div>
      <strong>{item.label}</strong>
      {item.children
        .filter((child) => child.visible && child[mode])
        .map((child) => (
          <span key={child.id}>
            <PreviewItem item={child} mode={mode} />
          </span>
        ))}
    </div>
  );
}
function NavRow({
  item,
  selected,
  select,
  move,
  siblings,
}: {
  item: NavItem;
  selected: string;
  select: (id: string) => void;
  move: (source: string, target: string) => void;
  siblings: NavItem[];
}) {
  const [open, setOpen] = useState(true),
    index = siblings.findIndex((row) => row.id === item.id);
  return (
    <div>
      <div
        className={`navigation-row${selected === item.id ? " is-selected" : ""}`}
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/nav-id", item.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          move(e.dataTransfer.getData("text/nav-id"), item.id);
        }}
      >
        <IconGripVertical size={15} aria-hidden="true" />
        <button
          aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}
          aria-expanded={open}
          disabled={!item.children.length}
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <IconChevronDown size={14} />
          ) : (
            <IconChevronRight size={14} />
          )}
        </button>
        <button className="navigation-name" onClick={() => select(item.id)}>
          <strong>{item.label}</strong>
          <small>
            {item.visible ? item.destination || "Parent menu" : "Hidden"}
          </small>
        </button>
        <button
          aria-label={`Move ${item.label} up`}
          disabled={index === 0}
          onClick={() => move(item.id, siblings[index - 1].id)}
        >
          <IconArrowUp size={14} />
        </button>
        <button
          aria-label={`Move ${item.label} down`}
          disabled={index === siblings.length - 1}
          onClick={() => move(item.id, siblings[index + 1].id)}
        >
          <IconArrowDown size={14} />
        </button>
      </div>
      {open && (
        <div className="navigation-children">
          {item.children.map((child) => (
            <NavRow
              key={child.id}
              item={child}
              selected={selected}
              select={select}
              move={move}
              siblings={item.children}
            />
          ))}
        </div>
      )}
    </div>
  );
}
