import {
  formatAperture,
  formatShutterSpeed,
  STANDARD_APERTURES,
  STANDARD_SHUTTER_SPEEDS,
  sanitizeText,
  snapToStandardStop,
} from '@dorkroom/logic';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SelectField } from '@/components/film-log/select-field';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { Screen } from '@/components/screen';
import { Stepper } from '@/components/stepper';
import {
  useCameras,
  useFilmCatalog,
  useLensesForCamera,
  useRoll,
  useRolls,
} from '@/hooks/use-film-log';
import { useFormState } from '@/hooks/use-form-state';
import { cameraUsesBacks } from '@/lib/film-log-options';
import { addShot, updateShot } from '@/lib/film-log-storage';

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
    iso?: string;
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
  const films = useFilmCatalog();
  const existing = roll?.shots.find((shot) => shot.id === params.shotId);

  const filmIso = films.find((f) => f.id === roll?.filmStockId)?.iso;
  const prefillAperture = parseNum(params.aperture);
  const prefillShutter = parseNum(params.shutter);
  const prefillIso = parseNum(params.iso);
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
    // Free-form so the user can enter a push/pull EI (e.g. 800 for Tri-X @ +1).
    iso: String(existing?.iso ?? prefillIso ?? filmIso ?? 400),
    lensId: existing?.lensId,
    back: existing?.back ?? roll?.back,
    notes: existing?.notes ?? '',
  });

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

  const onSave = () => {
    if (!roll) return;
    const fields = {
      frameNumber: form.frameNumber,
      aperture: form.aperture,
      shutterSpeed: form.shutterSpeed,
      iso: parseNum(form.iso),
      lensId: form.lensId,
      back: showBacks ? form.back : undefined,
      notes: sanitizeText(form.notes, 2000),
      source:
        existing?.source ?? (params.source === 'meter' ? 'meter' : 'manual'),
    } as const;
    if (existing) {
      updateShot(roll.id, existing.id, fields);
    } else {
      addShot(roll.id, { ...fields, takenAt: new Date().toISOString() });
    }
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
        <LabeledTextField
          label="ISO / EI (push/pull)"
          value={form.iso}
          onChangeText={(v) => set('iso', v)}
          keyboardType="numeric"
          placeholder="e.g. 400 or 800 pushed"
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
