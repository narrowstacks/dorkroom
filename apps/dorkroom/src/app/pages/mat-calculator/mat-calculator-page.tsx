import {
  bestFitBorders,
  MAT_CALCULATOR_DEFAULTS,
  MAT_CALCULATOR_STORAGE_KEY,
  MAT_PRESETS,
  type MatCalculatorState,
  makeMatFormatter,
  parseMatInput,
  toFractionInput,
  useLocalStorageFormPersistence,
} from '@dorkroom/logic';
import { StatusAlert } from '@dorkroom/ui';
import {
  CalculatorCard,
  CalculatorLayout,
  CalculatorStat,
} from '@dorkroom/ui/calculator';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { FractionField } from './fraction-field';
import { MatDiagram } from './mat-diagram';

const HOW_TO_USE = [
  'Enter the outer mat dimensions — usually the frame’s rabbet opening, or pick a board preset.',
  'Set each border, or let Best fit center your artwork inside the board.',
  'Bottom-weighting adds a touch to the bottom border so the window sits at the optical center.',
  'Read the window opening, then take the guide-bar settings below to your cutter.',
];

const TIPS = [
  'Cut the mat face down. The guide-bar offset is the border for the edge set against the bar.',
  'Reveal (overlap onto the artwork) is typically 1/8" to 1/4" per side so the mat hides the paper edge.',
  'For a beveled cutter, overshoot each plunge/stop slightly to account for the bevel reach — verify on a scrap first.',
  'Inputs accept decimals like 1.5, or fractions like 1 1/2 and 1/4.',
];

