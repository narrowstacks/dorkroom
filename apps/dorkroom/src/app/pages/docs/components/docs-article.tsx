import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../../lib/cn';

const proseVariables: CSSProperties & Record<string, string> = {
  '--prose-body': 'var(--color-text-primary)',
  '--prose-headings': 'var(--color-text-primary)',
  '--prose-lead': 'var(--color-text-secondary)',
  '--prose-links': 'var(--color-accent)',
  '--prose-bold': 'var(--color-text-primary)',
  '--prose-counters': 'var(--color-text-secondary)',
  '--prose-bullets': 'var(--color-text-secondary)',
  '--prose-hr': 'var(--color-border-secondary)',
  '--prose-quotes': 'var(--color-text-secondary)',
  '--prose-quote-borders': 'var(--color-border-secondary)',
  '--prose-captions': 'var(--color-text-secondary)',
  '--prose-code': 'var(--color-text-primary)',
  '--prose-pre-code': 'var(--color-text-primary)',
  '--prose-pre-bg': 'var(--color-surface)',
  '--prose-th-borders': 'var(--color-border-secondary)',
  '--prose-td-borders': 'var(--color-border-secondary)',
};

interface DocsArticleProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  style?: CSSProperties;
}

export function DocsArticle({
  children,
  title,
  description,
  className,
  style,
}: DocsArticleProps) {
  return (
    <article
      className={cn(
        'prose prose-neutral max-w-none',
        // Headings
        'prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-0',
        'prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-10 prose-h2:pb-2',
        'prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-8',
        'prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-6',
        // Paragraphs and text
        'prose-p:leading-7 prose-p:my-5',
        'prose-p:text-[var(--color-text-secondary)]',
        // Lists
        'prose-li:my-1',
        'prose-ul:my-5 prose-ol:my-5',
        // Links
        'prose-a:text-[var(--color-accent)] prose-a:no-underline prose-a:font-medium',
        'hover:prose-a:underline',
        // Code
        'prose-code:text-sm prose-code:font-mono',
        'prose-code:bg-[var(--color-surface)] prose-code:px-1.5 prose-code:py-0.5',
        'prose-code:rounded prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-[var(--color-surface)] prose-pre:border prose-pre:border-[var(--color-border-secondary)]',
        'prose-pre:rounded-lg prose-pre:p-4 prose-pre:my-6',
        // Tables
        'prose-table:my-6',
        'prose-th:border-[var(--color-border-secondary)] prose-th:font-semibold',
        'prose-td:border-[var(--color-border-secondary)]',
        // Blockquotes
        'prose-blockquote:border-l-[var(--color-border-secondary)]',
        'prose-blockquote:text-[var(--color-text-secondary)]',
        // Horizontal rules
        'prose-hr:border-[var(--color-border-secondary)] prose-hr:my-8',
        // Strong and emphasis
        'prose-strong:font-semibold prose-strong:text-[var(--color-text-primary)]',
        className
      )}
      style={{
        ...proseVariables,
        ...style,
      }}
    >
      {title && <h1>{title}</h1>}
      {description && (
        <p className="text-[var(--color-text-secondary)] text-sm italic leading-6 -mt-4 mb-6">
          {description}
        </p>
      )}
      {children}
    </article>
  );
}
