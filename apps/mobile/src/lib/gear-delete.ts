// The confirmations before Delete camera and Delete lens (#733): what happens
// to the film log, counted. Pure, tested in `gear-delete.test.ts`.
import type { FilmRoll } from '@/schemas/film-log.schema';

type Rolls = readonly Pick<FilmRoll, 'cameraId' | 'shots'>[];

/** How many rolls were loaded in the camera. */
export function rollsUsingCamera(rolls: Rolls, cameraId: string): number {
  return rolls.filter((roll) => roll.cameraId === cameraId).length;
}

/** How many frames record the lens (by its id; a fixed-lens snapshot never
 * counts, it does not depend on a saved lens). */
export function framesUsingLens(rolls: Rolls, lensId: string): number {
  return rolls.reduce(
    (sum, roll) =>
      sum + roll.shots.filter((shot) => shot.lensId === lensId).length,
    0
  );
}

export interface DeleteAlertText {
  title: string;
  message: string;
}

/** Deleting a camera keeps its rolls: their pages and exports then say
 * "Unknown camera" (the roll list leaves the camera out). */
export function deleteCameraAlert(
  cameraName: string,
  rollCount: number
): DeleteAlertText {
  const lead = `${cameraName} is removed from your cameras.`;
  return {
    title: 'Delete camera?',
    message:
      rollCount === 0
        ? `${lead} No rolls use it.`
        : rollCount === 1
          ? `${lead} 1 roll used it. It stays in your film log, and its page shows "Unknown camera".`
          : `${lead} ${rollCount} rolls used it. They stay in your film log, and their pages show "Unknown camera".`,
  };
}

/** Deleting a lens keeps its frames, which then show no lens. */
export function deleteLensAlert(
  lensName: string,
  frameCount: number
): DeleteAlertText {
  const lead = `${lensName} is removed from your lenses.`;
  return {
    title: 'Delete lens?',
    message:
      frameCount === 0
        ? `${lead} No frames use it.`
        : frameCount === 1
          ? `${lead} 1 frame used it. It stays in your film log but no longer shows a lens.`
          : `${lead} ${frameCount} frames used it. They stay in your film log but no longer show a lens.`,
  };
}
