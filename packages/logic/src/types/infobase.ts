/**
 * Infobase content structure types
 */

export interface MDXFrontmatter {
  title: string;
  description?: string;
  category?: string;
  icon?: string; // Emoji icon for sidebar display
  filmSlug?: string;
  developerSlug?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface ContentNode {
  type: 'folder' | 'file' | 'database';
  name: string;
  path: string;
  slug: string;
  icon?: string; // Emoji icon for sidebar display
  children?: ContentNode[];
  frontmatter?: MDXFrontmatter;
  databaseType?: 'films' | 'developers';
}

export interface BreadcrumbItem {
  label: string;
  path: string;
}
