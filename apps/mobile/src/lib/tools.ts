import type { ToolIconName } from '@/components/tool-icon';

/** Where the user is standing; every tool belongs to exactly one phase. */
export type Phase = 'shoot' | 'develop' | 'print';

interface ToolBase {
  id: string;
  label: string;
  icon: ToolIconName;
  phase: Phase;
  /** Two to four words under the label on a hub tile until a result exists. */
  blurb: string;
  /**
   * The screen fills the space it is given and never scrolls (an editor),
   * so in a phase stack it gets a standard header: a large title would sit
   * expanded for good, since nothing scrolls to collapse it.
   */
  fixedLayout?: boolean;
  /**
   * The screen pins a readout above its scroll view, so a large title could
   * never collapse (it needs the scroll view first). In a phase stack it
   * takes a standard header instead.
   */
  answerFirst?: boolean;
}

/**
 * A single screen at `/<phase>/<id>`, served by the phase's `[tool].tsx`. It
 * needs an entry in `TOOL_SCREENS` (`tool-screens.ts`), which the compiler
 * enforces.
 */
interface ScreenToolDef extends ToolBase {
  kind: 'screen';
  /**
   * The screen restores its inputs when reopened (its `@dorkroom/logic` hook
   * persists through `usePersistedCalculator`; the hydration tests are
   * `packages/logic/src/__tests__/hooks/use-lens-calculator.test.ts` and
   * `use-camera-exposure-calculator.test.ts`). Only such a tool can show a
   * "last result" on its hub tile: for one that resets, the tile would name an
   * answer the tool no longer shows.
   */
  persistsInputs?: boolean;
}

/**
 * A multi-screen section with route files of its own, at `/<phase>/<path>`
 * (Film Log, Recipes) or inside another section (Process Timer opens the
 * timer Recipes uses).
 */
interface SectionToolDef extends ToolBase {
  kind: 'section';
  path: string;
}

type ToolDef = ScreenToolDef | SectionToolDef;

// The iOS tool manifest (#455). Every other tool table is derived from it: the
// hubs, each phase's `[tool]` route (via `TOOL_SCREENS`), the legacy-path
// resolver and "recently used". The order below is the order of the hub tiles.
// `tool-manifest.test.ts` checks the route files and App Intents against it.
const TOOL_LIST = [
  {
    id: 'meter',
    label: 'Meter',
    icon: 'sun-medium',
    phase: 'shoot',
    blurb: 'Light meter',
    kind: 'screen',
    fixedLayout: true,
  },
  {
    id: 'film-log',
    label: 'Film Log',
    icon: 'film',
    phase: 'shoot',
    blurb: 'Rolls and shots',
    kind: 'section',
    path: 'film-log',
  },
  {
    id: 'reciprocity',
    label: 'Reciprocity',
    icon: 'timer',
    phase: 'shoot',
    blurb: 'Long exposure correction',
    kind: 'screen',
    answerFirst: true,
  },
  {
    id: 'camera-exposure',
    label: 'Camera Exposure',
    icon: 'aperture',
    phase: 'shoot',
    blurb: 'Equivalent exposures',
    kind: 'screen',
    persistsInputs: true,
    answerFirst: true,
  },
  {
    id: 'lens',
    label: 'Lenses',
    icon: 'focus',
    phase: 'shoot',
    blurb: 'Focal length equivalents',
    kind: 'screen',
    persistsInputs: true,
    answerFirst: true,
  },
  {
    id: 'recipes',
    label: 'Recipes',
    icon: 'flask-conical',
    phase: 'develop',
    blurb: 'Film and developer times',
    kind: 'section',
    path: 'recipes',
  },
  {
    id: 'timer',
    label: 'Process Timer',
    icon: 'hourglass',
    phase: 'develop',
    blurb: 'Development stages',
    kind: 'section',
    path: 'recipes/timer',
  },
  {
    id: 'negative-inverter',
    label: 'Inverter',
    icon: 'contrast',
    phase: 'develop',
    blurb: 'Negative to positive',
    kind: 'screen',
    fixedLayout: true,
  },
  {
    id: 'border',
    label: 'Border',
    icon: 'crop',
    phase: 'print',
    blurb: 'Print borders and easel',
    kind: 'screen',
    persistsInputs: true,
  },
  {
    id: 'exposure',
    label: 'Exposure',
    icon: 'gauge',
    phase: 'print',
    blurb: 'Print time by stops',
    kind: 'screen',
    answerFirst: true,
  },
  {
    id: 'resize',
    label: 'Resize',
    icon: 'ruler',
    phase: 'print',
    blurb: 'Scale a print',
    kind: 'screen',
    answerFirst: true,
  },
  {
    id: 'mat',
    label: 'Mat Cut',
    icon: 'frame',
    phase: 'print',
    blurb: 'Mat board cuts',
    kind: 'screen',
    persistsInputs: true,
  },
] as const satisfies readonly ToolDef[];

