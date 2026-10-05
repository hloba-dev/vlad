import { addDays, HOUR } from "@/lib/time";
import type { Feeding, Sleep, Toilet } from "@/lib/types";

export type TrackerData = {
  feedings: Feeding[];
  toilets: Toilet[];
  sleeps: Sleep[];
};

export type DayStat = {
  day: Date;
  start: number;
  end: number;
  isToday: boolean;
  feedCount: number;
  feedMl: number;
  toiletCount: number;
  sleepMs: number;
  sleepCount: number;
};

const MAX_FEED_GAP = 12 * HOUR;

/** The sleep that is still going on, if the baby is asleep. */
export function findOpenSleep(sleeps: Sleep[]): Sleep | null {
  return sleeps.find((sleep) => sleep.ended_at === null) ?? null;
}

/** The finished sleep with the latest wake-up time. */
export function findLastFinishedSleep(sleeps: Sleep[]): Sleep | null {
  let latest: Sleep | null = null;
  for (const sleep of sleeps) {
    if (!sleep.ended_at) continue;
    if (!latest || sleep.ended_at > latest.ended_at!) latest = sleep;
  }
  return latest;
}

/** One entry per calendar day, oldest first, ending with today. */
export function buildDayStats(
  data: TrackerData,
  todayStart: number,
  days: number,
  now: number,
): DayStat[] {
  const today = new Date(todayStart);
  const result: DayStat[] = [];
  for (let back = days - 1; back >= 0; back--) {
    const day = addDays(today, -back);
    const start = day.getTime();
    const end = addDays(day, 1).getTime();
    const stat: DayStat = {
      day,
      start,
      end,
      isToday: back === 0,
      feedCount: 0,
      feedMl: 0,
      toiletCount: 0,
      sleepMs: 0,
      sleepCount: 0,
    };
    for (const feeding of data.feedings) {
      const at = Date.parse(feeding.fed_at);
      if (at >= start && at < end) {
        stat.feedCount += 1;
        stat.feedMl += feeding.amount_ml;
      }
    }
    for (const toilet of data.toilets) {
      const at = Date.parse(toilet.happened_at);
      if (at >= start && at < end) stat.toiletCount += 1;
    }
    for (const sleep of data.sleeps) {
      const from = Date.parse(sleep.started_at);
      const to = sleep.ended_at ? Date.parse(sleep.ended_at) : now;
      // A night's sleep is split between the two days it spans.
      const overlap = Math.min(end, to) - Math.max(start, from);
      if (overlap > 0) stat.sleepMs += overlap;
      if (from >= start && from < end) stat.sleepCount += 1;
    }
    result.push(stat);
  }
  return result;
}

/**
 * Average over days that have data. Today is still in progress, so it only
 * counts when there is no finished day to use instead.
 */
export function averagePerDay(
  stats: DayStat[],
  pick: (stat: DayStat) => number,
): number | null {
  const withData = stats.filter((stat) => pick(stat) > 0);
  const finished = withData.filter((stat) => !stat.isToday);
  const base = finished.length > 0 ? finished : withData;
  if (base.length === 0) return null;
  return base.reduce((sum, stat) => sum + pick(stat), 0) / base.length;
}

/** Average pause between feedings, ignoring gaps where nothing was tracked. */
export function averageFeedGap(feedings: Feeding[], since: number): number | null {
  const times = feedings
    .map((feeding) => Date.parse(feeding.fed_at))
    .filter((at) => at >= since)
    .sort((a, b) => a - b);
  let total = 0;
  let count = 0;
  for (let i = 1; i < times.length; i++) {
    const gap = times[i] - times[i - 1];
    if (gap > 0 && gap <= MAX_FEED_GAP) {
      total += gap;
      count += 1;
    }
  }
  return count > 0 ? total / count : null;
}

/** Axis ending on a round number with at most four intervals. */
export function niceScale(
  max: number,
  integer: boolean,
): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const steps: number[] = [];
  for (let exponent = integer ? 0 : -1; exponent <= 6; exponent++) {
    for (const base of [1, 2, 5]) steps.push(base * 10 ** exponent);
  }
  const step =
    steps.find((candidate) => Math.ceil(max / candidate) <= 4) ??
    steps[steps.length - 1];
  const count = Math.max(1, Math.ceil(max / step));
  const ticks = Array.from({ length: count + 1 }, (_, i) =>
    Number((i * step).toFixed(1)),
  );
  return { top: count * step, ticks };
}
