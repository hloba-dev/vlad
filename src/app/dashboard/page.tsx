"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BarChart, type ChartBar } from "@/components/bar-chart";
import { useData } from "@/components/data-provider";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import {
  averageFeedGap,
  averagePerDay,
  buildDayStats,
  type DayStat,
} from "@/lib/stats";
import {
  dayKey,
  dayLabel,
  formatClock,
  formatDuration,
  formatFullDate,
  HOUR,
  plural,
  startOfDay,
  weekdayLabel,
} from "@/lib/time";

const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];
const TOTAL_DAYS = 30;

const COLORS = {
  food: "var(--food)",
  sleep: "var(--sleep)",
  toilet: "var(--toilet)",
} as const;
type Tone = keyof typeof COLORS;

const decimal = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const NONE = "—";

const feedingsWord = (n: number) => plural(n, ["кормление", "кормления", "кормлений"]);
const timesWord = (n: number) => plural(n, ["раз", "раза", "раз"]);
const sleepsWord = (n: number) => plural(n, ["сон", "сна", "снов"]);

type TimelineItem = {
  key: string;
  at: number;
  time: string;
  tone: Tone;
  text: string;
};

export default function DashboardPage() {
  const { feedings, toilets, sleeps, loaded, now } = useData();
  const [range, setRange] = useState<Range>(7);
  // Selected day, counted in days back from today.
  const [back, setBack] = useState(0);

  const todayStart = startOfDay(now).getTime();
  const stats = useMemo(
    () => buildDayStats({ feedings, toilets, sleeps }, todayStart, TOTAL_DAYS, now),
    [feedings, toilets, sleeps, todayStart, now],
  );

  const selected = stats[stats.length - 1 - back];
  const selectedKey = dayKey(selected.day);
  const shown = stats.slice(-range);
  const rangeStart = shown[0].start;

  function selectDay(key: string) {
    const index = stats.findIndex((stat) => dayKey(stat.day) === key);
    if (index >= 0) setBack(stats.length - 1 - index);
  }

  const labelEvery = range === 7 ? 1 : range === 14 ? 2 : 5;
  function toBars(
    value: (stat: DayStat) => number,
    valueText: (stat: DayStat) => string,
  ): ChartBar[] {
    return shown.map((stat, i) => {
      const fromEnd = shown.length - 1 - i;
      let axisLabel = "";
      if (fromEnd % labelEvery === 0) {
        axisLabel = range === 7 ? weekdayLabel(stat.day) : String(stat.day.getDate());
      }
      return {
        key: dayKey(stat.day),
        axisLabel,
        name: dayLabel(stat.day, now),
        value: value(stat),
        valueText: valueText(stat),
      };
    });
  }

  const mlPerDay = averagePerDay(shown, (stat) => stat.feedMl);
  const feedsPerDay = averagePerDay(shown, (stat) => stat.feedCount);
  const feedGap = averageFeedGap(feedings, rangeStart);
  const sleepPerDay = averagePerDay(shown, (stat) => stat.sleepMs);
  const toiletsPerDay = averagePerDay(shown, (stat) => stat.toiletCount);
  const longestSleep = sleeps.reduce((longest, sleep) => {
    const start = Date.parse(sleep.started_at);
    if (!sleep.ended_at || start < rangeStart) return longest;
    return Math.max(longest, Date.parse(sleep.ended_at) - start);
  }, 0);

  const timeline: TimelineItem[] = [];
  for (const feeding of feedings) {
    const at = Date.parse(feeding.fed_at);
    if (at >= selected.start && at < selected.end) {
      timeline.push({
        key: `feeding-${feeding.id}`,
        at,
        time: formatClock(at),
        tone: "food",
        text: `Еда · ${feeding.amount_ml} мл`,
      });
    }
  }
  for (const toilet of toilets) {
    const at = Date.parse(toilet.happened_at);
    if (at >= selected.start && at < selected.end) {
      timeline.push({
        key: `toilet-${toilet.id}`,
        at,
        time: formatClock(at),
        tone: "toilet",
        text: "Туалет",
      });
    }
  }
  for (const sleep of sleeps) {
    const start = Date.parse(sleep.started_at);
    const end = sleep.ended_at ? Date.parse(sleep.ended_at) : now;
    if (start < selected.end && end > selected.start) {
      timeline.push({
        key: `sleep-${sleep.id}`,
        at: start,
        time: `${formatClock(start)} – ${sleep.ended_at ? formatClock(end) : "…"}`,
        tone: "sleep",
        text: sleep.ended_at ? `Сон · ${formatDuration(end - start)}` : "Сон · спит",
      });
    }
  }
  timeline.sort((a, b) => b.at - a.at);

  const dayTitle = back === 0 ? "Сегодня" : back === 1 ? "Вчера" : formatFullDate(selected.day);

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-3xl border border-line bg-card p-2">
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Предыдущий день"
            disabled={back >= TOTAL_DAYS - 1}
            onClick={() => setBack((value) => value + 1)}
            className="grid size-12 shrink-0 place-items-center rounded-full active:bg-ink/8 disabled:opacity-25"
          >
            <ChevronLeftIcon />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2 className="truncate text-lg font-bold first-letter:uppercase">{dayTitle}</h2>
            <p className="h-4 text-xs leading-4 text-muted">
              {back <= 1 ? formatFullDate(selected.day) : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label="Следующий день"
            disabled={back === 0}
            onClick={() => setBack((value) => value - 1)}
            className="grid size-12 shrink-0 place-items-center rounded-full active:bg-ink/8 disabled:opacity-25"
          >
            <ChevronRightIcon />
          </button>
        </div>

        <dl className="mt-1 divide-y divide-line px-2">
          <SummaryRow
            emoji="🍼"
            label="Еда"
            value={selected.feedCount > 0 ? `${selected.feedMl} мл` : NONE}
            detail={
              selected.feedCount > 0
                ? `${selected.feedCount} ${feedingsWord(selected.feedCount)}`
                : "нет записей"
            }
          />
          <SummaryRow
            emoji="🌙"
            label="Сон"
            value={selected.sleepMs > 0 ? formatDuration(selected.sleepMs) : NONE}
            detail={
              selected.sleepMs > 0
                ? selected.sleepCount > 0
                  ? `${selected.sleepCount} ${sleepsWord(selected.sleepCount)}`
                  : "ночной сон"
                : "нет записей"
            }
          />
          <SummaryRow
            emoji="🚽"
            label="Туалет"
            value={
              selected.toiletCount > 0
                ? `${selected.toiletCount} ${timesWord(selected.toiletCount)}`
                : NONE
            }
            detail={selected.toiletCount > 0 ? "" : "нет записей"}
          />
        </dl>
      </section>

      <div
        role="group"
        aria-label="Период графиков"
        className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-ink/8 p-1"
      >
        {RANGES.map((days) => (
          <button
            key={days}
            type="button"
            aria-pressed={range === days}
            onClick={() => setRange(days)}
            className={`h-10 rounded-xl text-sm font-semibold ${
              range === days ? "bg-card shadow-sm" : "text-ink-2"
            }`}
          >
            {days} дней
          </button>
        ))}
      </div>

      <ChartCard
        title="Еда"
        unit="мл в день"
        tone="food"
        facts={[
          ["В среднем за день", mlPerDay === null ? NONE : `${Math.round(mlPerDay)} мл`],
          ["Кормлений в день", feedsPerDay === null ? NONE : decimal.format(feedsPerDay)],
          ["Между кормлениями", feedGap === null ? NONE : formatDuration(feedGap)],
        ]}
      >
        <BarChart
          caption="Съедено за день, мл"
          bars={toBars(
            (stat) => stat.feedMl,
            (stat) => `${stat.feedMl} мл`,
          )}
          color={COLORS.food}
          integer
          selectedKey={selectedKey}
          onSelect={selectDay}
        />
      </ChartCard>

      <ChartCard
        title="Сон"
        unit="часов в день"
        tone="sleep"
        facts={[
          ["В среднем за день", sleepPerDay === null ? NONE : formatDuration(sleepPerDay)],
          ["Самый долгий сон", longestSleep > 0 ? formatDuration(longestSleep) : NONE],
        ]}
      >
        <BarChart
          caption="Сон за день"
          bars={toBars(
            (stat) => stat.sleepMs / HOUR,
            (stat) => (stat.sleepMs > 0 ? formatDuration(stat.sleepMs) : "0 мин"),
          )}
          color={COLORS.sleep}
          selectedKey={selectedKey}
          onSelect={selectDay}
        />
      </ChartCard>

      <ChartCard
        title="Туалет"
        unit="раз в день"
        tone="toilet"
        facts={[
          ["В среднем за день", toiletsPerDay === null ? NONE : decimal.format(toiletsPerDay)],
        ]}
      >
        <BarChart
          caption="Походы в туалет за день"
          bars={toBars(
            (stat) => stat.toiletCount,
            (stat) => `${stat.toiletCount} ${timesWord(stat.toiletCount)}`,
          )}
          color={COLORS.toilet}
          integer
          selectedKey={selectedKey}
          onSelect={selectDay}
        />
      </ChartCard>

      <section className="mt-2">
        <h2 className="mb-2 text-lg font-bold">
          Лента дня <span className="font-normal text-muted">· {dayLabel(selected.day, now)}</span>
        </h2>
        {!loaded ? (
          <div className="h-24 animate-pulse rounded-2xl bg-ink/7" />
        ) : timeline.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            За этот день записей нет
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {timeline.map((item) => (
              <li key={item.key} className="flex min-h-12 items-center gap-3 px-4 py-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: COLORS[item.tone] }}
                />
                <span className="min-w-0 flex-1">{item.text}</span>
                <span className="shrink-0 font-semibold tabular-nums">{item.time}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SummaryRow({
  emoji,
  label,
  value,
  detail,
}: {
  emoji: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 py-2">
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <dt className="flex-1 font-semibold text-ink-2">{label}</dt>
      <dd className="text-right">
        <span className="block text-xl leading-6 font-bold">{value}</span>
        {detail && <span className="block text-xs text-muted">{detail}</span>}
      </dd>
    </div>
  );
}

function ChartCard({
  title,
  unit,
  tone,
  facts,
  children,
}: {
  title: string;
  unit: string;
  tone: Tone;
  facts: [label: string, value: string][];
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="size-2.5 rounded-full" style={{ background: COLORS[tone] }} />
          {title}
        </h2>
        <span className="text-xs text-muted">{unit}</span>
      </div>
      {children}
      <dl className="mt-3 divide-y divide-line border-t border-line text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-2 last:pb-0">
            <dt className="text-ink-2">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
