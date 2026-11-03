import { cn } from "@/lib/cn";

export function Logo({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex select-none items-center gap-3", className)}>
      <svg
        viewBox="0 0 44 44"
        aria-hidden="true"
        className="size-9 shrink-0 text-runner"
        fill="none"
      >
        <circle cx="22" cy="22" r="14" stroke="currentColor" strokeWidth="1.4" opacity="0.75" />
        <circle cx="22" cy="22" r="5" fill="currentColor" />
        <circle cx="22" cy="22" r="9" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
        <path
          d="M22 2v9M22 33v9M2 22h9M33 22h9"
          stroke="var(--hunter)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path d="M22 18v8M18 22h8" stroke="var(--canvas)" strokeWidth="1.2" />
        <rect
          x="1.5"
          y="1.5"
          width="41"
          height="41"
          stroke="currentColor"
          strokeOpacity="0.12"
        />
      </svg>
      <div className="min-w-0">
        <p className="display text-[22px] font-bold leading-none text-ink">MANHUNT</p>
        {!compact ? (
          <p className="mt-1 hidden font-mono text-[8px] uppercase tracking-[0.28em] text-faint sm:block">
            Real-world pursuit
          </p>
        ) : null}
      </div>
    </div>
  );
}
