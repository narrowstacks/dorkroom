// The "Last answers" widget: the last result of each tool that records one
// (Camera Exposure and Lenses today, see `last-result-widget-props.ts` for why
// not Print's Exposure). Drawn in the isolated widget runtime, under the Live
// Activity's rules (`src/lib/timer/live-activity-widget.tsx`): the `'widget'`
// function names nothing from module scope and shows only its props.
// `last-result-widget.test.ts` renders the compiled string.
//
// A result is what the tool showed when it was last left, and the tool
// restores those inputs, so it cannot be contradicted by opening the tool.
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
import type { LastResultWidgetProps } from './last-result-widget-props';

export function lastResultWidget(
  props: LastResultWidgetProps,
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
  const rows = props.rows.slice(0, 2);

  if (family.indexOf('accessoryRectangular') >= 0) {
    return (
      <VStack alignment="leading" spacing={0} modifiers={root}>
        <Text modifiers={oneLine(13, 'semibold', pal.ink)}>Last answers</Text>
        {rows.length === 0 ? (
          <Text modifiers={oneLine(13, 'regular', pal.inkSecondary)}>
            None yet
          </Text>
        ) : (
          rows.map((row, i) => (
            <HStack key={'r' + i} spacing={6}>
              <Text modifiers={oneLine(13, 'regular', pal.inkSecondary)}>
                {row.label}
              </Text>
              <Spacer />
              <Text
                modifiers={[
                  ...oneLine(13, 'semibold', pal.ink),
                  monospacedDigit(),
                ]}
              >
                {row.value}
              </Text>
            </HStack>
          ))
        )}
      </VStack>
    );
  }

  const header = (
    <HStack spacing={5}>
      <Image systemName="clock.arrow.circlepath" size={12} color={pal.accent} />
      <Text modifiers={oneLine(11, 'semibold', pal.accent)}>LAST ANSWERS</Text>
    </HStack>
  );

  if (rows.length === 0) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={root}>
        {header}
        <Spacer />
        <Text modifiers={oneLine(17, 'semibold', pal.ink)}>None yet</Text>
        <Text
          modifiers={[
            font({ size: 12, weight: 'regular' }),
            foregroundStyle(pal.inkTertiary),
            lineLimit(3),
            truncationMode('tail'),
          ]}
        >
          {props.emptyHint}
        </Text>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={6} modifiers={root}>
      {header}
      <Spacer />
      {rows.map((row, i) => (
        <VStack key={'r' + i} alignment="leading" spacing={0}>
          <Text modifiers={oneLine(11, 'medium', pal.inkTertiary)}>
            {row.label}
          </Text>
          <Text
            modifiers={[
              ...oneLine(22, 'bold', pal.ink),
              monospacedDigit(),
              minimumScaleFactor(0.7),
            ]}
          >
            {row.value}
          </Text>
        </VStack>
      ))}
    </VStack>
  );
}
