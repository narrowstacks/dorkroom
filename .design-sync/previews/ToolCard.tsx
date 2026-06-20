import { ToolCard } from '@dorkroom/ui';
import { Crop, FlaskConical, Gauge, Ruler, Timer } from 'lucide-react';

// A single tool entry — the canonical home-page composition.
export const Default = () => (
  <div style={{ maxWidth: 280 }}>
    <ToolCard
      category="Printing"
      title="Border Calculator"
      description="Print borders & trim guides"
      href="/border"
      icon={Crop}
      accent="indigo"
    />
  </div>
);

// The accent axis swept across a few real calculators.
export const Accents = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))',
      gap: 16,
      maxWidth: 520,
    }}
  >
    <ToolCard
      category="Printing"
      title="Stops Calculator"
      description="F-stop & time math"
      href="/stops"
      icon={Gauge}
      accent="blue"
    />
    <ToolCard
      category="Printing"
      title="Resize Calculator"
      description="Scale prints, no wasting test strips"
      href="/resize"
      icon={Ruler}
      accent="teal"
    />
    <ToolCard
      category="Film"
      title="Reciprocity"
      description="Film long exposure correction"
      href="/reciprocity"
      icon={Timer}
      accent="amber"
    />
    <ToolCard
      category="Film"
      title="Film Development Recipes"
      description="B&W film development database"
      href="/development"
      icon={FlaskConical}
      accent="rose"
    />
  </div>
);
