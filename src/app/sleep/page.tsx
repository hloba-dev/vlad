"use client";

import { useCallback, useState } from "react";
import { errorMessage, useData } from "@/components/data-provider";
import { History, type HistoryGroup } from "@/components/history";
import { Sheet } from "@/components/sheet";
import { isFutureTime, TimePicker } from "@/components/time-picker";
import { useTimeChoice } from "@/lib/hooks";
import { findLastFinishedSleep, findOpenSleep } from "@/lib/stats";
import {
  dayKey,
  dayLabel,
  formatClock,
  formatDuration,
  formatWhen,
  groupByDay,
  plural,
} from "@/lib/time";
import type { Sleep } from "@/lib/types";

type SheetMode = "start" | "end";

function sleepDuration(sleep: Sleep, now: number): number {
  const end = sleep.ended_at ? Date.parse(sleep.ended_at) : now;
  return end - Date.parse(sleep.started_at);
}

export default function SleepPage() {
  const { sleeps, loaded, now, remove } = useData();
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  const openSleep = findOpenSleep(sleeps);
  const lastSleep = findLastFinishedSleep(sleeps);

  const groups: HistoryGroup[] = groupByDay(sleeps, (sleep) =>
    Date.parse(sleep.started_at),
  ).map(({ day, items }) => {
    const finished = items.filter((sleep) => sleep.ended_at);
    const total = finished.reduce((sum, sleep) => sum + sleepDuration(sleep, now), 0);
    const count = `${items.length} ${plural(items.length, ["сон", "сна", "снов"])}`;
    return {
      key: dayKey(day),
      label: dayLabel(day, now),
      summary: finished.length > 0 ? `${count} · ${formatDuration(total)}` : count,
      rows: items.map((sleep) => ({
        id: sleep.id,
        time: `${formatClock(sleep.started_at)} – ${
          sleep.ended_at ? formatClock(sleep.ended_at) : "…"
        }`,
        text: sleep.ended_at ? formatDuration(sleepDuration(sleep, now)) : "спит",
        note: sleep.ended_at ? "уснул – проснулся" : "ещё не проснулся",
      })),
    };
  });

  return (
    <>
      <div className="rounded-3xl border border-line bg-card px-4 py-5 text-center">
        {!loaded ? (
          <div className="mx-auto h-28 w-48 animate-pulse rounded-2xl bg-ink/8" />
        ) : openSleep ? (
          <>
            <div className="text-5xl" aria-hidden="true">😴</div>
            <p className="mt-2 font-semibold text-ink-2">Спит</p>
            <p className="text-4xl font-bold">{formatDuration(sleepDuration(openSleep, now))}</p>
            <p className="mt-1 text-sm text-muted">уснул {formatWhen(openSleep.started_at, now)}</p>
          </>
        ) : lastSleep?.ended_at ? (
          <>
            <div className="text-5xl" aria-hidden="true">☀️</div>
            <p className="mt-2 font-semibold text-ink-2">Не спит</p>
            <p className="text-4xl font-bold">
              {formatDuration(now - Date.parse(lastSleep.ended_at))}
            </p>
            <p className="mt-1 text-sm text-muted">
              проснулся {formatWhen(lastSleep.ended_at, now)} · спал{" "}
              {formatDuration(sleepDuration(lastSleep, now))}
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl" aria-hidden="true">🌙</div>
            <p className="mt-2 text-lg font-semibold">Записей о сне пока нет</p>
            <p className="mt-1 text-sm text-muted">Нажмите «Уснул», когда малыш заснёт</p>
          </>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <SleepButton
          emoji="🌙"
          label="Уснул"
          disabled={!loaded || openSleep !== null}
          onClick={() => setSheet("start")}
        />
        <SleepButton
          emoji="☀️"
          label="Проснулся"
          disabled={!loaded || openSleep === null}
          onClick={() => setSheet("end")}
        />
      </div>

      <History
        groups={groups}
        empty="Записей о сне пока нет"
        onDelete={(id) => remove("sleeps", id)}
      />

      {sheet && <SleepSheet mode={sheet} openSleep={openSleep} onClose={closeSheet} />}
    </>
  );
}

function SleepButton({
  emoji,
  label,
  disabled,
  onClick,
}: {
  emoji: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-24 flex-col items-center justify-center gap-1 rounded-3xl bg-ink text-lg font-bold text-bg transition-transform active:scale-[0.97] disabled:bg-ink/8 disabled:text-muted disabled:active:scale-100"
    >
      <span className={`text-3xl ${disabled ? "opacity-40 grayscale" : ""}`} aria-hidden="true">
        {emoji}
      </span>
      {label}
    </button>
  );
}

function SleepSheet({
  mode,
  openSleep,
  onClose,
}: {
  mode: SheetMode;
  openSleep: Sleep | null;
  onClose: () => void;
}) {
  const { now, startSleep, endSleep, notify } = useData();
  const time = useTimeChoice(now);
  const [saving, setSaving] = useState(false);

  const sleepToEnd = mode === "end" ? openSleep : null;
  const startedAt = sleepToEnd ? Date.parse(sleepToEnd.started_at) : null;
  const beforeStart = startedAt !== null && time.value.getTime() <= startedAt;
  const canSave = !isFutureTime(time.value, now) && !beforeStart && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      const at = time.resolve();
      if (sleepToEnd && startedAt !== null) {
        await endSleep(sleepToEnd.id, at);
        notify(
          `Проснулся в ${formatClock(at)} · спал ${formatDuration(at.getTime() - startedAt)}`,
        );
      } else {
        await startSleep(at);
        notify(`Уснул в ${formatClock(at)}`);
      }
      onClose();
    } catch (error) {
      notify(errorMessage(error), "error");
      setSaving(false);
    }
  }

  let hint = "";
  if (startedAt !== null) {
    hint = beforeStart
      ? `Должно быть позже, чем уснул (${formatClock(startedAt)})`
      : `Проспал ${formatDuration(time.value.getTime() - startedAt)}`;
  }

  return (
    <Sheet title={mode === "start" ? "Когда уснул?" : "Когда проснулся?"} onClose={onClose}>
      <TimePicker time={time} now={now} label="Время" />
      <p
        aria-live="polite"
        className={`mt-2 h-6 text-center font-semibold ${beforeStart ? "text-danger" : ""}`}
      >
        {hint}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-14 rounded-2xl bg-ink/8 text-lg font-semibold active:bg-ink/15"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="h-14 rounded-2xl bg-ink text-lg font-bold text-bg active:opacity-80 disabled:opacity-40"
        >
          {saving ? "Сохраняю…" : "Сохранить"}
        </button>
      </div>
    </Sheet>
  );
}
