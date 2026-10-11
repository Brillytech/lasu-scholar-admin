/*
  Brings a just-revealed side panel into view.

  The admin pages lay their side panels out in a column beside the main
  list on wide screens, but stack them *below* the whole list on narrow
  ones. Opening a panel there (Share Course, say) left the admin sitting
  at the top of a long list with no sign that anything had happened, and
  the longer the list the worse it got.
*/

/* Tailwind's `xl` breakpoint — at or above this the panels sit side by side. */
const SIDE_BY_SIDE_MIN_WIDTH = 1280;

/* Breathing room between the sticky header and the panel heading. */
const GAP = 12;

export function scrollPanelIntoView(
  element: HTMLElement | null,
  options: { stackedBelow?: number } = {}
) {
  if (!element || typeof window === "undefined") return;

  /*
    On wide screens the panel is already on screen in its own column, so
    scrolling the page would just yank the admin away from the list.
  */
  const stackedBelow = options.stackedBelow ?? SIDE_BY_SIDE_MIN_WIDTH;
  if (window.innerWidth >= stackedBelow) return;

  // The header is sticky, so scrolling to the raw offset hides the panel
  // heading underneath it.
  const header = document.querySelector("header");
  const headerHeight = header?.getBoundingClientRect().height || 0;

  const top =
    element.getBoundingClientRect().top + window.scrollY - headerHeight - GAP;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  window.scrollTo({
    top: Math.max(top, 0),
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });
}
