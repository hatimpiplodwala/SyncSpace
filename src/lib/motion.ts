// Framer-motion dialect of the CSS motion vocabulary in globals.css — the same
// curve, rise distance, and stagger cadence as `.rise`, so CSS-animated server
// pages and framer-animated client sections read as one hand.
//
// Reduced motion is handled globally by <MotionConfig reducedMotion="user">
// in the root layout: users with the OS setting get no transform motion.

import type { Variants } from "framer-motion";

export const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;

/** Quiet entrance: small lift + fade on the editorial curve (mirrors `.rise`). */
export const rise: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: EASE_EDITORIAL },
  },
};

/** Parent orchestrator: staggers `rise` children 60ms apart (mirrors `--i`). */
export const riseStagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06 } },
};
