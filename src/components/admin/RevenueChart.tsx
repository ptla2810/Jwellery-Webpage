"use client";

import { useState } from "react";
import { formatINR } from "@/lib/money";

/**
 * Single-series daily revenue bars. Colour validated with the dataviz palette checker (#a77a22 on light surface).
 * Thin bars, 4px rounded data-ends anchored to the baseline, 2px gaps, recessive grid, hover tooltip, table view.
 */
export function RevenueChart({ data }: { data: { day: string; revenue: number; orders: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const W = 720;
  const H = 220;
  const pad = { l: 56, r: 8, t: 12, b: 26 };
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const nice = (() => {
    const step = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / step) * step;
  })();
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const slot = iw / data.length;
  const barW = Math.max(2, slot - 2);
  const ticks = [0, 0.5, 1].map((f) => f * nice);
  const fmtShort = (p: number) => (p >= 1e7 ? `₹${(p / 1e7).toFixed(1)}L` : p >= 1e5 ? `₹${Math.round(p / 1e5)}k` : `₹${Math.round(p / 100)}`);
  const h = hover != null ? data[hover] : null;

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button onClick={() => setShowTable((s) => !s)} className="text-xs text-muted underline-offset-2 hover:underline">{showTable ? "Show chart" : "Show table"}</button>
      </div>
      {showTable ? (
        <div className="max-h-64 overflow-y-auto text-sm">
          <table className="w-full">
            <thead><tr className="text-left text-xs text-muted"><th className="py-1">Day</th><th>Orders</th><th className="text-right">Revenue</th></tr></thead>
            <tbody>{data.map((d) => <tr key={d.day} className="border-t border-line"><td className="py-1">{d.day}</td><td>{d.orders}</td><td className="text-right tabular-nums">{formatINR(d.revenue)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Daily revenue, last 30 days" onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => {
              const y = pad.t + ih - (t / nice) * ih;
              return (
                <g key={t}>
                  <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#e9e4da" strokeWidth={1} />
                  <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#6b635a">{fmtShort(t)}</text>
                </g>
              );
            })}
            {data.map((d, i) => {
              const bh = (d.revenue / nice) * ih;
              const x = pad.l + i * slot + 1;
              const y = pad.t + ih - bh;
              const r = Math.min(4, barW / 2, bh);
              return (
                <g key={d.day}>
                  {bh > 0 && (
                    <path
                      d={`M${x},${pad.t + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${pad.t + ih} Z`}
                      fill="#a77a22"
                      opacity={hover == null || hover === i ? 1 : 0.45}
                    />
                  )}
                  <rect x={pad.l + i * slot} y={pad.t} width={slot} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${d.day}: ${formatINR(d.revenue)}, ${d.orders} orders`} />
                  {((data.length - 1 - i) % 7 === 0) && (
                    <text x={pad.l + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#6b635a">{d.day.slice(5)}</text>
                  )}
                </g>
              );
            })}
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="#cfc6b6" />
          </svg>
          {h && hover != null && (
            <div className="pointer-events-none absolute top-0 rounded-[var(--radius-sm)] border border-line bg-white px-3 py-2 text-xs shadow-lg" style={{ left: `${Math.min(80, ((pad.l + hover * slot) / W) * 100)}%` }}>
              <p className="font-semibold text-ink">{h.day}</p>
              <p className="text-charcoal">{formatINR(h.revenue)} · {h.orders} {h.orders === 1 ? "order" : "orders"}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
