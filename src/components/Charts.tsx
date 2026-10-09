import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/* Chart primitives that follow the AZKOI chart spec: thin bars (≤24px) with
   4px rounded data-ends, hairline solid gridlines, text in ink tokens,
   hover tooltips and a table view for every chart. */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * exp;
}

/** Path for a vertical bar with rounded top corners and a square baseline. */
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export interface Series {
  key: string;
  label: string;
  color: string;
}

interface ColumnProps<T> {
  data: T[];
  series: Series[];
  xLabel: (d: T) => string;
  value: (d: T, key: string) => number;
  format: (n: number) => string;
  formatAxis?: (n: number) => string;
  tooltipTitle?: (d: T) => string;
  height?: number;
  /** Show every Nth x label (auto if omitted). */
  labelEvery?: number;
  highlight?: (d: T) => boolean;
}

/** Column chart, single or grouped series (one shared y-axis). */
export function ColumnChart<T>({
  data,
  series,
  xLabel,
  value,
  format,
  formatAxis = format,
  tooltipTitle = xLabel,
  height = 220,
  labelEvery,
  highlight,
}: ColumnProps<T>) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 52;
  const padR = 8;
  const padT = 14;
  const padB = 26;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const max = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => value(d, s.key)))));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const band = innerW / Math.max(1, data.length);
  const groupGap = 2;
  const barW = Math.min(24, Math.max(3, (band * 0.7 - groupGap * (series.length - 1)) / series.length));
  const groupW = barW * series.length + groupGap * (series.length - 1);
  const every = labelEvery ?? Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(innerW / 46))));
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  return (
    <div className="chart" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg height={height} role="img" aria-label="Column chart">
        {ticks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} />
            <text className="axis-label" x={padL - 8} y={y(t) + 4} textAnchor="end">
              {formatAxis(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const gx = padL + band * i + (band - groupW) / 2;
          const dim = hover !== null && hover !== i;
          const hl = highlight?.(d);
          return (
            <g key={i} opacity={dim ? 0.45 : 1}>
              {series.map((s, si) => {
                const v = value(d, s.key);
                const h = (v / max) * innerH;
                return <path key={s.key} d={barPath(gx + si * (barW + groupGap), padT + innerH - h, barW, h)} fill={s.color} />;
              })}
              {i % every === 0 && (
                <text
                  className="axis-label"
                  x={padL + band * i + band / 2}
                  y={height - 8}
                  textAnchor="middle"
                  style={hl ? { fill: 'var(--ink)', fontWeight: 700 } : undefined}
                >
                  {xLabel(d)}
                </text>
              )}
              <rect
                className="hit"
                x={padL + band * i}
                y={padT}
                width={band}
                height={innerH}
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div className="tooltip" style={{ left: Math.min(Math.max(padL + band * hover + band / 2, 70), width - 70), top: padT }}>
          <b>{tooltipTitle(data[hover])}</b>
          {series.map((s) => (
            <div key={s.key}>
              <i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: s.color, marginRight: 6 }} />
              {series.length > 1 ? `${s.label}: ` : ''}
              {format(value(data[hover], s.key))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <div className="legend">
      {series.map((s) => (
        <span key={s.key}>
          <i style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/** Horizontal bar list: label · bar · value at the tip. */
export function HBarList({
  rows,
  format,
  color = 'var(--s1)',
}: {
  rows: { label: ReactNode; value: number; hint?: string }[];
  format: (n: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <div className="empty small">No data yet</div>;
  return (
    <div className="hbar">
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'contents' }} title={r.hint}>
          <div className="hb-label truncate">{r.label}</div>
          <div className="hb-track">
            <div className="hb-bar" style={{ width: `calc(${(r.value / max) * 100}% - 70px)`, background: color }} />
            <span className="hb-val num">{format(r.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Meter({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${v * 100}%` }} />
      </div>
    </div>
  );
}

/** Collapsible table view — every chart has one so values never depend on colour or hover. */
export function TableView({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="table-view">
      <summary>View as table</summary>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={h} className={i ? 'r' : ''}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={j ? 'r num' : ''}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
