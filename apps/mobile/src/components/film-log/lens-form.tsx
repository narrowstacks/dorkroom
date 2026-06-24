import { sanitizeText } from '@dorkroom/logic';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { SelectField } from '@/components/film-log/select-field';
import { LabeledTextField } from '@/components/labeled-text-field';
import { useCameras } from '@/hooks/use-film-log';
import { useFormState } from '@/hooks/use-form-state';
import { addLens, deleteLens, updateLens } from '@/lib/film-log-storage';
import type { Lens } from '@/types/film-log';

const ANY_CAMERA = '__any__';

interface LensFormProps {
  visible: boolean;
  lens?: Lens;
  onClose: () => void;
}

/** Bottom-sheet create/edit form for a saved lens. */
export function LensForm({ visible, lens, onClose }: LensFormProps) {
  const cameras = useCameras();
  const [form, set] = useFormState({
    name: lens?.name ?? '',
    cameraId: lens?.cameraId ?? ANY_CAMERA,
    focalLength:
      lens?.focalLength !== undefined ? String(lens.focalLength) : '',
    maxAperture:
      lens?.maxAperture !== undefined ? String(lens.maxAperture) : '',
    notes: lens?.notes ?? '',
  });

  const cameraOptions = useMemo(
    () => [
      { label: 'Any camera', value: ANY_CAMERA },
      ...cameras.map((camera) => ({ label: camera.name, value: camera.id })),
    ],
    [cameras]
  );

  const onSave = () => {
    const cleanName = sanitizeText(form.name, 80);
    if (!cleanName) return;
    const focal = Number(form.focalLength);
    const aperture = Number(form.maxAperture);
    const fields = {
      name: cleanName,
      cameraId: form.cameraId === ANY_CAMERA ? null : form.cameraId,
      focalLength: Number.isFinite(focal) && focal > 0 ? focal : undefined,
      maxAperture:
        Number.isFinite(aperture) && aperture > 0 ? aperture : undefined,
      notes: sanitizeText(form.notes, 1000),
    };
    if (lens) {
      updateLens(lens.id, fields);
    } else {
      addLens(fields);
    }
    onClose();
  };

  const onDelete = () => {
    if (lens) deleteLens(lens.id);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      title={lens ? 'Edit lens' : 'Add lens'}
      onClose={onClose}
    >
      <View className="gap-4">
        <LabeledTextField
          label="Name"
          value={form.name}
          onChangeText={(v) => set('name', v)}
          placeholder="e.g. Planar 80mm f/2.8"
        />
        <SelectField
          label="Used on"
          value={form.cameraId}
          options={cameraOptions}
          onChange={(v) => set('cameraId', v)}
        />
        <LabeledTextField
          label="Focal length (mm, optional)"
          value={form.focalLength}
          onChangeText={(v) => set('focalLength', v)}
          keyboardType="numeric"
          placeholder="80"
        />
        <LabeledTextField
          label="Max aperture f/ (optional)"
          value={form.maxAperture}
          onChangeText={(v) => set('maxAperture', v)}
          keyboardType="decimal-pad"
          placeholder="e.g. 2.5 or 1.7"
        />
        <LabeledTextField
          label="Notes (optional)"
          value={form.notes}
          onChangeText={(v) => set('notes', v)}
        />

        <Pressable
          onPress={onSave}
          accessibilityRole="button"
          className="items-center rounded-xl bg-rose-600 px-4 py-3"
        >
          <Text className="text-base font-semibold text-white">
            {lens ? 'Save lens' : 'Add lens'}
          </Text>
        </Pressable>
        {lens ? (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            className="items-center rounded-xl bg-white/10 px-4 py-3"
          >
            <Text className="text-base text-rose-400">Delete lens</Text>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}
