import type { Href } from 'expo-router';
import type { ToolIconName } from '@/components/tool-icon';

export type ToolCategory =
  'printing' | 'film' | 'camera' | 'reference' | 'system';

export interface Tool {
  id: string;
  label: string;
  icon: ToolIconName;
  route: Href; // expo-router pathname for the More-stack detail route
  category: ToolCategory;
  /**
   * Route file name under `app/(tabs)` for a single-screen tool that can be
   * pinned as a tab (`border` lives at `index`, `lens` at `lenses`). Tools
   * with a `tabRoute` must also have an entry in `TOOL_SCREENS`
   * (`tool-screens.ts`) and `TAB_ICONS` (`tab-icons.ts`), which the compiler
   * enforces. Film Log and Recipes
   * have none: they are permanent directory tabs with their own stacks.
   */
  tabRoute?: string;
  /**
   * Whether the user can pin/unpin this tool via Edit Tabs. Defaults to true.
   * `film-log` is a permanent tab (always in the bar, not user-managed), so it
   * sets this false to stay out of the pin editor and the pinned-id store.
   * Use `isPinnable(tool)` rather than reading this field directly — it also
   * accounts for `comingSoon`.
   */
  pinnable?: boolean;
  /**
   * Screen is a ComingSoon stub. Not pinnable, and badged in More.
   */
  comingSoon?: boolean;
}

// The iOS tool manifest (#455). Every other tool table is derived from it:
// the tab bar (`app/(tabs)/_layout.tsx`), the More detail route
// (`more/[tool].tsx`, via `TOOL_SCREENS`; tab icons via `TAB_ICONS`), and the deep-link resolver.
// `tool-manifest.test.ts` checks the route files, tab icons, icon generator
// and App Intents against it.
const TOOL_LIST = [
  {
    id: 'border',
    label: 'Border',
    icon: 'crop',
    route: '/more/border',
    tabRoute: 'index',
    category: 'printing',
  },
  {
    id: 'resize',
    label: 'Resize',
    icon: 'ruler',
    route: '/more/resize',
    tabRoute: 'resize',
    category: 'printing',
  },
  {
    id: 'exposure',
    label: 'Exposure',
    icon: 'gauge',
    route: '/more/exposure',
    tabRoute: 'exposure',
    category: 'printing',
  },
  {
    id: 'mat',
    label: 'Mat Cut',
    icon: 'frame',
    route: '/more/mat',
    tabRoute: 'mat',
    category: 'printing',
  },
  {
    id: 'reciprocity',
    label: 'Reciprocity',
    icon: 'timer',
    route: '/more/reciprocity',
    tabRoute: 'reciprocity',
    category: 'film',
  },
  {
    id: 'film-log',
    label: 'Film Log',
    icon: 'film',
    // Multi-screen section with its own nested stack. It's a permanent tab (see
    // (tabs)/_layout.tsx), so it's not user-pinnable; still listed in More.
    route: '/film-log',
    category: 'film',
    pinnable: false,
  },
  {
    id: 'recipes',
    label: 'Recipes',
    icon: 'flask-conical',
    // Multi-screen section (list + detail) with its own nested stack, like Film
    // Log — a permanent tab (see (tabs)/_layout.tsx), so it's not user-pinnable;
    // still listed in More.
    route: '/development',
    category: 'film',
    pinnable: false,
  },
  {
    id: 'lens',
    label: 'Lenses',
    icon: 'focus',
    route: '/more/lens',
    tabRoute: 'lenses',
    category: 'camera',
  },
  {
    id: 'camera-exposure',
    label: 'Camera Exposure',
    icon: 'aperture',
    route: '/more/camera-exposure',
    tabRoute: 'camera-exposure',
    category: 'camera',
  },
  {
    id: 'meter',
    label: 'Meter',
    icon: 'sun-medium',
    route: '/more/meter',
    tabRoute: 'meter',
    category: 'camera',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    route: '/more/settings',
    tabRoute: 'settings',
    category: 'system',
  },
] as const satisfies readonly Tool[];

export const TOOLS: readonly Tool[] = TOOL_LIST;

/** Id of a single-screen tool: one with a tab route and a screen binding. */
export type ScreenToolId = Extract<
  (typeof TOOL_LIST)[number],
  { tabRoute: string }
>['id'];

export const DEFAULT_PINNED_IDS: readonly string[] = [
  'meter',
  'border',
  'reciprocity',
  'exposure',
];

export const CATEGORY_ORDER: readonly ToolCategory[] = [
  'printing',
  'film',
  'camera',
  'reference',
  'system',
];

export const CATEGORY_LABELS = {
  printing: 'Printing',
  film: 'Film',
  camera: 'Camera',
  reference: 'Reference',
  system: 'System',
} satisfies Record<ToolCategory, string>;

const TOOL_BY_ID = new Map(TOOLS.map((t) => [t.id, t]));

export function getTool(id: string): Tool | undefined {
  return TOOL_BY_ID.get(id);
}

const TOOL_ID_BY_TAB_ROUTE = new Map(
  TOOLS.flatMap((t): [string, string][] =>
    t.tabRoute === undefined ? [] : [[t.tabRoute, t.id]]
  )
);

/** Reverse of `Tool.tabRoute`: the tool a tab route file belongs to. */
export function getToolIdForTabRoute(routeName: string): string | undefined {
  return TOOL_ID_BY_TAB_ROUTE.get(routeName);
}

/** Whether a tool can be pinned/unpinned via Edit Tabs: opted out via
 * `pinnable: false`, or a `comingSoon` stub that has nothing to pin yet. */
export function isPinnable(tool: Tool): boolean {
  return tool.pinnable !== false && tool.comingSoon !== true;
}