function InfoSection() {
  return (
    <CalculatorCard
      title="How this calculator works"
      padding="normal"
      className="bg-surface-muted/80"
    >
      <div className="space-y-6">
        <p
          className="text-[15px] leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Plan a single-window mat with independent borders. Enter your board
          and borders (or fit them to your artwork) and the calculator returns
          the exact window opening plus guide-bar settings for a mat cutter.
        </p>

        <div className="space-y-3">
          <h4
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            How to use
          </h4>
          <ol className="ml-5 list-decimal space-y-2">
            {HOW_TO_USE.map((item) => (
              <li
                key={item}
                className="pl-2 text-[15px] leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {item}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3">
          <h4
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Tips
          </h4>
          <ul className="ml-5 list-disc space-y-2">
            {TIPS.map((tip) => (
              <li
                key={tip}
                className="pl-2 text-[15px] leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </CalculatorCard>
  );
}

interface PresetRowProps {
  outerW: string;
  outerH: string;
  onSelect: (w: number, h: number) => void;
}

function PresetRow({ outerW, outerH, onSelect }: PresetRowProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MAT_PRESETS.map((p) => {
        const active =
          parseMatInput(outerW) === p.w && parseMatInput(outerH) === p.h;
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onSelect(p.w, p.h)}
            className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{
              borderColor: active
                ? 'var(--color-primary)'
                : 'var(--color-border-secondary)',
              backgroundColor: active ? 'var(--color-primary)' : 'transparent',
              color: active
                ? 'var(--color-background)'
                : 'var(--color-text-tertiary)',
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

interface FlipButtonProps {
  label: string;
  onClick: () => void;
}

function FlipButton({ label, onClick }: FlipButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Flip orientation"
      aria-label={label}
      className="mb-0.5 shrink-0 self-end rounded-lg border px-3 py-2 text-base transition-colors"
      style={{
        borderColor: 'var(--color-border-secondary)',
        color: 'var(--color-text-primary)',
        backgroundColor: 'transparent',
      }}
    >
      ↔
    </button>
  );
}

interface GuideBarCardProps {
  title: string;
  offset: string;
  plunge: string;
  stop: string;
  setup: string;
}

function GuideBarCard({
  title,
  offset,
  plunge,
  stop,
  setup,
}: GuideBarCardProps) {
  return (
    <div
      className="rounded-xl border p-3.5"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgb(var(--color-background-rgb) / 0.15)',
      }}
    >
      <div
        className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: 'var(--color-primary)' }}
      >
        {title}
      </div>
      {[
        ['Guide bar offset', offset],
        ['Plunge at', plunge],
        ['Stop at', stop],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between font-mono text-[12px]">
          <span style={{ color: 'var(--color-text-tertiary)' }}>{k}</span>
          <span
            className="font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {v}
          </span>
        </div>
      ))}
      <div
        className="mt-2 text-[11px] italic leading-snug"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {setup}
      </div>
    </div>
  );
}

export default function MatCalculatorPage() {
  const form = useForm({
    defaultValues: MAT_CALCULATOR_DEFAULTS,
  });

  const values = useStore(
    form.store,
    (state) => state.values as MatCalculatorState
  );

  useLocalStorageFormPersistence({
    storageKey: MAT_CALCULATOR_STORAGE_KEY,
    form,
    formValues: values,
    persistKeys: [
      'outerW',
      'outerH',
      'borderTop',
      'borderBottom',
      'borderLeft',
      'borderRight',
      'artW',
      'artH',
      'reveal',
      'bottomWeight',
    ],
  });

  const ow = parseMatInput(values.outerW);
  const oh = parseMatInput(values.outerH);
  const bt = parseMatInput(values.borderTop);
  const bb = parseMatInput(values.borderBottom);
  const bl = parseMatInput(values.borderLeft);
  const br = parseMatInput(values.borderRight);
  const aw = parseMatInput(values.artW);
  const ah = parseMatInput(values.artH);
  const rev = parseMatInput(values.reveal);
  const revVal = isNaN(rev) ? 0 : rev;

  const bordersValid =
    !isNaN(bt) &&
    !isNaN(bb) &&
    !isNaN(bl) &&
    !isNaN(br) &&
    bt >= 0 &&
    bb >= 0 &&
    bl >= 0 &&
    br >= 0;
  const outerValid = !isNaN(ow) && !isNaN(oh) && ow > 0 && oh > 0;
  const windowW = ow - bl - br;
  const windowH = oh - bt - bb;
  const valid = outerValid && bordersValid && windowW > 0 && windowH > 0;

  const fmt = makeMatFormatter(valid);

  const artValid = !isNaN(aw) && !isNaN(ah) && aw > 0 && ah > 0;
  const revealMode = artValid;
  const bestFitPreview =
    artValid && outerValid
      ? bestFitBorders(ow, oh, aw, ah, revVal, values.bottomWeight)
      : null;
  const targetWindowW = revealMode ? aw - 2 * revVal : windowW;
  const targetWindowH = revealMode ? ah - 2 * revVal : windowH;
  const windowMismatchW = revealMode ? windowW - targetWindowW : 0;
  const windowMismatchH = revealMode ? windowH - targetWindowH : 0;
  const overlapLeft = revealMode ? (aw - windowW) / 2 : NaN;
  const overlapTop = revealMode ? (ah - windowH) / 2 : NaN;
  const hasRevealMismatch =
    valid &&
    revealMode &&
    (Math.abs(windowMismatchW) > 1e-3 || Math.abs(windowMismatchH) > 1e-3);

  const set = (key: keyof MatCalculatorState, value: string | boolean) =>
    form.setFieldValue(key, value);

  const applyBestFit = () => {
    const fit = bestFitBorders(ow, oh, aw, ah, revVal, values.bottomWeight);
    if (!fit) return;
    set('borderTop', toFractionInput(fit.top));
    set('borderBottom', toFractionInput(fit.bottom));
    set('borderLeft', toFractionInput(fit.left));
    set('borderRight', toFractionInput(fit.right));
  };

  const guideBarCuts = [
    {
      title: 'Cut 01 · Top window edge',
      offset: fmt(bt),
      plunge: fmt(bl),
      stop: fmt(ow - br),
      setup: 'Face down · top edge against guide bar',
    },
    {
      title: 'Cut 02 · Bottom window edge',
      offset: fmt(bb),
      plunge: fmt(bl),
      stop: fmt(ow - br),
      setup: 'Face down · bottom edge against guide bar',
    },
    {
      title: 'Cut 03 · Left window edge',
      offset: fmt(bl),
      plunge: fmt(bt),
      stop: fmt(oh - bb),
      setup: 'Face down · left edge against guide bar',
    },
    {
      title: 'Cut 04 · Right window edge',
      offset: fmt(br),
      plunge: fmt(bt),
      stop: fmt(oh - bb),
      setup: 'Face down · right edge against guide bar',
    },
  ];

  const dimensionRows: [string, string, string][] = [
    ['Outer mat', `${fmt(ow)} × ${fmt(oh)}`, 'matches frame rabbet'],
    [
      'Window (sight opening)',
      `${fmt(windowW)} × ${fmt(windowH)}`,
      'cut from the face side, short point to short point',
    ],
    [
      'Borders',
      `${fmt(bt)} top · ${fmt(bb)} bot · ${fmt(bl)} L · ${fmt(br)} R`,
      'distance from outer edge to window edge',
    ],
    ...(revealMode
      ? ([
          ['Artwork', `${fmt(aw)} × ${fmt(ah)}`, 'as specified'],
          [
            'Actual reveal',
            `${fmt(overlapLeft)} L/R · ${fmt(overlapTop)} T/B`,
            'mat coverage onto the artwork edge',
          ],
        ] as [string, string, string][])
      : []),
  ];

  return (
    <CalculatorLayout
      title="Mat Cut Calculator"
      description="Plan single-window mats with independent borders and get exact window openings and cutter guide-bar settings."
      results={
        <>
          <CalculatorCard title="Mat layout" padding="compact">
            <MatDiagram
              valid={valid}
              revealMode={revealMode}
              ow={ow}
              oh={oh}
              bt={bt}
              bb={bb}
              bl={bl}
              br={br}
              windowW={windowW}
              windowH={windowH}
              aw={aw}
              ah={ah}
              fmt={fmt}
            />
          </CalculatorCard>

          <CalculatorCard
            title="Window opening"
            description="Sight opening, short point to short point."
            accent="emerald"
            padding="compact"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <CalculatorStat
                label="Width"
                value={fmt(windowW)}
                tone="emerald"
              />
              <CalculatorStat
                label="Height"
                value={fmt(windowH)}
                tone="emerald"
              />
            </div>
          </CalculatorCard>
        </>
      }
      sidebar={
        <>
          <CalculatorCard
            title="Cutter guide-bar settings"
            description="Take these to the mat cutter. Cut face down."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {guideBarCuts.map((c) => (
                <GuideBarCard key={c.title} {...c} />
              ))}
            </div>
          </CalculatorCard>

          <CalculatorCard title="All dimensions">
            <div className="text-[13px]">
              {dimensionRows.map((row, i) => (
                <div
                  key={row[0]}
                  className="flex flex-col gap-[2px] border-t py-2.5 sm:grid sm:grid-cols-[38%_32%_30%] sm:items-start sm:gap-x-2 sm:gap-y-0"
                  style={{
                    borderColor: 'var(--color-border-secondary)',
                    borderTopWidth: i === 0 ? 0 : undefined,
                  }}
                >
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    {row[0]}
                  </div>
                  <div
                    className="break-words font-mono font-medium sm:px-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {row[1]}
                  </div>
                  <div
                    className="text-[12px] italic"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {row[2]}
                  </div>
                </div>
              ))}
            </div>
          </CalculatorCard>

          <InfoSection />
        </>
      }
    >
      <CalculatorCard
        title="Outer mat dimensions"
        description="Usually matches the frame’s rabbet opening."
      >
        <div className="flex items-end gap-2.5">
          <FractionField
            label="Width"
            value={values.outerW}
            onChange={(v) => set('outerW', v)}
          />
          <FractionField
            label="Height"
            value={values.outerH}
            onChange={(v) => set('outerH', v)}
          />
          <FlipButton
            label="Flip outer mat orientation"
            onClick={() => {
              const w = values.outerW;
              set('outerW', values.outerH);
              set('outerH', w);
            }}
          />
        </div>
        <PresetRow
          outerW={values.outerW}
          outerH={values.outerH}
          onSelect={(w, h) => {
            set('outerW', String(w));
            set('outerH', String(h));
          }}
        />
      </CalculatorCard>

      <CalculatorCard
        title="Borders (per side)"
        description="Bottom-weighting (a slightly larger bottom border) reads better on vertical art."
      >
        <div className="grid grid-cols-2 gap-2.5">
          <FractionField
            label="Top"
            value={values.borderTop}
            onChange={(v) => set('borderTop', v)}
          />
          <FractionField
            label="Bottom"
            value={values.borderBottom}
            onChange={(v) => set('borderBottom', v)}
          />
          <FractionField
            label="Left"
            value={values.borderLeft}
            onChange={(v) => set('borderLeft', v)}
          />
          <FractionField
            label="Right"
            value={values.borderRight}
            onChange={(v) => set('borderRight', v)}
          />
        </div>
      </CalculatorCard>

      <CalculatorCard
        title="Artwork & best fit"
        description="Center the artwork in the board and let Best fit set the borders."
      >
        <div className="flex items-end gap-2.5">
          <FractionField
            label="Art width"
            value={values.artW}
            onChange={(v) => set('artW', v)}
          />
          <FractionField
            label="Art height"
            value={values.artH}
            onChange={(v) => set('artH', v)}
          />
          <FlipButton
            label="Flip artwork orientation"
            onClick={() => {
              const w = values.artW;
              set('artW', values.artH);
              set('artH', w);
            }}
          />
        </div>
        <FractionField
          label="Reveal (overlap onto art, per side)"
          value={values.reveal}
          onChange={(v) => set('reveal', v)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={applyBestFit}
            disabled={!bestFitPreview}
            className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors disabled:cursor-not-allowed"
            style={{
              backgroundColor: bestFitPreview
                ? 'var(--color-primary)'
                : 'transparent',
              color: bestFitPreview
                ? 'var(--color-background)'
                : 'var(--color-text-tertiary)',
              border: bestFitPreview
                ? 'none'
                : '1px solid var(--color-border-secondary)',
            }}
          >
            Best fit borders →
          </button>
          <label
            className="flex cursor-pointer items-center gap-2 text-[12px]"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <input
              type="checkbox"
              checked={values.bottomWeight}
              onChange={(e) => set('bottomWeight', e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer"
              style={{ accentColor: 'var(--color-primary)' }}
            />
            Bottom-weight (optical center)
          </label>
        </div>
        {bestFitPreview && (
          <p
            className="font-mono text-[11px]"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Would set borders to {toFractionInput(bestFitPreview.top)}″ T ·{' '}
            {toFractionInput(bestFitPreview.bottom)}″ B ·{' '}
            {toFractionInput(bestFitPreview.left)}″ L ·{' '}
            {toFractionInput(bestFitPreview.right)}″ R
          </p>
        )}

        {!valid && (
          <StatusAlert
            action="warning"
            message="Check inputs. The outer mat must be positive and the borders must leave a window larger than zero on both axes."
          />
        )}
        {hasRevealMismatch && (
          <StatusAlert
            action="warning"
            message={`Window doesn’t match a ${fmt(revVal)} reveal. Actual overlap: ${fmt(overlapLeft)} L/R · ${fmt(overlapTop)} T/B.`}
          />
        )}
      </CalculatorCard>
    </CalculatorLayout>
  );
}
