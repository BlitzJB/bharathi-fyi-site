"use client";

import { useEffect } from "react";

/**
 * Landing-page chrome: a docking bar that fades in once the page scrolls,
 * paired with the hero wordmark (rendered by the page) which is sticky and
 * scales down into the bar. State rides on the <html> element so plain CSS
 * drives both transitions; detection is an IntersectionObserver on the
 * sentinel this component renders at the top of the page.
 */
export function LanderChrome() {
  useEffect(() => {
    const sentinel = document.getElementById("lander-top-sentinel");
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      document.documentElement.toggleAttribute(
        "data-lander-scrolled",
        !entry.isIntersecting,
      );
    });
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      document.documentElement.removeAttribute("data-lander-scrolled");
    };
  }, []);

  return (
    <>
      <div
        id="lander-top-sentinel"
        aria-hidden
        className="absolute top-0 h-6 w-px"
      />
      <div aria-hidden className="lander-bar fixed inset-x-0 top-0 z-40 h-12" />
    </>
  );
}
