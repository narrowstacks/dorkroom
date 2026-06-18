# Dorkroom UI — conventions

`@dorkroom/ui` is the component library for Dorkroom, an analog-photography calculator app. It is **dark-first** (near-black surfaces, neon-green primary) built on **React 19 + Tailwind CSS 4**. Build with the real exported components and the token/utility vocabulary below — do not invent new class names or restyle from scratch.

## Setup — wrap the app in the provider chain

Theme tokens and several components depend on React context. Wrap the app once, outermost, in this chain (all imported from `@dorkroom/ui`, all take only `children`):

```jsx
import {
  ThemeProvider, MeasurementProvider, TemperatureProvider, VolumeProvider, ToastProvider,
} from '@dorkroom/ui';

<ThemeProvider>
  <MeasurementProvider><TemperatureProvider><VolumeProvider><ToastProvider>
    {/* app */}
  </ToastProvider></VolumeProvider></TemperatureProvider></MeasurementProvider>
</ThemeProvider>
```

Without `ThemeProvider`, components that call `useTheme`/`useToast`/unit hooks throw. The provider sets `data-theme` on `<html>` (default resolves from system; the brand look is `data-theme="dark"`), which is what activates the token values. The page background should be `var(--color-background)`.

## Styling idiom — Tailwind utilities + semantic theme-token classes

Style with Tailwind utility classes. Colors come from **semantic token utilities** (not raw hex, not generic Tailwind palette) so they track the active theme. Use these real class families:

| Purpose | Semantic utility classes (these exist in the shipped CSS) |
|---|---|
| Text | `text-primary` (main body text — white), `text-secondary`, `text-tertiary`, `text-muted` |
| Surfaces (bg) | `bg-background` (page), `bg-surface`, `bg-surface-muted` |
| Borders | `border-primary`, `border-secondary`, `border-muted` |

**Accent colors and fonts have no plain utility class** — apply them via the CSS variables (inline `style` or Tailwind arbitrary values):

- Accents: `--color-primary` (neon green), `--color-secondary`, `--color-accent`, `--color-highlight` — e.g. `style={{ color: 'var(--color-primary)' }}` or `className="text-[var(--color-primary)]"`.
- Display/heading font is **Fraunces** via `--font-family-display`: `style={{ fontFamily: 'var(--font-family-display)' }}` or `font-[family-name:var(--font-family-display)]`. Body text is already **Montserrat Variable** (set globally on `html,body` — no class needed).

Full token set: `--color-<background|surface|surface-muted|primary|secondary|accent|highlight|text-primary|text-secondary|text-tertiary|text-muted|border-primary|border-secondary|border-muted>`. Layout/spacing use ordinary Tailwind utilities (`flex`, `gap-4`, `rounded-2xl`, `px-5`, `grid`, `sm:grid-cols-2`).

## Where the truth lives

- **Styles**: the bound `styles.css` and its `@import` closure (compiled tokens + the semantic utilities above) — read it before styling.
- **Per component**: each component ships `<Name>.d.ts` (the exact prop contract) and `<Name>.prompt.md` (usage + examples). Read those for any component before composing it — props are specific (e.g. `ToolCard` needs `icon` (a lucide-react icon), `accent`, `title`, `description`, `href`).

## One idiomatic example

```jsx
import { Crop } from 'lucide-react';
import { ToolCard, StatusAlert } from '@dorkroom/ui';

<div className="bg-background text-primary p-6 grid gap-4">
  <h1 className="text-2xl" style={{ fontFamily: 'var(--font-family-display)' }}>Darkroom tools</h1>
  <div className="grid gap-4 sm:grid-cols-2">
    <ToolCard category="Printing" title="Border Calculator"
      description="Print borders & trim guides" href="/border" icon={Crop} accent="indigo" />
  </div>
  <StatusAlert action="warning" message="Aspect ratios don't match — adjust to taste." />
</div>
```
