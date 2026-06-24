import {
  formatAperture,
  formatShutterSpeed,
  STANDARD_APERTURES,
  STANDARD_SHUTTER_SPEEDS,
  sanitizeText,
  snapToStandardStop,
} from '@dorkroom/logic';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SelectField } from '@/components/film-log/select-field';
import { ShotPhotoRow } from '@/components/film-log/shot-photo-row';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { Screen } from '@/components/screen';
import { Stepper } from '@/components/stepper';
import {
  useCameras,
  useLensesForCamera,
  useRoll,
  useRolls,
} from '@/hooks/use-film-log';
import { useFormState } from '@/hooks/use-form-state';
import { cameraUsesBacks, lastUsedLensId } from '@/lib/film-log-options';
import {
  deletePhotoFile,
  savePhoto,
  shouldGrayscale,
} from '@/lib/film-log-photos';
import { addShot, updateShot } from '@/lib/film-log-storage';
import type { ShotPhoto } from '@/types/film-log';

const APERTURE_OPTIONS = STANDARD_APERTURES.map((a) => ({
  value: a.value,
  label: formatAperture(a.value),
}));
const SHUTTER_OPTIONS = STANDARD_SHUTTER_SPEEDS.map((s) => ({
  value: s.value,
  label: formatShutterSpeed(s.value),
}));

