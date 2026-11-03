import { Moon, Sun } from "lucide-react";
import { usePreferences } from "@/store/preferences";

export function ThemeToggle() {
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${next === "dark" ? "dark" : "daylight"} theme`}
      onClick={() => setTheme(next)}
      className="flex size-9 items-center justify-center rounded-[3px] border border-line bg-surface/70 text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
