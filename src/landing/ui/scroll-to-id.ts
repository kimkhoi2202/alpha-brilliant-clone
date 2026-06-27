/** Smooth-scroll to an in-page section by id (used by nav + hero CTAs). */
export function scrollToId(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