export type Tool = ToolDef & {
  /** Canonical expo-router path, e.g. `/print/exposure`. */
  route: string;
};

/** Id of a single-screen tool: one with a screen binding. */
export type ScreenToolId = Extract<
  (typeof TOOL_LIST)[number],
  { kind: 'screen' }
>['id'];

function toolRoute(def: ToolDef): string {
  return `/${def.phase}/${def.kind === 'screen' ? def.id : def.path}`;
}

export const TOOLS: readonly Tool[] = TOOL_LIST.map((def): Tool => ({
  ...def,
  route: toolRoute(def),
}));

export const PHASE_LABELS = {
  shoot: 'Shoot',
  develop: 'Develop',
  print: 'Print',
} satisfies Record<Phase, string>;

/** The phases in tab-bar order. */
const PHASE_ORDER: readonly Phase[] = ['shoot', 'develop', 'print'];

export interface PhaseInfo {
  id: Phase;
  label: string;
  /** The phase's tools in hub order. */
  toolIds: readonly string[];
}

export const PHASES: readonly PhaseInfo[] = PHASE_ORDER.map((id) => ({
  id,
  label: PHASE_LABELS[id],
  toolIds: TOOLS.filter((t) => t.phase === id).map((t) => t.id),
}));

/** Where Home lives: the app's initial route, the Search tab. */
export const HOME_ROUTE = '/';

/**
 * Settings, a pushed screen in each phase's stack so it has that hub underneath
 * (Back returns to it) and a link that arrives while it is open pushes the tool
 * on top. The gear on a hub opens its own phase's.
 */
export function settingsRoute(phase: Phase): string {
  return `/${phase}/settings`;
}

const TOOL_BY_ID = new Map(TOOLS.map((t) => [t.id, t]));

export function getTool(id: string): Tool | undefined {
  return TOOL_BY_ID.get(id);
}

export function isPhase(value: string): value is Phase {
  return PHASE_ORDER.some((phase) => phase === value);
}

export function getToolPhase(id: string): Phase | undefined {
  return getTool(id)?.phase;
}

export function toolsForPhase(phase: Phase): readonly Tool[] {
  return TOOLS.filter((t) => t.phase === phase);
}

/**
 * The single-screen tool a phase's `[tool]` route should render for `id`, or
 * undefined (not found) for an unknown id, a section, or another phase's tool.
 */
export function getScreenToolForPhase(
  phase: Phase,
  id: string | undefined
): Tool | undefined {
  const tool = id === undefined ? undefined : getTool(id);
  return tool?.kind === 'screen' && tool.phase === phase ? tool : undefined;
}

/**
 * Whether a tool's header is a large title. Fixed-layout and answer-first
 * screens (and the not-found state) take a standard one, since nothing would
 * scroll to collapse a large title.
 */
export function usesLargeTitle(tool: Tool | undefined): boolean {
  return tool !== undefined && !tool.fixedLayout && !tool.answerFirst;
}

/**
 * Id of a tool whose hub tile shows its last result: one that restores its
 * inputs (`persistsInputs`) and has a `Readout` to record (`answerFirst`).
 * Passing any other id to the recorder fails to compile.
 */
export type RecordingToolId = Extract<
  (typeof TOOL_LIST)[number],
  { persistsInputs: true; answerFirst: true }
>['id'];

/** Whether a tool's hub tile may show its last result (see `RecordingToolId`). */
export function recordsLastResult(id: string): id is RecordingToolId {
  const tool = getTool(id);
  return (
    tool?.kind === 'screen' &&
    tool.persistsInputs === true &&
    tool.answerFirst === true
  );
}
