/**
 * Whether to surface dev-only controls (currently the course-map DEV TOOLS card:
 * "Make reviews due now" / "Complete all lessons").
 *
 * True in local `vite dev` (`import.meta.env.DEV`), AND when a built/deployed
 * bundle is flagged with `VITE_DEV_TOOLS="true"`. That second path lets preview /
 * staging deployments expose the controls while we're still testing, without
 * shipping them in a plain production build (flag unset → hidden). Fully
 * reversible: remove the `VITE_DEV_TOOLS` env var and rebuild to hide them.
 *
 * Note: this intentionally governs only the in-app DEV TOOLS controls, NOT the
 * dev guest/anonymous sign-in paths, which stay gated on `import.meta.env.DEV`
 * so a deployment never opens an auth bypass.
 */
export const devToolsEnabled = (): boolean =>
  import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === "true";
