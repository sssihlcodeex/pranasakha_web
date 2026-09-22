import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { LayoutDashboard, LogOut, UserCircle2, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser, logout, ROLE_HOME } from "@/lib/auth";

const navLinks = [
  { label: "Why Us", href: "#why" },
  { label: "Institutions", href: "#institutions" },
  { label: "How it Works", href: "#how-it-works" },
];

function initials(name) {
  return String(name || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase() || "U";
}

function DashboardLink({ onClick }) {
  const user = getCurrentUser();
  const target = ROLE_HOME[user?.role] || "/dashboard/doctor";
  return (
    <Link
      to={target}
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-variant"
    >
      <LayoutDashboard className="h-4 w-4" />
      Dashboard
    </Link>
  );
}

export function NavBar({ overlay = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(!overlay);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getCurrentUser());
    const sync = () => setUser(getCurrentUser());
    window.addEventListener("storage", sync);
    window.addEventListener("pranasakha-auth-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pranasakha-auth-changed", sync);
    };
  }, []);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const solid = !overlay || scrolled;
  const photo = user?.profile_picture;
  const dashboardPath = ROLE_HOME[user?.role] || "/dashboard/doctor";

  function signOut() {
    logout();
    setUser(null);
    setMenuOpen(false);
    window.dispatchEvent(new Event("pranasakha-auth-changed"));
    window.location.href = "/";
  }

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={[overlay ? "fixed" : "sticky", "top-0 inset-x-0 z-50 border-b transition-colors duration-300", solid ? "border-outline/30 bg-surface/90 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.02)]" : "border-transparent bg-gradient-to-b from-black/45 via-black/10 to-transparent"].join(" ")}
    >
      <nav className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-2.5 sm:flex sm:justify-between sm:px-5 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <img src="/brand/logo-mark.svg" alt="PRANASAKHA" className="h-9 w-9 shrink-0 rounded-[10px] shadow-sm sm:h-10 sm:w-10" />
          <span className={["truncate text-lg font-extrabold tracking-tight transition-colors duration-300 sm:text-xl", solid ? "text-primary" : "text-white"].join(" ")}>PRANASAKHA</span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <a href={link.href} className={["rounded-full px-4 py-2 text-title-medium transition-colors duration-200", solid ? "text-on-surface-variant hover:bg-surface-variant hover:text-primary" : "text-white/90 hover:bg-white/15 hover:text-white"].join(" ")}>{link.label}</a>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          <div className={solid ? "" : "[&_button]:text-white [&_button]:hover:bg-white/15"}><ThemeToggle /></div>

          {user?.id ? (
            <div className="relative hidden sm:block">
              <button
                type="button"
                aria-label="Profile menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-full border border-outline/40 bg-surface/90 px-2.5 py-1.5 shadow-sm"
              >
                <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-primary-container text-xs font-extrabold text-on-primary-container">
                  {photo ? <img src={photo} alt="Profile" className="h-full w-full object-cover" /> : initials(user.full_name)}
                </span>
                <span className="max-w-28 truncate text-xs font-bold text-foreground">{user.full_name || "My profile"}</span>
              </button>
              {menuOpen ? (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="m3-card-elevated absolute right-0 top-12 w-52 overflow-hidden p-2">
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-variant">MY Profile</Link>
                  <Link to={dashboardPath} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-variant"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
                  <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-on-surface hover:bg-surface-variant"><LogOut className="h-4 w-4" />Sign out</button>
                </motion.div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/signup" className="m3-btn-saffron !py-2.5 !text-sm">Sign Up</Link>
              <Link to="/signin" className={["m3-btn-outlined !py-2.5 !text-sm transition-colors duration-300", solid ? "" : "!border-white !text-white hover:!bg-white/15"].join(" ")}>Sign In</Link>
            </div>
          )}

          <div className="relative sm:hidden">
            <button type="button" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className={["inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full transition-colors duration-300", solid ? "bg-primary-container text-on-primary-container" : "bg-white/15 text-white"].join(" ")}>
              {user?.profile_picture && !menuOpen ? <img src={user.profile_picture} alt="Profile" className="h-full w-full object-cover" /> : menuOpen ? <X className="h-5 w-5" /> : <UserCircle2 className="h-5 w-5" />}
            </button>
            {menuOpen ? (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="m3-card-elevated absolute right-0 top-12 w-52 overflow-hidden p-2">
                {user?.id ? (
                  <>
                    <Link to="/profile" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-variant">MY Profile</Link>
                    <DashboardLink onClick={() => setMenuOpen(false)} />
                    <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-on-surface hover:bg-surface-variant"><LogOut className="h-4 w-4" />Sign out</button>
                  </>
                ) : (
                  <>
                    <Link to="/signup" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-variant">Sign Up</Link>
                    <Link to="/signin" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-variant">Sign In</Link>
                  </>
                )}
              </motion.div>
            ) : null}
          </div>
        </div>
      </nav>
    </motion.header>
  );
}
