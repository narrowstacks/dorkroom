import * as Haptics from 'expo-haptics';
import { router, usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { toHref } from '@/lib/href';
import {
  accessoryOpenHint,
  accessoryOpenLabel,
  accessoryTarget,
  createAccessoryModelSelector,
  TIMER_ROUTE,
  type TimerAccessoryModel,
} from '@/lib/timer/accessory-model';
import { runTimerAction } from '@/lib/timer/live-activity';
import { timerStore } from '@/lib/timer/timer-store';
import { PHASE_ACCENT } from '@/theme/accents';
import { SAFELIGHT } from '@/theme/safelight';
import { readoutText } from '@/theme/tokens';
import { useAccentColor, useModeColor } from '@/theme/use-phase-accent';
import { formatClock } from './format';

// One selector for both copies: the model changes once a second, not per tick.
const selectModel = createAccessoryModelSelector();
const modelOf = () => selectModel(timerStore.getSnapshot().timer);

/**
 * Largest Dynamic Type scale for the pill's text. The system fixes the
 * accessory's height (48pt measured), so bigger text would clip; 1.3 keeps the
 * 17pt time inside it. The Large Content Viewer is not wired up here.
 */
const ACCESSORY_MAX_FONT_SCALE = 1.3;

/**
 * Opens the timer in the Develop tab the way Home opens a tool: `navigate` with
 * an anchor, so a Develop tab never opened gets its hub underneath. A timer on
 * top of the Develop stack is reused; otherwise one is pushed, even when an
 * older one sits under another screen (both show the same run). Nothing
 * happens when the timer is already on screen.
 */
function openTimer(pathname: string) {
  if (accessoryTarget(pathname) === null) return;
  router.navigate(toHref(TIMER_ROUTE), { withAnchor: true });
}

function PauseButton({ paused }: { paused: boolean }) {
  const ink = useModeColor('#ffffff', SAFELIGHT.text);
  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // From the store, not the last render: a second tap before the
        // re-render must not resend the same action.
        const { status } = timerStore.getSnapshot().timer;
        void runTimerAction({ type: status === 'paused' ? 'RESUME' : 'PAUSE' });
      }}
      accessibilityRole="button"
      accessibilityLabel={paused ? 'Resume timer' : 'Pause timer'}
      hitSlop={4}
      className="items-center justify-center active:opacity-60"
      style={styles.button}
    >
      <SymbolView
        name={paused ? 'play.fill' : 'pause.fill'}
        size={20}
        tintColor={ink}
      />
    </Pressable>
  );
}

function AccessoryRow({
  model,
  inline,
}: {
  model: TimerAccessoryModel;
  inline: boolean;
}) {
  const hue = useAccentColor(PHASE_ACCENT.develop);
  const pathname = usePathname();
  // On the timer itself the body does nothing, and VoiceOver says so.
  const target = accessoryTarget(pathname);
  return (
    <View style={inline ? styles.rowInline : styles.row}>
      <Pressable
        onPress={() => openTimer(pathname)}
        accessibilityRole="button"
        accessibilityLabel={accessoryOpenLabel(model)}
        accessibilityHint={accessoryOpenHint(pathname)}
        disabled={target === null}
        className="active:opacity-70"
        style={styles.body}
      >
        <SymbolView name="timer" size={inline ? 15 : 17} tintColor={hue} />
        {inline ? null : (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={ACCESSORY_MAX_FONT_SCALE}
            className="text-[15px] font-semibold text-white"
            style={styles.name}
          >
            {model.stageName}
          </Text>
        )}
        {/* Inline is narrow: there the play icon and the label carry the
            paused state, and the clock never gives way. */}
        {model.paused && !inline ? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={ACCESSORY_MAX_FONT_SCALE}
            className="text-[13px] text-ink-70"
            style={styles.shrink}
          >
            Paused
          </Text>
        ) : null}
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={ACCESSORY_MAX_FONT_SCALE}
          className="text-white"
          style={[readoutText, styles.time]}
        >
          {formatClock(model.stageRemainingSeconds)}
        </Text>
      </Pressable>
      <PauseButton paused={model.paused} />
    </View>
  );
}

/**
 * The running Process Timer, in the tab bar's bottom accessory on every tab:
 * the current stage, its time left and pause/resume. expo-router mounts this
 * twice (regular, and inline beside a minimized bar), so it keeps no state of
 * its own: everything comes from the timer store, which `TimerRunEffects`
 * re-samples while a run is going, so it ticks without a timer here.
 */
export function TimerAccessory() {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const model = useSyncExternalStore(timerStore.subscribe, modelOf, modelOf);
  if (model === null) return null;
  return <AccessoryRow model={model} inline={placement === 'inline'} />;
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
  },
  rowInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 2,
  },
  body: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: { flex: 1 },
  // The body is bounded by the pause button: the name, then "Paused", give way
  // before anything reaches it. The clock never shrinks.
  shrink: { flexShrink: 1 },
  time: { fontSize: 17, fontWeight: '600', flexShrink: 0 },
  button: { width: 44, height: 44 },
});
