import { sanitizeText } from '@dorkroom/logic';
import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { LabeledTextField } from '@/components/labeled-text-field';
import { SegmentedControl } from '@/components/segmented-control';
import { useFormState } from '@/hooks/use-form-state';
import { PROCESS_OPTIONS } from '@/lib/film-log-options';
import { addCustomFilm } from '@/lib/film-log-storage';
import type { FilmProcess, FilmStock } from '@/types/film-log';

interface CustomFilmFormProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the newly created stock so the caller can select it. */
  onCreated: (film: FilmStock) => void;
}

/** Bottom-sheet form to add a film stock that isn't in the catalog. */
export function CustomFilmForm({
  visible,
  onClose,
  onCreated,
}: CustomFilmFormProps) {
  const [form, set] = useFormState({
    brand: '',
    name: '',
    iso: '',
    process: 'bw' as FilmProcess,
  });

  const onSave = () => {
    const brand = sanitizeText(form.brand, 60);
    const name = sanitizeText(form.name, 80);
    const iso = Number(form.iso);
    if (!name || !Number.isFinite(iso) || iso <= 0) return;
    const created = addCustomFilm({
      brand: brand || 'Custom',
      name,
      iso,
      process: form.process,
    });
    onCreated(created);
    onClose();
  };

  return (
    <BottomSheet visible={visible} title="Add custom film" onClose={onClose}>
      <View className="gap-4">
        <LabeledTextField
          label="Brand (optional)"
          value={form.brand}
          onChangeText={(v) => set('brand', v)}
          placeholder="e.g. Kodak"
        />
        <LabeledTextField
          label="Name"
          value={form.name}
          onChangeText={(v) => set('name', v)}
          placeholder="e.g. Double-X 5222"
        />
        <LabeledTextField
          label="Box speed (ISO)"
          value={form.iso}
          onChangeText={(v) => set('iso', v)}
          keyboardType="numeric"
          placeholder="250"
        />
        <View className="gap-2">
          <Text className="text-sm text-white/60">Type</Text>
          <SegmentedControl
            options={PROCESS_OPTIONS}
            value={form.process}
            onChange={(v) => set('process', v)}
          />
        </View>

        <Pressable
          onPress={onSave}
          accessibilityRole="button"
          className="items-center rounded-xl bg-rose-600 px-4 py-3"
        >
          <Text className="text-base font-semibold text-white">Add film</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
