"use client";

// Thin sticky landing nav. A hairline + faint backdrop fade in only once the page
// has scrolled, so the bar sits silent at the top and firms up as you move down.

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoWordmark } from "@/components/Logo";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-[var(--dur-base)] [transition-timing-function:var(--ease-editorial)] ${
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <LogoWordmark />
        <Link
          href="/login"
          className="hover-underline text-sm font-medium text-foreground/80 transition-colors duration-[var(--dur-fast)] hover:text-foreground"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
