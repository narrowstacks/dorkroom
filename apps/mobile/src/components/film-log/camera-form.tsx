import { sanitizeText } from '@dorkroom/logic';
import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { SelectField } from '@/components/film-log/select-field';
import { LabeledTextField } from '@/components/labeled-text-field';
import { useFormState } from '@/hooks/use-form-state';
import { FORMAT_OPTIONS } from '@/lib/film-log-options';
import { addCamera, deleteCamera, updateCamera } from '@/lib/film-log-storage';
import type { Camera, CameraFormat } from '@/types/film-log';

interface CameraFormProps {
  visible: boolean;
  camera?: Camera;
  onClose: () => void;
}

/** Bottom-sheet create/edit form for a saved camera (incl. its holders/backs). */
export function CameraForm({ visible, camera, onClose }: CameraFormProps) {
  const [form, set] = useFormState({
    name: camera?.name ?? '',
    format: (camera?.format ?? '35mm') as CameraFormat,
    backs: camera?.backs ?? [],
    backDraft: '',
    notes: camera?.notes ?? '',
  });

  const addBack = () => {
    const value = sanitizeText(form.backDraft, 40);
    if (!value || form.backs.includes(value)) return;
    set('backs', [...form.backs, value]);
    set('backDraft', '');
  };

  const onSave = () => {
    const cleanName = sanitizeText(form.name, 80);
    if (!cleanName) return;
    const fields = {
      name: cleanName,
      format: form.format,
      backs: form.backs.length > 0 ? form.backs : undefined,
      notes: sanitizeText(form.notes, 1000),
    };
    if (camera) {
      updateCamera(camera.id, fields);
    } else {
      addCamera(fields);
    }
    onClose();
  };

  const onDelete = () => {
    if (camera) deleteCamera(camera.id);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      title={camera ? 'Edit camera' : 'Add camera'}
      onClose={onClose}
    >
      <View className="gap-4">
        <LabeledTextField
          label="Name"
          value={form.name}
          onChangeText={(v) => set('name', v)}
          placeholder="e.g. Hasselblad 500C/M"
        />
        <SelectField
          label="Format"
          value={form.format}
          options={FORMAT_OPTIONS}
          onChange={(v) => set('format', v)}
        />

        <View className="gap-2">
          <Text className="text-sm text-white/60">
            Holders / backs (optional)
          </Text>
          {form.backs.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {form.backs.map((back) => (
                <Pressable
                  key={back}
                  onPress={() =>
                    set(
                      'backs',
                      form.backs.filter((b) => b !== back)
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${back}`}
                  className="flex-row items-center gap-1 rounded-full bg-white/10 px-3 py-1.5"
                >
                  <Text className="text-white">{back}</Text>
                  <Text className="text-white/40">×</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <LabeledTextField
                label=""
                value={form.backDraft}
                onChangeText={(v) => set('backDraft', v)}
                placeholder="e.g. A12 #1 or Holder 3"
              />
            </View>
            <Pressable
              onPress={addBack}
              accessibilityRole="button"
              accessibilityLabel="Add holder"
              className="self-end rounded-xl bg-white/10 px-4 py-3"
            >
              <Text className="text-base text-white">Add</Text>
            </Pressable>
          </View>
        </View>

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
            {camera ? 'Save camera' : 'Add camera'}
          </Text>
        </Pressable>
        {camera ? (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            className="items-center rounded-xl bg-white/10 px-4 py-3"
          >
            <Text className="text-base text-rose-400">Delete camera</Text>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}
