"use client";

// Overlay of other users' cursors: a rAF loop re-projects world-space positions through the viewport each frame.

import { useEffect, useRef } from "react";
import { type Viewport, worldToScreen } from "@/lib/canvas/viewport";
import type { CursorBuffer } from "@/lib/presence/throttle";
import type { Peer } from "@/lib/presence/usePresence";

type Props = {
  peers: Peer[];
  buffer: CursorBuffer;
  viewportRef: { readonly current: Viewport };
};

export function PresenceLayer({ peers, buffer, viewportRef }: Props) {
  const elRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    const loop = (now: number) => {
      const dt = lastRef.current ? now - lastRef.current : 16;
      lastRef.current = now;
      buffer.tick(dt);
      const vp = viewportRef.current;
      for (const [conn, el] of elRefs.current) {
        const w = buffer.get(conn);
        if (!w) {
          el.style.opacity = "0";
          continue;
        }
        const s = worldToScreen(vp, w.x, w.y);
        el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
        el.style.opacity = "1";
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, [buffer, viewportRef]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {peers.map((p) => (
        <div
          key={p.conn}
          ref={(el) => {
            if (el) elRefs.current.set(p.conn, el);
            else elRefs.current.delete(p.conn);
          }}
          className="absolute left-0 top-0 will-change-transform"
          style={{ opacity: 0 }}
        >
          <CursorGlyph color={p.color} />
        </div>
      ))}
    </div>
  );
}

function CursorGlyph({ color }: { color: string }) {
  return (
    <div className="relative">
      {/* Tip sits at the translate origin (0,0). */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        className="absolute left-0 top-0 drop-shadow-sm"
        aria-hidden
      >
        <path
          d="M1 1 L15 7 L8.5 8.5 L6 16 Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {/* Name pills removed (#10) — identification happens via the avatar stack
          at the top-right of the canvas. Color alone identifies the cursor here. */}
    </div>
  );
}
