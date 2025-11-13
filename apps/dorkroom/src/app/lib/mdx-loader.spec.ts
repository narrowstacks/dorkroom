/**
 * Unit tests for MDX content loader and metadata utilities
 */

import { describe, it, expect } from 'vitest';
import {
  buildContentTree,
  getBreadcrumbs,
  searchPages,
  type MDXPage,
} from './mdx-loader';

// Mock MDX pages for testing
const mockPages: MDXPage[] = [
  {
    slug: 'films/index',
    path: '/infobase/films',
    Component: () => null,
    frontmatter: { title: 'Films', category: 'films' },
  },
  {
    slug: 'films/kodak-tri-x-400',
    path: '/infobase/films/kodak-tri-x-400',
    Component: () => null,
    frontmatter: {
      title: 'Kodak Tri-X 400',
      category: 'films',
      description: 'Classic black and white film',
      tags: ['bw', '400', 'kodak'],
    },
  },
  {
    slug: 'films/ilford-hp5',
    path: '/infobase/films/ilford-hp5',
    Component: () => null,
    frontmatter: {
      title: 'Ilford HP5+',
      category: 'films',
      description: 'Versatile black and white film',
      tags: ['bw', '400', 'ilford'],
    },
  },
  {
    slug: 'developers/index',
    path: '/infobase/developers',
    Component: () => null,
    frontmatter: { title: 'Developers', category: 'developers' },
  },
  {
    slug: 'developers/kodak-d76',
    path: '/infobase/developers/kodak-d76',
    Component: () => null,
    frontmatter: {
      title: 'Kodak D-76',
      category: 'developers',
      description: 'Popular all-purpose developer',
      tags: ['kodak', 'powder'],
    },
  },
  {
    slug: 'guides/index',
    path: '/infobase/guides',
    Component: () => null,
    frontmatter: { title: 'Guides', category: 'guides' },
  },
];

