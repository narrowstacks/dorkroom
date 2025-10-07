/**
 * Automated MDX content loader using Vite's import.meta.glob
 */

import type { MDXPage } from './mdx-loader';
import type { MDXFrontmatter } from '@dorkroom/logic';

/**
 * Automatically load all MDX files from the content directory
 * Excludes template files in _templates/
 */
export function loadMDXPages(): MDXPage[] {
  // Load all MDX modules eagerly (excluding templates)
  // Note: Vite's import.meta.glob processes files at build time, so we must
  // exclude templates in the glob pattern itself, not in runtime code
  const modules = import.meta.glob<{
    default: React.ComponentType;
    frontmatter: MDXFrontmatter;
  }>(
    [
      '../../content/**/*.mdx',
      '!../../content/_templates/**/*.mdx', // Exclude templates
    ],
    {
      eager: true,
    }
  );

  const pages: MDXPage[] = [];

  for (const [filePath, module] of Object.entries(modules)) {
    // Extract slug from file path
    // Example: '../../content/films/kodak-tri-x-400.mdx' -> 'films/kodak-tri-x-400'
    const slug = filePath.replace('../../content/', '').replace(/\.mdx$/, '');

    // Generate path from slug
    const path = `/infobase/${slug}`;

    // Extract frontmatter and component
    const frontmatter = module.frontmatter || {
      title: extractTitleFromSlug(slug),
      category: extractCategoryFromSlug(slug),
    };

    pages.push({
      slug,
      path,
      Component: module.default,
      frontmatter,
    });
  }

  return pages;
}

/**
 * Extract a human-readable title from a slug
 * Example: 'films/kodak-tri-x-400' -> 'Kodak Tri X 400'
 */
function extractTitleFromSlug(slug: string): string {
  const parts = slug.split('/');
  const filename = parts[parts.length - 1];

  if (filename === 'index') {
    // For index files, use the folder name
    return parts[parts.length - 2]
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return filename
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract category from slug
 * Example: 'films/kodak-tri-x-400' -> 'films'
 */
function extractCategoryFromSlug(slug: string): string {
  const parts = slug.split('/');
  return parts[0];
}
