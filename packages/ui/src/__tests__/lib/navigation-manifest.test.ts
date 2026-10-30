import { type ComponentType, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getRouteAccent,
  getRouteIcon,
  homeToolCards,
  mobileNavItems,
  navigationCategories,
  navItems,
} from '../../lib/navigation';

// Pins the web navigation exactly as it renders today (#455), so deriving the
// tables from one manifest can't silently reorder, relabel, or re-icon any of
// them. Icons are compared by the Lucide class they render (`lucide-crop`),
// because the nav wraps each icon in a fresh function component.

function iconName(
  Icon: ComponentType<{ className?: string }> | undefined
): string | undefined {
  if (!Icon) return undefined;
  const markup = renderToStaticMarkup(createElement(Icon));
  return markup.match(/\blucide-(?!icon\b)([a-z0-9-]+)/)?.[1];
}

describe('desktop navigation (pinned)', () => {
  it('keeps the Home entry', () => {
    expect(
      navItems.map((i) => [i.label, i.to, iconName(i.icon), i.summary])
    ).toEqual([['Home', '/', 'house', 'Skip the math. Make prints.']]);
  });

  it('keeps every category, its icon, and its items in order', () => {
    expect(
      navigationCategories.map((c) => ({
        label: c.label,
        icon: iconName(c.icon),
        items: c.items.map((i) => [
          i.label,
          i.to,
          iconName(i.icon),
          i.summary,
          i.reload ?? false,
        ]),
      }))
    ).toEqual([
      {
        label: 'Printing',
        icon: 'printer',
        items: [
          [
            'Border',
            '/border',
            'crop',
            'Trim-safe borders with print guides.',
            false,
          ],
          [
            'Resize',
            '/resize',
            'ruler',
            'Scale prints without endless test strips.',
            false,
          ],
          [
            'Stops',
            '/stops',
            'gauge',
            'Translate exposure stops into seconds.',
            false,
          ],
          [
            'Mat',
            '/mat',
            'frame',
            'Window openings and cutter settings for mats.',
            false,
          ],
        ],
      },
      {
        label: 'Film',
        icon: 'film',
        items: [
          [
            'Development',
            '/development',
            'flask-conical',
            'Film and developer pairings with times.',
            false,
          ],
          [
            'Reciprocity',
            '/reciprocity',
            'timer',
            'Correct for long exposure failure.',
            false,
          ],
        ],
      },
      {
        label: 'Camera',
        icon: 'camera',
        items: [
          [
            'Lenses',
            '/lenses',
            'focus',
            'Equivalent focal lengths across formats.',
            false,
          ],
          [
            'Exposure',
            '/exposure',
            'aperture',
            'Balance aperture, shutter, and ISO on set.',
            false,
          ],
        ],
      },
      {
        label: 'Reference',
        icon: 'book-open',
        items: [
          [
            'Films',
            '/films',
            'film',
            'Browse and search the film stock database.',
            false,
          ],
          [
            'Docs',
            '/docs',
            'book-open',
            'Guides and documentation for analog photography.',
            true,
          ],
        ],
      },
    ]);
  });
});

