/**
 * MDX content loader and metadata utilities
 */

export interface MDXFrontmatter {
  title: string;
  description?: string;
  category?: string;
  filmSlug?: string;
  developerSlug?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface MDXPage {
  slug: string;
  path: string;
  frontmatter: MDXFrontmatter;
  Component: React.ComponentType;
}

export interface ContentNode {
  type: 'folder' | 'file';
  name: string;
  path: string;
  slug: string;
  children?: ContentNode[];
  frontmatter?: MDXFrontmatter;
}

/**
 * Build a tree structure from flat MDX page list
 */
export function buildContentTree(pages: MDXPage[]): ContentNode[] {
  const tree: ContentNode[] = [];
  const folderMap = new Map<string, ContentNode>();

  // Create folders first
  const categories = new Set<string>();
  pages.forEach((page) => {
    const parts = page.slug.split('/');
    if (parts.length > 1) {
      categories.add(parts[0]);
    }
  });

  categories.forEach((category) => {
    const folderNode: ContentNode = {
      type: 'folder',
      name: category.charAt(0).toUpperCase() + category.slice(1),
      path: `/infobase/${category}`,
      slug: category,
      children: [],
    };
    folderMap.set(category, folderNode);
    tree.push(folderNode);
  });

  // Add pages to their respective folders
  pages.forEach((page) => {
    const parts = page.slug.split('/');
    const fileNode: ContentNode = {
      type: 'file',
      name: page.frontmatter.title || parts[parts.length - 1],
      path: `/infobase/${page.slug}`,
      slug: page.slug,
      frontmatter: page.frontmatter,
    };

    if (parts.length > 1) {
      const folder = folderMap.get(parts[0]);
      if (folder && folder.children) {
        folder.children.push(fileNode);
      }
    } else {
      tree.push(fileNode);
    }
  });

  // Sort children within folders
  folderMap.forEach((folder) => {
    if (folder.children) {
      folder.children.sort((a, b) => {
        // Index pages first
        if (a.slug.endsWith('/index') || a.slug === 'index') return -1;
        if (b.slug.endsWith('/index') || b.slug === 'index') return 1;
        return a.name.localeCompare(b.name);
      });
    }
  });

  return tree;
}

/**
 * Get breadcrumb trail for a given slug
 */
export function getBreadcrumbs(
  slug: string,
  pages: MDXPage[]
): Array<{ label: string; path: string }> {
  const parts = slug.split('/').filter(Boolean);
  const breadcrumbs: Array<{ label: string; path: string }> = [
    { label: 'Infobase', path: '/infobase' },
  ];

  let currentPath = '';
  parts.forEach((part, index) => {
    currentPath += `/${part}`;
    const page = pages.find((p) => p.slug === currentPath.slice(1));

    if (page) {
      breadcrumbs.push({
        label: page.frontmatter.title || part,
        path: `/infobase${currentPath}`,
      });
    } else {
      // For folders without index pages
      breadcrumbs.push({
        label: part.charAt(0).toUpperCase() + part.slice(1),
        path: `/infobase${currentPath}`,
      });
    }
  });

  return breadcrumbs;
}

/**
 * Search/filter pages by query
 */
export function searchPages(pages: MDXPage[], query: string): MDXPage[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return pages;

  return pages.filter((page) => {
    const titleMatch = page.frontmatter.title
      ?.toLowerCase()
      .includes(normalizedQuery);
    const descMatch = page.frontmatter.description
      ?.toLowerCase()
      .includes(normalizedQuery);
    const tagsMatch = page.frontmatter.tags?.some((tag) =>
      tag.toLowerCase().includes(normalizedQuery)
    );

    return titleMatch || descMatch || tagsMatch;
  });
}
