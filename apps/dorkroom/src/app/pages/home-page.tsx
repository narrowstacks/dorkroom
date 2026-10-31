import { useStats } from '@dorkroom/logic';
import {
  Greeting,
  homeToolCards,
  TemperatureProvider,
  ToolCard,
} from '@dorkroom/ui';
import { Link } from '@tanstack/react-router';
import {
  CalculatorIcon,
  GitBranch,
  HandCoins,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { HomeSearch } from './home/home-search';

export function HomePage() {
  const { data: stats, isPending: isStatsLoading } = useStats();
  // Compute the year client-only to avoid a render-time new Date() value.
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  // eslint-disable-next-line react-doctor/rendering-hydration-no-flicker -- CSR-only SPA (no SSR); the footer year is intentionally computed client-side
  useEffect(() => {
    // eslint-disable-next-line react-doctor/no-initialize-state -- intentionally deferred: keeps new Date() out of render so build-time prerender snapshots stay deterministic
    setCurrentYear(new Date().getFullYear());
  }, []);

  const heroStats = [
    { value: stats?.combinations, label: 'development recipes' },
    { value: stats?.films, label: 'film stocks' },
    { value: stats?.developers, label: 'developers' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 sm:pb-24 space-y-10">
      {/* Hero: one grain-textured panel - wordmark, tagline and counts, then
          the search box with its answer and matches */}
      <div className="hero-grain flex flex-col gap-6 rounded-3xl border border-[color:var(--color-border-secondary)] p-4 shadow-subtle sm:p-8">
        <div className="flex flex-col gap-4">
          <div>
            <Greeting />
            <p className="text-lg sm:text-xl mt-2 text-[color:var(--color-text-secondary)]">
              Skip the math. Make prints!
            </p>
            <p className="max-w-xl mt-2 text-[color:var(--color-text-tertiary)]">
              Darkroom printing calculators, film development recipes, and
              exposure tools. Free and open source. Ask it a question.
            </p>
          </div>
          {/* Stack one stat per line on mobile (bullets hidden) so a stat never
              orphans onto a second line; inline with bullets from sm up. */}
          <p className="flex flex-col gap-y-1 text-sm text-[color:var(--color-text-tertiary)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
            {heroStats.map(({ value, label }, index) => (
              <span key={label} className="inline-flex items-center gap-x-2">
                {index > 0 ? (
                  <span aria-hidden className="hidden sm:inline">
                    ·
                  </span>
                ) : null}
                <span>
                  <span className="font-bold text-[color:var(--color-text-secondary)]">
                    {isStatsLoading || value === undefined
                      ? '-'
                      : value.toLocaleString()}
                  </span>{' '}
                  {label}
                </span>
              </span>
            ))}
          </p>
        </div>
        {/* Recipe answers follow the visitor's °C/°F setting, shared with /development. */}
        <TemperatureProvider>
          <HomeSearch />
        </TemperatureProvider>
      </div>

      {/* Tools Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[color:var(--color-text-primary)] flex items-center gap-2">
            <CalculatorIcon className="size-5 text-[color:var(--color-text-tertiary)]" />
            Tools
          </h2>
          <div
            className="h-px flex-1 ml-4"
            style={{ backgroundColor: 'var(--color-border-primary)' }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {homeToolCards.map((tool, index) => (
            <ToolCard
              key={tool.title}
              {...tool}
              as={Link}
              href={tool.href}
              className={
                index === homeToolCards.length - 1
                  ? 'sm:col-span-2 lg:col-span-1'
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Footer Links - Minimal */}
      <div
        className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-md"
        style={{
          borderColor: 'var(--color-border-primary)',
          color: 'var(--color-text-primary)',
        }}
      >
        <p>
          © {currentYear ?? ''} Dorkroom.{' '}
          <a
            href="https://github.com/narrowstacks/dorkroom/blob/main/LICENSE"
            className="underline transition-colors footer-link"
            target="_blank"
            rel="noreferrer"
          >
            Open Source via the AGPLv3 license.
          </a>{' '}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:flex-nowrap">
          <Link
            to="/privacy"
            className="flex items-center gap-2 transition-colors footer-link"
          >
            <ShieldCheck className="size-4" />
            <span>Privacy</span>
          </Link>
          <a
            href="https://github.com/narrowstacks/dorkroom"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 transition-colors footer-link"
          >
            <GitBranch className="size-4" />
            <span>Contribute</span>
          </a>
          <a
            href="https://ko-fi.com/affords"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 transition-colors footer-link"
          >
            <HandCoins className="size-4" />
            <span>Donate</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
