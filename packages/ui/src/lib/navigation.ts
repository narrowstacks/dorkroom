import {
  Aperture,
  BookOpen,
  Crop,
  FlaskConical,
  Gauge,
  Home,
  Ruler,
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

export const shootingItems: NavigationItem[] = [
  {
    label: 'Exposure',
    to: '/exposure',
    icon: asFunctionComponent(Aperture),
    summary: 'Balance aperture, shutter, and ISO on set.',
  },
  {
    label: 'Reciprocity',
    to: '/reciprocity',
    icon: asFunctionComponent(Timer),
    summary: 'Correct for long exposure failure.',
  },
  {
    label: 'Infobase',
    to: '/infobase',
    icon: asFunctionComponent(BookOpen),
    summary: 'Reference tables, notes, and recipes.',
  },
];

export const navItems = [
  {
    label: 'Home',
    to: '/',
    icon: asFunctionComponent(Home),
    summary: 'Skip the math. Make prints.',
  },
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

export const allNavItems = [...navItems, ...printingItems];
// Previously included ...shootingItems, but shooting section has been removed

export const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/border': 'Border Calculator',
  '/resize': 'Print Resize Calculator',
  '/reciprocity': 'Reciprocity Failure Calculator',
  '/stops': 'Stops Calculator',
  '/exposure': 'Exposure Calculator',
  '/development': 'Development Recipes',
  '/infobase': 'Infobase',
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
  '/development':
    'Browse film and developer combinations with proven development times. Find recipes for popular film stocks and chemistry.',
  '/infobase':
    'Reference tables, technical notes, and recipes for analog photography. Quick lookup for common darkroom data.',
  '/settings':
    'Customize your Dorkroom experience. Configure preferences for units, defaults, and display options.',
};
