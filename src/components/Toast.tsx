import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { setSpeechNotifier } from "../lib/speech";

type Kind = "info" | "success" | "error";
interface Toast { id: number; message: ReactNode; kind: Kind }

const Ctx = createContext<(message: ReactNode, kind?: Kind) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const show = useCallback((message: ReactNode, kind: Kind = "info") => {
    const id = next.current++;
    setToasts((t) => [...t.slice(-2), { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  useEffect(() => setSpeechNotifier((m) => show(`🔇 ${m}`, "error")), [show]);

  const color: Record<Kind, string> = {
    info: "bg-slate-900 text-white",
    success: "bg-teal-700 text-white",
    error: "bg-rose-700 text-white",
  };
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm shadow-lg ${color[t.kind]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
