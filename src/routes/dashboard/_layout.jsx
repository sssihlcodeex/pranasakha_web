import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/site/NavBar";
import { getCurrentUser, ROLE_HOME } from "@/lib/auth";

const MODERN_DASHBOARD_ROUTES = new Set(["/dashboard/doctor", "/dashboard/directorate", "/dashboard/hod"]);

export const Route = createFileRoute("/dashboard/_layout")({ component: DashboardLayout });

function DashboardLayout() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.navigate({ to: "/signin" }); return; }
    const ownPath = ROLE_HOME[user.role];
    const onOwnPage = ownPath && pathname.startsWith(ownPath);
    if (user.role !== "admin" && !onOwnPage) { router.navigate({ to: ownPath ?? "/signin" }); return; }
    setChecked(true);
  }, [pathname, router]);
  if (!checked) return null;
  const modern = MODERN_DASHBOARD_ROUTES.has(pathname);
  return <div className={modern ? "min-h-screen" : "min-h-screen bg-surface text-surface"}>{!modern && <NavBar />}<Outlet /></div>;
}
