import { describe, expect, it } from 'vitest';
import {
  allNavItems,
  cameraItems,
  filmItems,
  navItems,
  navigationCategories,
  printingItems,
  ROUTE_TITLES,
  referenceItems,
} from '../../lib/navigation';

describe('navigation utilities', () => {
  describe('navigation categories', () => {
    it('has correct number of categories', () => {
      expect(navigationCategories).toHaveLength(4);
    });

    it('has correct category labels', () => {
      const labels = navigationCategories.map((cat) => cat.label);
      expect(labels).toEqual(['Printing', 'Film', 'Camera', 'Reference']);
    });

    it('has all required category properties', () => {
      navigationCategories.forEach((category) => {
        expect(category).toHaveProperty('label');
        expect(category).toHaveProperty('icon');
        expect(category).toHaveProperty('items');
        expect(typeof category.label).toBe('string');
        expect(typeof category.icon).toBe('function');
        expect(Array.isArray(category.items)).toBe(true);
      });
    });
  });

  describe('navigation item arrays', () => {
    it('has correct printing items', () => {
      expect(printingItems).toHaveLength(3);
      const labels = printingItems.map((item) => item.label);
      expect(labels).toEqual(['Border', 'Resize', 'Stops']);
    });

    it('has correct film items', () => {
      expect(filmItems).toHaveLength(2);
      const labels = filmItems.map((item) => item.label);
      expect(labels).toEqual(['Development', 'Reciprocity']);
    });

    it('has correct camera items', () => {
      expect(cameraItems).toHaveLength(1);
      expect(cameraItems[0].label).toBe('Exposure');
    });

    it('has correct reference items', () => {
      expect(referenceItems).toHaveLength(2);
      const labels = referenceItems.map((item) => item.label);
      expect(labels).toEqual(['Films', 'Docs']);
    });

    it('has correct main nav items (Home only)', () => {
      expect(navItems).toHaveLength(1);
      expect(navItems[0].label).toBe('Home');
    });

    it('combines all items correctly', () => {
      const expectedLength =
        navItems.length +
        printingItems.length +
        filmItems.length +
        cameraItems.length +
        referenceItems.length;
      expect(allNavItems).toHaveLength(expectedLength);
    });
  });

  describe('navigation item structure', () => {
    it('has required properties for all items', () => {
      allNavItems.forEach((item) => {
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('to');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('summary');
        expect(typeof item.label).toBe('string');
        expect(typeof item.to).toBe('string');
        expect(typeof item.summary).toBe('string');
        expect(typeof item.icon).toBe('function'); // React component
      });
    });

    it('has unique routes for all items', () => {
      const routes = allNavItems.map((item) => item.to);
      const uniqueRoutes = new Set(routes);
      expect(uniqueRoutes.size).toBe(routes.length);
    });

    it('has meaningful summaries', () => {
      allNavItems.forEach((item) => {
        expect(item.summary.length).toBeGreaterThan(10);
        expect(item.summary).toMatch(/[.!]$/); // Ends with punctuation
      });
    });
  });

  describe('ROUTE_TITLES', () => {
    it('has all routes covered', () => {
      const routesInItems = allNavItems.map((item) => item.to);
      routesInItems.forEach((route) => {
        expect(ROUTE_TITLES).toHaveProperty(route);
      });
    });

    it('has additional utility routes', () => {
      expect(ROUTE_TITLES).toHaveProperty('/settings');
    });

    it('has meaningful titles', () => {
      Object.entries(ROUTE_TITLES).forEach(([route, title]) => {
        expect(typeof title).toBe('string');
        expect(title.length).toBeGreaterThan(0);
        expect(route.startsWith('/')).toBe(true);
      });
    });

    it('has consistent title formatting', () => {
      Object.values(ROUTE_TITLES).forEach((title) => {
        // Titles should be properly capitalized
        expect(title[0]).toBe(title[0].toUpperCase());
      });
    });
  });

  describe('route consistency', () => {
    it('matches navigation items to route titles', () => {
      allNavItems.forEach((item) => {
        const title = ROUTE_TITLES[item.to];
        expect(title).toBeDefined();
        // Title should contain or relate to the label
        const normalizedTitle = title.toLowerCase();
        const normalizedLabel = item.label.toLowerCase();

        // Exclude items where label doesn't match title pattern
        const exceptions = ['Home', 'Development', 'Films', 'Docs'];
        if (!exceptions.includes(item.label)) {
          // Most items should have their label in the title
          expect(normalizedTitle).toContain(normalizedLabel);
        }
      });
    });
  });
});
