import { useStats } from '@dorkroom/logic';
import { CATEGORY_LABELS, Greeting, ToolCard } from '@dorkroom/ui';
import { Link } from '@tanstack/react-router';
import {
  BookOpen,
  CalculatorIcon,
  Camera,
  Construction,
  Crop,
  Film,
  FlaskConical,
  Focus,
  Frame,
  Gauge,
  GitBranch,
  GraduationCap,
  HandCoins,
  Ruler,
  Timer,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { HomeHeroPreview } from './home-hero-preview';

// Calculator tools configuration - module level to prevent recreation on each
// render. Accents match each target page's tone (see plan 007).
const CALCULATORS = [
  {
    category: CATEGORY_LABELS.printing,
    title: 'Border Calculator',
    description: 'Print borders & trim guides',
    href: '/border',
    icon: Crop,
    accent: 'indigo',
  },
  {
    category: CATEGORY_LABELS.printing,
    title: 'Stops Calculator',
    description: 'F-stop & time math',
    href: '/stops',
    icon: Gauge,
    accent: 'blue',
  },
  {
    category: CATEGORY_LABELS.printing,
    title: 'Resize Calculator',
    description: 'Scale prints, no wasting test strips',
    href: '/resize',
    icon: Ruler,
    accent: 'teal',
  },
  {
    category: CATEGORY_LABELS.printing,
    title: 'Mat Cut Calculator',
    description: 'Window openings & cut guides',
    href: '/mat',
    icon: Frame,
    accent: 'cyan',
  },
  {
    category: CATEGORY_LABELS.film,
    title: 'Reciprocity',
    description: 'Film long exposure correction',
    href: '/reciprocity',
    icon: Timer,
    accent: 'amber',
  },
  {
    category: CATEGORY_LABELS.film,
    title: 'Film Development Recipes',
    description: 'B&W film development database',
    href: '/development',
    icon: FlaskConical,
    accent: 'rose',
  },
  {
    category: CATEGORY_LABELS.camera,
    title: 'Lens Equivalency',
    description: 'Compare format lens differences',
    href: '/lenses',
    icon: Focus,
    accent: 'emerald',
  },
  {
    category: CATEGORY_LABELS.camera,
    title: 'Camera Exposure',
    description: 'Equivalent exposure calculator',
    href: '/exposure',
    icon: Camera,
    accent: 'teal',
  },
  {
    category: CATEGORY_LABELS.reference,
    title: 'Film Database',
    description: 'Browse film stocks by brand & ISO',
    href: '/films',
    icon: Film,
    accent: 'cyan',
  },
] as const;

const COMING_SOON = [
  {
    title: 'Docs',
    description: 'Documentation for Dorkroom',
    icon: BookOpen,
  },
  {
    title: 'Infobase',
    description: 'Photography & darkroom guides',
    icon: GraduationCap,
  },
];

export function HomePage() {
  const { data: stats, isPending: isStatsLoading } = useStats();
  // Compute the year client-only to avoid a render-time new Date() value.
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  // eslint-disable-next-line react-doctor/rendering-hydration-no-flicker -- CSR-only SPA (no SSR); the footer year is intentionally computed client-side
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const heroStats = [
    { value: stats?.combinations, label: 'development recipes' },
    { value: stats?.films, label: 'film stocks' },
    { value: stats?.developers, label: 'developers' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 pb-24 space-y-10">
      {/* Hero: one grain-textured panel - copy + CTAs on the left, live
          border preview on the right */}
      <div className="hero-grain rounded-3xl border border-[color:var(--color-border-secondary)] p-6 sm:p-8 shadow-subtle grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10 md:items-center">
        <div className="md:col-span-7 flex flex-col gap-5">
          <div>
            <Greeting />
            <p className="text-lg sm:text-xl mt-2 text-[color:var(--color-text-secondary)]">
              Skip the math. Make prints!
            </p>
            <p className="max-w-md mt-2 text-[color:var(--color-text-tertiary)]">
              Darkroom printing calculators, film development recipes, and
              exposure tools. Free and open source.
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
          <div className="flex flex-wrap gap-2">
            <Link
              to="/border"
              className="darkroom-invert-icon inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm button-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-primary)]"
            >
              <Crop className="size-4" />
              Calculate darkroom easel borders
            </Link>
            <Link
              to="/development"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm button-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-primary)]"
            >
              <FlaskConical className="size-4" />
              Search film development recipes
            </Link>
          </div>
        </div>
        <div className="hidden md:block md:col-span-5">
          <HomeHeroPreview />
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[color:var(--color-text-primary)] flex items-center gap-2">
            <CalculatorIcon className="size-5 text-[color:var(--color-text-tertiary)]" />
            Calculators
          </h2>
          <div
            className="h-px flex-1 ml-4"
            style={{ backgroundColor: 'var(--color-border-primary)' }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {CALCULATORS.map((tool, index) => (
            <ToolCard
              key={tool.title}
              {...tool}
              as={Link}
              href={tool.href}
              className={
                index === CALCULATORS.length - 1
                  ? 'sm:col-span-2 lg:col-span-1'
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Coming Soon - quiet strip below the grid */}
      <div
        className="rounded-2xl border border-dashed px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-x-8 gap-y-2"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-surface-muted)',
        }}
        data-coming-soon-section
      >
        <span className="flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
          <Construction className="size-4" data-coming-soon />
          Coming soon
        </span>
        {COMING_SOON.map((item) => (
          <div key={item.title} className="flex items-center gap-2 min-w-0">
            <item.icon
              className="size-4 shrink-0 text-[color:var(--color-text-tertiary)]"
              data-coming-soon
            />
            <span className="font-medium text-[color:var(--color-text-secondary)]">
              {item.title}
            </span>
            <span className="text-sm text-[color:var(--color-text-tertiary)] truncate">
              {item.description}
            </span>
          </div>
        ))}
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
        <div className="flex items-center gap-6">
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
