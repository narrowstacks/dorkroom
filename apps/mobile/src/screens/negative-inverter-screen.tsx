import { useMemo, useState } from 'react';
import { ActionSheetIOS, View } from 'react-native';
import { MeterToast } from '@/components/meter/meter-toast';
import { AdjustmentPanel } from '@/components/negative-inverter/adjustment-panel';
import { EditorButton } from '@/components/negative-inverter/editor-button';
import {
  FilmTypeToggle,
  HoldButton,
} from '@/components/negative-inverter/editor-chrome';
import {
  EditorFrame,
  StageArea,
} from '@/components/negative-inverter/editor-frame';
import {
  type AdjustmentKey,
  allDefault,
  baseChip,
} from '@/components/negative-inverter/editor-layout';
import {
  EditorTools,
  InverterEmpty,
} from '@/components/negative-inverter/editor-tools';
import type { ExportFormat } from '@/components/negative-inverter/export-plan';
import { ExportSheet } from '@/components/negative-inverter/export-sheet';
import { InverterStage } from '@/components/negative-inverter/inverter-stage';
import { LiveCamera } from '@/components/negative-inverter/live-camera';
import type { ViewFrame } from '@/components/negative-inverter/orientation';
import { StatusChip } from '@/components/negative-inverter/status-chip';
import { useNegativeInverter } from '@/hooks/use-negative-inverter';
import { useToast } from '@/hooks/use-toast';

