"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { DAY } from "@/lib/time";
import type { Feeding, Sleep, Toilet } from "@/lib/types";

const HISTORY_DAYS = 31;
const AUTO_REFRESH_MS = 60_000;
const CLOCK_TICK_MS = 15_000;
const TOAST_MS = 2800;

const NOT_CONFIGURED =
  "Supabase не настроен. Заполните NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";

export type TableName = "feedings" | "toilets" | "sleeps";
export type ToastTone = "ok" | "error";
type Toast = { id: number; text: string; tone: ToastTone };

type Snapshot = {
  feedings: Feeding[];
  toilets: Toilet[];
  sleeps: Sleep[];
  loaded: boolean;
  error: string | null;
  updatedAt: number | null;
};

type DataContextValue = Snapshot & {
  refreshing: boolean;
  /** Shared clock for "… назад" labels; ticks on its own and after every refresh. */
  now: number;
  toast: Toast | null;
  refresh: () => Promise<void>;
  notify: (text: string, tone?: ToastTone) => void;
  addFeeding: (at: Date, amountMl: number) => Promise<void>;
  addToilet: (at: Date) => Promise<void>;
  startSleep: (at: Date) => Promise<void>;
  endSleep: (id: string, at: Date) => Promise<void>;
  remove: (table: TableName, id: string) => Promise<void>;
};

const EMPTY: Snapshot = {
  feedings: [],
  toilets: [],
  sleeps: [],
  loaded: false,
  error: null,
  updatedAt: null,
};

const DataContext = createContext<DataContextValue | null>(null);

export function errorMessage(error: unknown): string {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  if (code === "PGRST205" || code === "42P01") {
    return "В Supabase нет таблиц. Выполните supabase/schema.sql в SQL Editor.";
  }
  if (code === "42501") {
    return "Нет доступа к таблицам. Выполните supabase/schema.sql в SQL Editor.";
  }
  if (error instanceof TypeError || /Failed to fetch|Load failed|NetworkError/.test(message ?? "")) {
    return "Нет связи с сервером. Проверьте интернет.";
  }
  return message || "Что-то пошло не так. Попробуйте ещё раз.";
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<Toast | null>(null);
  const requestSeq = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const seq = ++requestSeq.current;
    setRefreshing(true);
    try {
      const supabase = getSupabase();
      const since = new Date(Date.now() - HISTORY_DAYS * DAY).toISOString();
      const [feedings, toilets, sleeps] = await Promise.all([
        supabase
          .from("feedings")
          .select("id, fed_at, amount_ml")
          .gte("fed_at", since)
          .order("fed_at", { ascending: false }),
        supabase
          .from("toilets")
          .select("id, happened_at")
          .gte("happened_at", since)
          .order("happened_at", { ascending: false }),
        supabase
          .from("sleeps")
          .select("id, started_at, ended_at")
          .gte("started_at", since)
          .order("started_at", { ascending: false }),
      ]);
      const failure = feedings.error ?? toilets.error ?? sleeps.error;
      if (failure) throw failure;
      // A newer request is in flight; let it deliver the result.
      if (seq !== requestSeq.current) return;
      setSnapshot({
        feedings: (feedings.data ?? []) as Feeding[],
        toilets: (toilets.data ?? []) as Toilet[],
        sleeps: (sleeps.data ?? []) as Sleep[],
        loaded: true,
        error: null,
        updatedAt: Date.now(),
      });
    } catch (error) {
      if (seq !== requestSeq.current) return;
      setSnapshot((previous) => ({
        ...previous,
        loaded: true,
        error: errorMessage(error),
      }));
    } finally {
      if (seq === requestSeq.current) {
        setRefreshing(false);
        setNow(Date.now());
      }
    }
  }, []);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const initial = setTimeout(() => void refresh(), 0);
    const poll = setInterval(refreshIfVisible, AUTO_REFRESH_MS);
    const clock = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      clearTimeout(initial);
      clearInterval(poll);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [refresh]);

  const notify = useCallback((text: string, tone: ToastTone = "ok") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, tone });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const write = useCallback(
    async (run: (supabase: SupabaseClient) => PromiseLike<{ error: unknown }>) => {
      const { error } = await run(getSupabase());
      if (error) throw new Error(errorMessage(error));
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      ...snapshot,
      loaded: snapshot.loaded || !isSupabaseConfigured,
      error: isSupabaseConfigured ? snapshot.error : NOT_CONFIGURED,
      refreshing,
      now,
      toast,
      refresh,
      notify,
      addFeeding: (at, amountMl) =>
        write((supabase) =>
          supabase
            .from("feedings")
            .insert({ fed_at: at.toISOString(), amount_ml: amountMl }),
        ),
      addToilet: (at) =>
        write((supabase) =>
          supabase.from("toilets").insert({ happened_at: at.toISOString() }),
        ),
      startSleep: (at) =>
        write((supabase) =>
          supabase.from("sleeps").insert({ started_at: at.toISOString() }),
        ),
      endSleep: (id, at) =>
        write((supabase) =>
          supabase
            .from("sleeps")
            .update({ ended_at: at.toISOString() })
            .eq("id", id),
        ),
      remove: (table, id) =>
        write((supabase) => supabase.from(table).delete().eq("id", id)),
    }),
    [snapshot, refreshing, now, toast, refresh, notify, write],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside DataProvider");
  return context;
}
