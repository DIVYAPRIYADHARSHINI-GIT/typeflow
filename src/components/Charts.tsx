// Hand-written SVG charts.
//
// No charting dependency: these are a few dozen lines of SVG each, which keeps the bundle
// small and avoids a library licence question entirely. Every chart renders an explicit
// "no data yet" state rather than an empty box or a fabricated zero line.

import { useId } from 'react';

export interface Point {
  label: string;
  value: number;
}

function niceMax(values: number[], floor = 10): number {
  const max = Math.max(floor, ...values);
  const step = max <= 50 ? 10 : max <= 120 ? 20 : 50;
  return Math.ceil(max / step) * step;
}

function EmptyChart({ height, message }: { height: number; message: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed text-sm"
      style={{ height, borderColor: 'var(--tf-border)', color: 'var(--tf-ink-faint)' }}
    >
      {message}
    </div>
  );
}

/** Line chart with optional second series. */
export function LineChart({
  points,
  height = 200,
  suffix = '',
  minPoints = 2,
  label,
}: {
  points: Point[];
  height?: number;
  suffix?: string;
  minPoints?: number;
  label: string;
}) {
  const gradientId = useId();
  if (points.length < minPoints) {
    return <EmptyChart height={height} message={`Not enough data yet - complete ${minPoints} tests to see ${label}.`} />;
  }

  const width = 640;
  const padding = { top: 14, right: 14, bottom: 26, left: 36 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = niceMax(points.map((p) => p.value));
  const x = (i: number) => padding.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padding.top + innerH - (Math.min(v, max) / max) * innerH;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${padding.top + innerH} L${x(0).toFixed(1)},${
    padding.top + innerH
  } Z`;
  const ticks = [0, max / 2, max];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height }}
      role="img"
      aria-label={`${label}: ${points.length} points, latest ${points[points.length - 1].value}${suffix}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--tf-accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--tf-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padding.left} x2={width - padding.right} y1={y(t)} y2={y(t)} stroke="var(--tf-border)" strokeWidth="1" />
          <text x={padding.left - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--tf-ink-faint)">
            {Math.round(t)}
          </text>
        </g>
      ))}
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="var(--tf-accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={`${p.label}-${i}`} cx={x(i)} cy={y(p.value)} r="3" fill="var(--tf-accent)" />
      ))}
      <text x={padding.left} y={height - 8} fontSize="10" fill="var(--tf-ink-faint)">
        {points[0].label}
      </text>
      <text x={width - padding.right} y={height - 8} fontSize="10" textAnchor="end" fill="var(--tf-ink-faint)">
        {points[points.length - 1].label}
      </text>
    </svg>
  );
}

/** Vertical bar chart, used for practice history. */
export function BarChart({
  points,
  height = 180,
  suffix = '',
  label,
}: {
  points: Point[];
  height?: number;
  suffix?: string;
  label: string;
}) {
  if (points.length === 0) return <EmptyChart height={height} message={`No ${label} recorded yet.`} />;

  const width = 640;
  const padding = { top: 14, right: 14, bottom: 26, left: 36 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = niceMax(points.map((p) => p.value), 1);
  const slot = innerW / points.length;
  const barW = Math.max(3, Math.min(34, slot * 0.62));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height }}
      role="img"
      aria-label={`${label}: ${points.length} bars, maximum ${max}${suffix}`}
    >
      {[0, max / 2, max].map((t) => {
        const ty = padding.top + innerH - (t / max) * innerH;
        return (
          <g key={t}>
            <line x1={padding.left} x2={width - padding.right} y1={ty} y2={ty} stroke="var(--tf-border)" />
            <text x={padding.left - 6} y={ty + 4} textAnchor="end" fontSize="10" fill="var(--tf-ink-faint)">
              {Math.round(t)}
            </text>
          </g>
        );
      })}
      {points.map((p, i) => {
        const h = (Math.min(p.value, max) / max) * innerH;
        return (
          <rect
            key={`${p.label}-${i}`}
            x={padding.left + i * slot + (slot - barW) / 2}
            y={padding.top + innerH - h}
            width={barW}
            height={Math.max(h, p.value > 0 ? 2 : 0)}
            rx="3"
            fill="var(--tf-accent)"
            opacity="0.85"
          >
            <title>{`${p.label}: ${p.value}${suffix}`}</title>
          </rect>
        );
      })}
      <text x={padding.left} y={height - 8} fontSize="10" fill="var(--tf-ink-faint)">
        {points[0].label}
      </text>
      {points.length > 1 && (
        <text x={width - padding.right} y={height - 8} fontSize="10" textAnchor="end" fill="var(--tf-ink-faint)">
          {points[points.length - 1].label}
        </text>
      )}
    </svg>
  );
}

/** Horizontal correct-vs-incorrect comparison used on the results screen. */
export function ComparisonBar({ correct, incorrect }: { correct: number; incorrect: number }) {
  const total = correct + incorrect;
  const pct = total === 0 ? 0 : (correct / total) * 100;
  return (
    <div>
      <div
        className="flex h-8 w-full overflow-hidden rounded-lg"
        role="img"
        aria-label={`${correct} correct characters and ${incorrect} incorrect characters`}
        style={{ background: 'var(--tf-wrong-bg)' }}
      >
        <div
          className="flex items-center justify-end pr-2 text-xs font-bold"
          style={{ width: `${pct}%`, background: 'var(--tf-correct-bg)', color: 'var(--tf-correct)' }}
        >
          {pct >= 18 ? `${correct} correct` : ''}
        </div>
        <div
          className="flex flex-1 items-center justify-start pl-2 text-xs font-bold"
          style={{ color: 'var(--tf-wrong)' }}
        >
          {total - correct > 0 && 100 - pct >= 18 ? `${incorrect} incorrect` : ''}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs" style={{ color: 'var(--tf-ink-faint)' }}>
        <span style={{ color: 'var(--tf-correct)' }}>{correct} correct characters</span>
        <span style={{ color: 'var(--tf-wrong)' }}>{incorrect} incorrect characters</span>
      </div>
    </div>
  );
}
