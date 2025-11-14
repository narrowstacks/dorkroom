declare module '*.mdx' {
  import { ComponentType } from 'react';

  export interface Frontmatter {
    title: string;
    description?: string;
    group?: string;
    navTitle?: string;
    order?: number;
    [key: string]: unknown;
  }

  const MDXComponent: ComponentType;
  export const frontmatter: Frontmatter;
  export default MDXComponent;
}
