"use client";

import { niceScale } from "@/lib/stats";

export type ChartBar = {
  key: string;
  /** Short axis label; empty to leave the slot unlabeled. */
  axisLabel: string;
  /** Full name of the day for screen readers and the data table. */
  name: string;
  value: number;
  valueText: string;
};

type BarChartProps = {
  caption: string;
  bars: ChartBar[];
  /** CSS color of the series this chart shows. */
  color: string;
  integer?: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

const tickFormat = new Intl.NumberFormat("ru-RU");

/** Daily column chart. Tapping a column selects that day. */
export function BarChart({
  caption,
  bars,
  color,
  integer = false,
  selectedKey,
  onSelect,
}: BarChartProps) {
  const max = Math.max(0, ...bars.map((bar) => bar.value));
  const { top, ticks } = niceScale(max, integer);

  return (
    <figure>
      <div className="flex pt-5">
        <div className="relative h-28 w-8 shrink-0" aria-hidden="true">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-2 translate-y-1/2 text-[11px] leading-none tabular-nums text-muted"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {tickFormat.format(tick)}
            </span>
          ))}
        </div>

        <div className="relative h-28 flex-1">
          {ticks.map((tick) => (
            <div
              key={tick}
              className={`absolute inset-x-0 h-px ${tick === 0 ? "bg-ink/25" : "bg-line"}`}
              style={{ bottom: `${(tick / top) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex">
            {bars.map((bar, i) => {
              const selected = bar.key === selectedKey;
              const height = (bar.value / top) * 100;
              // Keep the value label inside the plot near either edge.
              const place = bars.length > 1 ? i / (bars.length - 1) : 0.5;
              const labelAlign =
                place < 0.2
                  ? "left-0"
                  : place > 0.8
                    ? "right-0"
                    : "left-1/2 -translate-x-1/2";
              return (
                <button
                  key={bar.key}
                  type="button"
                  onClick={() => onSelect(bar.key)}
                  aria-pressed={selected}
                  aria-label={`${bar.name}: ${bar.valueText}`}
                  className="group relative flex h-full flex-1 items-end justify-center"
                >
                  {selected && (
                    <span
                      className={`pointer-events-none absolute pb-1 text-xs font-semibold whitespace-nowrap ${labelAlign}`}
                      style={{ bottom: `${height}%` }}
                    >
                      {bar.valueText}
                    </span>
                  )}
                  <span
                    className={`w-[min(24px,70%)] rounded-t-[4px] transition-opacity ${
                      selected ? "" : "opacity-45 group-hover:opacity-70"
                    }`}
                    style={{
                      height: `${height}%`,
                      minHeight: bar.value > 0 ? 3 : 0,
                      background: color,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex pl-8" aria-hidden="true">
        {bars.map((bar) => (
          <span
            key={bar.key}
            className={`flex-1 overflow-visible text-center text-[11px] leading-none whitespace-nowrap ${
              bar.key === selectedKey ? "font-semibold text-ink" : "text-muted"
            }`}
          >
            {bar.axisLabel}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.key}>
              <th scope="row">{bar.name}</th>
              <td>{bar.valueText}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
