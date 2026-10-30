import {
  Aperture,
  BookOpen,
  Camera,
  Crop,
  Film,
  FlaskConical,
  Focus,
  Frame,
  Gauge,
  GitBranch,
  Home,
  type LucideIcon,
  Newspaper,
  Printer,
  Ruler,
  Settings,
  Timer,
} from 'lucide-react';
import { type ComponentType, createElement } from 'react';
import type { AccentTone } from '../components/calculator/accent-tone';
import type { NavigationItem } from '../components/navigation-dropdown';

// Wrap Lucide icons so typeof component is 'function' in tests
const asFunctionComponent =
  (Icon: ComponentType<{ className?: string; size?: number | string }>) =>
  (props: { className?: string; size?: number | string }) =>
    createElement(Icon, props);

export const CATEGORY_LABELS = {
  printing: 'Printing',
  film: 'Film',
  camera: 'Camera',
  reference: 'Reference',
} as const;

export type ToolCategory = keyof typeof CATEGORY_LABELS;

/** Section order in the desktop dropdowns and the mobile sidebar. */
export const CATEGORY_ORDER: readonly ToolCategory[] = [
  'printing',
  'film',
  'camera',
  'reference',
];

interface ToolManifestEntry {
  /** Route pathname. */
  to: string;
  /** Short nav label (desktop dropdown and mobile sidebar). */
  label: string;
  /** One-line summary in the desktop dropdown. */
  summary: string;
  icon: LucideIcon;
  category: ToolCategory;
  /** Page identity tone: the page header tile and the home card. */
  accent?: AccentTone;
  /** Full document navigation: the path is owned by another microfrontend
   *  (e.g. /docs), so the edge must route the real request. */
  reload?: boolean;
  /** Home page tool card copy. Tools without one get no card. */
  card?: {
    title: string;
    description: string;
    /** Position in the home grid. It groups by category like the nav but
     *  orders within a category differently (Stops before Resize,
     *  Reciprocity before Development). */
    order: number;
    /** Overrides `icon` on the card only. */
    icon?: LucideIcon;
  };
}

/**
 * The web tool manifest (#455): every tool the nav, mobile sidebar, home cards
 * and page header accents list, in nav order. Those tables are all derived
 * from this array, so adding a tool is one entry here plus its route.
 * ROUTE_TITLES / ROUTE_DESCRIPTIONS below stay separate: the OG image and meta
 * endpoints read them for non-tool routes too.
 */
const TOOL_LIST = [
  {
    to: '/border',
    label: 'Border',
    summary: 'Trim-safe borders with print guides.',
    icon: Crop,
    category: 'printing',
    accent: 'indigo',
    card: {
      title: 'Border Calculator',
      description: 'Print borders & trim guides',
      order: 1,
    },
  },
  {
    to: '/resize',
    label: 'Resize',
    summary: 'Scale prints without endless test strips.',
    icon: Ruler,
    category: 'printing',
    accent: 'teal',
    card: {
      title: 'Resize Calculator',
      description: 'Scale prints, no wasting test strips',
      order: 3,
    },
  },
  {
    to: '/stops',
    label: 'Stops',
    summary: 'Translate exposure stops into seconds.',
    icon: Gauge,
    category: 'printing',
    accent: 'blue',
    card: {
      title: 'Stops Calculator',
      description: 'F-stop & time math',
      order: 2,
    },
  },
  {
    to: '/mat',
    label: 'Mat',
    summary: 'Window openings and cutter settings for mats.',
    icon: Frame,
    category: 'printing',
    accent: 'cyan',
    card: {
      title: 'Mat Cut Calculator',
      description: 'Window openings & cut guides',
      order: 4,
    },
  },
  {
    to: '/development',
    label: 'Development',
    summary: 'Film and developer pairings with times.',
    icon: FlaskConical,
    category: 'film',
    // Home card only: the recipes page header sets no accent tone.
    accent: 'rose',
    card: {
      title: 'Film Development Recipes',
      description: 'B&W film development database',
      order: 6,
    },
  },
  {
    to: '/reciprocity',
    label: 'Reciprocity',
    summary: 'Correct for long exposure failure.',
    icon: Timer,
    category: 'film',
    accent: 'amber',
    card: {
      title: 'Reciprocity',
      description: 'Film long exposure correction',
      order: 5,
    },
  },
  {
    to: '/lenses',
    label: 'Lenses',
    summary: 'Equivalent focal lengths across formats.',
    icon: Focus,
    category: 'camera',
    accent: 'emerald',
    card: {
      title: 'Lens Equivalency',
      description: 'Compare format lens differences',
      order: 7,
    },
  },
  {
    to: '/exposure',
    label: 'Exposure',
    summary: 'Balance aperture, shutter, and ISO on set.',
    icon: Aperture,
    category: 'camera',
    accent: 'teal',
    card: {
      title: 'Camera Exposure',
      description: 'Equivalent exposure calculator',
      order: 8,
      icon: Camera,
    },
  },
  {
    to: '/films',
    label: 'Films',
    summary: 'Browse and search the film stock database.',
    icon: Film,
    category: 'reference',
    accent: 'cyan',
    card: {
      title: 'Film Database',
      description: 'Browse film stocks by brand & ISO',
      order: 9,
    },
  },
  {
    to: '/docs',
    label: 'Docs',
    summary: 'Guides and documentation for analog photography.',
    icon: BookOpen,
    category: 'reference',
    // Served by the docs microfrontend, not this SPA — force a full document
    // navigation so the edge routes /docs to the docs app. See navigation-dropdown.
    reload: true,
  },
] as const satisfies readonly ToolManifestEntry[];

