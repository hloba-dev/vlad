"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { errorMessage, useData } from "@/components/data-provider";
import { History, type HistoryGroup } from "@/components/history";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { isFutureTime, TimePicker } from "@/components/time-picker";
import { useTimeChoice } from "@/lib/hooks";
import {
  DAY,
  dayKey,
  dayLabel,
  formatClock,
  formatDuration,
  groupByDay,
  plural,
} from "@/lib/time";

const PRESETS = [30, 60, 90, 120, 150, 180, 210, 240];
const STEP = 10;
const MAX_ML = 999;
const DEFAULT_ML = 90;

export default function FeedingPage() {
  const { feedings, now, addFeeding, remove, notify } = useData();
  const router = useRouter();
  const time = useTimeChoice(now);
  // Until edited, the amount suggests what was eaten last time.
  const [amountInput, setAmountInput] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const amountText = amountInput ?? String(feedings[0]?.amount_ml ?? DEFAULT_ML);
  const amount = Number.parseInt(amountText, 10);
  const amountValid = Number.isFinite(amount) && amount > 0 && amount <= MAX_ML;
  const canSave = amountValid && !isFutureTime(time.value, now) && !saving;

  function stepAmount(delta: number) {
    const base = Number.isFinite(amount) ? amount : 0;
    setAmountInput(String(Math.min(MAX_ML, Math.max(STEP, base + delta))));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const at = time.resolve();
      await addFeeding(at, amount);
      notify(`Записано: ${amount} мл в ${formatClock(at)}`);
      router.push("/");
    } catch (error) {
      notify(errorMessage(error), "error");
      setSaving(false);
    }
  }

  const entries = feedings.map((feeding, i) => {
    const at = Date.parse(feeding.fed_at);
    const older = feedings[i + 1];
    return { feeding, at, gap: older ? at - Date.parse(older.fed_at) : null };
  });
  const groups: HistoryGroup[] = groupByDay(entries, (entry) => entry.at).map(
    ({ day, items }) => {
      const total = items.reduce((sum, entry) => sum + entry.feeding.amount_ml, 0);
      const count = `${items.length} ${plural(items.length, ["кормление", "кормления", "кормлений"])}`;
      return {
        key: dayKey(day),
        label: dayLabel(day, now),
        summary: `${count} · ${total} мл`,
        rows: items.map(({ feeding, at, gap }) => ({
          id: feeding.id,
          time: formatClock(at),
          text: `${feeding.amount_ml} мл`,
          note:
            gap !== null && gap < DAY
              ? `через ${formatDuration(gap)} после прошлого`
              : undefined,
        })),
      };
    },
  );

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <div className="rounded-3xl border border-line bg-card px-4 pt-1 pb-2">
          <TimePicker time={time} now={now} />
        </div>

        <div className="rounded-3xl border border-line bg-card py-3">
          <div className="flex items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => stepAmount(-STEP)}
              aria-label={`Меньше на ${STEP} мл`}
              className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ink/8 active:bg-ink/15"
            >
              <MinusIcon />
            </button>
            <label className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5">
              <span className="sr-only">Сколько съел, мл</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="done"
                autoComplete="off"
                value={amountText}
                onChange={(event) =>
                  setAmountInput(event.target.value.replace(/\D/g, "").slice(0, 3))
                }
                onFocus={(event) => event.target.select()}
                className="w-[3.2ch] bg-transparent text-center text-5xl font-bold tabular-nums outline-none"
              />
              <span className="text-xl font-semibold text-muted">мл</span>
            </label>
            <button
              type="button"
              onClick={() => stepAmount(STEP)}
              aria-label={`Больше на ${STEP} мл`}
              className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ink/8 active:bg-ink/15"
            >
              <PlusIcon />
            </button>
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmountInput(String(preset))}
                aria-pressed={amount === preset}
                className={`h-10 shrink-0 rounded-full px-4 font-semibold tabular-nums ${
                  amount === preset ? "bg-ink text-bg" : "bg-ink/8 active:bg-ink/15"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSave}
          className="h-14 rounded-2xl bg-ink text-lg font-bold text-bg active:opacity-80 disabled:opacity-40"
        >
          {saving ? "Сохраняю…" : "Сохранить"}
        </button>
      </form>

      <History
        groups={groups}
        empty="Кормлений пока нет"
        onDelete={(id) => remove("feedings", id)}
      />
    </>
  );
}
