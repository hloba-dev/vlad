"use client";

import { useMemo, useState } from "react";
import { Wheel, WHEEL_ITEM_HEIGHT } from "@/components/wheel";
import type { TimeChoice } from "@/lib/hooks";
import { addDays, diffDays, formatAgo, MINUTE, shortDay, startOfDay } from "@/lib/time";

const DAYS_BACK = 7;
const TODAY_INDEX = DAYS_BACK - 1;
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export function isFutureTime(value: Date, now: number): boolean {
  return value.getTime() > now + MINUTE;
}

type TimePickerProps = {
  time: TimeChoice;
  now: number;
  label?: string;
};

/** iOS-style day / hour / minute wheels. Starts at the current time. */
export function TimePicker({ time, now, label = "Когда" }: TimePickerProps) {
  const [today] = useState(() => startOfDay(Date.now()));
  const days = useMemo(
    () => Array.from({ length: DAYS_BACK }, (_, i) => addDays(today, i - TODAY_INDEX)),
    [today],
  );
  const dayLabels = useMemo(
    () =>
      days.map((day, i) => {
        if (i === TODAY_INDEX) return "Сегодня";
        if (i === TODAY_INDEX - 1) return "Вчера";
        return shortDay(day);
      }),
    [days],
  );

  const { value, change } = time;
  const dayIndex = Math.min(
    TODAY_INDEX,
    Math.max(0, TODAY_INDEX - diffDays(today, value)),
  );
  const future = isFutureTime(value, now);

  let status = "сейчас";
  if (future) status = "ещё не наступило";
  else if (!time.followsNow) status = formatAgo(now - value.getTime());

  return (
    <div>
      <div className="flex h-9 items-center gap-2">
        <span className="text-sm font-semibold text-ink-2">{label}</span>
        <span
          aria-live="polite"
          className={`min-w-0 flex-1 truncate text-right text-sm ${
            future ? "font-semibold text-danger" : "text-muted"
          }`}
        >
          {status}
        </span>
        {!time.followsNow && (
          <button
            type="button"
            onClick={time.reset}
            className="h-8 shrink-0 rounded-full bg-ink/8 px-3 text-sm font-semibold active:bg-ink/15"
          >
            Сейчас
          </button>
        )}
      </div>

      <div className="relative grid grid-cols-[1.4fr_1fr_1fr]">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-xl bg-ink/7"
          style={{ height: WHEEL_ITEM_HEIGHT }}
        />
        <Wheel
          label="День"
          items={dayLabels}
          index={dayIndex}
          onChange={(i) =>
            change((previous) => {
              const day = days[i];
              return new Date(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
                previous.getHours(),
                previous.getMinutes(),
              );
            })
          }
        />
        <Wheel
          label="Часы"
          items={HOURS}
          index={value.getHours()}
          loop
          onChange={(hours) =>
            change((previous) => {
              const next = new Date(previous);
              next.setHours(hours);
              return next;
            })
          }
        />
        <Wheel
          label="Минуты"
          items={MINUTES}
          index={value.getMinutes()}
          loop
          onChange={(minutes) =>
            change((previous) => {
              const next = new Date(previous);
              next.setMinutes(minutes);
              return next;
            })
          }
        />
      </div>
    </div>
  );
}
