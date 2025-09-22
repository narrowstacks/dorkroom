import {
  Aperture,
  ArrowUpRight,
  Beaker,
  Camera,
  Crop,
  Gauge,
  GitBranch,
  Mic,
  Ruler,
  Timer,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/cn';

const quickActions = [
  {
    title: 'Launch border calculator',
    description: 'Get instant print guides and trim-safe borders',
    href: '/border',
    gradient:
      'linear-gradient(135deg, rgba(110, 243, 164, 0.35), rgba(36, 146, 88, 0.25))',
  },
  {
    title: 'Browse development recipes',
    description: 'Film + chemistry pairings with trusted results',
    href: '/development',
    gradient:
      'linear-gradient(135deg, rgba(249, 159, 150, 0.35), rgba(141, 61, 69, 0.25))',
  },
];

const highlights = [
  { icon: Camera, label: 'Built for analog photographers' },
  { icon: Timer, label: 'Fast exposure & reciprocity math' },
  { icon: GitBranch, label: 'Open source, community powered' },
];

const calculators = [
  {
    category: 'Printmaking',
    title: 'Border Calculator',
    description: 'Calculate precise print borders',
    href: '/border',
    icon: Crop,
    gradient:
      'linear-gradient(135deg, rgba(57, 118, 79, 0.45), rgba(20, 52, 36, 0.35))',
  },
  {
    category: 'Exposure Math',
    title: 'Stops Calculator',
    description: 'Calculate exposure in stops and time',
    href: '/stops',
    icon: Gauge,
    gradient:
      'linear-gradient(135deg, rgba(70, 34, 90, 0.55), rgba(23, 15, 42, 0.4))',
  },
  {
    category: 'Digital Prep',
    title: 'Resize Calculator',
    description: 'Scale prints without making tons of test strips',
    href: '/resize',
    icon: Ruler,
    gradient:
      'linear-gradient(135deg, rgba(35, 73, 117, 0.55), rgba(18, 33, 56, 0.35))',
  },
  {
    category: 'On-location',
    title: 'Exposure Calculator',
    description: 'Aperture, shutter, ISO trade-offs',
    href: '/exposure',
    icon: Aperture,
    gradient:
      'linear-gradient(135deg, rgba(38, 50, 107, 0.5), rgba(15, 25, 52, 0.4))',
  },
  {
    category: 'Long Exposure',
    title: 'Reciprocity',
    description: 'Correct for long exposure failure',
    href: '/reciprocity',
    icon: Timer,
    gradient:
      'linear-gradient(135deg, rgba(148, 92, 34, 0.55), rgba(65, 36, 14, 0.4))',
  },
  {
    category: 'Darkroom Library',
    title: 'Development Recipes',
    description: 'Film & chemistry pairings that just work',
    href: '/development',
    icon: Beaker,
    gradient:
      'linear-gradient(135deg, rgba(121, 53, 78, 0.55), rgba(50, 23, 35, 0.4))',
  },
];

const communityLinks = [
  {
    label: 'Contribute on GitHub',
    href: 'https://github.com/dorkroom',
    icon: GitBranch,
  },
  {
    label: 'Support on Ko-fi',
    href: 'https://ko-fi.com/',
    icon: Mic,
  },
];

export function HomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-12 sm:px-10">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-surface/80 px-6 py-12 shadow-glow sm:px-12">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-90" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 pr-4 py-2 text-4xl font-black tracking-tight sm:text-5xl">
              <span>Dorkroom.art</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Skip the math. Make prints.
              </h1>
              <p className="text-lg leading-relaxed text-zinc-200">
                Dorkroom keeps the math and planning out of the way so you can
                focus on making prints and beautiful exposures.{' '}
              </p>
              <p className="text-lg leading-relaxed text-zinc-200">
                Explore calculators that balance exposure, size prints, and
                guide darkroom chemistry.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  to={action.href}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 transition-transform hover:-translate-y-0.5 hover:border-white/20"
                  style={{ backgroundImage: action.gradient }}
                >
                  <div className="relative z-10 flex h-full flex-col justify-between gap-3 text-left">
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-white">
                        {action.title}
                      </p>
                      <p className="text-sm text-zinc-100/80">
                        {action.description}
                      </p>
                    </div>
                    <span className="flex items-center gap-2 text-sm font-medium text-white/90">
                      Get started
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-10" />
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-black/30 p-6 shadow-subtle backdrop-blur">
            <div className="space-y-2">
              <p className="text-3xl font-semibold text-white">
                Built for darkroom obsessives.
              </p>
            </div>
            <ul className="flex flex-col gap-4 text-sm text-zinc-200">
              {highlights.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <item.icon className="h-4 w-4 text-white/80" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">Calculators</h2>
          <p className="text-sm text-zinc-300">
            Everything you need to plan exposures, prints, and reciprocity fixes
            in the darkroom.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {calculators.map((tool) => (
            <Link
              key={tool.title}
              to={tool.href}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-surface-muted/80 p-6 shadow-subtle transition-transform hover:-translate-y-1"
              style={{ backgroundImage: tool.gradient }}
            >
              <div className="relative z-10 flex h-full flex-col gap-6">
                <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-white/70">
                  <span>{tool.category}</span>
                  <tool.icon className="h-4 w-4 text-white/80" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-white">
                    {tool.title}
                  </p>
                  <p className="text-sm text-white/80">{tool.description}</p>
                </div>
                <span className="mt-auto flex items-center gap-2 text-sm font-medium text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
                  Open calculator
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <div className="pointer-events-none absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-10" />
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-surface/80 p-8 shadow-subtle sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">
              Stay in the loop
            </p>
            <h3 className="text-3xl font-semibold text-white">
              Support the project, download the code, or share feedback with
              other darkroom techs.
            </h3>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {communityLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-medium transition hover:border-white/30 hover:bg-white/10',
                  link.label.includes('Ko-fi') &&
                    'bg-gradient-to-r from-rose-500/30 to-orange-400/20'
                )}
              >
                {/* render icon component explicitly to satisfy JSX typing */}
                {(() => {
                  const IconComp = link.icon as React.ComponentType<{
                    className?: string;
                  }>;
                  return <IconComp className="h-4 w-4" />;
                })()}
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
