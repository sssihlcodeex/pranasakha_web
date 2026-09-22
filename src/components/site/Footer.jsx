import { ThemeToggle } from "@/components/theme-toggle";
const institutions = [
  "SSSIHMS, Prasanthigram",
  "SSSIHMS, Whitefield",
  "SSSGH, Prasanthi Nilayam",
  "SSSGH, Whitefield",
  "SSSMH — Mobile Hospital",
];
export function Footer() {
  return (
    <footer className="border-t border-outline/30 bg-surface-variant/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-extrabold tracking-tight text-primary">
              PRANASAKHA
            </span>
            <span
              className="h-1.5 w-1.5 rounded-full bg-secondary"
              aria-hidden="true"
            />
          </div>
          <p className="mt-3 max-w-sm text-body-large text-on-surface-variant">
            Connecting volunteer doctors worldwide with Sri Sathya Sai Medical
            Institutions — Love All, Serve All.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <ThemeToggle />
            <span className="text-label-medium text-on-surface-variant">
              Toggle theme
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-label-medium uppercase text-on-surface-variant">
            Institutions
          </h2>
          <ul className="mt-4 space-y-2">
            {institutions.map((name) => (
              <li key={name}>
                <a
                  href="#institutions"
                  className="text-body-large text-on-surface hover:text-primary"
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-label-medium uppercase text-on-surface-variant">
            Contact
          </h2>
          <ul className="mt-4 space-y-2 text-body-large text-on-surface">
            <li>Prasanthi Nilayam, Andhra Pradesh, India</li>
            <li>seva@pranasakha.org</li>
          </ul>
          <ul className="mt-6 space-y-2">
            <li>
              <a
                href="#"
                className="text-body-large text-on-surface-variant hover:text-primary"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-body-large text-on-surface-variant hover:text-primary"
              >
                Terms of Service
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-outline/30 px-5 py-6 text-center text-label-medium text-on-surface-variant lg:px-8">
        © {new Date().getFullYear()} PRANASAKHA · Sri Sathya Sai Central Trust
      </div>
    </footer>
  );
}
