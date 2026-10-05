export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

type TimeInput = Date | number | string;

const clockFormat = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const fullDateFormat = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const weekdayFormat = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
const monthFormat = new Intl.DateTimeFormat("ru-RU", { month: "short" });

export function plural(n: number, forms: [string, string, string]): string {
  const rest = Math.abs(n) % 100;
  const last = rest % 10;
  if (rest > 10 && rest < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / MINUTE));
  if (totalMinutes < 1) return "меньше минуты";
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days} д ${hours} ч` : `${days} д`;
  if (hours > 0) return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  return `${minutes} мин`;
}

export function formatAgo(ms: number): string {
  if (ms < MINUTE) return "только что";
  return `${formatDuration(ms)} назад`;
}

export function formatClock(time: TimeInput): string {
  return clockFormat.format(new Date(time));
}

export function startOfDay(time: TimeInput): Date {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function addDays(day: Date, amount: number): Date {
  const result = new Date(day);
  result.setDate(result.getDate() + amount);
  return result;
}

export function dayKey(time: TimeInput): string {
  const day = new Date(time);
  return `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
}

/** Whole calendar days from `earlier` to `later`. */
export function diffDays(later: TimeInput, earlier: TimeInput): number {
  return Math.round(
    (startOfDay(later).getTime() - startOfDay(earlier).getTime()) / DAY,
  );
}

export function dayLabel(day: TimeInput, now: number): string {
  const diff = diffDays(now, day);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Вчера";
  return dateFormat.format(new Date(day));
}

/** Compact day label for the picker wheel: "пт 2 окт". */
export function shortDay(day: Date): string {
  const month = monthFormat.format(day).replace(".", "");
  return `${weekdayFormat.format(day)} ${day.getDate()} ${month}`;
}

/** "понедельник, 5 октября". */
export function formatFullDate(day: Date): string {
  return fullDateFormat.format(day);
}

export function weekdayLabel(day: Date): string {
  return weekdayFormat.format(day);
}

/** "в 14:05", "вчера в 14:05" or "пт, 2 окт. в 14:05". */
export function formatWhen(time: TimeInput, now: number): string {
  const diff = diffDays(now, time);
  const clock = formatClock(time);
  if (diff === 0) return `в ${clock}`;
  if (diff === 1) return `вчера в ${clock}`;
  return `${dateFormat.format(new Date(time))} в ${clock}`;
}

export function floorMinute(time: number): Date {
  return new Date(Math.floor(time / MINUTE) * MINUTE);
}

export function groupByDay<T>(
  items: T[],
  getTime: (item: T) => number,
): { day: Date; items: T[] }[] {
  const groups: { day: Date; items: T[] }[] = [];
  let currentKey = "";
  for (const item of items) {
    const time = getTime(item);
    const key = dayKey(time);
    if (key !== currentKey) {
      groups.push({ day: startOfDay(time), items: [] });
      currentKey = key;
    }
    groups[groups.length - 1].items.push(item);
  }
  return groups;
}
