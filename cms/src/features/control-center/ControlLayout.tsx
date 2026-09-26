import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  IconDashboard,
  IconFileText,
  IconPhoto,
  IconSitemap,
  IconDatabase,
  IconSearch,
  IconSettings,
  IconHistory,
  IconMenu2,
  IconChevronLeft,
  IconExternalLink,
  IconLogout,
} from "@tabler/icons-react";
import { useAuth } from "../auth/AuthProvider";
import { controlApi, publicSiteBase, type ControlPage } from "./api";
import "./control.css";
import { Dialog, SearchField } from "./primitives";
import { mediaApi } from "../media/api";
import { useGlobal, canonicalFields } from "./workspace-data";

const groups = [
  {
    label: "Overview",
    links: [{ label: "Overview", path: "/control", icon: IconDashboard }],
  },
  {
    label: "Website",
    links: [
      { label: "Pages", path: "/control/pages", icon: IconFileText },
      { label: "Navigation", path: "/control/navigation", icon: IconSitemap },
    ],
  },
  {
    label: "Content",
    links: [
      {
        label: "Global data",
        path: "/control/global-data",
        icon: IconDatabase,
      },
    ],
  },
  {
    label: "Assets",
    links: [
      { label: "Media library", path: "/control/media", icon: IconPhoto },
    ],
  },
  {
    label: "System",
    links: [
      { label: "Version history", path: "/control/history", icon: IconHistory },
      { label: "Settings", path: "/control/settings", icon: IconSettings },
    ],
  },
];

