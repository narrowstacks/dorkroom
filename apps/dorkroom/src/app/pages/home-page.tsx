import {
  useCombinations,
  useCustomRecipes,
  useFavorites,
} from '@dorkroom/logic';
import { Greeting, StatCard, ToolCard } from '@dorkroom/ui';
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
  Gauge,
  GitBranch,
  GraduationCap,
  HandCoins,
  Heart,
  Library,
  Ruler,
  Timer,
} from 'lucide-react';

// Calculator tools configuration - module level to prevent recreation on each render
const CALCULATORS = [
  {
    category: 'Printing',
    title: 'Border Calculator',
    description: 'Print borders & trim guides',
    href: '/border',
    icon: Crop,
    iconColorKey: 'indigo' as const,
    color: 'text-indigo-400',
    bg: 'from-indigo-500/20 to-purple-500/20',
    border: 'group-hover:border-indigo-500/50',
  },
  {
    category: 'Printing',
    title: 'Stops Calculator',
    description: 'F-stop & time math',
    href: '/stops',
    icon: Gauge,
    iconColorKey: 'blue' as const,
    color: 'text-blue-400',
    bg: 'from-blue-500/20 to-cyan-500/20',
    border: 'group-hover:border-blue-500/50',
  },
  {
    category: 'Printing',
    title: 'Resize Calculator',
    description: 'Scale prints, no wasting test strips',
    href: '/resize',
    icon: Ruler,
    iconColorKey: 'violet' as const,
    color: 'text-violet-400',
    bg: 'from-violet-500/20 to-fuchsia-500/20',
    border: 'group-hover:border-violet-500/50',
  },
  {
    category: 'In the Field',
    title: 'Reciprocity',
    description: 'Long exposure correction',
    href: '/reciprocity',
    icon: Timer,
    iconColorKey: 'amber' as const,
    color: 'text-amber-400',
    bg: 'from-amber-500/20 to-orange-500/20',
    border: 'group-hover:border-amber-500/50',
  },
  {
    category: 'In the Field',
    title: 'Lens Equivalency',
    description: 'Compare focal lengths across formats',
    href: '/lens',
    icon: Focus,
    iconColorKey: 'emerald' as const,
    color: 'text-emerald-400',
    bg: 'from-emerald-500/20 to-teal-500/20',
    border: 'group-hover:border-emerald-500/50',
  },
  {
    category: 'Film Dev',
    title: 'Film Development Recipes',
    description: 'B&W film development database',
    href: '/development',
    icon: FlaskConical,
    iconColorKey: 'rose' as const,
    color: 'text-rose-400',
    bg: 'from-rose-500/20 to-red-500/20',
    border: 'group-hover:border-rose-500/50',
  },
  {
    category: 'Reference',
    title: 'Film Database',
    description: 'Browse film stocks by brand & ISO',
    href: '/films',
    icon: Film,
    iconColorKey: 'cyan' as const,
    color: 'text-cyan-400',
    bg: 'from-cyan-500/20 to-teal-500/20',
    border: 'group-hover:border-cyan-500/50',
  },
] as const;

const COMING_SOON = [
  {
    category: 'Resources',
    title: 'Docs',
    description: 'Documentation for Dorkroom',
    icon: BookOpen,
  },
  {
    category: 'Knowledge',
    title: 'Infobase',
    description: 'Photography & darkroom guides',
    icon: GraduationCap,
  },
  {
    category: 'Tools',
    title: 'Camera Exposure',
    description: 'Equivalent exposure calculator',
    icon: Camera,
  },
];

