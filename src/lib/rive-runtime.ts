import { RuntimeLoader } from "@rive-app/react-webgl2";

/*
 * Self-host Rive's WebGL2 runtime instead of pulling it from a CDN at runtime:
 * the same self-hosting approach Brilliant uses. public/rive/rive.wasm is a copy
 * of the wasm that ships with the installed @rive-app/webgl2, so the wasm and the
 * JS runtime are always the same version. To upgrade Rive: bump the npm package,
 * then refresh the wasm with:
 *   node -e "const p=require('path'),f=require('fs');f.copyFileSync(require.resolve('@rive-app/webgl2/rive.wasm',{paths:[p.dirname(require.resolve('@rive-app/react-webgl2/package.json'))]}),'public/rive/rive.wasm')"
 *
 * setWasmUrl must run before any Rive instance initializes, so this module is
 * imported purely for its side effect by every Rive entry point (see RivePlayer).
 */
RuntimeLoader.setWasmUrl("/rive/rive.wasm");

/** Keep in sync with the installed @rive-app/webgl2 version. */
export const RIVE_RUNTIME_VERSION = "2.38.2";
export const RIVE_WASM_URL = "/rive/rive.wasm";
export const RIVE_WASM_SOURCE =
  "https://unpkg.com/@rive-app/webgl2@2.38.2/rive.wasm";

/** One change to a state-machine input: set a value, or fire a trigger. */
export interface RiveInputAction {
  name: string;
  value?: number | boolean;
  fire?: boolean;
}

/** A named combination of input changes that puts a state machine into a state. */
export interface RivePreset {
  label: string;
  /** Apply against this state machine (defaults to whatever is playing). */
  machine?: string;
  actions: RiveInputAction[];
}

export interface RiveAsset {
  id: string;
  title: string;
  description: string;
  /** Served path under /public. */
  src: string;
  /** Original Brilliant origin (for reference). */
  source: string;
  /** Full-bleed / full-height animation (taller stage). */
  tall?: boolean;
  /** One-click input combinations for the showcase. */
  presets?: RivePreset[];
  /** Inputs applied once on load (mirrors how the app drives the asset). */
  initialInputs?: RiveInputAction[];
  /** ViewModel boolean properties set on load via data binding. */
  viewModelBooleans?: Record<string, boolean>;
}

