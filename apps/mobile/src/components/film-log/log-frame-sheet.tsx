import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/button';
import { DetentSheet } from '@/components/detent-sheet/detent-sheet';
import { FrameLocationField } from '@/components/film-log/frame-location-field';
import { LabeledTextField } from '@/components/labeled-text-field';
import { PresetChipRow } from '@/components/preset-chip-row';
import { useCameras, useLensesForCamera } from '@/hooks/use-film-log';
import {
  lastUsedLensId,
  lastUsedPlace,
  nextFrameNumber,
} from '@/lib/film-log-options';
import { photoUri } from '@/lib/film-log-photos';
import { addShot } from '@/lib/film-log-storage';
import { isCommitDisabled } from '@/lib/frame-location-format';
import {
  buildLoggedShot,
  type FrameReading,
  frameReadout,
  isoMismatchNote,
  lensChipOptions,
  needsLens,
  placeCardValue,
  placeRowLabel,
  selectedLens,
} from '@/lib/log-frame';
import type {
  FilmRoll,
  Shot,
  ShotLocationFields,
  ShotPhoto,
} from '@/schemas/film-log.schema';
import { readoutText } from '@/theme/tokens';
import { useDimInk, usePhaseHue } from '@/theme/use-phase-accent';

/** The readout's figures grow with Dynamic Type up to this, then shrink to fit,
 * like the Meter's and the timer's readouts. */
const READOUT_MAX_FONT_SCALE = 1.4;
const THUMB = { width: 48, height: 64, borderRadius: 8 } as const;
const ROW_CLASS =
  'min-h-11 flex-row items-center gap-3 rounded-xl border-hw border-line bg-surface px-4';

interface LogFrameSheetProps {
  visible: boolean;
  roll: FilmRoll;
  reading: FrameReading;
  source: 'meter' | 'manual';
  photo?: ShotPhoto;
  defaultNotes?: string;
  /** Called after the shot is stored. */
  onLogged: (shot: Shot) => void;
  onCancel: () => void;
  /** Shows "More options…", which hands the draft to the full shot form. */
  onMoreOptions?: (draft: {
    lensId?: string;
    /** Always present, empty when the user cleared it. */
    place: string;
    /** Always present, empty when the user cleared it. */
    notes: string;
    /** Only when the user added one in this sheet. */
    location?: ShotLocationFields;
  }) => void;
}

/**
 * Logs a frame to a roll from a reading: the Meter's shutter (with the photo it
 * took) or a calculator's "Save to roll". A `DetentSheet` that leads with the
 * reading: at medium the readout (frame, exposure, roll), the lens chips and
 * the Place row; the large detent adds the location row, notes and "More
 * options…". The one commit is the footer's "Log frame N" (the header has
 * Cancel and the title only); it is disabled while a lens is needed, a
 * location is being found or the roll is gone, and the line saying why sits
 * just above it.
 *
 * Mounted only while open, so each opening starts from fresh defaults.
 */
export function LogFrameSheet(props: LogFrameSheetProps) {
  if (!props.visible) return null;
  return <LogFrameSheetBody {...props} />;
}

