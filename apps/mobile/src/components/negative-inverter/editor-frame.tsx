import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import {
  type EdgeInsets,
  SafeAreaListener,
} from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/gradient-background';
import { type EditorLayout, editorLayout } from './editor-layout';

export interface EditorFrameProps {
  /** Rendered with how the controls should arrange themselves. */
  children: (layout: EditorLayout) => ReactNode;
}

const sameInsets = (a: EdgeInsets | null, b: EdgeInsets) =>
  a !== null &&
  a.top === b.top &&
  a.bottom === b.bottom &&
  a.left === b.left &&
  a.right === b.right;

/**
 * A screen-filling editor body that never scrolls. It listens for this
 * screen's own native insets, which include the stack header and the tab
 * bar (the app's root provider only knows the window's), and draws nothing
 * until they arrive, so the controls never flash under the tab bar first.
 */
export function EditorFrame({ children }: EditorFrameProps) {
  const [insets, setInsets] = useState<EdgeInsets | null>(null);
  const [body, setBody] = useState({ width: 0, height: 0 });
  return (
    <SafeAreaListener
      style={{ flex: 1 }}
      onChange={({ insets: next }) =>
        setInsets((current) => (sameInsets(current, next) ? current : next))
      }
    >
      <GradientBackground />
      {insets ? (
        <View
          className="flex-1 gap-2 px-4 pb-2 pt-1"
          style={{
            marginTop: insets.top,
            marginBottom: insets.bottom,
            marginLeft: insets.left,
            marginRight: insets.right,
          }}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setBody((current) =>
              current.width === width && current.height === height
                ? current
                : { width, height }
            );
          }}
        >
          {children(editorLayout(body))}
        </View>
      ) : null}
    </SafeAreaListener>
  );
}

export interface StageAreaProps {
  /** The stage, given the height it may fill; not called until measured. */
  children: (height: number) => ReactNode;
  /** Chips and buttons over the stage's corners. */
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
}

/** The flexible middle of the editor: the stage takes whatever height the
 *  controls leave, with status chips floating over its corners. */
export function StageArea({
  children,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
}: StageAreaProps) {
  const [height, setHeight] = useState(0);
  return (
    <View
      className="flex-1"
      onLayout={(e) => setHeight(Math.floor(e.nativeEvent.layout.height))}
    >
      {height > 0 ? children(height) : null}
      <View
        pointerEvents="box-none"
        className="absolute left-2 right-2 top-2 flex-row items-start justify-between gap-2"
      >
        <View pointerEvents="box-none" className="shrink flex-row gap-2">
          {topLeft}
        </View>
        <View pointerEvents="box-none" className="shrink flex-row gap-2">
          {topRight}
        </View>
      </View>
      <View
        pointerEvents="box-none"
        className="absolute bottom-2 left-2 right-2 flex-row items-end justify-between gap-2"
      >
        <View pointerEvents="box-none" className="shrink flex-row gap-2">
          {bottomLeft}
        </View>
        <View pointerEvents="box-none" className="flex-row gap-2">
          {bottomRight}
        </View>
      </View>
    </View>
  );
}

export interface ControlSlotProps {
  children: ReactNode;
}

/**
 * The bottom panel's slot. It keeps the tallest height its contents have
 * had, so swapping the adjustments for a shorter tool hint does not grow the
 * stage and move the photo under the user's finger.
 */
export function ControlSlot({ children }: ControlSlotProps) {
  const [tallest, setTallest] = useState(0);
  return (
    <View
      style={{ minHeight: tallest }}
      onLayout={(e) => {
        const h = Math.ceil(e.nativeEvent.layout.height);
        if (h > tallest) setTallest(h);
      }}
    >
      {children}
    </View>
  );
}
