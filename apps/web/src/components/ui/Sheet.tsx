import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "right" | "bottom";
  className?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  side = "right",
  className,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: side === "bottom" ? 40 : 24, x: side === "right" ? 32 : 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: side === "bottom" ? 30 : 16, x: side === "right" ? 24 : 0 }}
            transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              "absolute z-10 flex max-h-[88dvh] flex-col border-line-strong/60 bg-surface shadow-[0_40px_120px_rgb(0_0_0/0.55)]",
              side === "right"
                ? "inset-x-0 bottom-0 rounded-t-2xl border-t sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[470px] sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0"
                : "inset-x-0 bottom-0 rounded-t-2xl border-t",
              className,
            )}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong sm:hidden" />
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-4 sm:pt-6">
              <div>
                {eyebrow ? <p className="label-mono mb-2">{eyebrow}</p> : null}
                {title ? <h2 className="display text-2xl font-semibold text-ink">{title}</h2> : null}
                {description ? (
                  <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-muted">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="flex size-8 shrink-0 items-center justify-center rounded-[2px] text-faint transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer ? (
              <div className="border-t border-line bg-surface/95 px-5 py-4 safe-bottom">
                {footer}
              </div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
