import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { setSpeechNotifier } from "../lib/speech";
import { IconAlert, IconCheck, IconClose } from "./Icons";

type Kind = "info" | "success" | "error";

export interface ToastOptions {
  /** One action button, e.g. Undo. The toast closes when it is pressed. */
  action?: { label: string; onAction: () => void };
  /** Milliseconds before auto-dismiss. Defaults: 5s, 8s with an action; errors persist until dismissed. */
  duration?: number;
}

interface Toast { id: number; message: ReactNode; kind: Kind; opts: ToastOptions; duration: number }

type Show = (message: ReactNode, kind?: Kind, opts?: ToastOptions) => void;

const Ctx = createContext<Show>(() => undefined);

const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** One toast with its own pausable timer (DESIGN.md › Toast). */
function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: (id: number) => void }) {
  const remaining = useRef(t.duration);
  const started = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(t.duration)) return;
    if (paused) {
      clearTimeout(timer.current);
      remaining.current -= Date.now() - started.current;
      return;
    }
    started.current = Date.now();
    timer.current = setTimeout(() => onDismiss(t.id), Math.max(0, remaining.current));
    return () => clearTimeout(timer.current);
  }, [paused, t.duration, t.id, onDismiss]);

  const pause = () => setPaused(true);
  const resume = (e?: React.FocusEvent) => {
    if (e && e.currentTarget.contains(e.relatedTarget as Node)) return;
    setPaused(false);
  };

  const seconds = Math.round(t.duration / 1000);
  return (
    <div
      role={t.kind === "error" ? "alert" : "status"}
      className="toast"
      onMouseEnter={pause}
      onMouseLeave={() => resume()}
      onFocus={pause}
      onBlur={resume}
    >
      {t.kind === "success" && <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-11" />}
      {t.kind === "error" && <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-error-11" />}
      <div className="min-w-0 flex-1 self-center">{t.message}</div>
      {t.opts.action && (
        <button
          type="button"
          className="btn-ghost -my-2 shrink-0"
          onClick={() => { t.opts.action!.onAction(); onDismiss(t.id); }}
        >
          {t.opts.action.label}{reducedMotion() && Number.isFinite(t.duration) ? ` (${seconds}s)` : ""}
        </button>
      )}
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => onDismiss(t.id)}>
        <IconClose className="h-4 w-4" />
      </button>
      {t.opts.action && Number.isFinite(t.duration) && !reducedMotion() && (
        <span
          className="toast-progress"
          style={{ animationDuration: `${t.duration}ms`, animationPlayState: paused ? "paused" : "running" }}
          aria-hidden
        />
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback<Show>((message, kind = "info", opts = {}) => {
    const id = next.current++;
    const duration = opts.duration ?? (kind === "error" ? Infinity : opts.action ? 8000 : 5000);
    // keep a toast that carries an action; otherwise the newest replaces older ones beyond three
    setToasts((t) => {
      const kept = t.length >= 3 ? t.filter((x, i) => x.opts.action || i >= t.length - 2) : t;
      return [...kept, { id, message, kind, opts, duration }];
    });
  }, []);

  useEffect(() => setSpeechNotifier((m) => show(m, "error")), [show]);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toasts.map((t) => <ToastItem key={t.id} t={t} onDismiss={dismiss} />)}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
