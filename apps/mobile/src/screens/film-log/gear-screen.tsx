import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { CameraForm } from '@/components/film-log/camera-form';
import { LensForm } from '@/components/film-log/lens-form';
import { InsetGroup } from '@/components/inset-group';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { useCameras, useCustomMounts, useLenses } from '@/hooks/use-film-log';
import {
  cameraDetailLine,
  cameraDisplayName,
  lensDetailLine,
  lensDisplayName,
} from '@/lib/gear-display';
import type { Camera, Lens } from '@/schemas/film-log.schema';

type CameraEdit = { mode: 'new' } | { mode: 'edit'; camera: Camera } | null;
type LensEdit = { mode: 'new' } | { mode: 'edit'; lens: Lens } | null;

export function GearScreen() {
  const cameras = useCameras();
  const lenses = useLenses();
  const customMounts = useCustomMounts();
  const [cameraEdit, setCameraEdit] = useState<CameraEdit>(null);
  const [lensEdit, setLensEdit] = useState<LensEdit>(null);

  return (
    <Screen>
      <View className="gap-2">
        <SectionLabel>Cameras</SectionLabel>
        <InsetGroup>
          {cameras.length === 0 ? (
            <Text className="px-4 py-3 text-ink-50">No cameras saved yet.</Text>
          ) : (
            cameras.map((camera) => {
              const name = cameraDisplayName(camera);
              return (
                <Pressable
                  key={camera.id}
                  onPress={() => setCameraEdit({ mode: 'edit', camera })}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${name}`}
                  className="min-h-11 flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-70"
                >
                  <View className="flex-1">
                    <Text className="text-base text-white">{name}</Text>
                    <Text className="text-sm text-ink-50">
                      {cameraDetailLine(camera, customMounts)}
                    </Text>
                  </View>
                  <Text className="text-ink-30">›</Text>
                </Pressable>
              );
            })
          )}
        </InsetGroup>
        <Button
          label="+ Add camera"
          onPress={() => setCameraEdit({ mode: 'new' })}
        />
      </View>

      <View className="gap-2">
        <SectionLabel>Lenses</SectionLabel>
        <InsetGroup>
          {lenses.length === 0 ? (
            <Text className="px-4 py-3 text-ink-50">No lenses saved yet.</Text>
          ) : (
            lenses.map((lens) => {
              const name = lensDisplayName(lens);
              return (
                <Pressable
                  key={lens.id}
                  onPress={() => setLensEdit({ mode: 'edit', lens })}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${name}`}
                  className="min-h-11 flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-70"
                >
                  <View className="flex-1">
                    <Text className="text-base text-white">{name}</Text>
                    <Text className="text-sm text-ink-50">
                      {lensDetailLine(lens, cameras, customMounts)}
                    </Text>
                  </View>
                  <Text className="text-ink-30">›</Text>
                </Pressable>
              );
            })
          )}
        </InsetGroup>
        <Button
          label="+ Add lens"
          onPress={() => setLensEdit({ mode: 'new' })}
        />
      </View>

      {cameraEdit ? (
        <CameraForm
          key={cameraEdit.mode === 'edit' ? cameraEdit.camera.id : 'new-camera'}
          visible
          camera={cameraEdit.mode === 'edit' ? cameraEdit.camera : undefined}
          onClose={() => setCameraEdit(null)}
        />
      ) : null}
      {lensEdit ? (
        <LensForm
          key={lensEdit.mode === 'edit' ? lensEdit.lens.id : 'new-lens'}
          visible
          lens={lensEdit.mode === 'edit' ? lensEdit.lens : undefined}
          onClose={() => setLensEdit(null)}
        />
      ) : null}
    </Screen>
  );
}
