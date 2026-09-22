import { Link } from "@tanstack/react-router";
export function RoleDashboardShell({ role, title, description, navItems, children }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <div className="rounded-[2rem] border border-border bg-background/90 p-8 shadow-xl shadow-black/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5"><img src="/brand/logo-mark.svg" alt="PRANASAKHA" className="h-9 w-9 rounded-xl" /><p className="text-sm font-extrabold tracking-[0.14em] text-primary">PRANASAKHA</p></div>
            <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant">{description}</p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-3xl bg-surface px-4 py-3 shadow-sm shadow-black/5">
            <span className="rounded-full bg-secondary-container px-3 py-1 text-sm font-semibold text-secondary-foreground">{role}</span>
            <span className="text-sm text-on-surface-variant">Dashboard</span>
          </div>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <aside className="hidden xl:block">
          <div className="sticky top-8 space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-black/5">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Section menu</p>
              <p className="text-2xl font-semibold text-foreground">{role} tools</p>
            </div>
            <nav className="mt-6 space-y-2">
              {navItems.map((item) => (
                <div key={item.id}>
                  {item.isRoute ? (
                    <Link to={item.href} className="block rounded-3xl border border-outline/60 bg-surface px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary-container/10">{item.label}</Link>
                  ) : (
                    <a href={item.href} className="block rounded-3xl border border-outline/60 bg-surface px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary-container/10">{item.label}</a>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </aside>
        <div className="space-y-6">{children}</div>
      </div>
      <div className="sticky bottom-0 left-0 right-0 z-10 block rounded-t-[2rem] border-t border-border bg-background/95 p-4 backdrop-blur-xl xl:hidden">
        <div className="mx-auto flex max-w-5xl justify-between gap-2 overflow-x-auto px-2">
          {navItems.map((item) => item.isRoute ? <Link key={item.id} to={item.href} className="min-w-[9rem] rounded-3xl border border-outline/60 bg-surface px-4 py-3 text-center text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary-container/10">{item.label}</Link> : <a key={item.id} href={item.href} className="min-w-[9rem] rounded-3xl border border-outline/60 bg-surface px-4 py-3 text-center text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary-container/10">{item.label}</a>)}
        </div>
      </div>
    </div>
  );
}
