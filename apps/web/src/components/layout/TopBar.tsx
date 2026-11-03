import { Link } from "react-router-dom";
import { ArrowLeft, Settings2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/cn";

export function TopBar({
  backTo,
  backLabel = "Back",
  right,
  className,
}: {
  backTo?: string;
  backLabel?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("safe-top relative z-20 px-4 py-3 sm:px-6", className)}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {backTo ? (
            <Link
              to={backTo}
              className="flex h-10 items-center gap-2 rounded-[3px] border border-line bg-surface/70 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>
          ) : null}
          <Link to="/" aria-label="Manhunt home" className="min-w-0">
            <Logo compact={Boolean(backTo)} />
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          <ThemeToggle />
          <Link
            to="/settings"
            aria-label="Settings"
            className="flex size-9 items-center justify-center rounded-[3px] border border-line bg-surface/70 text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Settings2 className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
