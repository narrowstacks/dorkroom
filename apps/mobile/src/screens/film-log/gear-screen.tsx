import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CameraForm } from '@/components/film-log/camera-form';
import { LensForm } from '@/components/film-log/lens-form';
import { GlassCard } from '@/components/glass-card';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { useCameras, useLenses } from '@/hooks/use-film-log';
import { formatCameraFormat } from '@/lib/film-log-options';
import type { Camera, Lens } from '@/types/film-log';

type CameraEdit = { mode: 'new' } | { mode: 'edit'; camera: Camera } | null;
type LensEdit = { mode: 'new' } | { mode: 'edit'; lens: Lens } | null;

export function GearScreen() {
  const cameras = useCameras();
  const lenses = useLenses();
  const [cameraEdit, setCameraEdit] = useState<CameraEdit>(null);
  const [lensEdit, setLensEdit] = useState<LensEdit>(null);

  const cameraName = (id: string | null | undefined) =>
    cameras.find((c) => c.id === id)?.name;

  return (
    <Screen>
      <View className="gap-2">
        <SectionLabel>Cameras</SectionLabel>
        <GlassCard className="gap-2">
          {cameras.length === 0 ? (
            <Text className="text-white/50">No cameras saved yet.</Text>
          ) : (
            cameras.map((camera) => (
              <Pressable
                key={camera.id}
                onPress={() => setCameraEdit({ mode: 'edit', camera })}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${camera.name}`}
                className="flex-row items-center justify-between py-2"
              >
                <View className="flex-1">
                  <Text className="text-base text-white">{camera.name}</Text>
                  <Text className="text-sm text-white/50">
                    {formatCameraFormat(camera.format)}
                    {camera.backs?.length
                      ? ` · ${camera.backs.length} ${camera.backs.length === 1 ? 'back' : 'backs'}`
                      : ''}
                  </Text>
                </View>
                <Text className="text-white/30">›</Text>
              </Pressable>
            ))
          )}
        </GlassCard>
        <Pressable
          onPress={() => setCameraEdit({ mode: 'new' })}
          accessibilityRole="button"
          className="items-center rounded-xl bg-white/10 px-4 py-3"
        >
          <Text className="text-base text-white">+ Add camera</Text>
        </Pressable>
      </View>

      <View className="gap-2">
        <SectionLabel>Lenses</SectionLabel>
        <GlassCard className="gap-2">
          {lenses.length === 0 ? (
            <Text className="text-white/50">No lenses saved yet.</Text>
          ) : (
            lenses.map((lens) => {
              const owner = cameraName(lens.cameraId) ?? 'Any camera';
              const focal =
                lens.focalLength !== undefined
                  ? `${lens.focalLength}mm · `
                  : '';
              return (
                <Pressable
                  key={lens.id}
                  onPress={() => setLensEdit({ mode: 'edit', lens })}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${lens.name}`}
                  className="flex-row items-center justify-between py-2"
                >
                  <View className="flex-1">
                    <Text className="text-base text-white">{lens.name}</Text>
                    <Text className="text-sm text-white/50">
                      {focal}
                      {owner}
                    </Text>
                  </View>
                  <Text className="text-white/30">›</Text>
                </Pressable>
              );
            })
          )}
        </GlassCard>
        <Pressable
          onPress={() => setLensEdit({ mode: 'new' })}
          accessibilityRole="button"
          className="items-center rounded-xl bg-white/10 px-4 py-3"
        >
          <Text className="text-base text-white">+ Add lens</Text>
        </Pressable>
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
