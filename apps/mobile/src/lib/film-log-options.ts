// Shared option lists + label helpers for the film-log forms.
import type {
  Camera,
  CameraFormat,
  FilmProcess,
  FilmRoll,
  RollStatus,
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

/**
 * The one place a roll's status is put into words. The stored values predate
 * the phases: `active` is a roll in the camera (Loaded), `finished` is Shot
 * and waiting for the tank, `developed` is Developed. Printing is not a
 * status (see `roll-lifecycle.ts`).
 */
export const ROLL_STATUS_OPTIONS: {
  label: string;
  value: RollStatus;
}[] = [
  { label: 'In camera', value: 'active' },
  { label: 'Shot', value: 'finished' },
  { label: 'Developed', value: 'developed' },
];

/** The status word shown for a roll, from {@link ROLL_STATUS_OPTIONS}. */
export function rollStatusLabel(status: RollStatus): string {
  return (
    ROLL_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

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

/** "1 frame", "24 frames": the word the Film Log, roll page, hubs and Save to
 * roll use. */
export function frameCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'frame' : 'frames'}`;
}

/** Joins a short fact's words with no-break spaces, so a wrapping line breaks
 * between facts and never inside one ("2 / frames"). Display strings only. */
export function keepTogether(text: string): string {
  return text.replace(/ /g, '\u00a0');
}

/** `frameCountLabel` for a line that can wrap: "24 frames" never breaks. */
export function frameCountDisplay(count: number): string {
  return keepTogether(frameCountLabel(count));
}

/**
 * Joins the facts of a detail line with " · ", each separator bound to the fact
 * after it by a no-break space, so a wrap starts the next line with the dot
 * and never leaves one dangling at a line end. Display strings only: run the
 * result through `spokenText` for an accessibility label.
 */
export function joinFacts(
  facts: readonly (string | undefined | false)[]
): string {
  return facts
    .filter((fact): fact is string => Boolean(fact))
    .map((fact, index) => (index === 0 ? fact : `\u00b7\u00a0${fact}`))
    .join(' ');
}

/** A display string as plain words for VoiceOver: no-break spaces become
 * spaces, so "A ·\u00a0B" reads "A · B". */
export function spokenText(display: string): string {
  return display.replace(/\u00a0/g, ' ');
}

/** The line under a roll's label: its film (when the label is a name, not the
 * film itself) and how many frames it holds. A display string. */
export function rollSubtitle(
  roll: Pick<FilmRoll, 'name' | 'filmStockName' | 'shots'>
): string {
  const film = roll.name?.trim() ? roll.filmStockName : undefined;
  return joinFacts([film, frameCountDisplay(roll.shots.length)]);
}
