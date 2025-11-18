import {
  Crop,
  FlaskConical,
  Gauge,
  GitBranch,
  HandCoins,
  Heart,
  Layout,
  Library,
  Ruler,
  Timer,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import {
  useCustomRecipes,
  useFavorites,
  useCombinations,
} from '@dorkroom/logic';
import { Greeting, ToolCard, StatCard } from '@dorkroom/ui';

const calculators = [
  {
    category: 'Print',
    title: 'Border Calculator',
    description: 'Print borders & trim guides',
    href: '/border',
    icon: Crop,
    color: 'text-indigo-400',
    bg: 'from-indigo-500/20 to-purple-500/20',
    border: 'group-hover:border-indigo-500/50',
  },
  {
    category: 'Exposure',
    title: 'Stops Calculator',
    description: 'F-stop & time math',
    href: '/stops',
    icon: Gauge,
    color: 'text-blue-400',
    bg: 'from-blue-500/20 to-cyan-500/20',
    border: 'group-hover:border-blue-500/50',
  },
  {
    category: 'Digital',
    title: 'Resize Calculator',
    description: 'Scale prints, no wasting test strips',
    href: '/resize',
    icon: Ruler,
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
    color: 'text-amber-400',
    bg: 'from-amber-500/20 to-orange-500/20',
    border: 'group-hover:border-amber-500/50',
  },
  {
    category: 'Film Dev',
    title: 'Film Development Recipes',
    description: 'Film & chemistry database',
    href: '/development',
    icon: FlaskConical,
    color: 'text-rose-400',
    bg: 'from-rose-500/20 to-red-500/20',
    border: 'group-hover:border-rose-500/50',
  },
];

// Removed Greeting function definition

export function HomePage() {
  const { favoriteIds } = useFavorites();
  const { customRecipes } = useCustomRecipes();
  const { data: combinations } = useCombinations();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 pb-24 space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <Greeting />
      </div>

      {/* Featured Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
        {/* Main Hero - Compact */}
        <div className="md:col-span-8 relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8 transition-all hover:border-zinc-700 group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-3xl rounded-full" />
          <div className="relative z-10 flex flex-col justify-between h-full gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Skip the math. Make prints!
              </h2>
              <p className="text-zinc-400 max-w-md">
                Dorkroom.art is a collection of tools for the darkroom and
                photography. Calculate borders, exposures, and manage your
                development recipes in our easy to use interface.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/border"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 text-white hover:bg-emerald-700 font-medium text-sm transition-colors"
              >
                <Crop className="w-4 h-4" />
                Try our darkroom easel border calculator
              </Link>
              <Link
                to="/development"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-800 text-white hover:bg-rose-700 font-medium text-sm transition-colors"
              >
                <FlaskConical className="w-4 h-4" />
                Find the perfect film development recipe
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
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10 group-hover:bg-emerald-500/20"
            variant="horizontal"
            className="col-span-2"
          />

          <StatCard
            as={Link}
            to="/development"
            search={{ view: 'favorites' }}
            label="Favorite Recipes"
            value={favoriteIds.length}
            icon={Heart}
            iconColor="text-rose-400"
            iconBg="bg-rose-500/10 group-hover:bg-rose-500/20"
          />

          <StatCard
            as={Link}
            to="/development"
            search={{ view: 'custom' }}
            label="Your Custom Recipes"
            value={customRecipes.length}
            icon={Library}
            iconColor="text-indigo-400"
            iconBg="bg-indigo-500/10 group-hover:bg-indigo-500/20"
          />
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layout className="w-5 h-5 text-zinc-500" />
            Calculators
          </h2>
          <div className="h-px flex-1 bg-zinc-800 ml-4" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {calculators.map((tool) => (
            <ToolCard key={tool.title} {...tool} as={Link} href={tool.href} />
          ))}
        </div>
      </div>

      {/* Footer Links - Minimal */}
      <div className="border-t border-zinc-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-md text-white">
        <p>
          © {new Date().getFullYear()} Dorkroom.{' '}
          <a
            href="https://github.com/narrowstacks/dorkroom/blob/main/LICENSE"
            className="underline text-zinc-400"
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
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            <GitBranch className="h-4 w-4" />
            <span>Contribute</span>
          </a>
          <a
            href="https://ko-fi.com/affords"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 hover:text-rose-400 transition-colors"
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
