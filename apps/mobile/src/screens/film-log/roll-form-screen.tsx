import { sanitizeText } from '@dorkroom/logic';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { CustomFilmForm } from '@/components/film-log/custom-film-form';
import { SelectField } from '@/components/film-log/select-field';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
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
import type { FilmProcess, FilmRoll, FilmStock } from '@/types/film-log';

export function RollFormScreen() {
  const { rollId } = useLocalSearchParams<{ rollId?: string }>();
  const existing = useRoll(rollId);
  const cameras = useCameras();
  const films = useFilmCatalog();
  const [showCustomFilm, setShowCustomFilm] = useState(false);

  const [form, set] = useFormState({
    name: existing?.name ?? '',
    cameraId: existing?.cameraId ?? cameras[0]?.id,
    filmStockId: existing?.filmStockId,
    process: (existing?.process ?? 'bw') as FilmProcess,
    iso: existing?.iso !== undefined ? String(existing.iso) : '',
    status: (existing?.status ?? 'active') as FilmRoll['status'],
    back: existing?.back as string | undefined,
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
  const filmOptions = useMemo(
    () =>
      films.map((f) => ({
        label: `${f.brand} ${f.name}`,
        value: f.id,
        detail: `ISO ${f.iso}`,
      })),
    [films]
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

  const onSelectFilm = (id: string) => {
    const stock = resolveStock(id);
    if (stock) selectFilm(stock);
    else set('filmStockId', id);
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
    const ei = Number(form.iso);
    const fields = {
      name: sanitizeText(form.name, 120),
      cameraId: form.cameraId,
      filmStockId: form.filmStockId,
      filmStockName: stock ? `${stock.brand} ${stock.name}` : undefined,
      process: form.process,
      iso: Number.isFinite(ei) && ei > 0 ? ei : undefined,
      status: form.status,
      back: showBacks ? form.back : undefined,
      notes: sanitizeText(form.notes, 2000),
    };
    if (existing) {
      updateRoll(existing.id, fields);
    } else {
      addRoll({ ...fields, startedAt: new Date().toISOString() });
    }
    router.back();
  };

  if (cameras.length === 0) {
    return (
      <Screen>
        <GlassCard className="gap-3">
          <Text className="text-base text-white">
            Add a camera before starting a roll.
          </Text>
          <Pressable
            onPress={() => router.replace('/film-log/gear')}
            accessibilityRole="button"
            className="items-center rounded-xl bg-rose-600 px-4 py-3"
          >
            <Text className="text-base font-semibold text-white">
              Go to Cameras & lenses
            </Text>
          </Pressable>
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
          <SelectField
            label="Film"
            value={form.filmStockId}
            options={filmOptions}
            onChange={onSelectFilm}
            placeholder="Select a film stock"
          />
          <Pressable
            onPress={() => setShowCustomFilm(true)}
            accessibilityRole="button"
            className="self-start"
          >
            <Text className="text-sm text-rose-400">
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
          <Text className="text-sm text-white/60">Process</Text>
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
          <Text className="text-sm text-white/60">Status</Text>
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

      <Pressable
        onPress={onSave}
        accessibilityRole="button"
        className="items-center rounded-xl bg-rose-600 px-4 py-3"
      >
        <Text className="text-base font-semibold text-white">
          {existing ? 'Save changes' : 'Start roll'}
        </Text>
      </Pressable>

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
