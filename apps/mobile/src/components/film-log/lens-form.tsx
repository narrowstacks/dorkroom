import { parseDecimalInput, sanitizeText } from '@dorkroom/logic';
import { useMemo } from 'react';
import { Alert, Text } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { CommitButton } from '@/components/commit-button';
import { FormSheetBody } from '@/components/film-log/form-sheet-body';
import { GearPickerField } from '@/components/film-log/gear-picker-field';
import {
  brandOptions,
  mountOptions,
} from '@/components/film-log/gear-picker-logic';
import { SelectField } from '@/components/film-log/select-field';
import { usePendingGear } from '@/components/film-log/use-pending-gear';
import { LabeledTextField } from '@/components/labeled-text-field';
import { useCameras, useLenses } from '@/hooks/use-film-log';
import { useFormState } from '@/hooks/use-form-state';
import { camerasForLens } from '@/lib/camera-lenses';
import {
  addLens,
  deleteLens,
  getRolls,
  updateLens,
} from '@/lib/film-log-storage';
import { deleteLensAlert, framesUsingLens } from '@/lib/gear-delete';
import {
  cameraDisplayName,
  fitsLine,
  lensDisplayName,
  mountName,
} from '@/lib/gear-display';
import type { Lens } from '@/schemas/film-log.schema';

const ANY_CAMERA = '__any__';

interface LensFormProps {
  visible: boolean;
  lens?: Lens;
  onClose: () => void;
}

/**
 * Bottom-sheet create/edit form for a saved lens: brand, name, mount (#733),
 * then where it is used. With a mount, the lens is offered on every camera
 * with that mount ("Fits: ..."), and "Also use on" can add one more camera (an
 * adapted lens); with no mount, "Used on" is the single camera, or any camera,
 * exactly as before. Fixed-lens cameras are not offered: they take no lens.
 */
export function LensForm({ visible, lens, onClose }: LensFormProps) {
  const cameras = useCameras();
  const lenses = useLenses();
  const gear = usePendingGear();
  const [form, set] = useFormState({
    brand: lens?.brand,
    mountId: lens?.mountId,
    name: lens?.name ?? '',
    cameraId: lens?.cameraId ?? ANY_CAMERA,
    focalLength:
      lens?.focalLength !== undefined ? String(lens.focalLength) : '',
    maxAperture:
      lens?.maxAperture !== undefined ? String(lens.maxAperture) : '',
    notes: lens?.notes ?? '',
  });

  const brands = useMemo(
    () =>
      brandOptions('lens', gear.customBrands, [
        ...lenses.map((l) => l.brand),
        gear.pendingBrand,
      ]),
    [lenses, gear.customBrands, gear.pendingBrand]
  );
  const mounts = useMemo(() => mountOptions(gear.mounts), [gear.mounts]);
  const fits = useMemo(
    () => camerasForLens({ mountId: form.mountId }, cameras),
    [cameras, form.mountId]
  );

  // A fixed-lens camera takes no lens, so it is not offered, unless this lens
  // is already pinned to it (kept, never dropped).
  const cameraOptions = useMemo(
    () => [
      {
        label: form.mountId ? 'No other camera' : 'Any camera',
        value: ANY_CAMERA,
      },
      ...cameras
        .filter((camera) => !camera.fixedLens || camera.id === lens?.cameraId)
        .map((camera) => ({
          label: cameraDisplayName(camera),
          value: camera.id,
        })),
    ],
    [cameras, form.mountId, lens?.cameraId]
  );

  const onSave = () => {
    const cleanName = sanitizeText(form.name, 80);
    if (!cleanName) return;
    const focal = parseDecimalInput(form.focalLength);
    const aperture = parseDecimalInput(form.maxAperture);
    const fields = {
      // A brand or mount added in this form is stored only now.
      brand: gear.commitBrand(form.brand),
      mountId: gear.commitMount(form.mountId),
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

  // Asks first, like Delete roll; once confirmed it deletes exactly as before.
  const onDelete = () => {
    if (!lens) return;
    const { title, message } = deleteLensAlert(
      lensDisplayName(lens),
      framesUsingLens(getRolls(), lens.id)
    );
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteLens(lens.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <BottomSheet
      visible={visible}
      title={lens ? 'Edit lens' : 'Add lens'}
      onClose={onClose}
      dismissLabel="Cancel"
    >
      <FormSheetBody
        footer={
          <CommitButton
            onPress={onSave}
            label={lens ? 'Save lens' : 'Add lens'}
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
          label="Name"
          value={form.name}
          onChangeText={(v) => set('name', v)}
          placeholder="e.g. 35mm f/2.5 Color Skopar"
        />
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
          placeholder="No mount"
          searchPlaceholder="Search mounts, e.g. L39 or Nikon F"
        />
        {form.mountId ? (
          <>
            <Text className="text-sm text-ink-60">{fitsLine(fits)}</Text>
            <SelectField
              label="Also use on (optional)"
              value={form.cameraId}
              options={cameraOptions}
              onChange={(v) => set('cameraId', v)}
            />
          </>
        ) : (
          <SelectField
            label="Used on"
            value={form.cameraId}
            options={cameraOptions}
            onChange={(v) => set('cameraId', v)}
          />
        )}
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
        {/* At the end of the fields, not pinned: only the commit stays in view. */}
        {lens ? (
          <Button
            label="Delete lens"
            variant="destructive"
            onPress={onDelete}
          />
        ) : null}
      </FormSheetBody>
    </BottomSheet>
  );
}
