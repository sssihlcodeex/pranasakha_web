import { Bell, ChevronRight, Home, LogOut, Menu, Search, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { logout } from "@/lib/auth";
import { apiGetNotifications, apiMarkNotificationRead } from "@/lib/api";
import "./DashboardTopBar.css";

function initials(name = "User") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "U"
  );
}


export function DashboardTopBar({
  user,
  onOpenNav,
  onToggleSidebar,
  sidebarCollapsed = false,
  mobileNavOpen = false,
  currentLabel = "Overview",
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search this workspace…",
}) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const unread = notifications.filter((item) => !item.read_at).length;
  const name = user?.full_name || "Account";

  useEffect(() => {
    apiGetNotifications().then(setNotifications).catch(() => setNotifications([]));
  }, [user?.id]);

  useEffect(() => {
    function handleOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setNotificationsOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    function handleKey(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector(".dashboard-search input")?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function handleLogout() {
    logout();
    router.navigate({ to: "/signin" });
  }

  async function readNotification(item) {
    if (!item.read_at) {
      try {
        const updated = await apiMarkNotificationRead(item.id);
        setNotifications((rows) => rows.map((n) => (n.id === item.id ? updated : n)));
      } catch {
        // Keep the notification panel usable if marking read fails.
      }
    }
    if (item.action_url?.startsWith("/dashboard/")) {
      const [path, hash] = item.action_url.split("#");
      setNotificationsOpen(false);
      router.navigate({ to: path, hash: hash || undefined });
    }
  }

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar__context">
        <button
          type="button"
          className={`dashboard-icon-button dashboard-topbar__nav-toggle ${sidebarCollapsed ? "is-visible" : ""}`}
          onClick={() => {
            if (mobileNavOpen) onOpenNav?.();
            else if (sidebarCollapsed) onToggleSidebar?.();
            else onOpenNav?.();
          }}
          aria-label={mobileNavOpen ? "Close navigation" : sidebarCollapsed ? "Expand navigation" : "Open navigation"}
          title={mobileNavOpen ? "Close navigation" : sidebarCollapsed ? "Expand navigation" : "Open navigation"}
        >
          <ChevronRight className="dashboard-topbar__nav-icon dashboard-topbar__nav-icon--desktop" size={18} strokeWidth={2.2} />
          <Menu className="dashboard-topbar__nav-icon dashboard-topbar__nav-icon--mobile" size={20} />
        </button>
        <a className="dashboard-topbar__mobile-brand" href="/dashboard" aria-label="PRANASAKHA home" onClick={(event) => { event.preventDefault(); router.navigate({ to: "/dashboard" }); }}>
          <img className="dashboard-sidebar__brand-logo" src="/brand/logo-mark.svg" alt="PRANASAKHA" />
          <strong>PRANASAKHA</strong>
        </a>
        <div className="dashboard-topbar__context-copy">
          <div className="dashboard-topbar__breadcrumb" aria-label="Breadcrumb">
            <Home size={14} strokeWidth={2.1} />
            <strong>Home</strong>
            <span className="dashboard-topbar__breadcrumb-separator">/</span>
            <strong>{currentLabel}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-topbar__search-wrap">
        <label className="dashboard-search">
          <Search size={18} />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search dashboard"
          />
          <kbd>Ctrl K</kbd>
        </label>
      </div>

      <div className="dashboard-topbar__actions">
        <div className="dashboard-topbar__popover-anchor" ref={notificationRef}>
          <button
            type="button"
            className={`dashboard-icon-button dashboard-topbar__icon ${notificationsOpen ? "is-open" : ""}`}
            onClick={() => {
              setNotificationsOpen((value) => !value);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell size={19} />
            {unread > 0 ? <span className="dashboard-topbar__notification-badge">{unread > 9 ? "9+" : unread}</span> : null}
          </button>

          {notificationsOpen ? (
            <div className="dashboard-popover dashboard-notifications">
              <div className="dashboard-popover__head">
                <div>
                  <strong>Notifications</strong>
                  <span>{unread ? `${unread} unread` : "You're all caught up"}</span>
                </div>
              </div>
              <div className="dashboard-notifications__list">
                {notifications.length ? (
                  notifications.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`dashboard-notification ${item.read_at ? "is-read" : ""}`}
                      onClick={() => readNotification(item)}
                    >
                      <span className="dashboard-notification__dot" />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.message}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="dashboard-notifications__empty">No notifications yet.</div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="dashboard-topbar__popover-anchor" ref={profileRef}>
          <button
            type="button"
            className="dashboard-profile"
            onClick={() => {
              setProfileOpen((value) => !value);
              setNotificationsOpen(false);
            }}
            aria-expanded={profileOpen}
          >
            <span className="dashboard-profile__avatar" aria-hidden="true">{user?.profile_picture ? <img src={user.profile_picture} alt="" className="dashboard-profile__avatar-image" /> : <UserRound size={18} />}</span>
          </button>

          {profileOpen ? (
            <div className="dashboard-popover dashboard-profile-menu">
              <div className="dashboard-profile-menu__head">
                <span className="dashboard-profile__avatar dashboard-profile__avatar--large">{user?.profile_picture ? <img src={user.profile_picture} alt="" className="dashboard-profile__avatar-image" /> : initials(name)}</span>
                <div>
                  <strong>{name}</strong>
                  <small>{user?.email}</small>
                </div>
              </div>
              {user?.role === "doctor" ? (
                <button type="button" onClick={() => { window.location.href = "/profile"; }}>
                  <UserRound size={17} /> My profile
                </button>
              ) : null}
              <button type="button" className="dashboard-profile-menu__danger" onClick={handleLogout}>
                <LogOut size={17} /> Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
