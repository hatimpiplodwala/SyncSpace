"use client";

import { useEffect, useRef } from "react";

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: "V", desc: "Select / move tool" },
  { keys: "P", desc: "Pen" },
  { keys: "N", desc: "Sticky note" },
  { keys: "R", desc: "Rectangle" },
  { keys: "O", desc: "Ellipse" },
  { keys: "Ctrl/Cmd + Z", desc: "Undo" },
  { keys: "Ctrl/Cmd + Shift + Z", desc: "Redo" },
  { keys: "Delete / Backspace", desc: "Delete selection" },
  { keys: "Space + drag", desc: "Pan the canvas" },
  { keys: "Scroll / two-finger", desc: "Pan" },
  { keys: "Ctrl/Cmd + scroll · pinch", desc: "Zoom" },
  { keys: "?", desc: "Toggle this cheat sheet" },
  { keys: "Esc", desc: "Deselect / close" },
];

export function ShortcutsCheatSheet({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-gray-900/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Keyboard shortcuts
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
        <dl className="grid grid-cols-1 gap-1.5">
          {SHORTCUTS.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 odd:bg-gray-50"
            >
              <dt className="text-sm text-gray-600">{s.desc}</dt>
              <dd>
                <kbd className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm">
                  {s.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
