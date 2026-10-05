"use client";

import { useEffect, useRef, useState } from "react";
import { errorMessage, useData } from "@/components/data-provider";
import { TrashIcon } from "@/components/icons";

const INITIAL_DAYS = 3;
const MORE_DAYS = 7;
const CONFIRM_MS = 3000;

export type HistoryRow = {
  id: string;
  time: string;
  text: string;
  note?: string;
};

export type HistoryGroup = {
  key: string;
  label: string;
  summary: string;
  rows: HistoryRow[];
};

type HistoryProps = {
  groups: HistoryGroup[];
  empty: string;
  onDelete: (id: string) => Promise<void>;
};

/** Records grouped by day. Deleting takes two taps: the first one arms the button. */
export function History({ groups, empty, onDelete }: HistoryProps) {
  const { loaded, notify } = useData();
  const [shownDays, setShownDays] = useState(INITIAL_DAYS);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
    },
    [],
  );

  async function handleDelete(id: string) {
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
    if (armedId !== id) {
      setArmedId(id);
      disarmTimer.current = setTimeout(() => setArmedId(null), CONFIRM_MS);
      return;
    }
    setDeletingId(id);
    try {
      await onDelete(id);
      notify("Запись удалена");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setDeletingId(null);
      setArmedId(null);
    }
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-lg font-bold">История</h2>

      {!loaded && <div className="h-24 animate-pulse rounded-2xl bg-ink/7" />}
      {loaded && groups.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {empty}
        </p>
      )}

      {groups.slice(0, shownDays).map((group) => (
        <div key={group.key} className="mb-4">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
            <h3 className="text-sm font-semibold first-letter:uppercase">{group.label}</h3>
            <span className="text-sm text-muted">{group.summary}</span>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {group.rows.map((row) => {
              const armed = armedId === row.id;
              return (
                <li key={row.id} className="flex min-h-13 items-center gap-3 py-1.5 pr-2 pl-4">
                  <span className="shrink-0 font-semibold tabular-nums">{row.time}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{row.text}</span>
                    {row.note && <span className="block text-xs text-muted">{row.note}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    disabled={deletingId === row.id}
                    aria-label={armed ? "Подтвердить удаление" : "Удалить запись"}
                    className={
                      armed
                        ? "h-10 shrink-0 rounded-full bg-danger px-3.5 text-sm font-semibold text-white disabled:opacity-60"
                        : "grid size-10 shrink-0 place-items-center rounded-full text-muted active:bg-ink/8"
                    }
                  >
                    {armed ? "Удалить?" : <TrashIcon className="size-5" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {groups.length > shownDays && (
        <button
          type="button"
          onClick={() => setShownDays((days) => days + MORE_DAYS)}
          className="h-12 w-full rounded-2xl border border-line font-semibold text-ink-2 active:bg-ink/5"
        >
          Показать ещё
        </button>
      )}
    </section>
  );
}
