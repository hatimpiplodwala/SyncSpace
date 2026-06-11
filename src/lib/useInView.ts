"use client";

// Fire-once IntersectionObserver: returns a ref and whether it has entered the
// viewport yet. Used to trigger `.rise-in-view` entrances on scroll. Stays true
// after the first intersection so the element doesn't re-animate on scroll-back.

import { useEffect, useRef, useState } from "react";

export function useInView<T extends HTMLElement = HTMLElement>(
  options: IntersectionObserverInit = { rootMargin: "0px 0px -12% 0px" },
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);
    observer.observe(el);
    return () => observer.disconnect();
    // options is a fresh object each render; intentionally observe once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return [ref, inView];
}
