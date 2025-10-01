import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BreadcrumbItem } from '@dorkroom/logic';

import { cn } from '../../lib/cn';

export type { BreadcrumbItem };

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function BreadcrumbNav({ items, className }: BreadcrumbNavProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-2 text-sm', className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={item.path} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight
                className="h-4 w-4 flex-shrink-0"
                style={{ color: 'var(--color-text-tertiary)' }}
              />
            )}
            {isLast ? (
              <span
                className="font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="transition hover:underline"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
