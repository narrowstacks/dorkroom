import { describe, it, expect } from 'vitest';
import {
  printingItems,
  shootingItems,
  navItems,
  allNavItems,
  ROUTE_TITLES,
} from '../../lib/navigation';

describe('navigation utilities', () => {
  describe('navigation item arrays', () => {
    it('has correct printing items', () => {
      expect(printingItems).toHaveLength(3);
      const labels = printingItems.map((item) => item.label);
      expect(labels).toEqual(['Border', 'Resize', 'Stops']);
    });

    it('has correct shooting items', () => {
      expect(shootingItems).toHaveLength(3);
      const labels = shootingItems.map((item) => item.label);
      expect(labels).toEqual(['Exposure', 'Reciprocity', 'Infobase']);
    });

    it('has correct main nav items', () => {
      expect(navItems).toHaveLength(2);
      const labels = navItems.map((item) => item.label);
      expect(labels).toEqual(['Home', 'Development']);
    });

    it('combines all items correctly', () => {
      expect(allNavItems).toHaveLength(8);
      expect(allNavItems).toEqual([
        ...navItems,
        ...printingItems,
        ...shootingItems,
      ]);
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

        if (item.label !== 'Home' && item.label !== 'Development') {
          // Most items should have their label in the title
          expect(normalizedTitle).toContain(normalizedLabel);
        }
      });
    });
  });
});
