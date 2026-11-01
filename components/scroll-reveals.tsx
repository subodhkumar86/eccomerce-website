"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSiteMotion } from "@/components/motion-provider";

/** Animate only on arrival; content remains visible without JavaScript or motion. */
export function ScrollReveals() {
  const pathname = usePathname();
  const { enabled } = useSiteMotion();

  useEffect(() => {
    if (!enabled || pathname.startsWith("/admin") || !("IntersectionObserver" in window)) return;
    const elements = document.querySelectorAll<HTMLElement>(
      ".section-head, .story-card, .editorial-copy, .studio-intro, .signature-note, .shopping-guide > div, .newsletter, .journal-card, .directory-card",
    );
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.reveal = "arrived";
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    elements.forEach(element => observer.observe(element));
    return () => {
      observer.disconnect();
      elements.forEach(element => delete element.dataset.reveal);
    };
  }, [enabled, pathname]);

  return null;
}
