// Pure builder of the "Roll in the camera" widget's props: the roll the Meter
// logs to (`pickMeterRoll`, the same pick as `useMeterRoll` and the Shoot hub's
// card), already formatted for the widget, which cannot format anything itself.
//
// Frames SHOT, not frames left: a roll has no capacity field (a 35mm roll can
// hold 24, 36 or a bulk-loaded count), so "left" would be a guess.
import { rollLabel } from '@/lib/film-log-options';
import { cameraDisplayName } from '@/lib/gear-display';
import { pickMeterRoll } from '@/lib/meter-roll';
import { pushPullLabel } from '@/lib/roll-lifecycle';
import type { Camera, FilmRoll } from '@/schemas/film-log.schema';
import { cutText, type WidgetPalette, widgetPalette } from './widget-palette';

/** Matches the `name` of the widget in app.json's `expo-widgets` entry. */
export const ROLL_WIDGET_NAME = 'RollWidget';

/** Opened when no roll is in a camera: the film log list. */
export const FILM_LOG_URL = 'dorkroom://shoot/film-log';

export const rollUrl = (id: string): string =>
  `${FILM_LOG_URL}/roll/${encodeURIComponent(id)}`;

const MAX_LABEL = 40;
const MAX_CAMERA = 32;

export interface RollWidgetProps {
  /** False: "No roll in the camera", and the link opens the film log. */
  hasRoll: boolean;
  /** The roll's name, else its film. Empty without a roll. */
  label: string;
  /** "EI 800 · Push +1", "EI 400", or empty when the roll has no EI. */
  exposure: string;
  /** The camera's name, or empty when it is gone. */
  camera: string;
  /** "23 frames", "1 frame". Empty without a roll. */
  frames: string;
  frameCount: number;
  url: string;
  palette: WidgetPalette;
}

export function framesLabel(count: number): string {
  return `${count} ${count === 1 ? 'frame' : 'frames'}`;
}

export interface RollWidgetInput {
  rolls: readonly FilmRoll[];
  cameras: readonly Camera[];
  /** The Meter's stored pick (`METER_ROLL_KEY`), if any. */
  meterRollId: string | undefined;
}

export function buildRollWidgetProps(input: RollWidgetInput): RollWidgetProps {
  const palette = widgetPalette('yellow');
  const roll = pickMeterRoll(input.rolls, input.meterRollId);
  if (!roll) {
    return {
      hasRoll: false,
      label: '',
      exposure: '',
      camera: '',
      frames: '',
      frameCount: 0,
      url: FILM_LOG_URL,
      palette,
    };
  }
  const camera = input.cameras.find((c) => c.id === roll.cameraId);
  const exposure = [
    roll.iso !== undefined ? `EI ${roll.iso}` : undefined,
    pushPullLabel(roll.pushPull),
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    hasRoll: true,
    label: cutText(rollLabel(roll), MAX_LABEL),
    exposure,
    camera: camera ? cutText(cameraDisplayName(camera), MAX_CAMERA) : '',
    frames: framesLabel(roll.shots.length),
    frameCount: roll.shots.length,
    url: rollUrl(roll.id),
    palette,
  };
}
