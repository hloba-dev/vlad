"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useData } from "@/components/data-provider";
import {
  ChartIcon,
  ChevronLeftIcon,
  HomeIcon,
  RefreshIcon,
} from "@/components/icons";
import { useIsClient } from "@/lib/hooks";
import { formatClock } from "@/lib/time";

const TITLES: Record<string, string> = {
  "/": "Дневник малыша",
  "/feeding": "Еда",
  "/sleep": "Сон",
  "/toilet": "Туалет",
  "/dashboard": "Статистика",
};

// Keeps the spinner visible long enough to register as feedback on fast networks.
const MIN_SPIN_MS = 600;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isClient = useIsClient();
  const { refresh, refreshing, updatedAt, error, toast } = useData();
  const [spinning, setSpinning] = useState(false);

  const onDashboard = pathname === "/dashboard";
  const onSubpage = pathname !== "/" && !onDashboard;

  async function handleRefresh() {
    if (spinning) return;
    setSpinning(true);
    await Promise.all([
      refresh(),
      new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS)),
    ]);
    setSpinning(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-14 items-center gap-1 px-4">
          {onSubpage && (
            <Link
              href="/"
              aria-label="Назад на главную"
              className="-ml-3 grid size-11 shrink-0 place-items-center rounded-full active:bg-ink/8"
            >
              <ChevronLeftIcon />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl leading-7 font-bold">
              {TITLES[pathname] ?? TITLES["/"]}
            </h1>
            <p className="h-4 truncate text-xs leading-4 text-muted">
              {updatedAt ? `Обновлено в ${formatClock(updatedAt)}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-card px-4 font-semibold shadow-sm active:bg-ink/8"
          >
            <RefreshIcon
              className={`size-5 ${spinning || refreshing ? "animate-spin" : ""}`}
            />
            Обновить
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mx-4 mt-1 mb-2 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      <main className="flex flex-1 flex-col px-4 pt-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {isClient ? children : null}
      </main>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
          <div
            key={toast.id}
            role="status"
            className={`toast max-w-full rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-lg ${
              toast.tone === "error" ? "bg-danger text-white" : "bg-ink text-bg"
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto grid h-16 max-w-md grid-cols-2">
          <NavLink href="/" label="Главная" active={!onDashboard}>
            <HomeIcon />
          </NavLink>
          <NavLink href="/dashboard" label="Статистика" active={onDashboard}>
            <ChartIcon />
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
        active ? "text-ink" : "text-muted"
      }`}
    >
      {children}
      {label}
    </Link>
  );
}
