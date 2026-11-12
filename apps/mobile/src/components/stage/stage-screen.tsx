import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import {
  type EdgeInsets,
  SafeAreaListener,
} from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/gradient-background';
import { useHeaderClearance } from '@/hooks/use-header-clearance';
import { COLLAPSED_PAD, DetentPanel } from './detent-panel';
import {
  collapsedPanelHeight,
  PANEL_TAB_GAP,
  panelAvailable,
  type Size,
  STAGE_BLEED,
  stageRect,
  STRIP_HEIGHT,
} from './stage-layout';

interface StageScreenProps {
  /** Pinned above the drawing (an answer-first readout). It never scrolls. */
  header?: ReactNode;
  /** The drawing, given the room it may fill. Not called until that is known. */
  children: (stage: Size) => ReactNode;
  /** The panel's most-used controls: what shows when it is collapsed. */
  collapsed: ReactNode;
  /** The rest of the controls, shown when it is expanded. */
  expanded: ReactNode;
  /**
   * What the drawing keeps in view (points) while the panel is expanded, in
   * place of the default `max(240, 45%)` of the room. For a screen whose
   * drawing is a schematic and whose inputs are the work.
   */
  minDrawingExpanded?: number;
  /**
   * The collapsed panel's ceiling as a share of the room (default 45%). Raise
   * it when the collapsed block is whole rows that must not scroll.
   */
  collapsedMaxShare?: number;
}

/** Breathing room under a navigation bar. */
const BELOW_NAV_BAR = 8;
/** Side padding of a pinned header, matching `Screen`. */
const HEADER_PADDING = 16;

const sameBottom = (a: EdgeInsets | null, b: EdgeInsets) =>
  a !== null && a.bottom === b.bottom;

/**
 * A non-scrolling screen for a phase stack: the drawing (the stage) fills the
 * space between the header and the collapsed control panel and holds still, and
 * the controls live in a two-detent `DetentPanel` over the bottom. The stage is
 * laid out from the COLLAPSED panel alone, so expanding the panel or raising the
 * keyboard never moves or resizes it. Like the Inverter's frame it waits for this
 * screen's own insets (the root provider does not know the tab bar's height), so
 * the panel never flashes under the tab bar.
 */
export function StageScreen(props: StageScreenProps) {
  const [insets, setInsets] = useState<EdgeInsets | null>(null);
  return (
    <SafeAreaListener
      style={{ flex: 1 }}
      onChange={({ insets: next }) =>
        setInsets((current) => (sameBottom(current, next) ? current : next))
      }
    >
      <GradientBackground />
      {insets ? <StageBody bottomInset={insets.bottom} {...props} /> : null}
    </SafeAreaListener>
  );
}

interface StageBodyProps extends StageScreenProps {
  bottomInset: number;
}

/** The header's height and the width it was measured at. */
interface HeaderMeasure {
  forWidth: number;
  height: number;
}

function StageBody({
  bottomInset,
  header,
  children,
  collapsed,
  expanded,
  minDrawingExpanded,
  collapsedMaxShare,
}: StageBodyProps) {
  const clearance = useHeaderClearance(BELOW_NAV_BAR);
  const [window, setWindow] = useState<Size>({ width: 0, height: 0 });
  const [headerMeasure, setHeaderMeasure] = useState<HeaderMeasure>({
    forWidth: 0,
    height: 0,
  });
  const [bodyHeight, setBodyHeight] = useState(0);
  const bottomOffset = bottomInset + PANEL_TAB_GAP;
  const top = clearance + headerMeasure.height;
  const collapsedHeight =
    bodyHeight > 0
      ? collapsedPanelHeight({
          blockHeight: STRIP_HEIGHT + bodyHeight + COLLAPSED_PAD,
          available: panelAvailable(window.height, top, bottomOffset),
          maxShare: collapsedMaxShare,
        })
      : 0;
  const stage = stageRect({
    ...window,
    top,
    bottomOffset,
    collapsedHeight,
  });
  const ready = window.height > 0 && collapsedHeight > 0;

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setWindow((w) =>
          w.width === width && w.height === height ? w : { width, height }
        );
      }}
    >
      {ready ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            // Full width and a bleed above and below: a drawing keeps its edge
            // handles inside its own bounds, where touches always reach them.
            left: 0,
            width: window.width,
            top: stage.y - STAGE_BLEED,
            height: stage.height + 2 * STAGE_BLEED,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children({ width: stage.width, height: stage.height })}
        </View>
      ) : null}
      {header ? (
        <View
          onLayout={(e) => {
            // The tallest the header has been at this width, so a note that
            // comes and goes (a warning under a readout) cannot move the
            // drawing. Its layout fires again when the width changes (a
            // rotation, Split View), which starts the count over.
            const { width, height } = e.nativeEvent.layout;
            const measured = Math.ceil(height) - clearance;
            setHeaderMeasure((m) => ({
              forWidth: width,
              height:
                m.forWidth === width ? Math.max(m.height, measured) : measured,
            }));
          }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            paddingTop: clearance,
            paddingHorizontal: HEADER_PADDING,
            paddingBottom: 8,
          }}
        >
          {header}
        </View>
      ) : null}
      <DetentPanel
        collapsed={collapsed}
        expanded={expanded}
        windowWidth={window.width}
        windowHeight={window.height}
        topLimit={top}
        bottomOffset={bottomOffset}
        collapsedHeight={collapsedHeight}
        minDrawing={minDrawingExpanded}
        onBodyHeight={setBodyHeight}
      />
    </View>
  );
}
