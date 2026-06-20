import { StatCard } from '@dorkroom/ui';
import { FlaskConical, Film, Users } from 'lucide-react';

// Canonical vertical stat — the home-page library counter.
export const Vertical = () => (
  <div style={{ maxWidth: 280 }}>
    <StatCard
      icon={FlaskConical}
      label="Development recipes"
      value="1,240"
      iconColorKey="emerald"
      variant="vertical"
    />
  </div>
);

// Horizontal layout with a different accent.
export const Horizontal = () => (
  <div style={{ maxWidth: 320 }}>
    <StatCard
      icon={Film}
      label="Film stocks"
      value="318"
      iconColorKey="indigo"
      variant="horizontal"
    />
  </div>
);

// The accent palette swept across the real home-page stats.
export const Accents = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(150px, 1fr))',
      gap: 16,
      maxWidth: 520,
    }}
  >
    <StatCard
      icon={FlaskConical}
      label="Recipes"
      value="1,240"
      iconColorKey="emerald"
    />
    <StatCard
      icon={Film}
      label="Developers"
      value="86"
      iconColorKey="rose"
    />
    <StatCard
      icon={Users}
      label="Contributors"
      value="42"
      iconColorKey="indigo"
    />
  </div>
);

// Loading skeleton state.
export const Loading = () => (
  <div style={{ maxWidth: 280 }}>
    <StatCard
      icon={Film}
      label="Film stocks"
      value="318"
      iconColorKey="indigo"
      loading
    />
  </div>
);
