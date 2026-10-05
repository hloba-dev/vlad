"use client";

import Link from "next/link";
import { useData } from "@/components/data-provider";
import { findLastFinishedSleep, findOpenSleep } from "@/lib/stats";
import { formatAgo, formatDuration, formatWhen } from "@/lib/time";

const TONE_CLASS = {
  food: "bg-food/15",
  sleep: "bg-sleep/15",
  toilet: "bg-toilet/15",
} as const;

type CardText = { main: string; sub: string };

const NO_RECORDS: CardText = { main: "Нет записей", sub: "Нажмите, чтобы добавить" };

export default function HomePage() {
  const { feedings, toilets, sleeps, loaded, now } = useData();

  const lastFeeding = feedings[0];
  const lastToilet = toilets[0];
  const openSleep = findOpenSleep(sleeps);
  const lastSleep = findLastFinishedSleep(sleeps);

  const food: CardText = lastFeeding
    ? {
        main: formatAgo(now - Date.parse(lastFeeding.fed_at)),
        sub: `${lastFeeding.amount_ml} мл ${formatWhen(lastFeeding.fed_at, now)}`,
      }
    : NO_RECORDS;

  let sleep: CardText = NO_RECORDS;
  if (openSleep) {
    sleep = {
      main: `Спит ${formatDuration(now - Date.parse(openSleep.started_at))}`,
      sub: `уснул ${formatWhen(openSleep.started_at, now)}`,
    };
  } else if (lastSleep?.ended_at) {
    sleep = {
      main: `Не спит ${formatDuration(now - Date.parse(lastSleep.ended_at))}`,
      sub: `проснулся ${formatWhen(lastSleep.ended_at, now)}`,
    };
  }

  const toilet: CardText = lastToilet
    ? {
        main: formatAgo(now - Date.parse(lastToilet.happened_at)),
        sub: formatWhen(lastToilet.happened_at, now),
      }
    : NO_RECORDS;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <HomeCard href="/feeding" emoji="🍼" title="Еда" tone="food" text={food} loaded={loaded} />
      <HomeCard
        href="/sleep"
        emoji={openSleep ? "😴" : "🌙"}
        title="Сон"
        tone="sleep"
        text={sleep}
        loaded={loaded}
      />
      <HomeCard href="/toilet" emoji="🚽" title="Туалет" tone="toilet" text={toilet} loaded={loaded} />
    </div>
  );
}

function HomeCard({
  href,
  emoji,
  title,
  tone,
  text,
  loaded,
}: {
  href: string;
  emoji: string;
  title: string;
  tone: keyof typeof TONE_CLASS;
  text: CardText;
  loaded: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-32 flex-1 items-center gap-4 rounded-3xl border border-line bg-card p-4 shadow-sm transition-transform active:scale-[0.98]"
    >
      <span
        aria-hidden="true"
        className={`grid size-[4.5rem] shrink-0 place-items-center rounded-2xl text-4xl ${TONE_CLASS[tone]}`}
      >
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold text-ink-2">{title}</span>
        {loaded ? (
          <>
            <span className="block text-[1.6rem] leading-8 font-bold">{text.main}</span>
            <span className="mt-0.5 block text-sm text-muted">{text.sub}</span>
          </>
        ) : (
          <>
            <span className="mt-1 block h-7 w-40 max-w-full animate-pulse rounded-lg bg-ink/8" />
            <span className="mt-2 block h-4 w-24 animate-pulse rounded-md bg-ink/8" />
          </>
        )}
      </span>
    </Link>
  );
}
