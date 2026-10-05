"use client";

import { useState, useSyncExternalStore } from "react";
import { floorMinute } from "@/lib/time";

const subscribeNever = () => () => {};

/** False during server render and hydration, true afterwards. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/**
 * Time for a new record. Until the user moves the picker it follows the clock,
 * so a form left open for a while still saves the actual current time.
 */
export function useTimeChoice(now: number) {
  const [picked, setPicked] = useState<Date | null>(null);
  const current = floorMinute(now);
  return {
    value: picked ?? current,
    followsNow: picked === null,
    change: (update: (previous: Date) => Date) =>
      setPicked((previous) => update(previous ?? current)),
    reset: () => setPicked(null),
    resolve: () => picked ?? floorMinute(Date.now()),
  };
}

export type TimeChoice = ReturnType<typeof useTimeChoice>;