/** A route pathname that has a tool manifest entry. */
export type ToolRoute = (typeof TOOL_LIST)[number]['to'];

// Widened for iteration: the literal union has entries without `card`,
// `accent` or `reload`, so reading those fields needs the declared shape.
const TOOL_MANIFEST: readonly (ToolManifestEntry & { to: ToolRoute })[] =
  TOOL_LIST;

// One wrapped icon per tool, shared by the desktop and mobile nav entries.
const TOOL_NAV = TOOL_MANIFEST.map((tool) => ({
  tool,
  icon: asFunctionComponent(tool.icon),
}));

function navItemsIn(category: ToolCategory): NavigationItem[] {
  return TOOL_NAV.filter(({ tool }) => tool.category === category).map(
    ({ tool, icon }) => ({
      label: tool.label,
      to: tool.to,
      icon,
      summary: tool.summary,
      ...(tool.reload && { reload: true }),
    })
  );
}

export const printingItems: NavigationItem[] = navItemsIn('printing');
export const filmItems: NavigationItem[] = navItemsIn('film');
export const cameraItems: NavigationItem[] = navItemsIn('camera');
export const referenceItems: NavigationItem[] = navItemsIn('reference');

export const navItems: NavigationItem[] = [
  {
    label: 'Home',
    to: '/',
    icon: asFunctionComponent(Home),
    summary: 'Skip the math. Make prints.',
  },
];

export interface NavigationCategory {
  label: string;
  icon: ComponentType<{ className?: string }>;
  items: NavigationItem[];
}

const CATEGORY_ICONS = {
  printing: Printer,
  film: Film,
  camera: Camera,
  reference: BookOpen,
} satisfies Record<ToolCategory, LucideIcon>;

const ITEMS_BY_CATEGORY = {
  printing: printingItems,
  film: filmItems,
  camera: cameraItems,
  reference: referenceItems,
} satisfies Record<ToolCategory, NavigationItem[]>;

export const navigationCategories: NavigationCategory[] = CATEGORY_ORDER.map(
  (category) => ({
    label: CATEGORY_LABELS[category],
    icon: asFunctionComponent(CATEGORY_ICONS[category]),
    items: ITEMS_BY_CATEGORY[category],
  })
);

export const allNavItems = [
  ...navItems,
  ...printingItems,
  ...filmItems,
  ...cameraItems,
  ...referenceItems,
];

/**
 * Resolve the lucide icon for a route from the nav metadata, so calculator
 * page headers render the same icon as home/nav without re-importing icons
 * per page. Returns `undefined` for routes without a nav entry.
 */
export function getRouteIcon(
  to: string
): ComponentType<{ className?: string }> | undefined {
  return allNavItems.find((item) => item.to === to)?.icon;
}

/**
 * Resolve a page's accent tone from the tool manifest, so the page header
 * tile matches its home card. Returns `undefined` for routes without one.
 */
export function getRouteAccent(to: ToolRoute): AccentTone | undefined {
  return TOOL_MANIFEST.find((tool) => tool.to === to)?.accent;
}

export interface HomeToolCard {
  category: (typeof CATEGORY_LABELS)[ToolCategory];
  title: string;
  description: string;
  href: ToolRoute;
  icon: LucideIcon;
  accent: AccentTone;
}

