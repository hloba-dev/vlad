"use client";

import { useEffect, type ReactNode } from "react";

type SheetProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Bottom sheet. Mount it to open, unmount to close. */
export function Sheet({ title, onClose, children }: SheetProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 touch-none bg-black/50"
      />
      <div className="sheet-panel relative w-full max-w-md rounded-t-3xl bg-card px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <h2 className="mb-1 text-center text-lg font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
