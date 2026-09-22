import { Link } from "@tanstack/react-router";
export function DashboardShell({ role }) {
  return (
    <div className="mx-auto w-full max-w-4xl rounded-[2rem] border border-border bg-background/90 p-8 shadow-xl shadow-black/5">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/brand/logo-mark.svg" alt="PRANASAKHA" className="h-9 w-9 rounded-xl" />
            <p className="text-sm font-extrabold tracking-[0.14em] text-primary">PRANASAKHA</p>
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">
            {role} Dashboard
          </h1>
        </div>
        <Link
          to="/"
          className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-input bg-surface px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-variant"
        >
          Sign Out
        </Link>
      </div>

      <div className="mt-10 rounded-3xl bg-surface p-6 text-sm text-muted-foreground shadow-sm shadow-black/5">
        <p>
          This is a placeholder dashboard for the {role} role. Real
          authentication and role-specific data will be wired in later.
        </p>
      </div>
    </div>
  );
}
