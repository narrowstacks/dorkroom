import {
  formatAperture,
  formatShutterSpeed,
  snapToStandardStop,
  STANDARD_APERTURES,
  STANDARD_SHUTTER_SPEEDS,
} from '@dorkroom/logic';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { CommitButton } from '@/components/commit-button';
import { FrameLocationField } from '@/components/film-log/frame-location-field';
import { SelectField } from '@/components/film-log/select-field';
import { ShotPhotoRow } from '@/components/film-log/shot-photo-row';
import { LabeledTextField } from '@/components/labeled-text-field';
import { NeutralButton } from '@/components/neutral-button';
import { Screen } from '@/components/screen';
import { Stepper } from '@/components/stepper';
import { Surface } from '@/components/surface';
import {
  useCameras,
  useLensesForCamera,
  useRoll,
  useRolls,
} from '@/hooks/use-film-log';
import { useFormState } from '@/hooks/use-form-state';
import { cameraUsesBacks, nextFrameNumber } from '@/lib/film-log-options';
import {
  deletePhotoFile,
  savePhoto,
  shouldGrayscale,
} from '@/lib/film-log-photos';
import { addShot, updateShot } from '@/lib/film-log-storage';
import { isCommitDisabled } from '@/lib/frame-location-format';
import {
  clearFrameLocationHandoff,
  peekFrameLocationHandoff,
} from '@/lib/frame-location-handoff';
import { gatePhotoPicker } from '@/lib/photo-picker-gate';
import {
  firstParam,
  type RouteParam,
  shotFormDefaults,
  shotFormFields,
} from '@/lib/shot-form-defaults';
import type { ShotPhoto } from '@/schemas/film-log.schema';
import { useWarningLine } from '@/theme/use-phase-accent';

const APERTURE_OPTIONS = STANDARD_APERTURES.map((a) => ({
  value: a.value,
  label: formatAperture(a.value),
}));
const SHUTTER_OPTIONS = STANDARD_SHUTTER_SPEEDS.map((s) => ({
  value: s.value,
  label: formatShutterSpeed(s.value),
}));

/** The photo a meter capture hands over as a route param, if there was one. */
function meterCapturePhoto(
  fileName: string | undefined
): ShotPhoto | undefined {
  return fileName
    ? {
        fileName,
        width: 0,
        height: 0,
        capturedAt: new Date().toISOString(),
        source: 'meter',
      }
    : undefined;
}

