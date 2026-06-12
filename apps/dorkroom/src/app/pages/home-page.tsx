import { useStats } from '@dorkroom/logic';
import { CATEGORY_LABELS, Greeting, StatCard, ToolCard } from '@dorkroom/ui';
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
  TestTubes,
  Timer,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// Calculator tools configuration - module level to prevent recreation on each render
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
    accent: 'violet',
  },
  {
    category: CATEGORY_LABELS.printing,
    title: 'Mat Cut Calculator',
    description: 'Window openings & cut guides',
    href: '/mat',
    icon: Frame,
    accent: 'teal',
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
    category: CATEGORY_LABELS.reference,
    title: 'Film Database',
    description: 'Browse film stocks by brand & ISO',
    href: '/films',
    icon: Film,
    accent: 'cyan',
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
    accent: 'sky',
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

const CALCULATOR_CATEGORIES = [
  CATEGORY_LABELS.printing,
  CATEGORY_LABELS.film,
  CATEGORY_LABELS.camera,
  CATEGORY_LABELS.reference,
] as const;

// Group calculators by category in a single pass, preserving the order above.
type CalculatorCard = Omit<(typeof CALCULATORS)[number], 'category'>;
const CALCULATORS_BY_CATEGORY = (() => {
  const groups = new Map<string, CalculatorCard[]>(
    CALCULATOR_CATEGORIES.map((label) => [label, []])
  );
  for (const { category, ...tool } of CALCULATORS) {
    groups.get(category)?.push(tool);
  }
  return CALCULATOR_CATEGORIES.map((label) => ({
    label,
    tools: groups.get(label) ?? [],
  }));
})();

export function HomePage() {
  const { data: stats, isPending: isStatsLoading } = useStats();
  // Compute the year client-only to avoid a render-time new Date() value.
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  // eslint-disable-next-line react-doctor/rendering-hydration-no-flicker -- CSR-only SPA (no SSR); the footer year is intentionally computed client-side
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 pb-24 space-y-10">
      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
        {/* Hero copy + CTAs - unboxed */}
        <div className="md:col-span-8 flex flex-col justify-between gap-6">
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
          <div className="flex flex-wrap gap-2">
            <Link
              to="/border"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm button-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-primary)]"
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
        {/* Quick Stats / Actions */}
        <div className="md:col-span-4 grid grid-cols-2 gap-3">
          <StatCard
            as={Link}
            to="/development"
            label="Development Recipes"
            value={stats ? stats.combinations.toLocaleString() : '-'}
            icon={FlaskConical}
            iconColorKey="emerald"
            variant="horizontal"
            className="col-span-2"
            loading={isStatsLoading}
          />

          <StatCard
            as={Link}
            to="/films"
            label="Film Stocks"
            value={stats ? stats.films.toLocaleString() : '-'}
            icon={Film}
            iconColorKey="rose"
            loading={isStatsLoading}
          />

          <StatCard
            as={Link}
            to="/development"
            label="Developers"
            value={stats ? stats.developers.toLocaleString() : '-'}
            icon={TestTubes}
            iconColorKey="indigo"
            loading={isStatsLoading}
          />
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

        <div className="space-y-6">
          {CALCULATORS_BY_CATEGORY.map(({ label, tools }) => (
            <div key={label}>
              <h3 className="text-sm font-medium text-[color:var(--color-text-tertiary)] uppercase tracking-wider mb-3">
                {label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.map((tool) => (
                  <ToolCard
                    key={tool.title}
                    {...tool}
                    as={Link}
                    href={tool.href}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Section */}
      <div>
        <div
          className="flex items-center justify-between mb-6"
          data-coming-soon-section
        >
          <h2 className="text-xl font-semibold text-[color:var(--color-text-primary)] flex items-center gap-2">
            <Construction
              className="size-5 text-[color:var(--color-text-tertiary)]"
              data-coming-soon
            />
            Coming Soon
          </h2>
          <div
            className="h-px flex-1 ml-4"
            style={{ backgroundColor: 'var(--color-border-primary)' }}
          />
        </div>

        <div
          className="rounded-2xl border border-dashed p-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface-muted)',
          }}
          data-coming-soon-section
        >
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
