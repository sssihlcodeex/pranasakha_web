import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
export function useTheme() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const stored = window.localStorage.getItem("pranasakha-theme");
    const initial =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);
  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem("pranasakha-theme", next);
      return next;
    });
  };
  return { theme, toggle };
}
export function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline text-on-surface-variant transition-colors hover:bg-surface-variant ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="h-[18px] w-[18px]" />
      ) : (
        <Moon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
