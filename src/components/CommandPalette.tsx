"use client";

// Keyboard-driven command palette (Cmd/Ctrl-K). Generic over a list of commands;
// renders a discoverable trigger plus the overlay dialog.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type Command = {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  run: () => void;
};

export function CommandPalette({
  commands,
  placeholder = "Search or jump to…",
  triggerLabel = "Search",
  showTrigger = true,
}: {
  commands: Command[];
  placeholder?: string;
  triggerLabel?: string;
  /** When false, only the global ⌘K shortcut opens the palette (no visible button). */
  showTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  // Default to ⌘ so SSR and first client render match; correct to Ctrl after mount.
  const [isMac, setIsMac] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
  }, []);

  const openPalette = () => {
    setQuery("");
    setActive(0);
    setOpen(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setActive(0);
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focusing the input is a DOM side-effect (no React state involved).
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.keywords ?? ""} ${c.group}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Clamp during render rather than in an effect.
  const activeIndex = filtered.length ? Math.min(active, filtered.length - 1) : 0;

  const run = (c?: Command) => {
    if (!c) return;
    setOpen(false);
    c.run();
  };

  // Group commands in first-seen order, preserving filtered indices for navigation.
  const groups: { name: string; items: { cmd: Command; index: number }[] }[] = [];
  filtered.forEach((cmd, index) => {
    let g = groups.find((x) => x.name === cmd.group);
    if (!g) {
      g = { name: cmd.group, items: [] };
      groups.push(g);
    }
    g.items.push({ cmd, index });
  });

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={openPalette}
          suppressHydrationWarning
          className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {triggerLabel}
          <kbd className="border border-border px-1 text-[0.625rem] leading-none">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>
      )}

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[18vh]"
        >
          <div
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-lg border border-border bg-popover shadow-[var(--shadow-glossy)]">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              suppressHydrationWarning
              placeholder={placeholder}
              className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive(Math.min(activeIndex + 1, filtered.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive(Math.max(activeIndex - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  run(filtered[activeIndex]);
                }
              }}
            />

            <div className="max-h-[50vh] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No matches.
                </p>
              ) : (
                groups.map((g) => (
                  <div key={g.name} className="py-1">
                    <p className="label-mono px-4 py-1.5">{g.name}</p>
                    {g.items.map(({ cmd, index }) => (
                      <button
                        key={cmd.id}
                        type="button"
                        onMouseEnter={() => setActive(index)}
                        onClick={() => run(cmd)}
                        className={`flex w-full items-center px-4 py-2 text-left text-sm ${
                          index === activeIndex
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {cmd.label}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