export function ControlLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("lake-control-collapsed") === "true",
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const global = useGlobal(searchOpen);
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState<ControlPage[]>([]);
  const [assets, setAssets] = useState<
    Array<{ label: string; path: string; icon: typeof IconPhoto }>
  >([]);
  const [searchStatus, setSearchStatus] = useState("");
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const sidebar = document.querySelector<HTMLElement>(".control-sidebar");
    const body = document.querySelector<HTMLElement>(".control-body");
    body?.setAttribute("inert", "");
    const controls = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled)",
        ) ?? [],
      ).filter((element) => element.getClientRects().length);
    controls()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = controls(),
        first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    sidebar?.addEventListener("keydown", trap);
    return () => {
      body?.removeAttribute("inert");
      sidebar?.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [mobileOpen]);
  const context =
    groups
      .flatMap((group) => group.links)
      .find(
        (item) =>
          item.path !== "/control" && location.pathname.startsWith(item.path),
      )?.label || "Overview";

  useEffect(() => {
    localStorage.setItem("lake-control-collapsed", String(collapsed));
  }, [collapsed]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!searchOpen) return;
    setSearchStatus("Loading content search…");
    void Promise.allSettled([controlApi.pages(), mediaApi.list()]).then(
      ([catalog, media]) => {
        if (catalog.status === "fulfilled") setPages(catalog.value.pages);
        if (media.status === "fulfilled")
          setAssets(
            media.value.media.map((row) => ({
              label: row.altText || row.url.split("/").pop() || row.url,
              path: `/control/media?asset=${encodeURIComponent(row.id)}`,
              icon: IconPhoto,
            })),
          );
        setSearchStatus(
          catalog.status === "rejected" || media.status === "rejected"
            ? "Some content is unavailable. Workspace commands are still available."
            : "",
        );
      },
    );
  }, [searchOpen]);
  const results = [
    ...groups
      .flatMap((group) => group.links)
      .map((item) => ({ ...item, category: "Workspace" })),
    ...pages.map((page) => ({
      label: page.label,
      path: `/control/pages/${page.key}`,
      icon: IconFileText,
      category: "Page",
    })),
    ...canonicalFields(global.data?.currentDraftRevision?.data).map(
      (field) => ({
        label: field.label,
        path: `/control/global-data?field=${encodeURIComponent(field.key)}`,
        icon: IconDatabase,
        category: "Global value",
      }),
    ),
    ...assets.map((item) => ({ ...item, category: "Media" })),
  ]
    .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 18);

  return (
    <div className={`control-shell${collapsed ? " control-collapsed" : ""}`}>
      <a className="control-skip" href="#control-main">
        Skip to main content
      </a>
      {mobileOpen && (
        <button
          className="control-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`control-sidebar${mobileOpen ? " is-open" : ""}`}
        aria-label="Control center navigation"
      >
        <div className="control-brand">
          <span className="control-brand-drop">◈</span>
          {!collapsed && (
            <span>
              <strong>Lake</strong>
              <small>GROUP · CONTROL CENTER</small>
            </span>
          )}
        </div>
        <button
          className="control-search-trigger"
          aria-label="Search CMS"
          onClick={() => setSearchOpen(true)}
          title="Search CMS (Ctrl K)"
        >
          <IconSearch size={18} />
          {!collapsed && (
            <>
              <span>Search CMS</span>
              <kbd>Ctrl K</kbd>
            </>
          )}
        </button>
        <nav className="control-nav">
          {groups.map((group) => (
            <div className="control-nav-group" key={group.label}>
              {!collapsed && <p>{group.label}</p>}
              {group.links.map(({ label, path, icon: Icon }) => (
                <NavLink
                  aria-label={label}
                  key={path}
                  to={path}
                  end={path === "/control"}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `control-nav-link${isActive ? " is-active" : ""}`
                  }
                >
                  <Icon size={19} stroke={1.8} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="control-sidebar-footer">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="control-collapse"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconChevronLeft size={18} className={collapsed ? "flipped" : ""} />
            <span>{collapsed ? "" : "Collapse sidebar"}</span>
          </button>
          <div className="control-user">
            <span className="control-avatar">
              {(user?.name || user?.email || "IT").slice(0, 2).toUpperCase()}
            </span>
            {!collapsed && (
              <span>
                <strong>
                  {user?.name || user?.email || "IT administrator"}
                </strong>
                <small>Control center</small>
              </span>
            )}
            <button
              title="Sign out"
              aria-label="Sign out"
              onClick={() => void logout().then(() => navigate("/login"))}
            >
              <IconLogout size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="control-body">
        <header className="control-topbar">
          <button
            className="control-mobile-menu"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <IconMenu2 size={21} />
          </button>
          <div className="control-topbar-title">
            Lake Group <span>/</span> {context}
          </div>
          <div className="control-topbar-actions">
            <button
              onClick={() => setSearchOpen(true)}
              className="control-top-search"
            >
              <IconSearch size={16} /> Search <kbd>Ctrl K</kbd>
            </button>
            <a
              href={publicSiteBase}
              target="_blank"
              rel="noreferrer"
              className="control-button"
            >
              View website <IconExternalLink size={16} />
            </a>
            <Link to="/app" className="control-legacy-link">
              Previous CMS
            </Link>
          </div>
        </header>
        <main id="control-main" className="control-main">
          <Outlet />
        </main>
      </div>
      {searchOpen && (
        <Dialog title="Search CMS" close={() => setSearchOpen(false)}>
          <SearchField
            label="Search pages, values, media and workspaces"
            value={query}
            onChange={setQuery}
          />
          <div
            className="control-command-results"
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              const buttons = Array.from(
                  event.currentTarget.querySelectorAll("button"),
                ),
                index = buttons.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
              event.preventDefault();
              buttons[
                (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  buttons.length) %
                  buttons.length
              ]?.focus();
            }}
          >
            {results.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSearchOpen(false);
                  setQuery("");
                }}
              >
                <item.icon size={17} />
                <span>{item.label}</span>
                <small>{item.category}</small>
              </button>
            ))}
            {!results.length && (
              <p className="control-empty">No matching results.</p>
            )}
          </div>
          <p className="control-inspector-hint" role="status">
            {searchStatus ||
              "Use Tab or arrow keys to browse results. Enter to open. Escape to close."}
          </p>
        </Dialog>
      )}
    </div>
  );
}
