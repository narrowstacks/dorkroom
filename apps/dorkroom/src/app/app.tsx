import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  Aperture,
  Beaker,
  BookOpen,
  Crop,
  Gauge,
  Home,
  Ruler,
  Timer,
} from 'lucide-react';
import { cn } from './lib/cn';
import HomePage from './pages/home-page';
import BorderCalculatorPage from './pages/border-calculator/border-calculator-page';
import ResizeCalculatorPage from './pages/resize-calculator/resize-calculator-page';
import ReciprocityCalculatorPage from './pages/reciprocity-calculator/reciprocity-calculator-page';

const navItems = [
  {
    label: 'Home',
    to: '/',
    icon: Home,
    summary: 'Skip the math. Make prints.',
  },
  {
    label: 'Border',
    to: '/border',
    icon: Crop,
    summary: 'Trim-safe borders with print guides.',
  },
  {
    label: 'Resize',
    to: '/resize',
    icon: Ruler,
    summary: 'Scale prints without endless test strips.',
  },
  {
    label: 'Stops',
    to: '/stops',
    icon: Gauge,
    summary: 'Translate exposure stops into seconds.',
  },
  {
    label: 'Exposure',
    to: '/exposure',
    icon: Aperture,
    summary: 'Balance aperture, shutter, and ISO on set.',
  },
  {
    label: 'Reciprocity',
    to: '/reciprocity',
    icon: Timer,
    summary: 'Correct for long exposure failure.',
  },
  {
    label: 'Development',
    to: '/development',
    icon: Beaker,
    summary: 'Film chemistry pairings with proven results.',
  },
  {
    label: 'Infobase',
    to: '/infobase',
    icon: BookOpen,
    summary: 'Reference tables, notes, and recipes.',
  },
];

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/border': 'Border Calculator',
  '/resize': 'Print Resize Calculator',
  '/reciprocity': 'Reciprocity Failure Calculator',
  '/stops': 'Stops Calculator',
  '/exposure': 'Exposure Calculator',
  '/development': 'Development Recipes',
  '/infobase': 'Infobase',
};

function PlaceholderPage({
  title,
  summary,
}: {
  title: string;
  summary: string;
}) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-24 text-center sm:px-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-lg font-semibold text-white/80">
        Soon
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="text-base text-zinc-300">
          {summary} We&apos;re still putting the finishing touches on this
          calculator. Check back shortly or head to another tool.
        </p>
      </div>
      <div className="flex justify-center">
        <Link
          to="/"
          className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/10"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

export function App() {
  const location = useLocation();

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const normalisedPath = location.pathname.replace(/\/+$/, '') || '/';
    const pageTitle =
      ROUTE_TITLES[normalisedPath] ||
      navItems.find((item) => item.to === normalisedPath)?.label ||
      'Dorkroom';
    document.title =
      pageTitle === 'Dorkroom' ? 'Dorkroom' : `${pageTitle} - Dorkroom`;
  }, [location.pathname]);

  return (
    <div className="h-dvh bg-background text-white">
      <div className="backdrop-gradient min-h-dvh">
        <header className="sticky top-[env(safe-area-inset-top)] z-50 border-b border-white/5 bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
            <Link to="/" className="flex items-center gap-3 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold">
                D
              </span>
              <span className="hidden text-lg font-semibold tracking-tight sm:block">
                Dorkroom
              </span>
            </Link>
            <nav className="flex flex-1 justify-center">
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/40 p-1 text-sm backdrop-blur">
                {navItems.map(({ label, to, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex min-w-fit items-center gap-2 rounded-full px-4 py-2 font-medium text-zinc-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                        isActive &&
                          'bg-white hover:text-black text-background shadow-subtle'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </nav>
            <a
              href="https://github.com/dorkroom"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10 sm:block"
            >
              Contribute
            </a>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/border" element={<BorderCalculatorPage />} />
            <Route path="/resize" element={<ResizeCalculatorPage />} />
            <Route path="/reciprocity" element={<ReciprocityCalculatorPage />} />
            {navItems
              .filter(
                (item) =>
                  !['/', '/border', '/resize', '/reciprocity'].includes(item.to)
              )
              .map((item) => (
                <Route
                  key={item.to}
                  path={item.to}
                  element={
                    <PlaceholderPage
                      title={item.label}
                      summary={item.summary}
                    />
                  }
                />
              ))}
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
