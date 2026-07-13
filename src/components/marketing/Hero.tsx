"use client";

// Landing hero: one orchestrated page-load sequence. Every element rises on the
// same parent stagger — eyebrow, headline, copy, form, spec sheet — and the
// figure plate lands last with a slightly longer settle.

import { motion } from "framer-motion";
import { AuthForm } from "@/components/AuthForm";
import { rise, riseStagger, EASE_EDITORIAL } from "@/lib/motion";
import { LiveDemo } from "./LiveDemo";

const SPECS: [string, string][] = [
  ["Sync", "Yjs CRDT"],
  ["Transport", "Supabase Realtime"],
  ["Storage", "Postgres + RLS"],
  ["Offline", "IndexedDB cache"],
];

export function Hero() {
  return (
    <section className="border-t border-border">
      <motion.div
        className="mx-auto max-w-6xl px-6"
        variants={riseStagger}
        initial="hidden"
        animate="shown"
      >
        <div className="grid gap-12 pt-20 pb-16 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          {/* Headline column */}
          <div>
            <motion.p variants={rise} className="label-mono">
              Real-time / CRDT-synced / Offline-capable
            </motion.p>
            <motion.h1
              variants={rise}
              className="mt-6 font-display text-5xl font-medium leading-[0.98] tracking-tight text-foreground sm:text-6xl"
            >
              Whiteboard together,
              <br />
              <em className="font-normal italic text-primary">in real time.</em>
            </motion.h1>
            <motion.p
              variants={rise}
              className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground"
            >
              A multiplayer canvas where every stroke, sticky note, and shape
              merges instantly across the room — and keeps working after you go
              offline.
            </motion.p>
            <motion.div variants={rise} className="mt-9 max-w-md">
              <AuthForm />
            </motion.div>
          </div>

          {/* Spec sheet */}
          <motion.dl
            variants={rise}
            className="hidden self-end border-l border-border pl-6 lg:block"
          >
            {SPECS.map(([k, v], i) => (
              <div
                key={k}
                className={`group/row flex items-baseline justify-between gap-6 py-3 transition-colors duration-[var(--dur-fast)] ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <dt className="label-mono transition-colors duration-[var(--dur-fast)] group-hover/row:text-foreground">
                  {k}
                </dt>
                <dd className="font-mono text-sm text-foreground transition-colors duration-[var(--dur-fast)] group-hover/row:text-primary">
                  {v}
                </dd>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* Figure plate — the last beat: a longer, quieter settle. */}
        <motion.figure
          variants={{
            hidden: { opacity: 0, y: 12 },
            shown: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.56, ease: EASE_EDITORIAL },
            },
          }}
          className="border-t border-border pt-8 pb-20"
        >
          <LiveDemo />
          <figcaption className="label-mono mt-3">
            fig.01 — a shared canvas, mid-session
          </figcaption>
        </motion.figure>
      </motion.div>
    </section>
  );
}
