import {
  MAT_PRESETS,
  type MatCalculatorState,
  parseMatInput,
  type UseMatCalculatorReturn,
  useMatCalculator,
} from '@dorkroom/logic';
import { getRouteIcon, StatusAlert, useMeasurement } from '@dorkroom/ui';
import {
  CalculatorCard,
  CalculatorLayout,
  CalculatorStat,
} from '@dorkroom/ui/calculator';
import { useCallback, useMemo } from 'react';
import { useCalculatorAnalytics } from '../../lib/analytics/use-calculator-analytics';
import { FractionField } from './fraction-field';
import { MatDiagram } from './mat-diagram';
import { MatInfoSection } from './mat-info-section';
import {
  formatMatPresetLabel,
  formatMatPreview,
  formatMatValue,
} from './mat-units';

interface PresetRowProps {
  outerW: string;
  outerH: string;
  onSelect: (w: number, h: number) => void;
}

function PresetRow({ outerW, outerH, onSelect }: PresetRowProps) {
  const { unit } = useMeasurement();
  return (
    <div className="flex flex-wrap gap-1.5">
      {MAT_PRESETS.map((p) => {
        const active =
          parseMatInput(outerW) === p.w && parseMatInput(outerH) === p.h;
        return (
          <button
            key={p.label}
            type="button"
            title={unit === 'imperial' ? undefined : `${p.label} in`}
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
            {formatMatPresetLabel(p, unit)}
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

type MatCalculation = UseMatCalculatorReturn;
type MatSetter = MatCalculation['set'];

function MatResults({
  fmt,
  valid,
  revealMode,
  ow,
  oh,
  bt,
  bb,
  bl,
  br,
  aw,
  ah,
  windowW,
  windowH,
}: Pick<
  MatCalculation,
  | 'fmt'
  | 'valid'
  | 'revealMode'
  | 'ow'
  | 'oh'
  | 'bt'
  | 'bb'
  | 'bl'
  | 'br'
  | 'aw'
  | 'ah'
  | 'windowW'
  | 'windowH'
>) {
  return (
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
        accent="cyan"
        padding="compact"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CalculatorStat label="Width" value={fmt(windowW)} tone="cyan" />
          <CalculatorStat label="Height" value={fmt(windowH)} tone="cyan" />
        </div>
      </CalculatorCard>
    </>
  );
}

function MatSidebar({
  guideBarCuts,
  dimensionRows,
}: Pick<MatCalculation, 'guideBarCuts' | 'dimensionRows'>) {
  return (
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

      <MatInfoSection />
    </>
  );
}

function OuterMatCard({
  values,
  set,
}: {
  values: MatCalculatorState;
  set: MatSetter;
}) {
  return (
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
  );
}

function BordersCard({
  values,
  set,
}: {
  values: MatCalculatorState;
  set: MatSetter;
}) {
  return (
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
  );
}

function ArtworkBestFitCard({
  values,
  set,
  applyBestFit,
  bestFitPreview,
  fmt,
  valid,
  revVal,
  overlapLeft,
  overlapTop,
  hasRevealMismatch,
}: Pick<
  MatCalculation,
  | 'values'
  | 'set'
  | 'applyBestFit'
  | 'bestFitPreview'
  | 'fmt'
  | 'valid'
  | 'revVal'
  | 'overlapLeft'
  | 'overlapTop'
  | 'hasRevealMismatch'
>) {
  const { unit } = useMeasurement();

  return (
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
            className="size-3.5 cursor-pointer"
            style={{ accentColor: 'var(--color-primary)' }}
            aria-label="Bottom-weight (optical center)"
          />
          Bottom-weight (optical center)
        </label>
      </div>
      {bestFitPreview && (
        <p
          className="font-mono text-[11px]"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Would set borders to {formatMatPreview(bestFitPreview.top, unit)} T ·{' '}
          {formatMatPreview(bestFitPreview.bottom, unit)} B ·{' '}
          {formatMatPreview(bestFitPreview.left, unit)} L ·{' '}
          {formatMatPreview(bestFitPreview.right, unit)} R
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
  );
}

export default function MatCalculatorPage() {
  useCalculatorAnalytics({ tool: 'mat' });

  const { unit } = useMeasurement();

  // The only place the mat page leaves inches: form state, persistence and
  // every calculation stay imperial, and this renders them in the unit the
  // user picked in /settings.
  const formatValue = useCallback(
    (inches: number) => formatMatValue(inches, unit),
    [unit]
  );

  const calc = useMatCalculator({ formatValue });

  const results = useMemo(
    () => (
      <MatResults
        fmt={calc.fmt}
        valid={calc.valid}
        revealMode={calc.revealMode}
        ow={calc.ow}
        oh={calc.oh}
        bt={calc.bt}
        bb={calc.bb}
        bl={calc.bl}
        br={calc.br}
        aw={calc.aw}
        ah={calc.ah}
        windowW={calc.windowW}
        windowH={calc.windowH}
      />
    ),
    [calc]
  );

  return (
    <CalculatorLayout
      title="Mat Cut Calculator"
      icon={getRouteIcon('/mat')}
      accentTone="cyan"
      description="Plan single-window mats with independent borders and get exact window openings and cutter guide-bar settings."
      results={results}
      sidebar={
        <MatSidebar
          guideBarCuts={calc.guideBarCuts}
          dimensionRows={calc.dimensionRows}
        />
      }
    >
      <OuterMatCard values={calc.values} set={calc.set} />
      <BordersCard values={calc.values} set={calc.set} />
      <ArtworkBestFitCard
        values={calc.values}
        set={calc.set}
        applyBestFit={calc.applyBestFit}
        bestFitPreview={calc.bestFitPreview}
        fmt={calc.fmt}
        valid={calc.valid}
        revVal={calc.revVal}
        overlapLeft={calc.overlapLeft}
        overlapTop={calc.overlapTop}
        hasRevealMismatch={calc.hasRevealMismatch}
      />
    </CalculatorLayout>
  );
}