function parseNum(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function ShotFormScreen() {
  const params = useLocalSearchParams<{
    rollId: string;
    shotId?: string;
    source?: string;
    aperture?: string;
    shutter?: string;
    meteredIso?: string;
    photo?: string;
  }>();
  const rolls = useRolls();
  // When launched from a roll, rollId is fixed. From the meter "+ Log" button it
  // is absent, so the user picks a roll (defaulting to the first active one).
  const [rollId, setRollId] = useState(
    params.rollId ??
      rolls.find((r) => r.status === 'active')?.id ??
      rolls[0]?.id
  );
  const roll = useRoll(rollId);
  const cameras = useCameras();
  const camera = cameras.find((c) => c.id === roll?.cameraId);
  const lenses = useLensesForCamera(roll?.cameraId);
  const existing = roll?.shots.find((shot) => shot.id === params.shotId);

  const prefillAperture = parseNum(params.aperture);
  const prefillShutter = parseNum(params.shutter);
  // The meter passes the ISO it metered at; warn if it differs from the roll's EI
  // (the recorded aperture/shutter were solved for that ISO, not the roll's).
  const meteredIso = parseNum(params.meteredIso);
  const isoMismatch =
    meteredIso !== undefined &&
    roll?.iso !== undefined &&
    meteredIso !== roll.iso;
  const nextFrame =
    (roll?.shots.reduce((max, shot) => Math.max(max, shot.frameNumber), 0) ??
      0) + 1;

  const [form, set] = useFormState({
    frameNumber: existing?.frameNumber ?? nextFrame,
    aperture:
      existing?.aperture ??
      (prefillAperture !== undefined
        ? snapToStandardStop(prefillAperture, STANDARD_APERTURES, false)
            .standard.value
        : 8),
    shutterSpeed:
      existing?.shutterSpeed ??
      (prefillShutter !== undefined
        ? snapToStandardStop(prefillShutter, STANDARD_SHUTTER_SPEEDS, true)
            .standard.value
        : 0.008),
    // New shots default to the last lens used on this roll.
    lensId: existing?.lensId ?? lastUsedLensId(roll?.shots ?? []),
    back: existing?.back ?? roll?.back,
    notes: existing?.notes ?? '',
    photo: (existing?.photo ??
      (params.photo
        ? {
            fileName: params.photo,
            width: 0,
            height: 0,
            capturedAt: new Date().toISOString(),
            source: 'meter' as const,
          }
        : undefined)) as ShotPhoto | undefined,
  });

  const savedRef = useRef(false);
  const committedFileRef = useRef<string | undefined>(undefined);
  // eslint-disable-next-line react-doctor/rerender-lazy-ref-init -- Set() is a trivial allocation; lazy-init would require null + non-null assertion everywhere .current is accessed
  const sessionFiles = useRef<Set<string>>(new Set());

  // Seed the session set with the meter-capture file that was passed in as a param.
  useEffect(() => {
    if (params.photo) sessionFiles.current.add(params.photo);
    // eslint-disable-next-line react-doctor/exhaustive-deps -- one-time mount seed; sessionFiles ref is stable
  }, []);

  // On unmount, delete every file created during this session except the one committed.
  // Refs are stable; reading .current in the cleanup is intentional — we want the
  // latest value at unmount time, not the value captured at mount.
  // eslint-disable-next-line react-doctor/exhaustive-deps -- refs are stable; cleanup reads latest .current on unmount
  useEffect(() => {
    return () => {
      const kept = savedRef.current ? committedFileRef.current : undefined;
      // eslint-disable-next-line react-doctor/exhaustive-deps -- intentional: iterate latest sessionFiles ref at unmount; .current is the value we want at cleanup time
      for (const f of sessionFiles.current) {
        if (f !== kept) void deletePhotoFile(f);
      }
    };
  }, []);

  const showRollPicker = !params.rollId;
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
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 1,
    });
    if (res.canceled || !res.assets[0]) return;
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
    if (!roll) return;
    const fields = {
      frameNumber: form.frameNumber,
      aperture: form.aperture,
      shutterSpeed: form.shutterSpeed,
      lensId: form.lensId,
      back: showBacks ? form.back : undefined,
      notes: sanitizeText(form.notes, 2000),
      source:
        existing?.source ?? (params.source === 'meter' ? 'meter' : 'manual'),
      photo: form.photo,
    } as const;
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
    router.back();
  };

  if (rolls.length === 0) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Add shot' }} />
        <GlassCard className="gap-3">
          <Text className="text-base text-white">
            Start a roll before logging a shot.
          </Text>
          <Pressable
            onPress={() => router.replace('/film-log/roll-form')}
            accessibilityRole="button"
            className="items-center rounded-xl bg-rose-600 px-4 py-3"
          >
            <Text className="text-base font-semibold text-white">
              Start a roll
            </Text>
          </Pressable>
        </GlassCard>
      </Screen>
    );
  }

  if (!roll) {
    return (
      <Screen>
        <Text className="text-white/60">Roll not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Edit shot' : 'Add shot' }} />
      {isoMismatch ? (
        <GlassCard className="gap-1 border border-amber-400/40">
          <Text className="text-sm font-semibold text-amber-300">
            ISO doesn't match this roll
          </Text>
          <Text className="text-sm text-white/70">
            Metered at ISO {meteredIso}, but this roll is rated EI {roll.iso}.
            The aperture and shutter were solved for ISO {meteredIso}.
          </Text>
        </GlassCard>
      ) : null}
      <GlassCard className="gap-4">
        {showRollPicker ? (
          <SelectField
            label="Roll"
            value={rollId}
            options={rollOptions}
            onChange={setRollId}
          />
        ) : null}
        <View className="gap-2">
          <Text className="text-sm text-white/60">
            Frame #{form.frameNumber}
          </Text>
          <Stepper
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
        <SelectField
          label="Lens"
          value={form.lensId}
          options={lensOptions}
          onChange={(v) => set('lensId', v)}
          placeholder={
            lensOptions.length > 0 ? 'Select a lens' : 'No saved lenses'
          }
        />
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
      </GlassCard>

      <Pressable
        onPress={onSave}
        accessibilityRole="button"
        className="items-center rounded-xl bg-rose-600 px-4 py-3"
      >
        <Text className="text-base font-semibold text-white">
          {existing ? 'Save shot' : 'Add shot'}
        </Text>
      </Pressable>
    </Screen>
  );
}
