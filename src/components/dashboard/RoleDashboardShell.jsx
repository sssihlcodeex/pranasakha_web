import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Hotel,
  LayoutDashboard,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  UsersRound,
  UserPlus,
  UserRound,
  Shield,
  SlidersHorizontal,
  ArrowLeft,
  X,
} from "lucide-react";
import { DashboardTopBar } from "./DashboardTopBar";
import { getCurrentUser } from "@/lib/auth";
import "./RoleDashboardShell.css";

const ICONS = {
  overview: LayoutDashboard,
  people: UsersRound,
  accounts: UserRound,
  controls: SlidersHorizontal,
  provision: UserPlus,
  session: Shield,
  applications: ClipboardCheck,
  specialists: UsersRound,
  roster: CalendarDays,
  "roster-schedule": CalendarDays,
  "application-status": ClipboardCheck,
  "profile-documents": FileText,
  "visit-essentials": Hotel,
  "medical-pass": ShieldCheck,
  analytics: ListChecks,
  "weekly-roster": CalendarDays,
  "incoming-specialists": UsersRound,
  "publish-roster": CalendarDays,
  "verification-queue": ClipboardCheck,
  "capacity-analytics": ListChecks,
  "hospital-network": Building2,
  notifications: Bell,
  profile: Stethoscope,
};

function NavIcon({ id }) {
  const Icon = ICONS[id] ?? LayoutDashboard;
  return <Icon size={19} strokeWidth={2} />;
}

export function RoleDashboardShell({
  role,
  title,
  description,
  navItems = [],
  children,
  user: providedUser,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("pranasakha_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [hash, setHash] = useState("");
  const user = providedUser ?? getCurrentUser();

  useEffect(() => {
    const sync = () => setHash(window.location.hash.replace("#", ""));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const activeHash = navItems.some((item) => item.id === hash) ? hash : "overview";
  const activeItem = useMemo(
    () => navItems.find((item) => item.id === activeHash) || navItems.find((item) => item.id === "overview"),
    [activeHash, navItems],
  );
  const activeLabel = activeItem?.label || "Overview";
  const activeDescription = activeItem?.description || description;

  function navigate(href) {
    if (href?.startsWith("#")) {
      const target = href.slice(1);
      if (window.location.hash !== href) {
        window.location.hash = target;
      } else {
        setHash(target);
      }
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    }
    setMobileOpen(false);
  }

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        localStorage.setItem("pranasakha_sidebar_collapsed", next ? "1" : "0");
      } catch {
        // Keep the UI usable when storage is unavailable.
      }
      return next;
    });
  }

  const initials = (user?.full_name || role || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const sections = document.querySelectorAll(".dashboard-content section.dashboard-view");
    sections.forEach((section) => {
      const isActive = section.id === activeHash;
      section.hidden = !isActive;
      section.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [activeHash]);

  const Sidebar = ({ mobile = false }) => (
    <aside className={`dashboard-sidebar ${mobile ? "dashboard-sidebar--mobile" : ""} ${!mobile && sidebarCollapsed ? "dashboard-sidebar--collapsed" : ""}`}>
      <div className="dashboard-sidebar__brand">
        <a className="dashboard-sidebar__mark" href="/dashboard" aria-label="PRANASAKHA home" onClick={(event) => { event.preventDefault(); window.location.href = "/dashboard"; }}>
          <img className="dashboard-sidebar__brand-logo" src="/brand/logo-mark.svg" alt="PRANASAKHA" />
        </a>
        <div className="dashboard-sidebar__brand-copy">
          <strong>PRANASAKHA</strong>
          <span>Healthcare Seva network</span>
        </div>
        {!mobile && !sidebarCollapsed ? (
          <button
            type="button"
            className="dashboard-icon-button dashboard-sidebar__collapse"
            onClick={toggleSidebar}
            aria-label="Collapse navigation"
            title="Collapse navigation"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>
        ) : null}
        {mobile ? (
          <button
            type="button"
            className="dashboard-icon-button dashboard-sidebar__close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        ) : null}
      </div>

      <div className="dashboard-sidebar__section-label">Workspace</div>
      <nav className="dashboard-sidebar__nav" aria-label="Dashboard navigation">
        {navItems.map((item) => {
          const target = (item.href || `#${item.id}`).replace("#", "");
          const active = activeHash === target;
          return (
            <a
              key={item.id}
              href={item.href || `#${item.id}`}
              className={`dashboard-sidebar__link ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                if (item.href?.startsWith("#") || !item.isRoute) {
                  event.preventDefault();
                  navigate(item.href || `#${item.id}`);
                }
              }}
            >
              <span className="dashboard-sidebar__link-icon">
                <NavIcon id={item.id} />
              </span>
              <span className="dashboard-sidebar__link-label">{item.label}</span>
              {item.badge ? <span className="dashboard-sidebar__link-badge">{item.badge}</span> : null}
            </a>
          );
        })}
      </nav>

      <div className="dashboard-sidebar__account">
        <a href="/profile" className="dashboard-sidebar__account-avatar" aria-label="Open profile">{user?.profile_picture ? <img src={user.profile_picture} alt="" className="dashboard-sidebar__account-avatar-image" /> : initials}</a>
        <div>
          <strong>{user?.full_name || role}</strong>
          <span>{user?.department || role}</span>
        </div>
      </div>
    </aside>
  );

  return (
    <div className={`dashboard-app ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}>
      <Sidebar />
      {mobileOpen ? (
        <>
          <button
            className="dashboard-sidebar__scrim"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar mobile />
        </>
      ) : null}

      <div className="dashboard-main">
        <DashboardTopBar
          user={user}
          title={title}
          onOpenNav={() => setMobileOpen((open) => !open)}
          onToggleSidebar={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
          mobileNavOpen={mobileOpen}
          currentLabel={activeLabel}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />

        <main className="dashboard-content">
          <section className="dashboard-page-heading" aria-labelledby="dashboard-page-title">
            <div className="dashboard-page-heading__back-row">
              <button
                type="button"
                className="dashboard-page-heading__back"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.location.href = "/dashboard";
                  }
                }}
                aria-label="Go back"
              >
                <ArrowLeft size={18} strokeWidth={2} />
                <span>Back</span>
              </button>
              <nav className="dashboard-page-heading__path" aria-label="Breadcrumb">
                <a href="/dashboard" aria-label="Home" onClick={(event) => { event.preventDefault(); window.location.href = "/dashboard"; }}>
                  <span className="dashboard-page-heading__home-icon" aria-hidden="true">⌂</span>
                  <span className="dashboard-page-heading__home-label">Home</span>
                </a>
                <ChevronRight className="dashboard-page-heading__path-separator" size={14} strokeWidth={1.8} aria-hidden="true" />
                <a href={`#${activeHash}`} aria-current="page" onClick={(event) => { event.preventDefault(); navigate(`#${activeHash}`); }}>
                  <strong>{activeLabel}</strong>
                </a>
              </nav>
            </div>
            <div className="dashboard-page-heading__copy">
              <h1 id="dashboard-page-title">{activeLabel}</h1>
              <p>{activeDescription}</p>
            </div>
          </section>

          {children}
        </main>
      </div>
    </div>
  );
}
