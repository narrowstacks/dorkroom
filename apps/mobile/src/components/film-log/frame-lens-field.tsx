import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { SelectField } from '@/components/film-log/select-field';
import { useLenses } from '@/hooks/use-film-log';
import { type CameraLenses, lensChoices } from '@/lib/camera-lenses';
import type { Shot } from '@/schemas/film-log.schema';

interface FrameLensFieldProps {
  cameraLenses: CameraLenses;
  /** The frame being edited, so the lens it records is offered even when its
   * camera no longer offers it. */
  existing: Pick<Shot, 'lensId' | 'fixedLensName'> | undefined;
  /** A lens choice (`camera-lenses.ts`), not always a saved lens's id. */
  value: string | undefined;
  onChange: (value: string) => void;
}

/** The shot form's Lens field: the camera's lenses from `lensesForCamera`,
 * or its fixed lens as the only choice (#733). */
export function FrameLensField({
  cameraLenses,
  existing,
  value,
  onChange,
}: FrameLensFieldProps) {
  const allLenses = useLenses();
  const options = useMemo(
    () =>
      lensChoices(cameraLenses, allLenses, existing).map((lens) => ({
        label: lens.name,
        value: lens.id,
      })),
    [cameraLenses, allLenses, existing]
  );

  if (options.length === 0) {
    return (
      <View className="gap-1">
        <Text className="text-sm text-ink-60">Lens</Text>
        <View className="rounded-xl border-hw border-line bg-surface-dim px-4 py-3">
          <Text className="text-sm text-ink-40">
            No saved lenses. Add one under Cameras & lenses.
          </Text>
        </View>
      </View>
    );
  }
  return (
    <SelectField
      label="Lens"
      value={value}
      options={options}
      onChange={onChange}
      placeholder="Select a lens"
    />
  );
}