export function NegativeInverterScreen() {
  const { state, coefficients, uniforms, exporting, exportError, actions } =
    useNegativeInverter();
  const { message: toast, show: showToast } = useToast();
  const [holding, setHolding] = useState(false);
  const [live, setLive] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('jpeg');
  const [adjustment, setAdjustment] = useState<AdjustmentKey>('exposure');
  const negative = state.negative;
  // One object per photo: a fresh one each render would defeat the stage's
  // memo, rebuilding its gestures on every chip tap or export state.
  const proxySize = useMemo(
    () =>
      negative
        ? { width: negative.proxy.width, height: negative.proxy.height }
        : null,
    [negative]
  );
  // The whole frame while cropping or picking the base (the rebate usually
  // sits outside a tight crop); otherwise only the crop, as it will export.
  const wholeFrame = state.tool === 'crop' || state.tool === 'base';
  const frame = useMemo<ViewFrame | null>(
    () =>
      proxySize && state.crop
        ? {
            region: wholeFrame ? { x: 0, y: 0, ...proxySize } : state.crop,
            orientation: state.orientation,
          }
        : null,
    [proxySize, state.crop, state.orientation, wholeFrame]
  );
  const c41 = state.filmType === 'c41';
  // No new photo while one is being read or the current one exported.
  const loadLocked = state.loading || exporting !== null;

  if (live) {
    return (
      <LiveCamera
        filmType={state.filmType}
        adjustments={state.adjustments}
        onFilmType={actions.setFilmType}
        onAdjust={actions.adjust}
        onReset={actions.reset}
        onCapture={(capture) => {
          setLive(false);
          void actions.openCapture(capture);
        }}
        onClose={() => setLive(false)}
      />
    );
  }

  const openPhoto = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Choose Photo', 'Live Camera', 'Cancel'],
        cancelButtonIndex: 2,
      },
      (index) => {
        if (index === 0) void actions.chooseFromLibrary();
        else if (index === 1) setLive(true);
      }
    );

  if (!negative || !proxySize || !frame || !state.crop) {
    return (
      <InverterEmpty
        loading={state.loading}
        error={state.error}
        locked={loadLocked}
        onChoose={actions.chooseFromLibrary}
        onLive={() => setLive(true)}
      />
    );
  }

  const crop = state.crop;
  const ready = coefficients !== null;
  const showPositive = state.view === 'positive' && ready && !holding;
  const chip = state.tool === null ? baseChip(state.base) : null;
  const save = () =>
    void actions.runExport('save', format).then((saved) => {
      if (saved) showToast('Saved to Photos');
    });

  return (
    <View className="flex-1">
      <EditorFrame>
        {({ compact, mergePhotoActions }) => (
          <>
            <View className="flex-row items-center gap-1.5">
              {mergePhotoActions ? (
                <EditorButton
                  label="Open a photo"
                  icon="photo.badge.plus"
                  accessibilityHint="Choose a photo or use the live camera"
                  onPress={openPhoto}
                  disabled={loadLocked}
                />
              ) : (
                <>
                  <EditorButton
                    label="Choose Photo"
                    icon="photo.on.rectangle"
                    onPress={actions.chooseFromLibrary}
                    disabled={loadLocked}
                  />
                  <EditorButton
                    label="Live Camera"
                    icon="camera"
                    onPress={() => setLive(true)}
                    disabled={loadLocked}
                  />
                </>
              )}
              <FilmTypeToggle
                value={state.filmType}
                onChange={actions.setFilmType}
              />
              <View className="flex-1" />
              <EditorButton
                label="Photo, export and tips"
                icon="info.circle"
                onPress={() => setSheet(true)}
              />
              <EditorButton
                label="Share"
                icon="square.and.arrow.up"
                onPress={() => void actions.runExport('share', format)}
                disabled={!ready || exporting !== null}
                busy={exporting === 'share'}
              />
              <EditorButton
                label="Save to Photos"
                icon="square.and.arrow.down"
                primary
                onPress={save}
                disabled={!ready || exporting !== null}
                busy={exporting === 'save'}
              />
            </View>

            <StageArea
              topLeft={
                <>
                  {chip ? (
                    <StatusChip
                      text={chip.text}
                      tone={chip.tone}
                      accessibilityLabel={chip.label}
                      onPress={() => actions.setTool('base')}
                    />
                  ) : null}
                  {c41 && state.neutral && state.tool === null ? (
                    <StatusChip
                      text="Neutral  ✕"
                      tone="neutral"
                      accessibilityLabel="Clear neutral correction"
                      onPress={actions.clearNeutral}
                    />
                  ) : null}
                </>
              }
              topRight={
                state.loading ? (
                  <StatusChip text="Reading photo" tone="neutral" busy />
                ) : exporting ? (
                  <StatusChip
                    text={exporting === 'save' ? 'Saving' : 'Preparing'}
                    tone="neutral"
                    busy
                  />
                ) : null
              }
              bottomLeft={
                exportError || state.error ? (
                  <StatusChip
                    text={exportError ?? state.error ?? ''}
                    tone="alert"
                  />
                ) : null
              }
              bottomRight={
                state.tool === null || state.tool === 'rotate' ? (
                  <HoldButton onHold={setHolding} disabled={!ready} />
                ) : null
              }
            >
              {(height) => (
                <InverterStage
                  key={state.generation}
                  image={negative.proxyImage}
                  size={proxySize}
                  frame={frame}
                  height={height}
                  uniforms={uniforms}
                  positive={showPositive}
                  tool={state.tool}
                  crop={crop}
                  base={state.base}
                  neutral={c41 ? state.neutral : null}
                  onCrop={actions.setCrop}
                  onPick={actions.pick}
                  onHold={setHolding}
                />
              )}
            </StageArea>

            <EditorTools
              filmType={state.filmType}
              tool={state.tool}
              orientation={state.orientation}
              hasNeutral={state.neutral !== null}
              resetDisabled={allDefault(state.adjustments, state.filmType)}
              onTool={actions.setTool}
              onOrient={actions.orient}
              onClearNeutral={actions.clearNeutral}
              onReset={actions.reset}
            >
              <AdjustmentPanel
                filmType={state.filmType}
                adjustments={state.adjustments}
                onPreview={actions.previewAdjust}
                onCommit={actions.adjust}
                chosen={adjustment}
                onChoose={setAdjustment}
                compact={compact}
              />
            </EditorTools>
          </>
        )}
      </EditorFrame>
      <ExportSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        size={negative.size}
        proxy={proxySize}
        crop={state.crop}
        orientation={state.orientation}
        format={format}
        onFormat={setFormat}
        exporting={exporting !== null}
        onDiscard={() => {
          setSheet(false);
          actions.discard();
        }}
      />
      {toast ? <MeterToast message={toast} /> : null}
    </View>
  );
}
