import { ThemeToggle } from '@dorkroom/ui';

// The default desktop nav toggle: a round icon button showing the active
// theme's icon. Clicking opens a theme menu (Dark / Light / High Contrast /
// Darkroom / System).
export const Icon = () => (
  <div style={{ maxWidth: 80 }}>
    <ThemeToggle variant="icon" />
  </div>
);

// The labelled pill variant with a chevron, used in settings-style menus.
export const Button = () => (
  <div style={{ maxWidth: 220 }}>
    <ThemeToggle variant="button" />
  </div>
);

// The stacked tile variant for the mobile grid.
export const Grid = () => (
  <div style={{ maxWidth: 120 }}>
    <ThemeToggle variant="grid" />
  </div>
);

// The sidebar footer variant — a full-width labelled control.
export const Sidebar = () => (
  <div style={{ maxWidth: 160 }}>
    <ThemeToggle variant="sidebar" />
  </div>
);