/** Home page tool cards, derived from the tool manifest, in `card.order`. */
export const homeToolCards: readonly HomeToolCard[] = TOOL_MANIFEST.flatMap(
  (tool) =>
    tool.card && tool.accent
      ? [
          {
            order: tool.card.order,
            card: {
              category: CATEGORY_LABELS[tool.category],
              title: tool.card.title,
              description: tool.card.description,
              href: tool.to,
              icon: tool.card.icon ?? tool.icon,
              accent: tool.accent,
            },
          },
        ]
      : []
)
  .sort((a, b) => a.order - b.order)
  .map(({ card }) => card);

/**
 * Page copy keyed by route pathname. The root route and the OG image/meta
 * endpoints look up an arbitrary pathname, so the key stays open.
 */
interface RouteTextByPath {
  readonly [path: string]: string;
}

// Copied verbatim in utils/routeMetadata.ts; keep both in sync
// (tools/__tests__/route-metadata-sync.test.ts fails if they diverge).
export const ROUTE_TITLES: RouteTextByPath = {
  '/': 'Home',
  '/border': 'Border Calculator',
  '/resize': 'Print Resize Calculator',
  '/reciprocity': 'Reciprocity Failure Calculator',
  '/stops': 'Stops Calculator',
  '/mat': 'Mat Cut Calculator',
  '/exposure': 'Exposure Calculator',
  '/lenses': 'Lens Equivalency Calculator',
  '/development': 'Development Recipes',
  '/films': 'Film Database',
  '/docs': 'Documentation',
  '/privacy': 'Privacy',
  '/settings': 'Settings',
};

export const ROUTE_DESCRIPTIONS: RouteTextByPath = {
  '/': 'Film photography calculators and resources for analog photographers. Development recipes, printing calculators, and exposure tools.',
  '/border':
    'Figure out where to set your easel blades for even borders. Punch in paper size and negative format, get blade positions.',
  '/resize':
    'Scale darkroom prints to new sizes. Calculate exposure adjustments when enlarging or reducing print dimensions.',
  '/reciprocity':
    'Compensate for reciprocity failure in long exposures. Get corrected exposure times for film stocks like Ilford HP5, Kodak Tri-X, and more.',
  '/stops':
    'Convert between exposure stops and seconds. Translate f-stop or time adjustments into exposure values.',
  '/mat':
    'Plan single-window mats with independent borders. Get exact window openings and mat cutter guide-bar settings, with best-fit borders for your artwork.',
  '/exposure':
    'Balance aperture, shutter speed, and ISO for correct exposure. Calculate equivalent exposures across different settings.',
  '/lenses':
    'Calculate equivalent focal lengths between sensor and film formats. Compare APS-C, Full Frame, and Medium Format field of view.',
  '/development':
    'Browse film and developer combinations with development times. Find recipes for popular film stocks and chemistry.',
  '/films':
    'Browse and search the film stock database. Filter by brand, ISO, and color type.',
  '/docs': 'How-to guides and reference material for analog photography.',
  '/privacy':
    'What Dorkroom measures and what it deliberately does not. No accounts, no cookies, and nothing you type ever leaves your browser.',
  '/settings': 'Set your preferred units, defaults, and display options.',
};

export interface MobileNavItem {
  label: string;
  to?: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
  ariaLabel?: string;
  type: 'route' | 'external' | 'theme' | 'settings';
  category?: 'utility' | ToolCategory;
  /** When true, a `type: 'route'` item navigates with a full document load
   *  instead of client routing — required for paths owned by another
   *  microfrontend (e.g. /docs) so the edge can route the real request. */
  reload?: boolean;
}

export const mobileNavItems: MobileNavItem[] = [
  // Utility section
  {
    label: 'Home',
    to: '/',
    icon: asFunctionComponent(Home),
    type: 'route',
    category: 'utility',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/narrowstacks/dorkroom',
    icon: asFunctionComponent(GitBranch),
    ariaLabel: 'Contribute on GitHub',
    type: 'external',
    category: 'utility',
  },
  {
    label: 'Newsletter',
    href: 'https://news.dorkroom.art',
    icon: asFunctionComponent(Newspaper),
    ariaLabel: 'Subscribe to newsletter',
    type: 'external',
    category: 'utility',
  },
  {
    label: 'Theme',
    icon: asFunctionComponent(Settings), // Placeholder, ThemeToggle uses its own icon
    type: 'theme',
    category: 'utility',
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: asFunctionComponent(Settings),
    type: 'settings',
    category: 'utility',
  },
  // Tool sections, in manifest (nav) order
  ...TOOL_NAV.map(({ tool, icon }): MobileNavItem => ({
    label: tool.label,
    to: tool.to,
    icon,
    type: 'route',
    category: tool.category,
    ...(tool.reload && { reload: true }),
  })),
];
