import type {
  InversionAdjustments,
  NegativeFilmType,
  PixelPoint,
} from '@dorkroom/logic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  type CameraDevice,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { GlassCard } from '@/components/glass-card';
import { type LiveCapture, useLiveInverter } from '@/hooks/use-live-inverter';
import { AdjustmentPanel } from './adjustment-panel';
import { EditorButton } from './editor-button';
import { FilmTypeToggle, HoldButton, ToolHint } from './editor-chrome';
import { ControlSlot, EditorFrame, StageArea } from './editor-frame';
import {
  type AdjustmentKey,
  allDefault,
  baseChip,
  clippingChip,
  toolHint,
} from './editor-layout';
import { InverterButton } from './inverter-button';
import { InverterStage } from './inverter-stage';
import { IDENTITY_ORIENTATION, type ViewFrame } from './orientation';
import { StatusChip } from './status-chip';

export interface LiveCameraProps {
  filmType: NegativeFilmType;
  adjustments: InversionAdjustments;
  onFilmType: (filmType: NegativeFilmType) => void;
  onAdjust: (key: keyof InversionAdjustments, value: number) => void;
  onReset: () => void;
  /** A photo was taken: open it in the editor with this framing. */
  onCapture: (capture: LiveCapture) => void;
  onClose: () => void;
}

/**
 * Live mode: the camera feed, inverted as it streams, in the editor's
 * layout with a shutter under it. Asks for the camera first, and explains
 * rather than fails when it is off or missing.
 */
export function LiveCamera(props: LiveCameraProps) {
  const { hasPermission, canRequestPermission, requestPermission } =
    useCameraPermission();
  const device = useCameraDevice('back');

  useEffect(() => {
    if (canRequestPermission) void requestPermission();
  }, [canRequestPermission, requestPermission]);

  if (!hasPermission || !device) {
    return (
      <EditorFrame>
        {() => (
          <View className="flex-1 justify-center">
            <GlassCard className="gap-4">
              <Text className="text-base text-white/80">
                {!device
                  ? 'No camera is available on this device.'
                  : canRequestPermission
                    ? 'Allow camera access to see your negatives as positives, live.'
                    : 'Camera access is off. Turn it on in Settings > Dorkroom to use live mode.'}
              </Text>
              <View className="flex-row gap-3">
                {device && !canRequestPermission ? (
                  <InverterButton
                    label="Open Settings"
                    primary
                    onPress={() => void Linking.openSettings()}
                  />
                ) : null}
                {device && canRequestPermission ? (
                  <InverterButton
                    label="Allow Camera"
                    primary
                    onPress={() => void requestPermission()}
                  />
                ) : null}
                <InverterButton label="Back" onPress={props.onClose} />
              </View>
            </GlassCard>
          </View>
        )}
      </EditorFrame>
    );
  }

  return <LiveSession device={device} {...props} />;
}

// Live mode only picks the base; it measures the whole frame, and the
// captured photo is cropped in the editor.
type LiveTool = 'base';

/** The stage's crop handler; live mode has no crop tool to call it. */
const NO_CROP = () => undefined;

