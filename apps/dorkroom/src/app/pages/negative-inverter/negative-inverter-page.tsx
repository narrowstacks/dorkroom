import { type NegativeFilmType, scaleRect } from '@dorkroom/logic';
import { getRouteAccent, getRouteIcon } from '@dorkroom/ui';
import { CalculatorCard, CalculatorLayout } from '@dorkroom/ui/calculator';
import { Crop, ImagePlus, Pipette, SwatchBook } from 'lucide-react';
import { useState } from 'react';
import { AdjustmentsCard } from './adjustments-card';
import { ActionButton, SegmentedControl, type SegmentOption } from './controls';
import { ExportCard } from './export-card';
import { LoadPanel } from './load-panel';
import { NegativeInverterInfo } from './negative-inverter-info';
import { NegativeStage } from './negative-stage';
import {
  type InverterTool,
  type InverterView,
  useNegativeInverter,
} from './use-negative-inverter';

const FILM_OPTIONS = [
  { value: 'bw', label: 'Black & White' },
  { value: 'c41', label: 'Color (C-41)' },
] as const satisfies readonly { value: NegativeFilmType; label: string }[];

type InverterState = ReturnType<typeof useNegativeInverter>['state'];

/** One line telling the user what the photo does right now. */
function stageHint(state: InverterState): string {
  switch (state.tool) {
    case 'crop': {
      const { negative, crop } = state;
      const size =
        negative && crop
          ? scaleRect(crop, negative.proxy, negative.original)
          : { width: 0, height: 0 };
      return `Drag the handles around the frame so the light table is left out. Crop: ${size.width} × ${size.height} px.`;
    }
    case 'base':
      return 'Tap clear, unexposed film: the rebate or the gap between frames. On a touchscreen, slide your finger and lift to pick.';
    case 'neutral':
      return 'Tap something that should be neutral grey.';
    default:
      return state.base
        ? 'Converted. Adjust it, or switch to Negative to compare.'
        : 'Next, choose Film base and tap a clear part of the film.';
  }
}

export default function NegativeInverterPage() {
  const { state, coefficients, actions } = useNegativeInverter();
  const { negative, crop, filmType, tool, view } = state;
  // The sidebar's neutral picker button is far from the photo (below it on
  // phones), so a picker opened from there takes focus and scrolls into view.
  const [focusNeutralPicker, setFocusNeutralPicker] = useState(false);
  const converted = coefficients !== null;

  const toolOptions: SegmentOption<InverterTool>[] = [
    { value: 'crop', label: 'Crop', icon: Crop },
    { value: 'base', label: 'Film base', icon: SwatchBook },
  ];
  if (filmType === 'c41') {
    toolOptions.push({
      value: 'neutral',
      label: 'Neutral grey',
      icon: Pipette,
      disabled: !state.base,
    });
  }

  const viewOptions: SegmentOption<InverterView>[] = [
    { value: 'negative', label: 'Negative' },
    { value: 'positive', label: 'Positive', disabled: !coefficients },
  ];

  const shownView: InverterView = coefficients ? view : 'negative';

  return (
    <CalculatorLayout
      title="Negative Inverter"
      icon={getRouteIcon('/negative-inverter')}
      accentTone={getRouteAccent('/negative-inverter')}
      onReset={actions.resetAdjustments}
      description="Turn a phone photo of a negative into a positive preview, for black and white or C-41 colour film. Everything runs in your browser; your photos never leave this device."
      sidebar={
        // A flex column so that on phones, once converted, the adjustments
        // move up to sit right under the photo.
        <div className="flex flex-col gap-4">
          <CalculatorCard
            title="Film type"
            description={
              filmType === 'c41'
                ? 'Each colour channel is balanced on its own to remove the orange mask.'
                : 'Converted from brightness, so a tinted base or light table does not tint the result.'
            }
          >
            <SegmentedControl
              legend="Film type"
              options={FILM_OPTIONS}
              value={filmType}
              onChange={actions.setFilmType}
            />
          </CalculatorCard>
          <AdjustmentsCard
            enabled={converted}
            filmType={filmType}
            adjustments={state.adjustments}
            hasNeutral={state.neutral !== null}
            pickingNeutral={tool === 'neutral'}
            onAdjust={actions.adjust}
            onToggleNeutralPicker={() => {
              setFocusNeutralPicker(true);
              actions.setTool(tool === 'neutral' ? null : 'neutral');
            }}
            onClearNeutral={actions.clearNeutral}
            className={converted ? 'max-md:order-first' : undefined}
          />
          <ExportCard
            key={state.generation}
            negative={negative}
            crop={crop}
            coefficients={coefficients}
          />
        </div>
      }
      footer={<NegativeInverterInfo />}
    >
      <CalculatorCard title={negative ? negative.file.name : 'Photo'}>
        {negative && crop ? (
          <>
            <NegativeStage
              proxy={negative.proxy}
              crop={crop}
              tool={tool}
              view={shownView}
              base={state.base}
              neutral={state.neutral}
              coefficients={coefficients}
              onCropChange={actions.setCrop}
              onPickBase={actions.pickBase}
              onPickNeutral={actions.pickNeutral}
              focusNeutralPicker={focusNeutralPicker}
            />
            <SegmentedControl
              legend="Tool"
              options={toolOptions}
              value={tool}
              onChange={(next) => {
                setFocusNeutralPicker(false);
                actions.setTool(next === tool ? null : next);
              }}
            />
            <p
              aria-live="polite"
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {stageHint(state)}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SegmentedControl
                legend="Show"
                options={viewOptions}
                value={shownView}
                onChange={actions.setView}
                className="min-w-[14rem] flex-1 sm:flex-none"
              />
              <ActionButton icon={ImagePlus} onClick={actions.unload}>
                New photo
              </ActionButton>
            </div>
          </>
        ) : (
          <LoadPanel
            loading={state.loading}
            error={state.error}
            onFile={actions.loadFile}
          />
        )}
      </CalculatorCard>
    </CalculatorLayout>
  );
}
