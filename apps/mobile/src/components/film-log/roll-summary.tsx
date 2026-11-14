import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Text, useWindowDimensions, View } from 'react-native';
import { Button } from '@/components/button';
import { FrameMapThumbnail } from '@/components/film-log/frame-map-thumbnail';
import { Surface } from '@/components/surface';
import type { ThumbnailDot } from '@/lib/frame-map-thumbnail';
import {
  type LifecycleAction,
  type LifecycleStepState,
  lifecycleTrack,
  lifecycleTrackLabel,
} from '@/lib/roll-lifecycle';
import {
  lifecycleGlyphSize,
  stacksLifecycleTrack,
  stacksSummary,
} from '@/lib/roll-summary';
import type { RollStatus } from '@/schemas/film-log.schema';
import { useDimInk, usePhaseHue } from '@/theme/use-phase-accent';

// A glyph per state, so the track never rests on colour alone (under
// safelight every hue is the same red).
const STEP_SYMBOL = {
  done: 'checkmark.circle.fill',
  current: 'circle.inset.filled',
  upcoming: 'circle',
} satisfies Record<LifecycleStepState, SymbolViewProps['name']>;

/** In camera, Shot, Developed, with the roll's step marked. One VoiceOver
 * element; a column at the accessibility text sizes. */
function LifecycleTrack({
  status,
  stacked,
}: {
  status: RollStatus;
  stacked: boolean;
}) {
  const hue = usePhaseHue();
  const dim = useDimInk('rgba(255,255,255,0.5)');
  const { fontScale } = useWindowDimensions();
  const steps = lifecycleTrack(status);
  return (
    <View
      accessible
      accessibilityLabel={lifecycleTrackLabel(status)}
      className={stacked ? 'gap-2' : 'flex-row items-center gap-2'}
    >
      {steps.map((step, index) => {
        const ink = step.state === 'upcoming' ? dim : hue;
        return (
          <View
            key={step.status}
            className={
              stacked || index === 0
                ? 'flex-row items-center gap-2'
                : 'min-w-0 flex-1 flex-row items-center gap-2'
            }
          >
            {index > 0 && !stacked ? (
              <View className="h-px flex-1 bg-edge" />
            ) : null}
            <SymbolView
              name={STEP_SYMBOL[step.state]}
              size={lifecycleGlyphSize(fontScale)}
              tintColor={ink}
            />
            {/* `shrink`, so a label wraps rather than clips. */}
            <Text
              className={`shrink text-sm ${step.state === 'current' ? 'font-semibold' : 'font-medium'}`}
              style={{ color: ink }}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

interface RollSummaryProps {
  status: RollStatus;
  /** Camera, film, EI and process (`rollSetupLine`). */
  setup: string;
  /** The stored dates (`rollDatesLine`); may be empty. */
  dates: string;
  /** A developed roll's record in one line (`developmentSummaryLine`). */
  development: string | undefined;
  developmentNotes: string | undefined;
  back: string | undefined;
  notes: string | undefined;
  /** The next step, or null at the last one. */
  action: LifecycleAction | null;
  actionAccessibilityLabel: string | undefined;
  onAction: () => void;
  /** "7 frames". */
  frames: string;
  /** "3 with a location", or undefined. */
  located: string | undefined;
  /** The map thumbnail's dots; null hides it (nothing located, or no map in
   * this build). */
  mapDots: readonly ThumbnailDot[] | null;
  mapAccessibilityLabel: string;
  onOpenMap: () => void;
  /** Opens the Meter logging to this roll; undefined hides the shortcut. */
  onOpenMeter: (() => void) | undefined;
}

/**
 * The top of a roll's page, one flat surface: what is in the camera, the
 * dates, the development record of a developed roll, the lifecycle track with
 * its one next step, then the frame counts with the map thumbnail and, while
 * the roll is in the camera, the Meter shortcut. At the accessibility text
 * sizes the side by side pieces stack.
 */
export function RollSummary({
  status,
  setup,
  dates,
  development,
  developmentNotes,
  back,
  notes,
  action,
  actionAccessibilityLabel,
  onAction,
  frames,
  located,
  mapDots,
  mapAccessibilityLabel,
  onOpenMap,
  onOpenMeter,
}: RollSummaryProps) {
  const { fontScale } = useWindowDimensions();
  const stacked = stacksSummary(fontScale);
  return (
    <Surface className="gap-4">
      <View className="gap-1">
        <Text className="text-base font-semibold text-white">{setup}</Text>
        {dates ? <Text className="text-sm text-ink-60">{dates}</Text> : null}
        {development ? (
          <Text className="text-sm text-ink-60">{development}</Text>
        ) : null}
        {developmentNotes ? (
          <Text className="text-sm text-ink-60">{developmentNotes}</Text>
        ) : null}
        {back ? (
          <Text className="text-sm text-ink-60">Back: {back}</Text>
        ) : null}
        {notes ? <Text className="text-sm text-ink-60">{notes}</Text> : null}
      </View>
      <View className="gap-3">
        <LifecycleTrack
          status={status}
          stacked={stacksLifecycleTrack(fontScale)}
        />
        {action ? (
          <Button
            variant="tinted"
            label={action.label}
            accessibilityLabel={actionAccessibilityLabel}
            onPress={onAction}
          />
        ) : null}
      </View>
      <View className="h-px bg-edge" />
      <View className={stacked ? 'gap-3' : 'flex-row items-center gap-3'}>
        {mapDots ? (
          <FrameMapThumbnail
            dots={mapDots}
            accessibilityLabel={mapAccessibilityLabel}
            onPress={onOpenMap}
          />
        ) : null}
        <View className={stacked ? 'gap-0.5' : 'flex-1 gap-0.5'}>
          <Text className="text-base text-white">{frames}</Text>
          {located ? (
            <Text className="text-sm text-ink-60">{located}</Text>
          ) : null}
        </View>
        {onOpenMeter ? (
          <Button
            label="Open Meter"
            accessibilityLabel="Open the Meter for this roll"
            accessibilityHint="The Meter logs frames to this roll."
            onPress={onOpenMeter}
          />
        ) : null}
      </View>
    </Surface>
  );
}
