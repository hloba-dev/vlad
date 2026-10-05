"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { errorMessage, useData } from "@/components/data-provider";
import { History, type HistoryGroup } from "@/components/history";
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

export default function ToiletPage() {
  const { toilets, now, addToilet, remove, notify } = useData();
  const router = useRouter();
  const time = useTimeChoice(now);
  const [saving, setSaving] = useState(false);

  const canSave = !isFutureTime(time.value, now) && !saving;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const at = time.resolve();
      await addToilet(at);
      notify(`Туалет отмечен в ${formatClock(at)}`);
      router.push("/");
    } catch (error) {
      notify(errorMessage(error), "error");
      setSaving(false);
    }
  }

  const entries = toilets.map((toilet, i) => {
    const at = Date.parse(toilet.happened_at);
    const older = toilets[i + 1];
    return { toilet, at, gap: older ? at - Date.parse(older.happened_at) : null };
  });
  const groups: HistoryGroup[] = groupByDay(entries, (entry) => entry.at).map(
    ({ day, items }) => ({
      key: dayKey(day),
      label: dayLabel(day, now),
      summary: `${items.length} ${plural(items.length, ["раз", "раза", "раз"])}`,
      rows: items.map(({ toilet, at, gap }) => ({
        id: toilet.id,
        time: formatClock(at),
        text: "Сходил в туалет",
        note:
          gap !== null && gap < DAY
            ? `через ${formatDuration(gap)} после прошлого`
            : undefined,
      })),
    }),
  );

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <div className="rounded-3xl border border-line bg-card px-4 pt-1 pb-2">
          <TimePicker time={time} now={now} label="Когда сходил" />
        </div>
        <button
          type="submit"
          disabled={!canSave}
          className="h-14 rounded-2xl bg-ink text-lg font-bold text-bg active:opacity-80 disabled:opacity-40"
        >
          {saving ? "Сохраняю…" : "Отметить"}
        </button>
      </form>

      <History
        groups={groups}
        empty="Записей пока нет"
        onDelete={(id) => remove("toilets", id)}
      />
    </>
  );
}
