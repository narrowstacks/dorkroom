// The "Favorites" widget (#734): the user's favorite tools as a grid, each cell
// a link into its tool. Drawn in the isolated widget runtime under the Live
// Activity's rules (`src/lib/timer/live-activity-widget.tsx`): the `'widget'`
// function names nothing from module scope and shows only its props, built by
// `favorites-widget-props.ts`. `favorites-widget.test.ts` renders the compiled
// string.
//
// Each cell is an `@expo/ui` `Link` (SwiftUI `Link`, which expo-widgets 57
// renders as `LinkView`); a tap anywhere else uses the root's one `widgetURL`
// (Home, or Edit favorites while there are none).
import { HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  containerBackground,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  padding,
  truncationMode,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';
import type { FavoritesWidgetProps } from './favorites-widget-props';

export function favoritesWidget(
  props: FavoritesWidgetProps,
  environment: WidgetEnvironment
) {
  'widget';
  const pal = props.palette;
  const family = String(environment.widgetFamily || '');
  const medium = family.indexOf('systemMedium') >= 0;
  // 2 x 2 small, 4 x 2 medium (`FAVORITES_PER_FAMILY`).
  const columns = medium ? 4 : 2;
  const root = [
    frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
    containerBackground(pal.bg, 'widget'),
    widgetURL(props.url),
  ];

  if (props.cells.length === 0) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={root}>
        <HStack spacing={5}>
          <Image systemName="star.fill" size={12} color={pal.accent} />
          <Text
            modifiers={[
              font({ size: 11, weight: 'semibold' }),
              foregroundStyle(pal.accent),
              lineLimit(1),
              truncationMode('tail'),
            ]}
          >
            FAVORITES
          </Text>
        </HStack>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 17, weight: 'semibold' }),
            foregroundStyle(pal.ink),
            lineLimit(2),
            truncationMode('tail'),
          ]}
        >
          {props.emptyTitle}
        </Text>
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

  const shown = props.cells.slice(0, columns * 2);
  const cellFrame = frame({
    maxWidth: 10000,
    maxHeight: 10000,
    alignment: 'topLeading',
  });
  const rows = [shown.slice(0, columns), shown.slice(columns, columns * 2)];
  const iconFrame = frame({ width: 22, height: 22, alignment: 'leading' });

  return (
    <VStack alignment="leading" spacing={6} modifiers={root}>
      {rows.map((row, r) => {
        const blanks: number[] = [];
        for (let i = row.length; i < columns; i++) blanks.push(i);
        return (
          <HStack key={'row' + r} spacing={6}>
            {row.map((cell) => (
              <Link
                key={cell.id}
                destination={cell.url}
                modifiers={[cellFrame]}
              >
                <VStack
                  alignment="leading"
                  spacing={2}
                  modifiers={[
                    cellFrame,
                    padding({ horizontal: 6, vertical: 8 }),
                    background(props.cellFill),
                    cornerRadius(12),
                  ]}
                >
                  <Image
                    systemName={cell.symbol}
                    size={18}
                    color={cell.accent}
                    // One box for every glyph: symbols differ in height
                    // (sun.max, timer and scope are taller than film), and a
                    // taller one squeezed its name, which then shrank.
                    modifiers={[iconFrame]}
                  />
                  <Spacer />
                  <Text
                    modifiers={[
                      font({ size: 12, weight: 'semibold' }),
                      foregroundStyle(pal.ink),
                      lineLimit(1),
                      truncationMode('tail'),
                      // "Reciprocity" needs 0.6 in a small widget's quarter.
                      minimumScaleFactor(0.6),
                    ]}
                  >
                    {cell.name}
                  </Text>
                </VStack>
              </Link>
            ))}
            {blanks.map((i) => (
              <Spacer key={'blank' + i} modifiers={[cellFrame]} />
            ))}
          </HStack>
        );
      })}
    </VStack>
  );
}
