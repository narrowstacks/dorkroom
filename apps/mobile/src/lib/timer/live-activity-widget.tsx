// The Process Timer Live Activity, drawn by expo-widgets in an isolated runtime
// inside the widget extension. READ THE RULES BEFORE EDITING:
//
// - The function marked `'widget'` is turned into a STRING at build time and
//   evaluated by JavaScriptCore with no module system. Nothing declared outside
//   the function exists there: no imports, no constants, no helpers, no hooks, no
//   timers. Every helper below is declared INSIDE it on purpose, and
//   `live-activity-widget.test.ts` fails if the function names anything from
//   module scope. The `@expo/ui` imports are for types and for the compiler;
//   at runtime the same names are globals of the isolated runtime.
// - Everything it draws comes from `props` (absolute timestamps, see
//   `live-activity-props.ts`) and `environment`. It cannot read the clock, so
//   time is shown with the system's own interval text, which counts down with
//   no updates from the app, even while the app is suspended or killed.
// - Stage changes while the phone is locked cannot be pushed to it, so every
//   stage is its own row with its own countdown. Nothing here claims which stage
//   is "now": the highlight is subtle and as of the last update, and the ticking
//   countdowns are the real indicator.
import {
  Button,
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  activityBackgroundTint,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  labelsHidden,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  progressViewStyle,
  tint,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';
import type { LiveActivityEnvironment, LiveActivityLayout } from 'expo-widgets';
import type { TimerActivityProps } from './live-activity-props';

export function timerLiveActivity(
  props: TimerActivityProps,
  environment: LiveActivityEnvironment
): LiveActivityLayout {
  'widget';
  const pal = props.palette;
  // Not relied on for legibility: the normal palette is already quiet (small
  // text on near-black, no large bright fills). Whether the extension even
  // receives this flag on a device is unverified.
  const reduced = environment.isLuminanceReduced === true;
  const frozen = props.status === 'paused' || props.status === 'completed';
  const paused = props.status === 'paused';
  // Stale means the last stage's end has passed with no update from the app. A
  // paused run has no stale date, but never reads Done in any case.
  const done =
    props.status === 'completed' || (environment.isStale === true && !paused);
  const primary = reduced ? pal.inkSecondary : pal.ink;
  const secondary = reduced ? pal.inkTertiary : pal.inkSecondary;
  const tertiary = pal.inkTertiary;
  const accent = reduced ? pal.inkSecondary : pal.accent;

  const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n);
  const clock = (seconds: number) => {
    const t = Math.max(0, Math.ceil(seconds));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    return h > 0
      ? h + ':' + pad2(m) + ':' + pad2(t % 60)
      : m + ':' + pad2(t % 60);
  };
  const interval = (startMs: number, endMs: number) => ({
    lower: new Date(startMs),
    upper: new Date(endMs),
  });
  const hours = (props.endMs - props.startMs) / 1000 >= 3600;

  // One line, cut with an ellipsis: nothing may wrap and grow the activity.
  const oneLine = (
    size: number,
    weight: 'regular' | 'semibold' | 'bold',
    color: string
  ) => [
    font({ size, weight }),
    foregroundStyle(color),
    lineLimit(1),
    truncationMode('tail'),
  ];

  // A countdown: frozen text while paused or done, otherwise system interval text.
  const countdown = (
    startMs: number,
    endMs: number,
    frozenSeconds: number,
    size: number,
    color: string,
    weight: 'regular' | 'semibold' | 'bold'
  ) =>
    frozen ? (
      <Text
        modifiers={[
          font({ size, weight }),
          monospacedDigit(),
          foregroundStyle(color),
          lineLimit(1),
        ]}
      >
        {clock(frozenSeconds)}
      </Text>
    ) : (
      <Text
        timerInterval={interval(startMs, endMs)}
        countsDown={true}
        modifiers={[
          font({ size, weight }),
          monospacedDigit(),
          foregroundStyle(color),
          lineLimit(1),
          frame({
            width: hours ? size * 4.2 : size * 3,
            alignment: 'trailing',
          }),
        ]}
      />
    );

  const totalLeft = (size: number, color: string) =>
    done ? (
      <Text
        modifiers={[
          font({ size, weight: 'bold' }),
          foregroundStyle(color),
          lineLimit(1),
          truncationMode('tail'),
        ]}
      >
        Done
      </Text>
    ) : (
      countdown(
        props.startMs,
        props.endMs,
        props.frozenTotalSeconds,
        size,
        color,
        'bold'
      )
    );

  const buttons = (size: number) =>
    props.controls && !done ? (
      <HStack spacing={18}>
        <Button
          target={paused ? 'resume' : 'pause'}
          modifiers={[
            buttonStyle('plain'),
            accessibilityLabel(paused ? 'Resume' : 'Pause'),
          ]}
        >
          <Image
            systemName={paused ? 'play.fill' : 'pause.fill'}
            size={size}
            color={accent}
          />
        </Button>
        <Button
          target="skip"
          modifiers={[buttonStyle('plain'), accessibilityLabel('Skip stage')]}
        >
          <Image systemName="forward.end.fill" size={size} color={accent} />
        </Button>
      </HStack>
    ) : null;

  // The instruction for the stage that was current at the last update, drawn
  // under that stage's row so it reads as that stage's, not as "now".
  const instruction = () => {
    if (done) return null;
    const line = paused ? 'Paused' : props.note;
    return line ? (
      <Text
        modifiers={[
          ...oneLine(11, 'regular', paused ? accent : tertiary),
          padding({ leading: 10 }),
        ]}
      >
        {line}
      </Text>
    ) : null;
  };

  const row = (
    r: TimerActivityProps['rows'][number],
    i: number,
    size: number
  ) => {
    const isCurrent = i === props.currentRow && !done;
    const finished = done || i < props.currentRow;
    const color = isCurrent ? primary : finished ? tertiary : secondary;
    const duration = Math.max(1, (r.endMs - r.startMs) / 1000);
    const bar = frozen ? (
      <ProgressView
        value={done ? 1 : 1 - r.frozenSeconds / duration}
        modifiers={[progressViewStyle('linear'), tint(accent), labelsHidden()]}
      />
    ) : (
      <ProgressView
        timerInterval={interval(r.startMs, r.endMs)}
        countsDown={false}
        modifiers={[progressViewStyle('linear'), tint(accent), labelsHidden()]}
      />
    );
    return (
      <VStack key={'row' + i} alignment="leading" spacing={1}>
        <HStack spacing={8}>
          <Text
            modifiers={oneLine(size, isCurrent ? 'semibold' : 'regular', color)}
          >
            {r.name}
          </Text>
          <Spacer />
          {countdown(
            r.startMs,
            r.endMs,
            r.frozenSeconds,
            size,
            color,
            isCurrent ? 'semibold' : 'regular'
          )}
        </HStack>
        {bar}
        {i === props.currentRow ? instruction() : null}
      </VStack>
    );
  };

  // "+N more": the stages that do not fit, with their own countdown over the
  // span they cover, so something always counts while a hidden stage runs.
  const moreRow = (shown: number, size: number) => {
    const hidden = props.rows.length - shown + props.hiddenAfter;
    const last = props.rows[shown - 1];
    if (hidden <= 0 || !last || done) return null;
    return (
      <HStack key="more" spacing={8}>
        <Text modifiers={oneLine(size, 'regular', tertiary)}>
          {'+' + hidden + ' more'}
        </Text>
        <Spacer />
        {countdown(
          last.endMs,
          props.endMs,
          (props.endMs - last.endMs) / 1000,
          size,
          tertiary,
          'regular'
        )}
      </HStack>
    );
  };

  const rowsView = (limit: number, size: number) => [
    ...props.rows.slice(0, limit).map((r, i) => row(r, i, size)),
    moreRow(Math.min(limit, props.rows.length), size),
  ];

  const glyph = (size: number) => (
    <Image
      systemName={
        done ? 'checkmark.circle.fill' : paused ? 'pause.circle.fill' : 'timer'
      }
      size={size}
      color={accent}
    />
  );

  // The minimal island is a small circle shared with another app's activity.
  // While running it shows the whole run's time left, as the same system
  // interval text the compact trailing uses (it keeps counting with the app
  // suspended), in a small bold face with a fixed frame so the text cannot ask
  // for more width, and shrinking to half if the digits (an hours run) still
  // do not fit. A paused run keeps the pause glyph: a frozen time in a circle
  // that small reads as still running, and there is no room for both. Done and
  // stale keep the check glyph.
  const minimalView = () =>
    done || paused ? (
      glyph(14)
    ) : (
      <Text
        timerInterval={interval(props.startMs, props.endMs)}
        countsDown={true}
        modifiers={[
          font({ size: 11, weight: 'bold' }),
          monospacedDigit(),
          foregroundStyle(accent),
          lineLimit(1),
          minimumScaleFactor(0.5),
          frame({ width: 34, alignment: 'center' }),
        ]}
      />
    );

  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={3}
        modifiers={[
          padding({ horizontal: 16, vertical: 8 }),
          activityBackgroundTint(pal.bg),
        ]}
      >
        <HStack spacing={8}>
          {glyph(15)}
          <Text modifiers={oneLine(15, 'bold', primary)}>{props.title}</Text>
          <Spacer />
          {buttons(15)}
          {totalLeft(17, primary)}
        </HStack>
        {rowsView(3, 13)}
      </VStack>
    ),
    compactLeading: glyph(14),
    compactTrailing: totalLeft(14, accent),
    minimal: minimalView(),
    // The title, not a stage: a stage name here would be wrong after the next
    // boundary and the app is not there to change it.
    expandedLeading: (
      <VStack
        alignment="leading"
        spacing={2}
        modifiers={[padding({ leading: 4 })]}
      >
        <Text modifiers={oneLine(12, 'regular', tertiary)}>
          {done ? 'Finished' : paused ? 'Paused' : 'Process timer'}
        </Text>
        <Text modifiers={oneLine(17, 'bold', primary)}>{props.title}</Text>
      </VStack>
    ),
    // Buttons sit under the total, so they add no row to the bottom region.
    expandedTrailing: (
      <VStack
        alignment="trailing"
        spacing={6}
        modifiers={[padding({ trailing: 4 })]}
      >
        {totalLeft(20, primary)}
        {buttons(18)}
      </VStack>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={4}>
        {rowsView(2, 13)}
      </VStack>
    ),
  };
}