function LiveSession({
  device,
  filmType,
  adjustments,
  onFilmType,
  onAdjust,
  onReset,
  onCapture,
  onClose,
}: LiveCameraProps & { device: CameraDevice }) {
  const live = useLiveInverter(device, { filmType, adjustments });
  const [tool, setTool] = useState<LiveTool | null>(null);
  const [holding, setHolding] = useState(false);
  const [adjustment, setAdjustment] = useState<AdjustmentKey>('exposure');
  const { liveSize, view, actions } = live;
  const { base, exposure } = view;
  const { pickBase } = actions;
  // Stable props, so a reading that changes nothing the stage shows does not
  // re-render it (InverterStage is memoized). The whole frame, upright.
  const stageFrame = useMemo<ViewFrame | null>(
    () =>
      liveSize
        ? {
            region: { x: 0, y: 0, ...liveSize },
            orientation: IDENTITY_ORIENTATION,
          }
        : null,
    [liveSize]
  );
  const onPick = useCallback(
    (_: 'base' | 'neutral', point: PixelPoint) => {
      pickBase(point);
      setTool(null);
    },
    [pickBase]
  );

  const shutter = async () => {
    const captured = await actions.capture();
    if (captured) onCapture(captured);
  };

  const clipping = clippingChip(exposure);
  const chip = tool === null ? baseChip(base, true) : null;
  const ev = `${live.bias > 0 ? '+' : ''}${live.bias.toFixed(1)} EV`;

  return (
    <EditorFrame>
      {({ compact }) => (
        <>
          <View className="flex-row items-center gap-1.5">
            <EditorButton
              label="Close live camera"
              icon="xmark"
              onPress={onClose}
            />
            <FilmTypeToggle value={filmType} onChange={onFilmType} />
            <View className="flex-1" />
            <EditorButton
              label="Meter for film"
              icon="camera.metering.center.weighted"
              showLabel
              selected={live.meterForFilm}
              accessibilityHint="Sets the camera's exposure from the film, not the light table"
              onPress={() => actions.setMeterForFilm(!live.meterForFilm)}
            />
          </View>

          <StageArea
            topLeft={
              chip ? (
                <StatusChip
                  text={chip.text}
                  tone={chip.tone}
                  accessibilityLabel={chip.label}
                  onPress={() => setTool('base')}
                />
              ) : null
            }
            topRight={
              <StatusChip
                text={clipping.text}
                tone={clipping.tone}
                accessibilityLabel={clipping.label}
              />
            }
            bottomLeft={
              live.failure ? (
                <StatusChip text={live.failure} tone="alert" />
              ) : (
                <StatusChip
                  text={ev}
                  tone="neutral"
                  accessibilityLabel={`Camera exposure ${ev}`}
                />
              )
            }
            bottomRight={
              tool === null ? (
                <HoldButton onHold={setHolding} disabled={!view.ready} />
              ) : null
            }
          >
            {(height) =>
              liveSize && stageFrame ? (
                <InverterStage
                  image={live.image}
                  size={liveSize}
                  height={height}
                  uniforms={live.uniforms}
                  positive={view.ready && !holding && tool !== 'base'}
                  tool={tool}
                  frame={stageFrame}
                  crop={stageFrame.region}
                  base={base}
                  neutral={null}
                  onCrop={NO_CROP}
                  onPick={onPick}
                  onHold={setHolding}
                />
              ) : (
                <View
                  style={{ height }}
                  className="items-center justify-center gap-2 rounded-xl bg-black"
                >
                  <ActivityIndicator color="#ffffff" />
                  <Text className="text-sm text-white/70">
                    Starting camera...
                  </Text>
                </View>
              )
            }
          </StageArea>

          <View
            className="flex-row items-center gap-2"
            accessibilityRole="toolbar"
            accessibilityLabel="Tool"
          >
            <EditorButton
              label="Base"
              icon="eyedropper"
              showLabel
              selected={tool === 'base'}
              onPress={() => setTool(tool === 'base' ? null : 'base')}
            />
            {live.framing.basePoint ? (
              <EditorButton
                label="Auto base"
                icon="wand.and.stars"
                showLabel
                onPress={actions.autoBase}
              />
            ) : null}
            <View className="flex-1" />
            <EditorButton
              label="Reset adjustments"
              icon="arrow.counterclockwise"
              onPress={onReset}
              disabled={allDefault(adjustments, filmType)}
            />
          </View>

          <ControlSlot>
            {tool ? (
              <ToolHint hint={toolHint(tool)} onDone={() => setTool(null)} />
            ) : (
              <AdjustmentPanel
                filmType={filmType}
                adjustments={adjustments}
                onPreview={actions.previewAdjust}
                onCommit={onAdjust}
                chosen={adjustment}
                onChoose={setAdjustment}
                compact={compact}
              />
            )}
          </ControlSlot>

          <View className="items-center">
            <Pressable
              onPress={() => void shutter()}
              disabled={live.capturing || !liveSize}
              accessibilityRole="button"
              accessibilityLabel={
                live.capturing ? 'Capturing' : 'Capture and open in the editor'
              }
              accessibilityState={{
                disabled: live.capturing || !liveSize,
                busy: live.capturing,
              }}
              className="h-[68px] w-[68px] items-center justify-center rounded-full border-[3px] border-white/90 active:opacity-70"
            >
              <View
                className={`h-[54px] w-[54px] items-center justify-center rounded-full ${
                  live.capturing || !liveSize ? 'bg-white/40' : 'bg-white'
                }`}
              >
                {live.capturing ? <ActivityIndicator color="#0b0b0c" /> : null}
              </View>
            </Pressable>
          </View>
        </>
      )}
    </EditorFrame>
  );
}
