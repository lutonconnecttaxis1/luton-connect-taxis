/**
 * Small progressive-enhancement layer for the homepage:
 *  - header turns solid after scrolling
 *  - scroll progress bar
 *  - gentle hero parallax
 *  - fade/slide reveal of [data-reveal] elements as they enter the viewport
 *  - arrow buttons for the hotel scroller
 * Everything is skipped (content simply shows) when the user prefers reduced motion.
 * Returns a cleanup function.
 */
export function initHomeEffects(): () => void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector<HTMLElement>("[data-header]");
  const progress = document.querySelector<HTMLElement>("[data-progress]");
  const hero = document.querySelector<HTMLElement>("[data-hero]");

  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    header?.classList.toggle("is-solid", y > 40);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty("--p", String(max > 0 ? Math.min(1, y / max) : 0));
    }
    if (hero && !reduce && y < window.innerHeight * 1.2) {
      hero.style.setProperty("--shift", `${(y * 0.16).toFixed(1)}px`);
    }
    ticking = false;
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  update();

  // Reveal on scroll
  const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
  let observer: IntersectionObserver | undefined;
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
  } else {
    // "clip" reveals start fully clipped away (clip-path: inset(0 0 100% 0)). Chrome treats a fully
    // clipped element as not on screen, so watching it directly would never fire and the photo
    // would stay hidden forever. Watch its (unclipped) parent instead and reveal the child with it.
    const revealWith = new Map<Element, HTMLElement[]>();
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (revealWith.get(entry.target) ?? [entry.target as HTMLElement]).forEach((el) =>
              el.classList.add("is-in"),
            );
            observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    items.forEach((el) => {
      const watch = el.dataset.reveal === "clip" && el.parentElement ? el.parentElement : el;
      if (watch !== el) revealWith.set(watch, [...(revealWith.get(watch) ?? []), el]);
      observer?.observe(watch);
    });
  }

  // Hotel scroller arrows
  const onClick = (event: Event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-scroll-dir]");
    if (!button) return;
    const target = document.querySelector<HTMLElement>(button.dataset.scrollTarget ?? "");
    if (!target) return;
    const dir = Number(button.dataset.scrollDir);
    target.scrollBy({
      left: dir * Math.min(target.clientWidth * 0.8, 520),
      behavior: reduce ? "auto" : "smooth",
    });
  };
  document.addEventListener("click", onClick);

  return () => {
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("click", onClick);
    observer?.disconnect();
  };
}
