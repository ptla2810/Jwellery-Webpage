"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type Toast = { id: number; message: string; tone: "success" | "error" };
const Ctx = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  // Wraps every page, and parent effects run after children's: marks the whole tree as interactive (used by E2E tests).
  useEffect(() => {
    document.documentElement.dataset.hydrated = "";
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-center gap-3 rounded-[var(--radius-md)] bg-ink px-4 py-3 text-sm text-ivory shadow-xl">
            {t.tone === "success" ? <CheckCircle2 className="size-4 shrink-0 text-gold-300" /> : <AlertCircle className="size-4 shrink-0 text-[#f0a49a]" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss" className="text-ivory/60 hover:text-ivory">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