describe('mdx-loader', () => {
  describe('buildContentTree', () => {
    it('should build a tree structure from flat page list', () => {
      const tree = buildContentTree(mockPages);

      expect(tree).toHaveLength(3); // films, developers, guides folders
      expect(tree[0].type).toBe('folder');
      expect(tree[0].name).toBe('Films');
      expect(tree[0].slug).toBe('films');
      expect(tree[0].children).toBeDefined();
    });

    it('should place pages in their respective folders', () => {
      const tree = buildContentTree(mockPages);
      const filmsFolder = tree.find((node) => node.slug === 'films');

      expect(filmsFolder?.children).toHaveLength(3); // index + 2 films
      expect(filmsFolder?.children?.[0].type).toBe('file');
    });

    it('should sort index pages first within folders', () => {
      const tree = buildContentTree(mockPages);
      const filmsFolder = tree.find((node) => node.slug === 'films');

      expect(filmsFolder?.children?.[0].slug).toBe('films/index');
    });

    it('should sort non-index pages alphabetically', () => {
      const tree = buildContentTree(mockPages);
      const filmsFolder = tree.find((node) => node.slug === 'films');

      // After index, should be: Ilford HP5+, Kodak Tri-X 400 (alphabetical)
      expect(filmsFolder?.children?.[1].name).toBe('Ilford HP5+');
      expect(filmsFolder?.children?.[2].name).toBe('Kodak Tri-X 400');
    });

    it('should capitalize folder names', () => {
      const tree = buildContentTree(mockPages);

      expect(tree[0].name).toBe('Films');
      expect(tree[1].name).toBe('Developers');
      expect(tree[2].name).toBe('Guides');
    });

    it('should handle empty page list', () => {
      const tree = buildContentTree([]);
      expect(tree).toEqual([]);
    });

    it('should use frontmatter title for file names', () => {
      const tree = buildContentTree(mockPages);
      const filmsFolder = tree.find((node) => node.slug === 'films');

      expect(filmsFolder?.children?.[2].name).toBe('Kodak Tri-X 400');
    });

    it('should fallback to slug part if frontmatter title is empty', () => {
      const pagesWithoutTitle: MDXPage[] = [
        {
          slug: 'test/page-name',
          path: '/infobase/test/page-name',
          Component: () => null,
          frontmatter: { title: '', category: 'test' },
        },
      ];

      const tree = buildContentTree(pagesWithoutTitle);
      const testFolder = tree.find((node) => node.slug === 'test');

      expect(testFolder?.children?.[0].name).toBe('page-name');
    });
  });

  describe('getBreadcrumbs', () => {
    it('should always start with Infobase root', () => {
      const breadcrumbs = getBreadcrumbs('films/index', mockPages);

      expect(breadcrumbs[0]).toEqual({
        label: 'Infobase',
        path: '/infobase',
      });
    });

    it('should create breadcrumbs for nested pages', () => {
      const breadcrumbs = getBreadcrumbs('films/kodak-tri-x-400', mockPages);

      expect(breadcrumbs).toHaveLength(3); // Infobase > Films > Kodak Tri-X 400
      expect(breadcrumbs[1].label).toBe('Films');
      expect(breadcrumbs[1].path).toBe('/infobase/films');
      expect(breadcrumbs[2].label).toBe('Kodak Tri-X 400');
      expect(breadcrumbs[2].path).toBe('/infobase/films/kodak-tri-x-400');
    });

    it('should use frontmatter title when available', () => {
      const breadcrumbs = getBreadcrumbs('developers/kodak-d76', mockPages);

      expect(breadcrumbs[2].label).toBe('Kodak D-76');
    });

    it('should fallback to capitalized slug when page not found', () => {
      const breadcrumbs = getBreadcrumbs('unknown/category/page', mockPages);

      expect(breadcrumbs[1].label).toBe('Unknown');
      expect(breadcrumbs[2].label).toBe('Category');
      expect(breadcrumbs[3].label).toBe('Page');
    });

    it('should handle page with empty frontmatter title gracefully', () => {
      const pagesWithoutTitle: MDXPage[] = [
        {
          slug: 'test/page',
          path: '/infobase/test/page',
          Component: () => null,
          frontmatter: { title: '', category: 'test' },
        },
      ];

      const breadcrumbs = getBreadcrumbs('test/page', pagesWithoutTitle);

      // Should use capitalized slug part as fallback
      expect(breadcrumbs[2].label).toBe('Page');
    });

    it('should handle single-level pages', () => {
      const singleLevelPage: MDXPage[] = [
        {
          slug: 'about',
          path: '/infobase/about',
          Component: () => null,
          frontmatter: { title: 'About' },
        },
      ];

      const breadcrumbs = getBreadcrumbs('about', singleLevelPage);

      expect(breadcrumbs).toHaveLength(2); // Infobase > About
      expect(breadcrumbs[1].label).toBe('About');
    });

    it('should handle empty slug', () => {
      const breadcrumbs = getBreadcrumbs('', mockPages);

      expect(breadcrumbs).toHaveLength(1); // Only Infobase root
      expect(breadcrumbs[0].label).toBe('Infobase');
    });
  });

  describe('searchPages', () => {
    it('should return all pages when query is empty', () => {
      const results = searchPages(mockPages, '');
      expect(results).toEqual(mockPages);
    });

    it('should return all pages when query is whitespace', () => {
      const results = searchPages(mockPages, '   ');
      expect(results).toEqual(mockPages);
    });

    it('should search by title (case-insensitive)', () => {
      const results = searchPages(mockPages, 'kodak');
      expect(results).toHaveLength(2); // Kodak Tri-X and Kodak D-76
      expect(results[0].frontmatter.title).toContain('Kodak');
    });

    it('should search by description', () => {
      const results = searchPages(mockPages, 'versatile');
      expect(results).toHaveLength(1);
      expect(results[0].slug).toBe('films/ilford-hp5');
    });

    it('should search by tags', () => {
      const results = searchPages(mockPages, 'ilford');
      expect(results).toHaveLength(1);
      expect(results[0].slug).toBe('films/ilford-hp5');
    });

    it('should match across multiple fields', () => {
      const results = searchPages(mockPages, '400');
      expect(results).toHaveLength(2); // Both 400-speed films
    });

    it('should be case-insensitive', () => {
      const results = searchPages(mockPages, 'KODAK');
      expect(results).toHaveLength(2);
    });

    it('should return empty array when no matches found', () => {
      const results = searchPages(mockPages, 'nonexistent');
      expect(results).toEqual([]);
    });

    it('should handle partial matches', () => {
      const results = searchPages(mockPages, 'dev');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((p) => p.slug.includes('developer'))).toBe(true);
    });

    it('should handle pages without optional frontmatter fields', () => {
      const minimalPage: MDXPage[] = [
        {
          slug: 'minimal',
          path: '/infobase/minimal',
          Component: () => null,
          frontmatter: { title: 'Minimal' },
        },
      ];

      const results = searchPages(minimalPage, 'test');
      expect(results).toEqual([]); // No error, just no matches
    });

    it('should trim whitespace from query', () => {
      const results1 = searchPages(mockPages, '  kodak  ');
      const results2 = searchPages(mockPages, 'kodak');
      expect(results1).toEqual(results2);
    });
  });
});
