// The Process Timer Home Screen / Lock Screen widget, drawn by expo-widgets in
// an isolated runtime. The Live Activity's rules apply in full (read
// `src/lib/timer/live-activity-widget.tsx`): the `'widget'` function is
// compiled to a STRING and names nothing from module scope; it has no clock, so
// every countdown is the system's own timer text over absolute timestamps from
// the props.
//
// Each timeline entry (`src/lib/timer/widget-timeline.ts`) names the stage
// that is current from its date on, so naming the stage here is right after
// every boundary: WidgetKit switches entries on its own, with the app
// suspended. A paused run is frozen numbers; Done and idle are plain text.
import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  truncationMode,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';
import type { TimerWidgetProps } from '@/lib/timer/widget-timeline';

export function timerWidget(
  props: TimerWidgetProps,
  environment: WidgetEnvironment
) {
  'widget';
  const pal = props.palette;
  const family = String(environment.widgetFamily || '');
  const running = props.status === 'running';
  const paused = props.status === 'paused';
  const active = running || paused;
  // The background and the one link go on the root view of every family. The
  // root fills the widget from its top leading corner (a flexible frame takes
  // the size offered up to its max; JSON cannot carry Infinity).
  const root = [
    frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
    containerBackground(pal.bg, 'widget'),
    widgetURL(props.url),
  ];

  const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n);
  const clock = (seconds: number) => {
    const t = Math.max(0, Math.ceil(seconds));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    return h > 0
      ? h + ':' + pad2(m) + ':' + pad2(t % 60)
      : m + ':' + pad2(t % 60);
  };
  const oneLine = (
    size: number,
    weight: 'regular' | 'medium' | 'semibold' | 'bold',
    color: string
  ) => [
    font({ size, weight }),
    foregroundStyle(color),
    lineLimit(1),
    truncationMode('tail'),
  ];

  // A countdown: system interval text while running (it ticks with the app
  // suspended), frozen text while paused. The frame stops the interval text
  // from taking the whole row.
  const countdown = (
    startMs: number,
    endMs: number,
    frozenSeconds: number,
    size: number,
    weight: 'regular' | 'semibold' | 'bold',
    color: string,
    alignment: 'leading' | 'trailing'
  ) => {
    const longest = running ? (endMs - startMs) / 1000 : frozenSeconds;
    const width = size * (longest >= 3600 ? 4.2 : 3);
    const mods = [
      font({ size, weight }),
      monospacedDigit(),
      foregroundStyle(color),
      lineLimit(1),
      frame({ width, alignment }),
    ];
    return running ? (
      <Text
        timerInterval={{ lower: new Date(startMs), upper: new Date(endMs) }}
        countsDown={true}
        modifiers={mods}
      />
    ) : (
      <Text modifiers={mods}>{clock(frozenSeconds)}</Text>
    );
  };
  const stageLeft = (
    size: number,
    weight: 'regular' | 'semibold' | 'bold',
    color: string,
    alignment: 'leading' | 'trailing'
  ) =>
    countdown(
      props.stageStartMs,
      props.stageEndMs,
      props.frozenStageSeconds,
      size,
      weight,
      color,
      alignment
    );
  const runLeft = (
    size: number,
    color: string,
    alignment: 'leading' | 'trailing'
  ) =>
    countdown(
      props.runStartMs,
      props.runEndMs,
      props.frozenTotalSeconds,
      size,
      'regular',
      color,
      alignment
    );
  // The current stage's end as a clock time ("ends 7:42 PM"). It cannot go
  // stale: the entry that names a stage carries that stage's absolute end, and
  // the next entry takes over at that moment. A countdown is right only while
  // it ticks, and on the Simulator's Home Screen the medium family's did not,
  // so this line is the one the user can always trust. Running only: a paused
  // stage has no end. (No timer progress bars: with one in the layout the small
  // family's countdown did not tick on the Simulator's Home Screen either.)
  const endsAt = (size: number) =>
    running ? (
      <HStack spacing={3}>
        <Text modifiers={oneLine(size, 'regular', pal.inkTertiary)}>ends</Text>
        <Text
          date={new Date(props.stageEndMs)}
          dateStyle="time"
          modifiers={[
            font({ size, weight: 'medium' }),
            monospacedDigit(),
            foregroundStyle(pal.inkSecondary),
            lineLimit(1),
          ]}
        />
      </HStack>
    ) : null;
  const glyph = (size: number) => (
    <Image
      systemName={
        props.status === 'done'
          ? 'checkmark.circle.fill'
          : paused
            ? 'pause.circle.fill'
            : 'timer'
      }
      size={size}
      color={pal.accent}
    />
  );
  const stageOf = 'Stage ' + props.stageNumber + ' of ' + props.stageCount;

  if (family.indexOf('accessoryRectangular') >= 0) {
    if (!active) {
      return (
        <VStack alignment="leading" spacing={0} modifiers={root}>
          <Text modifiers={oneLine(15, 'semibold', pal.ink)}>
            {props.status === 'done' ? 'Done' : 'No timer running'}
          </Text>
          <Text modifiers={oneLine(13, 'regular', pal.inkSecondary)}>
            {props.status === 'done' ? props.title : props.idleLine}
          </Text>
        </VStack>
      );
    }
    return (
      <VStack alignment="leading" spacing={0} modifiers={root}>
        <HStack spacing={4}>
          <Text modifiers={oneLine(15, 'semibold', pal.ink)}>
            {props.stage}
          </Text>
          <Spacer />
          {stageLeft(15, 'semibold', pal.ink, 'trailing')}
        </HStack>
        <Text modifiers={oneLine(13, 'regular', pal.inkSecondary)}>
          {paused ? 'Paused · ' + stageOf : props.title}
        </Text>
        <HStack spacing={4}>
          <Text modifiers={oneLine(13, 'regular', pal.inkSecondary)}>
            Run left
          </Text>
          <Spacer />
          {runLeft(13, pal.inkSecondary, 'trailing')}
        </HStack>
      </VStack>
    );
  }

  const header = (
    <HStack spacing={5}>
      {glyph(12)}
      <Text modifiers={oneLine(11, 'semibold', pal.accent)}>
        {active || props.status === 'done' ? props.title : 'PROCESS TIMER'}
      </Text>
    </HStack>
  );

  if (!active) {
    const done = props.status === 'done';
    return (
      <VStack alignment="leading" spacing={4} modifiers={root}>
        {header}
        <Spacer />
        <Text
          modifiers={[
            font({ size: done ? 22 : 17, weight: done ? 'bold' : 'semibold' }),
            foregroundStyle(pal.ink),
            lineLimit(2),
            truncationMode('tail'),
          ]}
        >
          {done ? 'Done' : 'No timer running'}
        </Text>
        <Text modifiers={oneLine(12, 'regular', pal.inkTertiary)}>
          {done
            ? props.stageCount + (props.stageCount === 1 ? ' stage' : ' stages')
            : props.idleLine}
        </Text>
      </VStack>
    );
  }

  const main = (
    <VStack alignment="leading" spacing={2}>
      {header}
      <Spacer />
      <Text modifiers={oneLine(17, 'bold', pal.ink)}>{props.stage}</Text>
      <Text modifiers={oneLine(11, 'regular', pal.inkTertiary)}>
        {paused ? 'Paused · ' + stageOf : stageOf}
      </Text>
      {stageLeft(30, 'bold', pal.accent, 'leading')}
      {endsAt(11)}
    </VStack>
  );

  if (family.indexOf('systemMedium') >= 0) {
    return (
      <HStack alignment="top" spacing={16} modifiers={root}>
        {main}
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={oneLine(11, 'medium', pal.inkTertiary)}>Next</Text>
          <Text modifiers={oneLine(15, 'semibold', pal.inkSecondary)}>
            {props.next === '' ? 'Last stage' : props.next}
          </Text>
          <Spacer />
          <Text modifiers={oneLine(11, 'medium', pal.inkTertiary)}>
            Run left
          </Text>
          {runLeft(20, pal.ink, 'leading')}
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={2} modifiers={root}>
      {main}
      <HStack spacing={4}>
        <Text modifiers={oneLine(11, 'regular', pal.inkTertiary)}>
          Run left
        </Text>
        {runLeft(12, pal.inkSecondary, 'leading')}
      </HStack>
    </VStack>
  );
}
