import { QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Toaster } from "../components/ui/sonner";
import "./__root.css";
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="max-w-md text-center rounded-3xl bg-white/70 px-10 py-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md border border-white/50 root-fade-in-up-card"
      >
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-blue-500">
          <svg
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-7xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
          404
        </h1>
        <h2 className="mt-4 text-2xl font-semibold text-slate-800">
          Page not found
        </h2>
        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Let's get
          you back to the right place.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-md shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 active:translate-y-0"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="max-w-md text-center rounded-3xl bg-white/70 px-10 py-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md border border-white/50 root-fade-in-up-card"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
          <svg
            className="h-10 w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          This page didn't load
        </h1>
        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 active:translate-y-0"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border-2 border-slate-200 bg-white/50 px-6 py-2.5 text-sm font-medium text-slate-700 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:translate-y-0"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
export const Route = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PRANASAKHA — Friend of Life" },
      {
        name: "description",
        content:
          "Volunteer doctor onboarding for Sri Sathya Sai Medical Institutions.",
      },
      { name: "author", content: "PRANASAKHA" },
      { property: "og:title", content: "PRANASAKHA — Friend of Life" },
      {
        property: "og:description",
        content:
          "Volunteer doctor onboarding for Sri Sathya Sai Medical Institutions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/brand/logo-mark.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/brand/logo-mark.svg" },
      { rel: "mask-icon", href: "/brand/logo-mark.svg", color: "#1e3a8a" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
function RootShell({ children }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      {/* Global Animated Background Container */}
      <div className="relative min-h-screen w-full bg-slate-50 font-sans overflow-hidden selection:bg-blue-200">
        {/* Soft, floating medical-themed blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-[10%] -left-[5%] h-[40vh] w-[40vw] rounded-full bg-blue-300/20 blur-[120px] root-blob-1" />
          <div className="absolute top-[20%] -right-[10%] h-[50vh] w-[40vw] rounded-full bg-teal-300/15 blur-[120px] root-blob-2" />
          <div className="absolute -bottom-[10%] left-[15%] h-[40vh] w-[50vw] rounded-full bg-indigo-300/15 blur-[120px] root-blob-3" />
        </div>

        {/* Main Content Area */}
        <div
          className="relative z-10 flex min-h-screen flex-col w-full root-fade-in-up-main"
        >
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </div>
      </div>

      <Toaster />
    </QueryClientProvider>
  );
}
