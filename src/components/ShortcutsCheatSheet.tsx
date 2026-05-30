"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export function ShortcutsCheatSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-1 gap-1">
          {SHORTCUTS.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 odd:bg-secondary/50"
            >
              <dt className="text-sm text-muted-foreground">{s.desc}</dt>
              <dd>
                <kbd className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]">
                  {s.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
