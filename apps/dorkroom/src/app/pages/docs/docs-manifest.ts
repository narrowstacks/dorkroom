import type { ComponentType } from 'react';

export interface DocFrontmatter {
  title: string;
  description?: string;
  group?: string;
  navTitle?: string;
  order?: number;
}

interface DocModule {
  default: ComponentType;
  frontmatter: DocFrontmatter;
}

export interface DocEntry {
  slug: string;
  href: string;
  frontmatter: DocFrontmatter;
  load: () => Promise<DocModule>;
}

const docModules = import.meta.glob<DocModule>(
  '../../../../../../content/docs/**/*.mdx'
) as Record<string, () => Promise<DocModule>>;

const docFrontmatters = import.meta.glob<DocModule>(
  '../../../../../../content/docs/**/*.mdx',
  {
    eager: true,
  }
) as Record<string, DocModule>;

const normalizedDocs: DocEntry[] = Object.entries(docModules).map(
  ([path, load]) => {
    const slug = toSlug(path);
    const frontmatter = docFrontmatters[path]?.frontmatter ?? {
      title: 'Untitled Document',
      description: '',
    };

    return {
      slug,
      href: slug ? `/docs/${slug}` : '/docs',
      frontmatter,
      load,
    };
  }
);

// Sort by order field, then by slug
normalizedDocs.sort((a, b) => {
  const orderA = a.frontmatter.order ?? 999;
  const orderB = b.frontmatter.order ?? 999;
  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return a.slug.localeCompare(b.slug);
});

export const docEntries = normalizedDocs;

export function getDocEntry(slug: string) {
  return docEntries.find((entry) => entry.slug === slug);
}

export interface DocsNavigationItem {
  title: string;
  href: string;
  children?: DocsNavigationItem[];
}

export interface DocsNavigationSection {
  title: string;
  items: DocsNavigationItem[];
}

export const docsNavigation: DocsNavigationSection[] = (() => {
  const sections: DocsNavigationSection[] = [];

  // Helper to get folder name from slug
  const getFolderName = (slug: string): string | null => {
    if (!slug || !slug.includes('/')) return null;
    return slug.split('/')[0];
  };

  // First, add the home page at the top without a category label
  const homeEntry = docEntries.find((entry) => entry.slug === '');
  if (homeEntry) {
    sections.push({
      title: '', // Empty title to hide the category label
      items: [
        {
          title: 'Home',
          href: homeEntry.href,
        },
      ],
    });
  }

  // Group remaining docs by folder
  const folderGroups = new Map<string, typeof docEntries>();

  for (const entry of docEntries) {
    if (entry.slug === '') continue; // Skip home page

    const folderName = getFolderName(entry.slug);
    if (folderName) {
      if (!folderGroups.has(folderName)) {
        folderGroups.set(folderName, []);
      }
      const group = folderGroups.get(folderName);
      if (group) {
        group.push(entry);
      }
    } else {
      // Top-level files
      if (!folderGroups.has('root')) {
        folderGroups.set('root', []);
      }
      const group = folderGroups.get('root');
      if (group) {
        group.push(entry);
      }
    }
  }

  // Add root-level items first
  const rootGroup = folderGroups.get('root');
  if (rootGroup) {
    const rootItems = rootGroup.map((entry) => ({
      title: entry.frontmatter.navTitle ?? entry.frontmatter.title,
      href: entry.href,
    }));

    for (const item of rootItems) {
      sections.push({
        title: item.title,
        items: [item],
      });
    }
  }

  // Add folders with children
  for (const [folderName, entries] of folderGroups) {
    if (folderName === 'root') continue;

    const children = entries
      .sort((a, b) => {
        const orderA = a.frontmatter.order ?? 999;
        const orderB = b.frontmatter.order ?? 999;
        return orderA - orderB;
      })
      .map((entry) => ({
        title: entry.frontmatter.navTitle ?? entry.frontmatter.title,
        href: entry.href,
      }));

    // Capitalize folder name for display
    const folderTitle = folderName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    sections.push({
      title: folderTitle,
      items: children,
    });
  }

  return sections;
})();

export const docSlugs = docEntries.map((entry) => entry.slug);

function toSlug(path: string) {
  const normalized = path.replace(/\\/g, '/');
  const withoutBase = normalized.replace(/^.*content\/docs\//, '');
  const withoutExtension = withoutBase.replace(/\.(mdx|md)$/, '');

  if (withoutExtension === 'index') {
    return '';
  }

  if (withoutExtension.endsWith('/index')) {
    return withoutExtension.replace(/\/index$/, '');
  }

  return withoutExtension;
}
