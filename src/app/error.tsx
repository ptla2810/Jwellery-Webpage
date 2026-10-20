"use client";

import { useEffect } from "react";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error.digest ?? error.message);
  }, [error]);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl">Something went wrong</h1>
      <p className="max-w-md text-muted">Please try again. If the problem continues, contact customer care{error.digest ? ` with reference ${error.digest}` : ""}.</p>
      <button onClick={reset} className="bg-ink px-6 py-3 text-xs uppercase tracking-[0.14em] text-ivory">Try again</button>
    </div>
  );
}
