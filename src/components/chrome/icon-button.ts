import { cn } from "../../lib/cn";

/**
 * The single source of truth for the app's icon-button hover treatment.
 *
 * The visual standard is HeroUI's modal close button (see `ui/modal.tsx`'s
 * `CloseTrigger`): at rest it's just the icon (`text-muted`, transparent); on
 * hover a STATIC `rounded-xl` (12px) square fills with `bg-default` and the icon
 * brightens to `text-foreground`, animated with `transition-colors`. Focus shows
 * a 2px accent ring.
 *
 * Only the parts that must look identical everywhere live here — SHAPE (static
 * `rounded-xl`, never a circle→square morph), BG, ICON-COLOR, TRANSITION, FOCUS,
 * and the DISABLED look. Everything else stays at the call site: pass the `size`
 * knob (some buttons are `size-9`, some `size-10`) and any positioning/extra
 * classes via `className`, and keep each button's own `onClick` / `aria-label` /
 * children.
 *
 * @example
 * <button type="button" className={iconButtonClass({ size: "size-9" })}>…</button>
 *
 * @example // JS-derived disabled (a real `<button disabled>`):
 * <button disabled={disabled} className={iconButtonClass({ disabled })}>…</button>
 */
export function iconButtonClass({
  size = "size-10",
  disabled = false,
  className,
}: {
  /** Tailwind size utility for the square hit target (e.g. `"size-9"`). */
  size?: string;
  /**
   * Render the disabled look (`text-muted/40`, `cursor-not-allowed`, no hover
   * bg). Use with a real `<button disabled>` for buttons whose disabled state is
   * derived in JS (e.g. the step chevrons). For an always-mounted button that
   * toggles via the `disabled` attribute, leave this `false` and pass the
   * Tailwind `disabled:` variants through `className` instead.
   */
  disabled?: boolean;
  /** Positioning / layout extras. Must NOT include shape, bg, color, transition,
   * or focus classes — those are owned here so every icon button stays uniform. */
  className?: string;
} = {}): string {
  return cn(
    // Shape + layout + motion + focus — identical for every icon button.
    "grid shrink-0 place-items-center rounded-xl outline-none",
    "transition-colors duration-200 ease-out motion-reduce:transition-none",
    "focus-visible:ring-2 focus-visible:ring-accent",
    size,
    disabled
      ? "cursor-not-allowed text-muted/40"
      : "text-muted hover:bg-default hover:text-foreground",
    className,
  );
}
