// The "Roll in the camera" widget, drawn by expo-widgets in an isolated runtime
// inside the widget extension. The rules are the Live Activity's (see
// `src/lib/timer/live-activity-widget.tsx`): the `'widget'` function becomes a
// STRING evaluated by JavaScriptCore with no module system, so it names nothing
// from module scope (no imports at runtime, no constants, no helpers, no hooks,
// no clock), and everything it shows comes in through `props`, already
// formatted (`roll-widget-props.ts`). `roll-widget.test.ts` renders the
// compiled string with only the runtime's globals reachable.
//
// Nothing here goes stale on its own: the app pushes new props whenever the
// film log or the Meter's roll changes.
import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  truncationMode,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';
import type { RollWidgetProps } from './roll-widget-props';

export function rollWidget(
  props: RollWidgetProps,
  environment: WidgetEnvironment
) {
  'widget';
  const pal = props.palette;
  const family = String(environment.widgetFamily || '');
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
  // The background and the one link go on the root view of every family. The
  // root fills the widget from its top leading corner (a flexible frame takes
  // the size offered up to its max; JSON cannot carry Infinity).
  const root = [
    frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
    containerBackground(pal.bg, 'widget'),
    widgetURL(props.url),
  ];
  const exposureAndCamera = [props.exposure, props.camera]
    .filter((part) => part !== '')
    .join(' · ');

  if (family.indexOf('accessoryInline') >= 0) {
    return (
      <Text modifiers={[...root, lineLimit(1), truncationMode('tail')]}>
        {props.hasRoll
          ? props.label + ' · ' + props.frames
          : 'No roll in the camera'}
      </Text>
    );
  }

  if (family.indexOf('accessoryRectangular') >= 0) {
    return props.hasRoll ? (
      <VStack alignment="leading" spacing={0} modifiers={root}>
        <Text modifiers={oneLine(15, 'semibold', pal.ink)}>{props.label}</Text>
        <Text modifiers={oneLine(13, 'regular', pal.inkSecondary)}>
          {props.frames}
        </Text>
        {exposureAndCamera !== '' ? (
          <Text modifiers={oneLine(13, 'regular', pal.inkSecondary)}>
            {exposureAndCamera}
          </Text>
        ) : null}
      </VStack>
    ) : (
      <VStack alignment="leading" spacing={0} modifiers={root}>
        <Text modifiers={oneLine(15, 'semibold', pal.ink)}>
          No roll in the camera
        </Text>
        <Text modifiers={oneLine(13, 'regular', pal.inkSecondary)}>
          Film log
        </Text>
      </VStack>
    );
  }

  const header = (
    <HStack spacing={5}>
      <Image systemName="film" size={12} color={pal.accent} />
      <Text modifiers={oneLine(11, 'semibold', pal.accent)}>IN CAMERA</Text>
    </HStack>
  );

  if (!props.hasRoll) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={root}>
        {header}
        <Spacer />
        <Text
          modifiers={[
            font({ size: 17, weight: 'semibold' }),
            foregroundStyle(pal.ink),
            lineLimit(2),
            truncationMode('tail'),
          ]}
        >
          No roll in the camera
        </Text>
        <Text modifiers={oneLine(12, 'regular', pal.inkTertiary)}>
          Open the film log
        </Text>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={2} modifiers={root}>
      {header}
      <Spacer />
      <Text
        modifiers={[...oneLine(17, 'bold', pal.ink), minimumScaleFactor(0.7)]}
      >
        {props.label}
      </Text>
      {props.exposure !== '' ? (
        <Text modifiers={oneLine(12, 'regular', pal.inkSecondary)}>
          {props.exposure}
        </Text>
      ) : null}
      {props.camera !== '' ? (
        <Text modifiers={oneLine(12, 'regular', pal.inkSecondary)}>
          {props.camera}
        </Text>
      ) : null}
      <Spacer />
      <HStack alignment="firstTextBaseline" spacing={4}>
        <Text
          modifiers={[
            font({ size: 28, weight: 'bold' }),
            monospacedDigit(),
            foregroundStyle(pal.ink),
            lineLimit(1),
          ]}
        >
          {String(props.frameCount)}
        </Text>
        <Text modifiers={oneLine(13, 'medium', pal.inkTertiary)}>
          {props.frameCount === 1 ? 'frame shot' : 'frames shot'}
        </Text>
      </HStack>
    </VStack>
  );
}
