"use client";

import { useEffect, useLayoutEffect, useRef, type MouseEvent } from "react";

export const WHEEL_ITEM_HEIGHT = 34;
const VISIBLE_ITEMS = 5;
// A looping wheel renders its items several times and quietly jumps back to
// the middle copy once scrolling stops, so it never reaches an end. Each side
// of the middle copy gets enough items to absorb a hard fling.
const LOOP_ITEMS_PER_SIDE = 180;
const IDLE_MS = 140;

const mod = (value: number, n: number) => ((value % n) + n) % n;

type WheelProps = {
  label: string;
  items: string[];
  index: number;
  /** Called only for changes made by the user, never for prop-driven scrolling. */
  onChange: (index: number) => void;
  loop?: boolean;
};

export function Wheel({ label, items, index, onChange, loop = false }: WheelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const count = items.length;
  const copies = loop ? 2 * Math.ceil(LOOP_ITEMS_PER_SIDE / count) + 1 : 1;
  const base = Math.floor(copies / 2) * count;

  const applied = useRef<number | null>(null);
  const programmatic = useRef(false);
  const touching = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (applied.current === null) {
      element.scrollTop = (base + index) * WHEEL_ITEM_HEIGHT;
      applied.current = index;
      return;
    }
    // The parent echoing back what this wheel just reported.
    if (applied.current === index) return;
    applied.current = index;
    const position = Math.round(element.scrollTop / WHEEL_ITEM_HEIGHT);
    let target = position - mod(position, count) + index;
    if (loop) {
      if (target - position > count / 2) target -= count;
      else if (position - target > count / 2) target += count;
    }
    if (target === position) return;
    programmatic.current = true;
    element.scrollTo({ top: target * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
  }, [index, base, count, loop]);

  useEffect(
    () => () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    },
    [],
  );

  function settle() {
    const element = ref.current;
    if (!element) return;
    programmatic.current = false;
    if (!loop || touching.current) return;
    const position = Math.round(element.scrollTop / WHEEL_ITEM_HEIGHT);
    if (position < base || position >= base + count) {
      element.scrollTop +=
        (base + mod(position, count) - position) * WHEEL_ITEM_HEIGHT;
    }
  }

  function scheduleSettle() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(settle, IDLE_MS);
  }

  function handleScroll() {
    const element = ref.current;
    if (!element) return;
    scheduleSettle();
    if (programmatic.current) return;
    const position = Math.round(element.scrollTop / WHEEL_ITEM_HEIGHT);
    const next = loop
      ? mod(position, count)
      : Math.min(count - 1, Math.max(0, position));
    if (next !== applied.current) {
      applied.current = next;
      onChange(next);
    }
  }

  function takeControl() {
    programmatic.current = false;
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const item = (event.target as HTMLElement).closest<HTMLElement>("[data-position]");
    if (!item || !ref.current) return;
    takeControl();
    ref.current.scrollTo({
      top: Number(item.dataset.position) * WHEEL_ITEM_HEIGHT,
      behavior: "smooth",
    });
  }

  function stepBy(direction: number) {
    takeControl();
    ref.current?.scrollBy({
      top: direction * WHEEL_ITEM_HEIGHT,
      behavior: "smooth",
    });
  }

  return (
    <div
      ref={ref}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={index}
      aria-valuetext={items[index]}
      className="wheel"
      style={{
        height: WHEEL_ITEM_HEIGHT * VISIBLE_ITEMS,
        paddingBlock: WHEEL_ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
      }}
      onScroll={handleScroll}
      onClick={handleClick}
      onWheel={takeControl}
      onPointerDown={takeControl}
      onTouchStart={() => {
        touching.current = true;
        takeControl();
      }}
      onTouchEnd={() => {
        touching.current = false;
        scheduleSettle();
      }}
      onTouchCancel={() => {
        touching.current = false;
        scheduleSettle();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          stepBy(event.key === "ArrowUp" ? -1 : 1);
        }
      }}
    >
      {Array.from({ length: copies * count }, (_, position) => {
        const selected = position % count === index;
        return (
          <div
            key={position}
            data-position={position}
            className={`wheel-item ${selected ? "font-semibold text-ink" : "text-ink-2"}`}
            style={{ height: WHEEL_ITEM_HEIGHT }}
          >
            {items[position % count]}
          </div>
        );
      })}
    </div>
  );
}
