import { parseDecimalInput, sanitizeText } from '@dorkroom/logic';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Keyboard, Pressable, Text, View } from 'react-native';
import { CommitButton } from '@/components/commit-button';
import { CustomFilmForm } from '@/components/film-log/custom-film-form';
import { FilmStockPicker } from '@/components/film-log/film-stock-picker';
import { resolveFilmStockName } from '@/components/film-log/film-stock-picker-logic';
import { SelectField } from '@/components/film-log/select-field';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { NeutralButton } from '@/components/neutral-button';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { useCameras, useFilmCatalog, useRoll } from '@/hooks/use-film-log';
import { useFormState } from '@/hooks/use-form-state';
import {
  cameraUsesBacks,
  PROCESS_OPTIONS,
  ROLL_STATUS_OPTIONS,
} from '@/lib/film-log-options';
import { addRoll, updateRoll } from '@/lib/film-log-storage';
import { rollFormStatusPatch } from '@/lib/roll-lifecycle';
import type { FilmStock } from '@/schemas/film-log.schema';
import { usePhaseHue } from '@/theme/use-phase-accent';

export function RollFormScreen() {
  const hue = usePhaseHue();
  const { rollId } = useLocalSearchParams<{ rollId?: string }>();
  const existing = useRoll(rollId);
  const cameras = useCameras();
  const {
    films,
    isLoading: filmsLoading,
    isError: filmsError,
    refetch: refetchFilms,
  } = useFilmCatalog();
  const [showCustomFilm, setShowCustomFilm] = useState(false);
  // The status the form opened with: saving writes status only if the user
  // changed it here, so an open form cannot undo a change made elsewhere.
  const [openedStatus] = useState(existing?.status);

  const [form, set] = useFormState({
    name: existing?.name ?? '',
    cameraId: existing?.cameraId ?? cameras[0]?.id,
    filmStockId: existing?.filmStockId,
    process: existing?.process ?? 'bw',
    iso: existing?.iso !== undefined ? String(existing.iso) : '',
    status: existing?.status ?? 'active',
    back: existing?.back,
    notes: existing?.notes ?? '',
  });

  const camera = cameras.find((c) => c.id === form.cameraId);
  const showBacks = cameraUsesBacks(camera);
  const resolveStock = (id: string | undefined) =>
    films.find((f) => f.id === id);

  const cameraOptions = useMemo(
    () => cameras.map((c) => ({ label: c.name, value: c.id })),
    [cameras]
  );
  const backOptions = useMemo(
    () => (camera?.backs ?? []).map((b) => ({ label: b, value: b })),
    [camera]
  );

  const selectFilm = (stock: FilmStock) => {
    set('filmStockId', stock.id);
    set('process', stock.process);
    // Default the roll's EI to box speed; the user bumps it to push/pull.
    set('iso', String(stock.iso));
  };

  const onSave = () => {
    if (!form.cameraId) {
      Alert.alert(
        'Pick a camera',
        'Add a camera under Cameras & lenses first.'
      );
      return;
    }
    const stock = resolveStock(form.filmStockId);
    const ei = parseDecimalInput(form.iso);
    const fields = {
      name: sanitizeText(form.name, 120),
      cameraId: form.cameraId,
      filmStockId: form.filmStockId,
      filmStockName: resolveFilmStockName(stock, form.filmStockId, existing),
      process: form.process,
      iso: Number.isFinite(ei) && ei > 0 ? ei : undefined,
      back: showBacks ? form.back : undefined,
      notes: sanitizeText(form.notes, 2000),
    };
    // The same status rule as Mark as shot / developed, so the dates agree.
    const now = new Date().toISOString();
    if (existing) {
      updateRoll(existing.id, {
        ...fields,
        ...rollFormStatusPatch(existing, openedStatus, form.status, now),
      });
    } else {
      addRoll({
        ...fields,
        status: form.status,
        ...rollFormStatusPatch(undefined, undefined, form.status, now),
        startedAt: now,
      });
    }
    // Close the keyboard while this form is still the focused screen, so the
    // screen Back reveals does not handle its hide (see `Screen`).
    Keyboard.dismiss();
    router.back();
  };

  if (cameras.length === 0) {
    return (
      <Screen>
        <GlassCard className="gap-3">
          <Text className="text-base text-white">
            Add a camera before starting a roll.
          </Text>
          <NeutralButton
            onPress={() => router.replace('/shoot/film-log/gear')}
            label="Go to Cameras & lenses"
          />
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <GlassCard className="gap-4">
        <LabeledTextField
          label="Roll name (optional)"
          value={form.name}
          onChangeText={(v) => set('name', v)}
          placeholder="e.g. Trip to Portland"
        />
        <SelectField
          label="Camera"
          value={form.cameraId}
          options={cameraOptions}
          onChange={(v) => set('cameraId', v)}
        />
        <View className="gap-2">
          <FilmStockPicker
            label="Film"
            value={form.filmStockId}
            films={films}
            onSelect={selectFilm}
            placeholder="Select a film stock"
          />
          {filmsLoading ? (
            <Text className="text-sm text-ink-40">Loading film catalog…</Text>
          ) : null}
          {filmsError ? (
            <Pressable
              onPress={refetchFilms}
              accessibilityRole="button"
              className="self-start"
            >
              <Text className="text-sm text-amber-400">
                ⚠ Couldn't load the film catalog. Tap to retry, or add your film
                below.
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setShowCustomFilm(true)}
            accessibilityRole="button"
            className="self-start"
          >
            <Text className="text-sm" style={{ color: hue }}>
              + Add a film that isn't listed
            </Text>
          </Pressable>
        </View>
        <LabeledTextField
          label="ISO / EI (push/pull)"
          value={form.iso}
          onChangeText={(v) => set('iso', v)}
          keyboardType="numeric"
          placeholder="Box speed, or rate it differently"
        />
        <View className="gap-2">
          <Text className="text-sm text-ink-60">Process</Text>
          <SegmentedControl
            options={PROCESS_OPTIONS}
            value={form.process}
            onChange={(v) => set('process', v)}
          />
        </View>
        {showBacks && backOptions.length > 0 ? (
          <SelectField
            label="Default holder / back"
            value={form.back}
            options={backOptions}
            onChange={(v) => set('back', v)}
            placeholder="Select a back"
          />
        ) : null}
        <View className="gap-2">
          <Text className="text-sm text-ink-60">Status</Text>
          <SegmentedControl
            options={ROLL_STATUS_OPTIONS}
            value={form.status}
            onChange={(v) => set('status', v)}
          />
        </View>
        <LabeledTextField
          label="Notes (optional)"
          value={form.notes}
          onChangeText={(v) => set('notes', v)}
          placeholder="Developer, push/pull, reminders…"
        />
      </GlassCard>

      <CommitButton
        onPress={onSave}
        label={existing ? 'Save changes' : 'Start roll'}
      />

      {showCustomFilm ? (
        <CustomFilmForm
          visible
          onClose={() => setShowCustomFilm(false)}
          onCreated={selectFilm}
        />
      ) : null}
    </Screen>
  );
}
