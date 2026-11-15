import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, Text, type TextInput, View } from 'react-native';
import { DetentSheet } from '@/components/detent-sheet/detent-sheet';
import { FrameLocationField } from '@/components/film-log/frame-location-field';
import { LabeledTextField } from '@/components/labeled-text-field';
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
  formatReading,
  type FrameReading,
  isoMismatchNote,
  needsLens,
  placeCardValue,
  rollSummary,
} from '@/lib/log-frame';
import type {
  FilmRoll,
  Shot,
  ShotLocationFields,
  ShotPhoto,
} from '@/schemas/film-log.schema';
import { selectableRowStyle, useSelectionTint } from '@/theme/use-phase-accent';

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
  /** Shows a "More options" row that hands the draft to the full shot form. */
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

interface SummaryCardProps {
  label: string;
  value: string;
  /** The value is a prompt, not a choice: drawn dimmer. */
  placeholder: boolean;
  onPress: () => void;
}

/** A tappable card in the medium block: what is chosen, and a way to change it. */
function SummaryCard({ label, value, placeholder, onPress }: SummaryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint="Shows the details"
      className="min-h-11 flex-1 gap-1 rounded-xl border-hw border-line bg-surface px-4 py-3 active:opacity-80"
    >
      <Text className="text-xs text-ink-60">{label}</Text>
      <Text
        numberOfLines={1}
        className={`text-base ${placeholder ? 'text-ink-50' : 'text-white'}`}
      >
        {value}
      </Text>
    </Pressable>
  );
}

/**
 * Logs a frame to a roll from a reading: the Meter's shutter (with the photo it
 * took) or a calculator's "Save to roll". A `DetentSheet`: at medium it shows the
 * roll, the reading and the lens and place chosen; the large detent opens the
 * lens list, place, notes and photo. The header's Log and the footer's button do
 * the same thing and share one disabled state (a lens must be picked when the
 * camera has lenses).
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
  const tint = useSelectionTint();
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
  const [rollGone, setRollGone] = useState(false);
  const placeRef = useRef<TextInput>(null);
  const focusPlaceOnExpand = useRef(false);

  // A last-used lens that was deleted, or belongs to another body, is no pick.
  const lens = lenses.find((candidate) => candidate.id === pickedLens);
  const lensId = lens?.id;
  const blocked = needsLens(lenses, lensId);

  const readingLine = formatReading(reading, source);
  const mismatch = isoMismatchNote(reading, roll, source);
  const trimmedPlace = place.trim();
  const placeValue = placeCardValue(place, location);

  // Whether Place is focused is decided on arrival (`onSettled`), whatever the
  // sheet was doing when the card was tapped.
  const expand = (focusPlace: boolean) => {
    focusPlaceOnExpand.current = focusPlace;
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

  const lensValue = lens
    ? lens.name
    : lenses.length > 0
      ? 'Select a lens'
      : 'No saved lenses';

  return (
    <DetentSheet
      visible
      title={`Frame ${frame}`}
      commitLabel="Log"
      onCommit={commit}
      commitDisabled={isCommitDisabled({ blocked, rollGone, locating })}
      onClose={onCancel}
      expandSignal={expandSignal}
      onSettled={(isExpanded) => {
        // The request is spent whether or not the sheet reached large.
        const focusPlace = focusPlaceOnExpand.current;
        focusPlaceOnExpand.current = false;
        if (isExpanded && focusPlace) placeRef.current?.focus();
      }}
      footerCommitLabel={`Log frame ${frame}`}
      expanded={
        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-sm text-ink-60">Lens</Text>
            {lenses.length === 0 ? (
              <Text className="text-sm text-ink-50">
                No saved lenses. Add one under Cameras & lenses.
              </Text>
            ) : (
              lenses.map((candidate) => {
                const selected = candidate.id === lensId;
                return (
                  <Pressable
                    key={candidate.id}
                    onPress={() => setPickedLens(candidate.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="min-h-11 flex-row items-center justify-between rounded-xl border px-4 py-3"
                    style={selectableRowStyle(tint, selected)}
                  >
                    <Text className="text-base text-white">
                      {candidate.name}
                    </Text>
                    {selected ? (
                      <Text className="text-base text-white">✓</Text>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </View>
          <LabeledTextField
            label="Place"
            value={place}
            onChangeText={setPlace}
            placeholder="Where you are"
            inputRef={placeRef}
          />
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
          {photo ? (
            <View className="flex-row items-center gap-3">
              <Image
                source={{ uri: photoUri(photo.fileName) }}
                style={{ width: 72, height: 96, borderRadius: 10 }}
                contentFit="cover"
              />
              {photo.grayscale ? (
                <Text className="text-xs text-ink-60">Saved in B&amp;W</Text>
              ) : null}
            </View>
          ) : null}
          {onMoreOptions ? (
            <Pressable
              onPress={() => {
                // A pending fix is not on the draft yet: wait for it.
                if (locating) return;
                onMoreOptions({
                  lensId,
                  place: trimmedPlace,
                  notes: notes.trim(),
                  location,
                });
              }}
              disabled={locating}
              accessibilityRole="button"
              accessibilityState={{ disabled: locating }}
              className={`min-h-11 items-center justify-center rounded-xl border-hw border-line bg-surface px-4 py-3 ${locating ? 'opacity-40' : 'active:opacity-80'}`}
            >
              <Text className="text-base text-white">More options…</Text>
            </Pressable>
          ) : null}
        </View>
      }
    >
      <View className="gap-3">
        <View className="gap-1 rounded-xl border-hw border-line bg-surface px-4 py-3">
          <Text className="text-xs text-ink-60">Roll</Text>
          <Text className="text-base text-white">
            {rollSummary(roll, cameraName)}
          </Text>
        </View>
        {readingLine ? (
          <Text className="text-base text-white">{readingLine}</Text>
        ) : null}
        {mismatch ? (
          <Text className="text-xs text-ink-60">{mismatch}</Text>
        ) : null}
        <View className="flex-row gap-3">
          <SummaryCard
            label="Lens"
            value={lensValue}
            placeholder={!lens}
            onPress={() => expand(false)}
          />
          <SummaryCard
            label="Place"
            value={placeValue ?? 'Add a place'}
            placeholder={placeValue === null}
            onPress={() => expand(true)}
          />
        </View>
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
    </DetentSheet>
  );
}
