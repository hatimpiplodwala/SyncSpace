"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import { LOCAL_ORIGIN } from "@/lib/yjs/doc";

type Props = {
  doc: Y.Doc;
  text: Y.Text;
  // Screen-space rect of the note (CSS px), already through the viewport.
  rect: { x: number; y: number; w: number; h: number };
  scale: number;
  color: string;
  onClose: () => void;
};

// Reconcile a textarea's full value into a Y.Text by editing only the changed
// middle (common prefix + suffix preserved). Keeps edits character-granular so
// concurrent typing merges cleanly once realtime lands.
function applyTextDiff(doc: Y.Doc, ytext: Y.Text, next: string): void {
  const prev = ytext.toString();
  if (prev === next) return;
  let p = 0;
  const minLen = Math.min(prev.length, next.length);
  while (p < minLen && prev[p] === next[p]) p++;
  let s = 0;
  while (
    s < minLen - p &&
    prev[prev.length - 1 - s] === next[next.length - 1 - s]
  ) {
    s++;
  }
  doc.transact(() => {
    const delLen = prev.length - p - s;
    if (delLen > 0) ytext.delete(p, delLen);
    const insStr = next.slice(p, next.length - s);
    if (insStr) ytext.insert(p, insStr);
  }, LOCAL_ORIGIN);
}

export function StickyNoteEditor({
  doc,
  text,
  rect,
  scale,
  color,
  onClose,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(() => text.toString());

  // Focus + place caret at end on open.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  // Reflect external Y.Text changes (remote edits in later phases).
  useEffect(() => {
    const onChange = () => {
      const next = text.toString();
      setValue((cur) => (cur === next ? cur : next));
    };
    text.observe(onChange);
    return () => text.unobserve(onChange);
  }, [text]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        applyTextDiff(doc, text, next);
      }}
      onBlur={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        // Don't let canvas-level shortcuts fire while typing.
        e.stopPropagation();
      }}
      placeholder="Type…"
      className="pointer-events-auto absolute z-30 resize-none overflow-hidden rounded-[10px] text-gray-800 shadow-[var(--shadow-glossy)] outline-none ring-2 ring-ring placeholder:text-gray-500/50"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        backgroundColor: color,
        padding: 12 * scale,
        fontSize: 15 * scale,
        lineHeight: `${20 * scale}px`,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    />
  );
}
