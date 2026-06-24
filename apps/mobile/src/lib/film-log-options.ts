// Shared option lists + label helpers for the film-log forms.
import type { Camera, CameraFormat, FilmProcess } from '@/types/film-log';

export const PROCESS_OPTIONS: { label: string; value: FilmProcess }[] = [
  { label: 'B&W', value: 'bw' },
  { label: 'Color', value: 'color' },
  { label: 'Slide (E-6)', value: 'slide' },
];

export const FORMAT_OPTIONS: { label: string; value: CameraFormat }[] = [
  { label: '35mm', value: '35mm' },
  { label: '120 / 220', value: '120' },
  { label: '4×5', value: '4x5' },
  { label: '8×10', value: '8x10' },
  { label: 'Digital', value: 'digital' },
  { label: 'Other', value: 'other' },
];

export const ROLL_STATUS_OPTIONS: {
  label: string;
  value: 'active' | 'finished' | 'developed';
}[] = [
  { label: 'Active', value: 'active' },
  { label: 'Finished', value: 'finished' },
  { label: 'Developed', value: 'developed' },
];

const PROCESS_LABELS: Record<FilmProcess, string> = {
  bw: 'B&W',
  color: 'Color',
  slide: 'Slide',
};

export function formatProcess(process: FilmProcess): string {
  return PROCESS_LABELS[process];
}

const FORMAT_LABELS: Record<CameraFormat, string> = {
  '35mm': '35mm',
  '120': '120',
  '4x5': '4×5',
  '8x10': '8×10',
  digital: 'Digital',
  other: 'Other',
};

export function formatCameraFormat(format: CameraFormat): string {
  return FORMAT_LABELS[format];
}

/** Sheet/large-format and multi-back bodies track which holder/back a shot used. */
export function cameraUsesBacks(camera: Camera | undefined): boolean {
  if (!camera) return false;
  return (
    (camera.backs?.length ?? 0) > 0 ||
    camera.format === '4x5' ||
    camera.format === '8x10'
  );
}
