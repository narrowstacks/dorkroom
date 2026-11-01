import { formatMegapixels, type PixelRect } from '@dorkroom/logic';
import { Alert, Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { SectionLabel } from '@/components/section-label';
import { SegmentedControl } from '@/components/segmented-control';
import {
  cropToSource,
  type ExportFormat,
  planCroppedExport,
} from './export-plan';
import { LIGHT_TABLE_TIPS } from './light-table-tips';
import type { Orientation } from './orientation';

export interface ExportSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Full-resolution size of the photo. */
  size: { width: number; height: number };
  /** Size of the proxy the crop is in. */
  proxy: { width: number; height: number };
  /** The crop, which is what exports, in proxy pixels. */
  crop: PixelRect;
  orientation: Orientation;
  format: ExportFormat;
  onFormat: (format: ExportFormat) => void;
  /** Close the photo and forget its session. */
  onDiscard: () => void;
  /** An export is running from the photo: it cannot be closed yet. */
  exporting: boolean;
}

/**
 * The editor's secondary information, out of the photo's way: the export
 * format and size, and the light-table tips.
 */
export function ExportSheet({
  visible,
  onClose,
  size,
  proxy,
  crop,
  orientation,
  format,
  onFormat,
  onDiscard,
  exporting,
}: ExportSheetProps) {
  // The file is the crop, turned as shown.
  const plan = planCroppedExport(cropToSource(crop, proxy, size), orientation);
  const output = { ...plan.output, downscaled: plan.downscaled };
  return (
    <BottomSheet
      visible={visible}
      title="Photo, export and tips"
      onClose={onClose}
    >
      <View className="gap-5">
        <View className="gap-2">
          <SectionLabel>File format</SectionLabel>
          <SegmentedControl
            options={[
              { label: 'JPEG', value: 'jpeg' as const },
              { label: 'PNG', value: 'png' as const },
            ]}
            value={format}
            onChange={onFormat}
            accessibilityLabel="File format"
          />
          <Text className="text-sm text-white/70">
            {output.downscaled
              ? `Scaled to ${formatMegapixels(output)} (${output.width} x ${output.height}), the largest this phone can export.`
              : `Full resolution, ${formatMegapixels(output)} (${output.width} x ${output.height}).`}
            {' The crop is what exports.'}
          </Text>
        </View>
        <View className="gap-2">
          <SectionLabel>Light table tips</SectionLabel>
          {LIGHT_TABLE_TIPS.map((tip) => (
            <Text key={tip} className="text-sm text-white/80">
              {`• ${tip}`}
            </Text>
          ))}
        </View>
        <Pressable
          onPress={() =>
            Alert.alert(
              'Close this photo?',
              'Its crop, base and adjustments are forgotten. Saved and shared photos are not affected.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Close Photo',
                  style: 'destructive',
                  onPress: onDiscard,
                },
              ]
            )
          }
          disabled={exporting}
          accessibilityRole="button"
          accessibilityHint="Forgets this photo's edits"
          accessibilityState={{ disabled: exporting }}
          className="min-h-11 items-center justify-center rounded-xl bg-white/10 active:opacity-70"
        >
          <Text
            className={`font-semibold ${exporting ? 'text-rose-400/40' : 'text-rose-400'}`}
          >
            Close Photo
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