function parseNum(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function IsoMismatchCard({
  meteredIso,
  rollIso,
}: {
  meteredIso: number | undefined;
  rollIso: number | undefined;
}) {
  const warningLine = useWarningLine();
  return (
    <Surface
      className="gap-1"
      style={{ borderWidth: 1, borderColor: warningLine }}
    >
      <Text className="text-sm font-semibold text-amber-300">
        ⚠ ISO doesn't match this roll
      </Text>
      <Text className="text-sm text-ink-70">
        Metered at ISO {meteredIso}, but this roll is rated EI {rollIso}. The
        aperture and shutter were solved for ISO {meteredIso}.
      </Text>
    </Surface>
  );
}

export function ShotFormScreen() {
  const params = useLocalSearchParams<{
    rollId?: RouteParam;
    shotId?: RouteParam;
    source?: string;
    aperture?: string;
    shutter?: string;
    meteredIso?: string;
    photo?: string;
    lensId?: RouteParam;
    place?: RouteParam;
    notes?: RouteParam;
  }>();
  const paramRollId = firstParam(params.rollId);
  const rolls = useRolls();
  // When launched from a roll, rollId is fixed. From the meter "+ Log" button it
  // is absent, so the user picks a roll (defaulting to the first active one).
  const [rollId, setRollId] = useState(
    paramRollId ?? rolls.find((r) => r.status === 'active')?.id ?? rolls[0]?.id
  );
  const roll = useRoll(rollId);
  const cameras = useCameras();
  const camera = cameras.find((c) => c.id === roll?.cameraId);
  const lenses = useLensesForCamera(roll?.cameraId);
  const existing = roll?.shots.find(
    (shot) => shot.id === firstParam(params.shotId)
  );

  const prefillAperture = parseNum(params.aperture);
  const prefillShutter = parseNum(params.shutter);
  // The meter passes the ISO it metered at; warn if it differs from the roll's EI
  // (the recorded aperture/shutter were solved for that ISO, not the roll's).
  const meteredIso = parseNum(params.meteredIso);
  const isoMismatch =
    meteredIso !== undefined &&
    roll?.iso !== undefined &&
    meteredIso !== roll.iso;
  const nextFrame = nextFrameNumber(roll?.shots ?? []);
  const defaults = shotFormDefaults(params, existing, roll, lenses, {
    aperture:
      prefillAperture === undefined
        ? undefined
        : snapToStandardStop(prefillAperture, STANDARD_APERTURES, false)
            .standard.value,
    shutterSpeed:
      prefillShutter === undefined
        ? undefined
        : snapToStandardStop(prefillShutter, STANDARD_SHUTTER_SPEEDS, true)
            .standard.value,
  });

  const [handoffLocation] = useState(() =>
    peekFrameLocationHandoff(params.photo)
  );
  const [locating, setLocating] = useState(false);

  // See shotFormDefaults: an existing shot starts exactly as saved, so a value
  // it never had stays unset (and unwritten) until the user picks one.
  const [form, set] = useFormState({
    frameNumber: existing?.frameNumber ?? nextFrame,
    aperture: defaults.aperture,
    shutterSpeed: defaults.shutterSpeed,
    lensId: defaults.lensId,
    back: defaults.back,
    notes: defaults.notes,
    place: defaults.place,
    // A new shot starts with the log sheet's location only when it was handed
    // over in memory for this capture; a route param is never read.
    location: existing ? defaults.location : handoffLocation,
    photo: existing?.photo ?? meterCapturePhoto(params.photo),
  });

  const savedRef = useRef(false);
  const committedFileRef = useRef<string | undefined>(undefined);
  // eslint-disable-next-line react-doctor/rerender-lazy-ref-init -- Set() is a trivial allocation; lazy-init would require null + non-null assertion everywhere .current is accessed
  const sessionFiles = useRef<Set<string>>(new Set());

  // Seed the session set with the meter-capture file that was passed in as a param.
  useEffect(() => {
    if (params.photo) sessionFiles.current.add(params.photo);
    // Read once above; whatever is left is dropped, here and on unmount.
    clearFrameLocationHandoff();
    // eslint-disable-next-line react-doctor/exhaustive-deps -- one-time mount seed; sessionFiles ref is stable
  }, []);

  // On unmount, delete every file created during this session except the one committed.
  // Refs are stable; reading .current in the cleanup is intentional — we want the
  // latest value at unmount time, not the value captured at mount.
  // eslint-disable-next-line react-doctor/exhaustive-deps -- refs are stable; cleanup reads latest .current on unmount
  useEffect(() => {
    return () => {
      clearFrameLocationHandoff();
      const kept = savedRef.current ? committedFileRef.current : undefined;
      // eslint-disable-next-line react-doctor/exhaustive-deps -- intentional: iterate latest sessionFiles ref at unmount; .current is the value we want at cleanup time
      for (const f of sessionFiles.current) {
        if (f !== kept) void deletePhotoFile(f);
      }
    };
  }, []);

  const showRollPicker = !paramRollId;
  const rollOptions = rolls.map((r) => ({
    label: r.name?.trim() ? r.name : (r.filmStockName ?? 'Roll'),
    value: r.id,
  }));
  const lensOptions = useMemo(
    () => lenses.map((lens) => ({ label: lens.name, value: lens.id })),
    [lenses]
  );
  const backOptions = useMemo(
    () => (camera?.backs ?? []).map((b) => ({ label: b, value: b })),
    [camera]
  );
  const showBacks = cameraUsesBacks(camera);

  const onChoosePhoto = async () => {
    const res = await gatePhotoPicker(() =>
      ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 1,
      })
    );
    if (!res || res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const saved = await savePhoto(a.uri, {
      source: 'library',
      width: a.width ?? 0,
      height: a.height ?? 0,
      grayscale: shouldGrayscale(roll?.process ?? 'color'),
    });
    sessionFiles.current.add(saved.fileName);
    set('photo', saved);
  };

  const onRemovePhoto = () => {
    const fileName = form.photo?.fileName;
    // Only delete files created during this session right away. An existing
    // shot's saved photo is left on disk and removed in onSave, so navigating
    // back without saving keeps the photo the shot still references.
    if (fileName && sessionFiles.current.has(fileName)) {
      sessionFiles.current.delete(fileName);
      void deletePhotoFile(fileName);
    }
    set('photo', undefined);
  };

  const onSave = () => {
    if (!roll || locating) return;
    const fields = shotFormFields(form, {
      showBacks,
      source:
        existing?.source ?? (params.source === 'meter' ? 'meter' : 'manual'),
    });
    if (existing) {
      // Clean up the old photo file if the photo was replaced.
      if (existing.photo && existing.photo.fileName !== form.photo?.fileName) {
        void deletePhotoFile(existing.photo.fileName);
      }
      updateShot(roll.id, existing.id, fields);
    } else {
      addShot(roll.id, { ...fields, takenAt: new Date().toISOString() });
    }
    savedRef.current = true;
    committedFileRef.current = form.photo?.fileName;
    // Close the keyboard while this form is still the focused screen, so the
    // screen Back reveals does not handle its hide (see `Screen`).
    Keyboard.dismiss();
    router.back();
  };

  if (rolls.length === 0) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Add frame' }} />
        <Surface className="gap-3">
          <Text className="text-base text-white">
            Start a roll before logging a frame.
          </Text>
          <NeutralButton
            onPress={() => router.replace('/shoot/film-log/roll-form')}
            label="Start a roll"
          />
        </Surface>
      </Screen>
    );
  }

  if (!roll) {
    return (
      <Screen>
        <Text className="text-ink-60">Roll not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        options={{ title: existing ? 'Edit frame' : 'Add frame' }}
      />
      {isoMismatch ? (
        <IsoMismatchCard meteredIso={meteredIso} rollIso={roll.iso} />
      ) : null}
      <Surface className="gap-4">
        {showRollPicker ? (
          <SelectField
            label="Roll"
            value={rollId}
            options={rollOptions}
            onChange={setRollId}
          />
        ) : null}
        <View className="gap-2">
          <Text className="text-sm text-ink-60">Frame #{form.frameNumber}</Text>
          <Stepper
            label="Frame number"
            value={String(form.frameNumber)}
            onDecrement={() =>
              set('frameNumber', Math.max(1, form.frameNumber - 1))
            }
            onIncrement={() => set('frameNumber', form.frameNumber + 1)}
          />
        </View>
        <SelectField
          label="Aperture"
          value={form.aperture}
          options={APERTURE_OPTIONS}
          onChange={(v) => set('aperture', v)}
        />
        <SelectField
          label="Shutter speed"
          value={form.shutterSpeed}
          options={SHUTTER_OPTIONS}
          onChange={(v) => set('shutterSpeed', v)}
        />
        {lensOptions.length > 0 ? (
          <SelectField
            label="Lens"
            value={form.lensId}
            options={lensOptions}
            onChange={(v) => set('lensId', v)}
            placeholder="Select a lens"
          />
        ) : (
          <View className="gap-1">
            <Text className="text-sm text-ink-60">Lens</Text>
            <View className="rounded-xl border-hw border-line bg-surface-dim px-4 py-3">
              <Text className="text-sm text-ink-40">
                No saved lenses — add one under Cameras & lenses.
              </Text>
            </View>
          </View>
        )}
        {showBacks && backOptions.length > 0 ? (
          <SelectField
            label="Holder / back"
            value={form.back}
            options={backOptions}
            onChange={(v) => set('back', v)}
            placeholder="Select a back"
          />
        ) : null}
        <LabeledTextField
          label="Place (optional)"
          value={form.place}
          onChangeText={(v) => set('place', v)}
          placeholder="Where you took it"
        />
        <FrameLocationField
          location={form.location}
          onChange={(v) => set('location', v)}
          onBusyChange={setLocating}
        />
        <LabeledTextField
          label="Notes (optional)"
          value={form.notes}
          onChangeText={(v) => set('notes', v)}
          placeholder="Subject, filter, reminders…"
        />
        <ShotPhotoRow
          photo={form.photo}
          onChoose={() => void onChoosePhoto()}
          onRemove={onRemovePhoto}
        />
      </Surface>

      <CommitButton
        onPress={onSave}
        disabled={isCommitDisabled({ locating })}
        label={existing ? 'Save frame' : 'Add frame'}
      />
    </Screen>
  );
}
