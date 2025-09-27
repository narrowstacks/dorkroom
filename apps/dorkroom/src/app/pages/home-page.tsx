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
    gradient: 'var(--gradient-card-primary)',
  },
  {
    title: 'Browse development recipes',
    description: 'Film + chemistry pairings with trusted results',
    href: '/development',
    gradient: 'var(--gradient-card-accent)',
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
    gradient: 'var(--gradient-card-neutral)',
  },
  {
    category: 'Exposure Math',
    title: 'Stops Calculator',
    description: 'Calculate exposure in stops and time',
    href: '/stops',
    icon: Gauge,
    gradient: 'var(--gradient-card-info)',
  },
  {
    category: 'Digital Prep',
    title: 'Resize Calculator',
    description: 'Scale prints without making tons of test strips',
    href: '/resize',
    icon: Ruler,
    gradient: 'var(--gradient-card-secondary)',
  },
  {
    category: 'On-location',
    title: 'Exposure Calculator',
    description: 'Aperture, shutter, ISO trade-offs',
    href: '/exposure',
    icon: Aperture,
    gradient: 'var(--gradient-card-secondary)',
  },
  {
    category: 'Long Exposure',
    title: 'Reciprocity',
    description: 'Correct for long exposure failure',
    href: '/reciprocity',
    icon: Timer,
    gradient: 'var(--gradient-card-warning)',
  },
  {
    category: 'Darkroom Library',
    title: 'Development Recipes',
    description: 'Film & chemistry pairings that just work',
    href: '/development',
    icon: Beaker,
    gradient: 'var(--gradient-card-error)',
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
      <section
        className="relative overflow-hidden rounded-4xl border px-6 py-12 shadow-glow sm:px-12"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-90" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-6">
            <div
              className="inline-flex items-center gap-2 pr-4 py-2 text-4xl font-black tracking-tight sm:text-5xl"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <span>Dorkroom.art</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Skip the math. Make prints.
              </h1>
              <p
                className="text-lg leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Dorkroom keeps the math and planning out of the way so you can
                focus on making prints and beautiful exposures.{' '}
              </p>
              <p
                className="text-lg leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Explore calculators that balance exposure, size prints, and
                guide darkroom chemistry.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  to={action.href}
                  className="group relative overflow-hidden rounded-3xl p-5 transition-transform hover:-translate-y-0.5 shadow-subtle"
                  style={{ backgroundImage: action.gradient }}
                >
                  <div className="relative z-10 flex h-full flex-col justify-between gap-3 text-left">
                    <div className="space-y-2">
                      <p
                        className="text-base font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {action.title}
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {action.description}
                      </p>
                    </div>
                    <span
                      className="flex items-center gap-2 text-sm font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Get started
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-15"
                    style={{
                      backgroundColor:
                        'rgba(var(--color-background-rgb), 0.12)',
                    }}
                  />
                </Link>
              ))}
            </div>
          </div>
          <div
            className="flex flex-col justify-between gap-6 rounded-3xl p-6 shadow-subtle backdrop-blur"
            style={{
              backgroundColor: 'rgba(var(--color-background-rgb), 0.6)',
            }}
          >
            <div className="space-y-4">
              <p
                className="text-3xl font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Built for darkroom obsessives.
              </p>
            </div>
            <ul
              className="flex flex-col gap-4 text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {highlights.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-subtle border"
                  style={{
                    backgroundColor: 'rgba(var(--color-background-rgb), 0.06)',
                    borderColor: 'var(--color-border-secondary)',
                    borderWidth: 1.5,
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2
            className="text-2xl font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Calculators
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Everything you need to plan exposures, prints, and reciprocity fixes
            in the darkroom.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {calculators.map((tool) => (
            <Link
              key={tool.title}
              to={tool.href}
              className="group relative overflow-hidden rounded-3xl p-6 shadow-subtle transition-transform hover:-translate-y-1"
              style={{ backgroundImage: tool.gradient }}
            >
              <div className="relative z-10 flex h-full flex-col gap-6">
                <div
                  className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em]"
                  style={{
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <span>{tool.category}</span>
                  <tool.icon className="h-4 w-4" />
                </div>
                <div className="space-y-2">
                  <p
                    className="text-xl font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {tool.title}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {tool.description}
                  </p>
                </div>
                <span
                  className="mt-auto flex items-center gap-2 text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Open calculator
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-15"
                style={{
                  backgroundColor: 'rgba(var(--color-background-rgb), 0.14)',
                }}
              />
            </Link>
          ))}
        </div>
      </section>

      <section
        className="rounded-3xl border p-8 shadow-subtle sm:p-10"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p
              className="text-sm uppercase tracking-[0.3em]"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Stay in the loop
            </p>
            <h3
              className="text-3xl font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
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
                  'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition',
                  link.label.includes('Ko-fi') &&
                    'bg-gradient-to-r from-rose-500/10 to-orange-400/10'
                )}
                style={{
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-secondary)',
                  borderWidth: 1,
                  backgroundColor: 'transparent',
                }}
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
