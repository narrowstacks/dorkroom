/**
 * Infobase content structure types
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

export interface ContentNode {
  type: 'folder' | 'file';
  name: string;
  path: string;
  slug: string;
  children?: ContentNode[];
  frontmatter?: MDXFrontmatter;
}

export interface BreadcrumbItem {
  label: string;
  path: string;
}
