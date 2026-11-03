import { Link } from "react-router-dom";
import { ArrowLeft, Crosshair } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { buttonStyles } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar backTo="/" backLabel="Home" />
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <div className="relative flex size-56 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-line" />
          <span className="absolute inset-8 rounded-full border border-dashed border-line-strong" />
          <span className="absolute inset-16 rounded-full border border-line" />
          <span className="absolute inset-x-0 top-1/2 h-px bg-line" />
          <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
          <div className="relative flex size-16 items-center justify-center rounded-full border border-hunter/30 bg-hunter/10 text-hunter">
            <Crosshair className="size-7" />
          </div>
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-[2px] border border-hunter/40 bg-canvas px-2 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-hunter">
            Signal lost
          </span>
        </div>
        <p className="mt-10 font-mono text-[9px] uppercase tracking-[0.22em] text-faint">
          Error 404 / sector unknown
        </p>
        <h1 className="display mt-3 text-6xl font-semibold text-ink sm:text-8xl">Off the map.</h1>
        <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-muted">
          This route does not exist. The field is elsewhere.
        </p>
        <div className="mt-7 flex gap-2">
          <Link to="/" className={buttonStyles("primary", "lg")}>
            <ArrowLeft className="size-4" />
            Back to base
          </Link>
          <Link to="/create" className={buttonStyles("secondary", "lg")}>
            New operation
          </Link>
        </div>
      </main>
    </div>
  );
}
