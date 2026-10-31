import type { HomeLinkTarget, HomeResultGroup } from '@dorkroom/logic';
import { cn, homeToolCards } from '@dorkroom/ui';
import { Link } from '@tanstack/react-router';
import type { MouseEventHandler } from 'react';

interface Row {
  key: string;
  title: string;
  detail: string;
  meta: string;
  target: HomeLinkTarget;
}

/** The rows a group lists; tools are named from the home tool cards. */
function rowsOf(group: HomeResultGroup): Row[] {
  if (group.key !== 'tools') {
    return group.items.map((item) => ({
      key: `${item.target.to}:${item.title}`,
      ...item,
    }));
  }
  return group.tools.slice(0, 3).flatMap((route) => {
    const card = homeToolCards.find((c) => c.href === route);
    return card
      ? [
          {
            key: route,
            title: card.title,
            detail: card.description,
            meta: '',
            target: { to: route, search: {} } satisfies HomeLinkTarget,
          },
        ]
      : [];
  });
}

interface ResultGroupsProps {
  groups: readonly HomeResultGroup[];
  /** Called when a row's link is clicked (the nav dialog closes on it). */
  onNavigate?: MouseEventHandler<HTMLAnchorElement>;
  className?: string;
}

/** Grouped matches beside the answer: recipes, films, developers and tools. */
export function ResultGroups({
  groups,
  onNavigate,
  className,
}: ResultGroupsProps) {
  if (groups.length === 0) return null;
  return (
    <div
      className={cn(
        'rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-surface)] px-4',
        className
      )}
    >
      <h2 className="sr-only">Matches</h2>
      <div className="divide-y divide-[color:var(--color-border-secondary)]">
        {groups.slice(0, 4).map((group) => (
          <section key={group.key} className="py-3">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                {group.label}
              </h3>
              <span className="text-xs text-[color:var(--color-text-tertiary)]">
                {group.total.toLocaleString('en-US')}
              </span>
            </div>
            <ul>
              {rowsOf(group).map((row) => (
                <li key={row.key}>
                  <Link
                    to={row.target.to}
                    search={row.target.search}
                    onClick={onNavigate}
                    className="-mx-2 grid grid-cols-[1fr_auto] gap-x-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[color:var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
                  >
                    <span className="min-w-0 text-sm font-medium text-[color:var(--color-text-primary)]">
                      {row.title}
                    </span>
                    <span className="row-span-2 self-center text-xs text-[color:var(--color-text-secondary)]">
                      {row.meta}
                    </span>
                    <span className="min-w-0 truncate text-xs text-[color:var(--color-text-tertiary)]">
                      {row.detail}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