function LogFrameSheetBody({
  roll,
  reading,
  source,
  photo,
  defaultNotes,
  onLogged,
  onCancel,
  onMoreOptions,
}: LogFrameSheetProps) {
  const cameras = useCameras();
  const lenses = useLensesForCamera(roll.cameraId);
  const hue = usePhaseHue();
  const placeholderColor = useDimInk('#71717a');
  const cameraName = cameras.find((c) => c.id === roll.cameraId)?.name;
  const frame = nextFrameNumber(roll.shots);

  const [pickedLens, setPickedLens] = useState(() =>
    lastUsedLensId(roll.shots)
  );
  const [place, setPlace] = useState(() => lastUsedPlace(roll.shots) ?? '');
  // Never inherited from the previous frame: coordinates belong to one frame.
  const [location, setLocation] = useState<ShotLocationFields | undefined>();
  const [locating, setLocating] = useState(false);
  const [notes, setNotes] = useState(defaultNotes ?? '');
  const [expandSignal, setExpandSignal] = useState(0);
  // True once the sheet rests at large (or has no room to grow and was asked
  // to): the Place row is then the text field itself. At medium the row is a
  // button that opens it.
  const [placeOpen, setPlaceOpen] = useState(false);
  const [rollGone, setRollGone] = useState(false);
  const placeRef = useRef<TextInput>(null);
  const focusPlaceOnExpand = useRef(false);

  const lens = selectedLens(lenses, pickedLens);
  const lensId = lens?.id;
  // The lens selected at opening leads the chips, so it is on screen however
  // many lenses there are; later taps do not reorder them.
  const [leadLensId] = useState(lensId);
  const blocked = needsLens(lenses, lensId);

  const readout = frameReadout({
    frameNumber: frame,
    reading,
    source,
    roll,
    cameraName,
  });
  const mismatch = isoMismatchNote(reading, roll, source);
  const placeValue = placeCardValue(place, location);

  // Place is focused on arrival (`onSettled`), whatever the sheet was doing
  // when the row was tapped.
  const editPlace = () => {
    focusPlaceOnExpand.current = true;
    setExpandSignal((n) => n + 1);
  };

  /** Returns false when nothing was logged, so the sheet stays usable. */
  const commit = (): boolean => {
    if (blocked || locating) return false;
    const created = addShot(
      roll.id,
      buildLoggedShot({
        roll,
        reading,
        lensId,
        place,
        location,
        notes,
        photo,
        source,
        now: new Date(),
      })
    );
    if (!created) {
      setRollGone(true);
      return false;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onLogged(created);
    return true;
  };

  const status =
    locating || blocked || rollGone ? (
      <View className="gap-1">
        {locating ? (
          <Text className="text-xs text-ink-60">
            Finding location… Log is available once it is found.
          </Text>
        ) : null}
        {blocked ? (
          <Text className="text-xs text-amber-300">
            ⚠ Pick the lens you shot this frame on to save.
          </Text>
        ) : null}
        {rollGone ? (
          <Text className="text-xs text-rose-400">
            Error: this roll no longer exists.
          </Text>
        ) : null}
      </View>
    ) : null;

  return (
    <DetentSheet
      visible
      title="Log frame"
      footerCommitLabel={`Log frame ${frame}`}
      onCommit={commit}
      commitDisabled={isCommitDisabled({ blocked, rollGone, locating })}
      onClose={onCancel}
      expandSignal={expandSignal}
      onSettled={(isExpanded) => {
        // The request is spent whether or not the sheet reached large.
        const focusPlace = focusPlaceOnExpand.current;
        focusPlaceOnExpand.current = false;
        const input = placeRef.current;
        if (isExpanded) {
          setPlaceOpen(true);
          // The input is always editable, so it can take focus right away.
          if (focusPlace) input?.focus();
          return;
        }
        // A real collapse from large has already dropped the keyboard. A
        // focused field here means a sheet with no room to grow was nudged
        // while typing: it keeps the field.
        if (input?.isFocused()) return;
        input?.blur();
        setPlaceOpen(false);
      }}
      footer={status}
      expanded={
        <View className="gap-4">
          <FrameLocationField
            location={location}
            onChange={setLocation}
            onBusyChange={setLocating}
          />
          <LabeledTextField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Subject, filter, reminders…"
            multiline
          />
          {onMoreOptions ? (
            <Button
              variant="plain"
              label="More options…"
              disabled={locating}
              onPress={() => {
                // A pending fix is not on the draft yet: wait for it.
                if (locating) return;
                onMoreOptions({
                  lensId,
                  place: place.trim(),
                  notes: notes.trim(),
                  location,
                });
              }}
            />
          ) : null}
        </View>
      }
    >
      <View className="gap-4">
        <View className="gap-1">
          <View className="flex-row items-center gap-3">
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={readout.spoken}
              className="flex-1 gap-1"
            >
              <View className="flex-row items-baseline gap-2">
                <Text
                  maxFontSizeMultiplier={READOUT_MAX_FONT_SCALE}
                  className="text-ink-50"
                  style={[readoutText, { fontSize: 20, fontWeight: '600' }]}
                >
                  {readout.figure}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                  maxFontSizeMultiplier={READOUT_MAX_FONT_SCALE}
                  className={readout.exposure ? 'shrink' : 'shrink text-ink-40'}
                  style={[
                    readoutText,
                    { fontSize: 40, fontWeight: '700' },
                    readout.exposure ? { color: hue } : null,
                  ]}
                >
                  {readout.exposure ?? '–'}
                </Text>
              </View>
              <Text className="text-sm text-ink-60">{readout.subtitle}</Text>
            </View>
            {photo ? (
              <Image
                source={{ uri: photoUri(photo.fileName) }}
                style={THUMB}
                contentFit="cover"
                accessibilityIgnoresInvertColors
                accessible={false}
              />
            ) : null}
          </View>
          {mismatch ? (
            <Text className="text-xs text-ink-60">{mismatch}</Text>
          ) : null}
          {photo?.grayscale ? (
            <Text className="text-xs text-ink-60">Photo saved in B&amp;W</Text>
          ) : null}
        </View>

        {lenses.length === 0 ? (
          <Text className="text-sm text-ink-60">
            No saved lenses. Add one under Cameras & lenses.
          </Text>
        ) : (
          <PresetChipRow
            options={lensChipOptions(lenses, leadLensId)}
            value={lensId}
            onSelect={setPickedLens}
          />
        )}

        <Pressable
          // At medium the row is one button that opens the field; at large a
          // tap beside the input focuses it, and VoiceOver reads the input.
          onPress={placeOpen ? () => placeRef.current?.focus() : editPlace}
          accessible={!placeOpen}
          accessibilityRole={placeOpen ? undefined : 'button'}
          accessibilityLabel={
            placeOpen ? undefined : placeRowLabel(place, location)
          }
          accessibilityHint={placeOpen ? undefined : 'Edits the place'}
          className={`${ROW_CLASS} ${placeOpen ? '' : 'active:opacity-70'}`}
        >
          <Text accessible={false} className="text-base text-ink-60">
            Place
          </Text>
          <TextInput
            ref={placeRef}
            accessibilityLabel="Place"
            value={place}
            onChangeText={setPlace}
            placeholder={
              placeOpen ? 'Where you are' : (placeValue ?? 'Add a place')
            }
            placeholderTextColor={placeholderColor}
            keyboardAppearance="dark"
            returnKeyType="done"
            // Always editable, so focus never waits on a re-render; at medium
            // the row takes the tap and the input is hidden from VoiceOver.
            pointerEvents={placeOpen ? 'auto' : 'none'}
            accessibilityElementsHidden={!placeOpen}
            importantForAccessibility={
              placeOpen ? 'auto' : 'no-hide-descendants'
            }
            // `text-base` also sets a line height, which draws a one-line
            // input's text below the label's baseline on iOS; 0 unsets it.
            style={{ lineHeight: 0 }}
            className="min-h-11 flex-1 text-base text-white"
          />
        </Pressable>
      </View>
    </DetentSheet>
  );
}