export function HomePage() {
  const { favoriteIds, isInitialized: isFavoritesInitialized } = useFavorites();
  const { customRecipes, isLoading: isCustomRecipesLoading } =
    useCustomRecipes();
  const { data: combinations, isPending: isCombinationsLoading } =
    useCombinations();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 pb-24 space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <Greeting />
      </div>

      {/* Featured Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
        {/* Main Hero - Compact */}
        <div className="md:col-span-8 relative overflow-hidden rounded-3xl border p-6 sm:p-8 transition-all group hero-card">
          <div
            className="absolute top-0 right-0 blur-3xl rounded-full"
            style={{
              backgroundImage: 'var(--gradient-hero-accent)',
              width: 'var(--size-hero-blob)',
              height: 'var(--size-hero-blob)',
              marginTop: 'var(--spacing-hero-blob-offset)',
              marginRight: 'var(--spacing-hero-blob-offset)',
            }}
          />
          <div className="relative z-10 flex flex-col justify-between h-full gap-6">
            <div>
              <h2
                className="text-2xl font-bold mb-2"
                style={{ color: 'var(--color-hero-title)' }}
              >
                Skip the math. Make prints!
              </h2>
              <p
                className="max-w-md"
                style={{ color: 'var(--color-hero-text)' }}
              >
                Darkroom printing calculators, film development recipes, and
                exposure tools. Free and open source.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/border"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors hero-button-success"
              >
                <Crop className="w-4 h-4" />
                Calculate darkroom easel borders
              </Link>
              <Link
                to="/development"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors hero-button-error"
              >
                <FlaskConical className="w-4 h-4" />
                Search film development recipes
              </Link>
            </div>
          </div>
        </div>
        {/* Quick Stats / Actions */}
        <div className="md:col-span-4 grid grid-cols-2 gap-3">
          <StatCard
            as={Link}
            to="/development"
            label="Film Development Recipes"
            value={combinations ? combinations.length.toLocaleString() : '-'}
            icon={FlaskConical}
            iconColorKey="emerald"
            variant="horizontal"
            className="col-span-2"
            loading={isCombinationsLoading}
          />

          <StatCard
            as={Link}
            to="/development"
            search={{ view: 'favorites' }}
            label="Favorite Recipes"
            value={favoriteIds.length}
            icon={Heart}
            iconColorKey="rose"
            loading={!isFavoritesInitialized}
          />

          <StatCard
            as={Link}
            to="/development"
            search={{ view: 'custom' }}
            label="Your Custom Recipes"
            value={customRecipes.length}
            icon={Library}
            iconColorKey="indigo"
            loading={isCustomRecipesLoading}
          />
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[color:var(--color-text-primary)] flex items-center gap-2">
            <CalculatorIcon className="w-5 h-5 text-[color:var(--color-text-tertiary)]" />
            Calculators
          </h2>
          <div
            className="h-px flex-1 ml-4"
            style={{ backgroundColor: 'var(--color-border-primary)' }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CALCULATORS.map((tool) => (
            <ToolCard key={tool.title} {...tool} as={Link} href={tool.href} />
          ))}
        </div>
      </div>

      {/* Coming Soon Section */}
      <div>
        <div
          className="flex items-center justify-between mb-6"
          data-coming-soon-section
        >
          <h2 className="text-xl font-bold text-[color:var(--color-text-primary)] flex items-center gap-2">
            <Construction
              className="w-5 h-5 text-[color:var(--color-text-tertiary)]"
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          data-coming-soon-section
        >
          {COMING_SOON.map((item) => (
            <div
              key={item.title}
              className="relative overflow-hidden rounded-2xl border border-dashed p-5"
              style={{
                borderColor: 'var(--color-border-secondary)',
                backgroundColor: 'var(--color-surface-muted)',
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="p-3 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border-secondary)',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  <item.icon className="h-6 w-6" data-coming-soon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-text-tertiary)] mb-1">
                    {item.category}
                  </p>
                  <h3 className="font-semibold text-[color:var(--color-text-secondary)] truncate pr-4">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[color:var(--color-text-tertiary)] line-clamp-1">
                    {item.description}
                  </p>
                </div>
              </div>
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
          © {new Date().getFullYear()} Dorkroom.{' '}
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
            <GitBranch className="h-4 w-4" />
            <span>Contribute</span>
          </a>
          <a
            href="https://ko-fi.com/affords"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 transition-colors footer-link"
          >
            <HandCoins className="h-4 w-4" />
            <span>Donate</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
