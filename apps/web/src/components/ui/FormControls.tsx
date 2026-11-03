import type { CSSProperties, ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  compact,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-5", compact ? "py-2" : "py-3.5")}>
      <div className="min-w-0">
        <p className={cn("font-medium leading-snug text-ink", compact ? "text-[11px]" : "text-[13px]")}>
          {label}
        </p>
        {description ? (
          <p className={cn("mt-1 max-w-sm leading-relaxed text-muted", compact ? "text-[10px]" : "text-[11px]")}>
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 shrink-0 rounded-full border transition-colors duration-200",
          compact ? "h-5 w-9" : "h-6 w-11",
          checked
            ? "border-runner/50 bg-runner/20"
            : "border-line-strong bg-surface-3",
          disabled && "opacity-40",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 rounded-full transition-all duration-200",
            compact ? "size-3 -translate-y-1/2" : "size-3.5 -translate-y-1/2",
            checked
              ? compact
                ? "left-[19px] bg-runner shadow-[0_0_8px_color-mix(in_srgb,var(--runner)_60%,transparent)]"
                : "left-[23px] bg-runner shadow-[0_0_10px_color-mix(in_srgb,var(--runner)_60%,transparent)]"
              : compact
              ? "left-[4px] bg-faint"
              : "left-[5px] bg-faint",
          )}
        />
      </button>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  hint,
  minLabel,
  maxLabel,
  accent = "var(--runner)",
  id,
  compact,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  display: string;
  hint?: string;
  minLabel?: string;
  maxLabel?: string;
  accent?: string;
  id?: string;
  compact?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <label htmlFor={inputId} className={cn("font-medium text-ink", compact ? "text-[11px]" : "text-[13px]")}>
            {label}
          </label>
          {hint ? (
            <p className={cn("mt-1 leading-relaxed text-muted", compact ? "text-[10px]" : "text-[11px]")}>
              {hint}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-[2px] border border-line-strong/70 bg-surface-2 px-2.5 font-mono font-medium tabular text-ink",
            compact ? "py-1 text-[10px]" : "py-1.5 text-[11px]",
          )}
          aria-live="polite"
        >
          {display}
        </span>
      </div>
      <input
        id={inputId}
        type="range"
        className="hud-range mt-2"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--pct": `${pct}%`, "--accent": accent } as CSSProperties}
      />
      {minLabel || maxLabel ? (
        <div className={cn("flex justify-between font-mono uppercase tracking-[0.14em] text-faint", compact ? "text-[8px] mt-0.5" : "text-[9px] mt-1")}>
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

export function PresetChips<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "h-7 rounded-[2px] border px-2.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors",
            option.value === value
              ? "border-runner/50 bg-runner/10 text-runner"
              : "border-line bg-surface-2/50 text-faint hover:border-line-strong hover:text-muted",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-1 rounded-[3px] border border-line bg-canvas/40 p-1",
        options.length === 2 ? "grid-cols-2" : "grid-cols-3",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-[2px] font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-all",
              active
                ? "bg-surface-3 text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]"
                : "text-faint hover:text-muted",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function NumberStepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  display: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-[13px] font-medium text-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="secondary"
          size="icon"
          className="size-8"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-[62px] text-center font-mono text-[11px] tabular text-ink">{display}</span>
        <Button
          variant="secondary"
          size="icon"
          className="size-8"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
