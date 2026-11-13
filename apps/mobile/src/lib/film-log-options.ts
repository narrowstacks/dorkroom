// Shared option lists + label helpers for the film-log forms.
import type {
  Camera,
  CameraFormat,
  FilmProcess,
  FilmRoll,
  Shot,
} from '@/schemas/film-log.schema';

/** The lens used on the most recent shot of a roll that recorded one, if any.
 * Used to pre-select the likely lens for the next shot. */
export function lastUsedLensId(shots: readonly Shot[]): string | undefined {
  for (let i = shots.length - 1; i >= 0; i--) {
    const lensId = shots[i]?.lensId;
    if (lensId) return lensId;
  }
  return undefined;
}

/** The place of the most recent shot of a roll that recorded one, if any.
 * Used to pre-fill the next shot's place (a roll is often shot in one spot). */
export function lastUsedPlace(shots: readonly Shot[]): string | undefined {
  for (let i = shots.length - 1; i >= 0; i--) {
    const place = shots[i]?.place?.trim();
    if (place) return place;
  }
  return undefined;
}

/** The frame number a roll's next shot gets: one past the highest so far. */
export function nextFrameNumber(shots: readonly Shot[]): number {
  return shots.reduce((max, shot) => Math.max(max, shot.frameNumber), 0) + 1;
}

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

const PROCESS_LABELS = {
  bw: 'B&W',
  color: 'Color',
  slide: 'Slide',
} satisfies Record<FilmProcess, string>;

export function formatProcess(process: FilmProcess): string {
  return PROCESS_LABELS[process];
}

const FORMAT_LABELS = {
  '35mm': '35mm',
  '120': '120',
  '4x5': '4×5',
  '8x10': '8×10',
  digital: 'Digital',
  other: 'Other',
} satisfies Record<CameraFormat, string>;

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

/** What a roll is called in lists and pickers: its name, else its film. */
export function rollLabel(
  roll: Pick<FilmRoll, 'name' | 'filmStockName'>
): string {
  return roll.name?.trim() ? roll.name : (roll.filmStockName ?? 'Roll');
}

export function shotCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'shot' : 'shots'}`;
}

/** The line under a roll's label: its film (when the label is a name, not the
 * film itself) and how many shots it holds. */
export function rollSubtitle(
  roll: Pick<FilmRoll, 'name' | 'filmStockName' | 'shots'>
): string {
  const film = roll.name?.trim() ? roll.filmStockName : undefined;
  return [film, shotCountLabel(roll.shots.length)].filter(Boolean).join(' · ');
}
