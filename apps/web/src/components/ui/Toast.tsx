import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "default" | "success" | "warning" | "danger";

interface ToastInput {
  description?: string;
  tone?: ToastTone;
}

interface ToastItem extends ToastInput {
  id: number;
  message: string;
  /** True while the exit animation plays, before the item unmounts. */
  leaving?: boolean;
}

interface ToastContextValue {
  toast: (message: string, input?: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Keep in sync with the toast-out animation duration in globals.css. */
const EXIT_MS = 180;

const toneStyles: Record<ToastTone, string> = {
  default: "border-line-strong text-ink",
  success: "border-runner/45 text-runner",
  warning: "border-warning/45 text-warning",
  danger: "border-danger/45 text-danger",
};

const toneIcons = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Set<number>());

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, leaving: true } : item,
        ),
      );
      const timer = window.setTimeout(() => {
        timersRef.current.delete(timer);
        remove(id);
      }, EXIT_MS);
      timersRef.current.add(timer);
    },
    [remove],
  );

  // Clear pending timers if the provider unmounts.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const toast = useCallback(
    (message: string, input?: ToastInput) => {
      const id = ++idRef.current;
      setItems((current) => [
        ...current.slice(-2),
        { id, message, ...input },
      ]);
      const timer = window.setTimeout(() => {
        timersRef.current.delete(timer);
        dismiss(id);
      }, 3800);
      timersRef.current.add(timer);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        {items.map((item) => {
          const tone = item.tone ?? "default";
          const Icon = toneIcons[tone];
          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[3px] border bg-surface/95 px-3.5 py-3 shadow-[0_18px_50px_rgb(0_0_0/0.35)] backdrop-blur-md",
                item.leaving ? "toast-leave" : "toast-enter",
                toneStyles[tone],
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] font-medium uppercase leading-relaxed tracking-[0.1em] text-ink">
                  {item.message}
                </p>
                {item.description ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="mt-0.5 text-faint transition-colors hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