/** The Rive animations cloned from Brilliant, self-hosted under /public/rive. */
export const RIVE_ASSETS: RiveAsset[] = [
  {
    id: "gameboard",
    title: "Course-map gameboard",
    description:
      "The animated lesson path. One “Gameboard Node” artboard drives every map state via the node_all inputs. Try the presets.",
    src: "/rive/koji-gameboard.e2320c48.riv",
    source: "https://brilliant.org/rive/koji-gameboard.e2320c48.riv",
    // Show the active blue node by default (color index 1 = Blue, like the app).
    initialInputs: [
      { name: "color", value: 1 },
      { name: "select", value: true },
      { name: "koji_appear", fire: true },
    ],
    // node_all input combinations. Values are best-effort guesses from the input
    // names; tweak freely, the Drive panel shows every real input.
    presets: [
      {
        label: "Locked",
        machine: "node_all",
        actions: [
          { name: "select", value: false },
          { name: "completed", value: false },
          { name: "hover", value: false },
          { name: "padlock", value: true },
          { name: "meter_locked", value: true },
        ],
      },
      {
        label: "Active + Koji",
        machine: "node_all",
        actions: [
          { name: "padlock", value: false },
          { name: "meter_locked", value: false },
          { name: "completed", value: false },
          { name: "hover", value: false },
          { name: "select", value: true },
          { name: "start_idle", value: true },
          { name: "icon", value: 1 },
          { name: "koji_appear_enter", fire: true },
        ],
      },
      {
        label: "Hover",
        machine: "node_all",
        actions: [
          { name: "padlock", value: false },
          { name: "meter_locked", value: false },
          { name: "select", value: false },
          { name: "completed", value: false },
          { name: "hover", value: true },
        ],
      },
      {
        label: "Completed",
        machine: "node_all",
        actions: [
          { name: "padlock", value: false },
          { name: "meter_locked", value: false },
          { name: "select", value: false },
          { name: "hover", value: false },
          { name: "completed", value: true },
        ],
      },
    ],
  },
  {
    id: "lesson-loader",
    title: "Lesson loader",
    description:
      "Full-screen loader shown while a lesson boots: Koji + a dumbbell with rotating status text (“Analyzing your progress”, “Generating problems”…).",
    src: "/rive/lesson-loader.ac940c03.riv",
    source: "https://brilliant.org/rive/lesson-loader.ac940c03.riv",
    tall: true,
  },
  {
    id: "ask-koji",
    title: "Ask Koji",
    description:
      "Koji, Brilliant’s mascot button. Pick the “ask-koji-button” state machine and fire play-enter. Koji swoops in and idles. The default machine only draws the “< >” frame; the orange spinning brackets are the loading-thinking state.",
    src: "/rive/ask_koji.d6b3e730.riv",
    source: "https://brilliant.org/rive/ask_koji.d6b3e730.riv",
  },
  {
    id: "lightning",
    title: "Lightning (streak bolt)",
    description:
      "The energy/streak bolt. The bolt is hidden by default (“No Bolt”). Flip the state-machine input below to reveal it.",
    src: "/rive/lightning.6513fd63.riv",
    source: "https://brilliant.org/rive/lightning.6513fd63.riv",
  },
  {
    id: "lcr-koji-transition",
    title: "Koji transition (lesson → review)",
    description:
      "Koji's full-screen transition when you finish a lesson / skill check: he swoops in, plays a success beat (small / medium / big), then exits into the review. Built on the LCRTransitionVM view-model; the exit* state-machine inputs trigger the outro. Use Playing to pick a timeline (e.g. enterSwoop, success-medium) or fire the Drive inputs.",
    src: "/rive/lcr-koji-transition.c8f8f68d.riv",
    source: "https://brilliant.org/rive/lcr-koji-transition.c8f8f68d.riv",
  },
  {
    id: "endstate",
    title: "Streak end-state",
    description:
      "The end-of-lesson celebration (the “Standard End-state Template” artboard): Koji and the energy bolt animate in with your streak number. Has first-streak / milestone / standard variants; pick a timeline under Playing (e.g. intro_standard_v04) to preview each.",
    src: "/rive/endstate.4a4b706c.riv",
    source: "https://brilliant.org/rive/endstate.4a4b706c.riv",
    tall: true,
  },
  {
    id: "streak-fire",
    title: "Dynamic streak fire",
    description:
      "The animated streak flame with the day count baked in: the number is data-bound via the UserStreakVM “streak” property. Used in place of the 🔥 emoji wherever the streak shows.",
    src: "/rive/dynamic-streak-fire.riv",
    source:
      "https://rive.app/marketplace/27337-51650-dynamic-streak-fire/",
  },
  {
    id: "congratulations",
    title: "Congratulations badge",
    description:
      "A gold award badge with a firework burst, the lesson-complete centerpiece. Fire the “Trigger explosion” input (State Machine 1) to play it; “Reset” replays.",
    src: "/rive/congratulations.riv",
    source: "https://rive.app/marketplace/3335-6999-congratulations/",
  },
  {
    id: "confetti",
    title: "Confetti",
    description:
      "A full-screen confetti burst (stars + streamers) for celebrations. Autoplays via State Machine 1. Paired with the badge on lesson complete.",
    src: "/rive/confetti-animation.riv",
    source: "https://rive.app/marketplace/15285-28806-confetti-animation/",
    tall: true,
  },
];

/** Direct paths for in-app integrations. */
export const GAMEBOARD_RIV = "/rive/koji-gameboard.e2320c48.riv";
export const LESSON_LOADER_RIV = "/rive/lesson-loader.ac940c03.riv";
export const ASK_KOJI_RIV = "/rive/ask_koji.d6b3e730.riv";
export const LIGHTNING_RIV = "/rive/lightning.6513fd63.riv";
export const LCR_KOJI_TRANSITION_RIV = "/rive/lcr-koji-transition.c8f8f68d.riv";
export const ENDSTATE_RIV = "/rive/endstate.4a4b706c.riv";
export const STREAK_FIRE_RIV = "/rive/dynamic-streak-fire.riv";
export const DUOLINGO_FIRE_RIV = "/rive/duolingo-fire.riv";
export const CONGRATULATIONS_RIV = "/rive/congratulations.riv";
export const CONFETTI_RIV = "/rive/confetti-animation.riv";
