import {
  Aperture,
  BookOpen,
  Camera,
  Crop,
  Film,
  FlaskConical,
  Focus,
  Gauge,
  GitBranch,
  Home,
  Newspaper,
  Printer,
  Ruler,
  Settings,
  Timer,
} from 'lucide-react';
import { type ComponentType, createElement } from 'react';
import type { NavigationItem } from '../components/navigation-dropdown';

// Wrap Lucide icons so typeof component is 'function' in tests
const asFunctionComponent =
  (Icon: ComponentType<{ className?: string; size?: number | string }>) =>
  (props: { className?: string; size?: number | string }) =>
    createElement(Icon, props);

export const printingItems: NavigationItem[] = [
  {
    label: 'Border',
    to: '/border',
    icon: asFunctionComponent(Crop),
    summary: 'Trim-safe borders with print guides.',
  },
  {
    label: 'Resize',
    to: '/resize',
    icon: asFunctionComponent(Ruler),
    summary: 'Scale prints without endless test strips.',
  },
  {
    label: 'Stops',
    to: '/stops',
    icon: asFunctionComponent(Gauge),
    summary: 'Translate exposure stops into seconds.',
  },
];

export const filmItems: NavigationItem[] = [
  {
    label: 'Development',
    to: '/development',
    icon: asFunctionComponent(FlaskConical),
    summary: 'Film chemistry pairings with proven results.',
  },
  {
    label: 'Reciprocity',
    to: '/reciprocity',
    icon: asFunctionComponent(Timer),
    summary: 'Correct for long exposure failure.',
  },
];

export const cameraItems: NavigationItem[] = [
  {
    label: 'Exposure',
    to: '/exposure',
    icon: asFunctionComponent(Aperture),
    summary: 'Balance aperture, shutter, and ISO on set.',
  },
  {
    label: 'Lens',
    to: '/lens',
    icon: asFunctionComponent(Focus),
    summary: 'Equivalent focal lengths across formats.',
  },
];

export const referenceItems: NavigationItem[] = [
  {
    label: 'Films',
    to: '/films',
    icon: asFunctionComponent(Film),
    summary: 'Browse and search the film stock database.',
  },
  {
    label: 'Docs',
    to: '/docs',
    icon: asFunctionComponent(BookOpen),
    summary: 'Guides and documentation for analog photography.',
  },
];

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

export const navigationCategories: NavigationCategory[] = [
  {
    label: 'Printing',
    icon: asFunctionComponent(Printer),
    items: printingItems,
  },
  {
    label: 'Film',
    icon: asFunctionComponent(Film),
    items: filmItems,
  },
  {
    label: 'Camera',
    icon: asFunctionComponent(Camera),
    items: cameraItems,
  },
  {
    label: 'Reference',
    icon: asFunctionComponent(BookOpen),
    items: referenceItems,
  },
];

export const allNavItems = [
  ...navItems,
  ...printingItems,
  ...filmItems,
  ...cameraItems,
  ...referenceItems,
];

export const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/border': 'Border Calculator',
  '/resize': 'Print Resize Calculator',
  '/reciprocity': 'Reciprocity Failure Calculator',
  '/stops': 'Stops Calculator',
  '/exposure': 'Exposure Calculator',
  '/lens': 'Lens Equivalency Calculator',
  '/development': 'Development Recipes',
  '/films': 'Film Database',
  '/docs': 'Documentation',
  '/settings': 'Settings',
};

export const ROUTE_DESCRIPTIONS: Record<string, string> = {
  '/': 'Film photography calculators and resources for analog photographers. Development recipes, printing calculators, and exposure tools.',
  '/border':
    'Calculate clean, precise borders for darkroom prints. Get precise measurements and visual guides for your easel.',
  '/resize':
    'Scale darkroom prints to new sizes. Calculate exposure adjustments when enlarging or reducing print dimensions.',
  '/reciprocity':
    'Compensate for reciprocity failure in long exposures. Get corrected exposure times for film stocks like Ilford HP5, Kodak Tri-X, and more.',
  '/stops':
    'Convert between exposure stops and seconds. Quickly translate f-stop or time adjustments into precise exposure values.',
  '/exposure':
    'Balance aperture, shutter speed, and ISO for correct exposure. Calculate equivalent exposures across different settings.',
  '/lens':
    'Calculate equivalent focal lengths between sensor and film formats. Compare APS-C, Full Frame, and Medium Format field of view.',
  '/development':
    'Browse film and developer combinations with proven development times. Find recipes for popular film stocks and chemistry.',
  '/films':
    'Browse and search the complete film stock database. Filter by brand, ISO, color type, and more.',
  '/docs':
    'Guides and documentation for analog photography. Learn techniques, understand concepts, and master your craft.',
  '/settings':
    'Customize your Dorkroom experience. Configure preferences for units, defaults, and display options.',
};

export interface MobileNavItem {
  label: string;
  to?: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
  ariaLabel?: string;
  type: 'route' | 'external' | 'theme' | 'settings';
  category?: 'utility' | 'printing' | 'film' | 'camera' | 'reference';
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
  // Printing section
  {
    label: 'Border',
    to: '/border',
    icon: asFunctionComponent(Crop),
    type: 'route',
    category: 'printing',
  },
  {
    label: 'Resize',
    to: '/resize',
    icon: asFunctionComponent(Ruler),
    type: 'route',
    category: 'printing',
  },
  {
    label: 'Stops',
    to: '/stops',
    icon: asFunctionComponent(Gauge),
    type: 'route',
    category: 'printing',
  },
  // Film section
  {
    label: 'Development',
    to: '/development',
    icon: asFunctionComponent(FlaskConical),
    type: 'route',
    category: 'film',
  },
  {
    label: 'Reciprocity',
    to: '/reciprocity',
    icon: asFunctionComponent(Timer),
    type: 'route',
    category: 'film',
  },
  // Camera section
  {
    label: 'Exposure',
    to: '/exposure',
    icon: asFunctionComponent(Aperture),
    type: 'route',
    category: 'camera',
  },
  {
    label: 'Lens',
    to: '/lens',
    icon: asFunctionComponent(Focus),
    type: 'route',
    category: 'camera',
  },
  // Reference section
  {
    label: 'Films',
    to: '/films',
    icon: asFunctionComponent(Film),
    type: 'route',
    category: 'reference',
  },
  {
    label: 'Docs',
    to: '/docs',
    icon: asFunctionComponent(BookOpen),
    type: 'route',
    category: 'reference',
  },
];
