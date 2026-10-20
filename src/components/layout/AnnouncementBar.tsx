"use client";

import { useEffect, useState } from "react";

export function AnnouncementBar({ messages }: { messages: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % messages.length), 4500);
    return () => clearInterval(t);
  }, [messages.length]);
  if (!messages.length) return null;
  return (
    <div className="bg-ink text-ivory">
      <div className="container-x flex h-9 items-center justify-center text-center text-[0.7rem] font-medium uppercase tracking-[0.18em]" aria-live="polite">
        <p key={i} className="animate-fade truncate">{messages[i]}</p>
      </div>
    </div>
  );
}
