import { parseDecimalInput, sanitizeText } from '@dorkroom/logic';
import { useMemo } from 'react';
import {
  Alert,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { CommitButton } from '@/components/commit-button';
import { FormSheetBody } from '@/components/film-log/form-sheet-body';
import { stacksLensKind } from '@/components/film-log/form-sheet-layout';
import { GearPickerField } from '@/components/film-log/gear-picker-field';
import {
  brandOptions,
  mountOptions,
} from '@/components/film-log/gear-picker-logic';
import { SelectField } from '@/components/film-log/select-field';
import { usePendingGear } from '@/components/film-log/use-pending-gear';
import { LabeledTextField } from '@/components/labeled-text-field';
import { SegmentedControl } from '@/components/segmented-control';
import { useCameras } from '@/hooks/use-film-log';
import { useFormState } from '@/hooks/use-form-state';
import { FORMAT_OPTIONS } from '@/lib/film-log-options';
import {
  addCamera,
  deleteCamera,
  getRolls,
  updateCamera,
} from '@/lib/film-log-storage';
import { deleteCameraAlert, rollsUsingCamera } from '@/lib/gear-delete';
import { cameraDisplayName, mountName } from '@/lib/gear-display';
import type { Camera } from '@/schemas/film-log.schema';

type LensKind = 'interchangeable' | 'fixed';

const LENS_KIND_OPTIONS: { label: string; value: LensKind }[] = [
  { label: 'Interchangeable lenses', value: 'interchangeable' },
  { label: 'Fixed lens', value: 'fixed' },
];

const lensKindOf = (camera: Camera | undefined): LensKind =>
  camera?.fixedLens ? 'fixed' : 'interchangeable';

/** The text of an optional number field. */
const numberText = (value: number | undefined) =>
  value === undefined ? '' : String(value);

/** A positive number from a field, else undefined. */
function positiveNumber(text: string): number | undefined {
  const value = parseDecimalInput(text);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

interface CameraFormProps {
  visible: boolean;
  camera?: Camera;
  onClose: () => void;
}

/**
 * Bottom-sheet create/edit form for a saved camera: brand, model, then either
 * a lens mount or a fixed lens (#733), format, holders/backs and notes. A
 * camera with neither (saved before #733) opens on "Interchangeable lenses"
 * with no mount, and saving it unchanged writes no new field.
 */
export function CameraForm({ visible, camera, onClose }: CameraFormProps) {
  const cameras = useCameras();
  const gear = usePendingGear();
  const { fontScale } = useWindowDimensions();
  const [form, set] = useFormState({
    brand: camera?.brand,
    name: camera?.name ?? '',
    lensKind: lensKindOf(camera),
    mountId: camera?.mountId,
    fixedName: camera?.fixedLens?.name ?? '',
    fixedFocalLength: numberText(camera?.fixedLens?.focalLength),
    fixedMaxAperture: numberText(camera?.fixedLens?.maxAperture),
    format: camera?.format ?? '35mm',
    backs: camera?.backs ?? [],
    backDraft: '',
    notes: camera?.notes ?? '',
  });

  // Brands already on a camera are offered too (an imported one, say).
  const brands = useMemo(
    () =>
      brandOptions('camera', gear.customBrands, [
        ...cameras.map((c) => c.brand),
        gear.pendingBrand,
      ]),
    [cameras, gear.customBrands, gear.pendingBrand]
  );
  const mounts = useMemo(() => mountOptions(gear.mounts), [gear.mounts]);

  const addBack = () => {
    const value = sanitizeText(form.backDraft, 40);
    if (!value || form.backs.includes(value)) return;
    set('backs', [...form.backs, value]);
    set('backDraft', '');
  };

  const onSave = () => {
    const cleanName = sanitizeText(form.name, 80);
    if (!cleanName) return;
    const fixed = form.lensKind === 'fixed';
    const fixedName = sanitizeText(form.fixedName, 80);
    const fields = {
      name: cleanName,
      format: form.format,
      backs: form.backs.length > 0 ? form.backs : undefined,
      notes: sanitizeText(form.notes, 1000),
      // A brand or mount added in this form is stored only now.
      brand: gear.commitBrand(form.brand),
      // A mount or a fixed lens, never both. Frames already logged keep the
      // lens they recorded either way.
      mountId: fixed ? undefined : gear.commitMount(form.mountId),
      fixedLens: fixed
        ? {
            // Keeps keys a newer build stored on the lens.
            ...camera?.fixedLens,
            name: fixedName || undefined,
            focalLength: positiveNumber(form.fixedFocalLength),
            maxAperture: positiveNumber(form.fixedMaxAperture),
          }
        : undefined,
    };
    if (camera) {
      updateCamera(camera.id, fields);
    } else {
      addCamera(fields);
    }
    onClose();
  };

  // Asks first, like Delete roll; once confirmed it deletes exactly as before.
  const onDelete = () => {
    if (!camera) return;
    const { title, message } = deleteCameraAlert(
      cameraDisplayName(camera),
      rollsUsingCamera(getRolls(), camera.id)
    );
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteCamera(camera.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <BottomSheet
      visible={visible}
      title={camera ? 'Edit camera' : 'Add camera'}
      onClose={onClose}
      dismissLabel="Cancel"
    >
      <FormSheetBody
        footer={
          <CommitButton
            onPress={onSave}
            label={camera ? 'Save camera' : 'Add camera'}
          />
        }
      >
        <GearPickerField
          label="Brand"
          value={form.brand}
          valueLabel={form.brand}
          options={brands}
          onChange={(v) => set('brand', v)}
          onAdd={gear.addBrand}
          noneLabel="No brand"
          placeholder="Choose a brand"
          searchPlaceholder="Search brands"
        />
        <LabeledTextField
          label="Model"
          value={form.name}
          onChangeText={(v) => set('name', v)}
          placeholder="e.g. Bessa R or 500C/M"
        />
        <SegmentedControl
          options={LENS_KIND_OPTIONS}
          value={form.lensKind}
          onChange={(v) => set('lensKind', v)}
          accessibilityLabel="Lens"
          stacked={stacksLensKind(fontScale)}
        />
        {form.lensKind === 'interchangeable' ? (
          <GearPickerField
            label="Lens mount"
            value={form.mountId}
            valueLabel={
              form.mountId ? mountName(form.mountId, gear.mounts) : undefined
            }
            options={mounts}
            onChange={(v) => set('mountId', v)}
            onAdd={gear.addMount}
            noneLabel="No mount"
            placeholder="Choose a mount"
            searchPlaceholder="Search mounts, e.g. L39 or Nikon F"
          />
        ) : (
          <>
            <LabeledTextField
              label="Focal length (mm, optional)"
              value={form.fixedFocalLength}
              onChangeText={(v) => set('fixedFocalLength', v)}
              keyboardType="decimal-pad"
              placeholder="90"
            />
            <LabeledTextField
              label="Max aperture f/ (optional)"
              value={form.fixedMaxAperture}
              onChangeText={(v) => set('fixedMaxAperture', v)}
              keyboardType="decimal-pad"
              placeholder="3.5"
            />
            <LabeledTextField
              label="Lens name (optional)"
              value={form.fixedName}
              onChangeText={(v) => set('fixedName', v)}
              placeholder="e.g. EBC Fujinon"
            />
          </>
        )}
        <SelectField
          label="Format"
          value={form.format}
          options={FORMAT_OPTIONS}
          onChange={(v) => set('format', v)}
        />

        <View className="gap-2">
          <Text className="text-sm text-ink-60">
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
                  className="flex-row items-center gap-1 rounded-full border-hw border-line bg-surface px-3 py-1.5"
                >
                  <Text className="text-white">{back}</Text>
                  <Text className="text-ink-40">×</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <LabeledTextField
                label=""
                accessibilityLabel="New holder"
                value={form.backDraft}
                onChangeText={(v) => set('backDraft', v)}
                placeholder="e.g. A12 #1 or Holder 3"
              />
            </View>
            <Button
              label="Add"
              onPress={addBack}
              accessibilityLabel="Add holder"
              className="self-end"
            />
          </View>
        </View>

        <LabeledTextField
          label="Notes (optional)"
          value={form.notes}
          onChangeText={(v) => set('notes', v)}
        />
        {/* At the end of the fields, not pinned: only the commit stays in view. */}
        {camera ? (
          <Button
            label="Delete camera"
            variant="destructive"
            onPress={onDelete}
          />
        ) : null}
      </FormSheetBody>
    </BottomSheet>
  );
}