describe('mobile navigation (pinned)', () => {
  it('keeps every item, its order, type, category and icon', () => {
    expect(
      mobileNavItems.map((i) => ({
        label: i.label,
        to: i.to,
        href: i.href,
        type: i.type,
        category: i.category,
        ariaLabel: i.ariaLabel,
        reload: i.reload,
        icon: iconName(i.icon),
      }))
    ).toEqual([
      {
        label: 'Home',
        to: '/',
        href: undefined,
        type: 'route',
        category: 'utility',
        ariaLabel: undefined,
        reload: undefined,
        icon: 'house',
      },
      {
        label: 'GitHub',
        to: undefined,
        href: 'https://github.com/narrowstacks/dorkroom',
        type: 'external',
        category: 'utility',
        ariaLabel: 'Contribute on GitHub',
        reload: undefined,
        icon: 'git-branch',
      },
      {
        label: 'Newsletter',
        to: undefined,
        href: 'https://news.dorkroom.art',
        type: 'external',
        category: 'utility',
        ariaLabel: 'Subscribe to newsletter',
        reload: undefined,
        icon: 'newspaper',
      },
      {
        label: 'Theme',
        to: undefined,
        href: undefined,
        type: 'theme',
        category: 'utility',
        ariaLabel: undefined,
        reload: undefined,
        icon: 'settings',
      },
      {
        label: 'Settings',
        to: '/settings',
        href: undefined,
        type: 'settings',
        category: 'utility',
        ariaLabel: undefined,
        reload: undefined,
        icon: 'settings',
      },
      ...(
        [
          ['Border', '/border', 'printing', 'crop'],
          ['Resize', '/resize', 'printing', 'ruler'],
          ['Stops', '/stops', 'printing', 'gauge'],
          ['Mat', '/mat', 'printing', 'frame'],
          ['Development', '/development', 'film', 'flask-conical'],
          ['Reciprocity', '/reciprocity', 'film', 'timer'],
          ['Lenses', '/lenses', 'camera', 'focus'],
          ['Exposure', '/exposure', 'camera', 'aperture'],
          ['Films', '/films', 'reference', 'film'],
        ] as const
      ).map(([label, to, category, icon]) => ({
        label,
        to,
        href: undefined,
        type: 'route',
        category,
        ariaLabel: undefined,
        reload: undefined,
        icon,
      })),
      {
        label: 'Docs',
        to: '/docs',
        href: undefined,
        type: 'route',
        category: 'reference',
        ariaLabel: undefined,
        reload: true,
        icon: 'book-open',
      },
    ]);
  });
});

describe('getRouteIcon (pinned)', () => {
  it('resolves the page header icon for each route', () => {
    const routes = [
      '/',
      '/border',
      '/resize',
      '/stops',
      '/mat',
      '/development',
      '/reciprocity',
      '/lenses',
      '/exposure',
      '/films',
      '/docs',
      '/settings',
      '/privacy',
    ];
    expect(
      Object.fromEntries(routes.map((r) => [r, iconName(getRouteIcon(r))]))
    ).toEqual({
      '/': 'house',
      '/border': 'crop',
      '/resize': 'ruler',
      '/stops': 'gauge',
      '/mat': 'frame',
      '/development': 'flask-conical',
      '/reciprocity': 'timer',
      '/lenses': 'focus',
      '/exposure': 'aperture',
      '/films': 'film',
      '/docs': 'book-open',
      '/settings': undefined,
      '/privacy': undefined,
    });
  });
});

describe('tool manifest derivations', () => {
  it('resolves each page accent tone from the manifest', () => {
    const routes = [
      '/border',
      '/resize',
      '/stops',
      '/mat',
      '/development',
      '/reciprocity',
      '/lenses',
      '/exposure',
      '/films',
      '/docs',
      '/',
      '/settings',
    ];
    expect(
      Object.fromEntries(routes.map((r) => [r, getRouteAccent(r)]))
    ).toEqual({
      '/border': 'indigo',
      '/resize': 'teal',
      '/stops': 'blue',
      '/mat': 'cyan',
      '/development': 'rose',
      '/reciprocity': 'amber',
      '/lenses': 'emerald',
      '/exposure': 'teal',
      '/films': 'cyan',
      '/docs': undefined,
      '/': undefined,
      '/settings': undefined,
    });
  });

  it('gives each home card its page accent and a nav entry', () => {
    const navRoutes = navigationCategories.flatMap((c) =>
      c.items.map((i) => i.to)
    );
    for (const card of homeToolCards) {
      expect(navRoutes).toContain(card.href);
      expect(card.accent).toBe(getRouteAccent(card.href));
    }
    // Every tool except Docs (served by another app) has a home card.
    expect(homeToolCards.map((c) => c.href).sort()).toEqual(
      navRoutes.filter((to) => to !== '/docs').sort()
    );
  });

  it('titles sidebar sections from CATEGORY_LABELS in CATEGORY_ORDER', () => {
    expect(CATEGORY_ORDER.map((c) => CATEGORY_LABELS[c])).toEqual(
      navigationCategories.map((c) => c.label)
    );
  });
});
