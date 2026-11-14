import { describe, expect, it } from 'vitest';
import type { Shot } from '@/schemas/film-log.schema';
import {
  deleteCameraAlert,
  deleteLensAlert,
  framesUsingLens,
  rollsUsingCamera,
} from './gear-delete';

const frame = (lensId?: string, fixedLensName?: string): Shot => ({
  id: `${lensId ?? fixedLensName ?? 'none'}-${Math.random()}`,
  frameNumber: 1,
  lensId,
  fixedLensName,
  source: 'manual',
});

const rolls = [
  { cameraId: 'fm2', shots: [frame('l50'), frame('l50'), frame()] },
  { cameraId: 'fm2', shots: [frame('l35')] },
  { cameraId: 'gw', shots: [frame(undefined, '90mm f/3.5')] },
];

describe('counting what a delete leaves behind', () => {
  it('counts the rolls of a camera and the frames of a lens', () => {
    expect(rollsUsingCamera(rolls, 'fm2')).toBe(2);
    expect(rollsUsingCamera(rolls, 'm6')).toBe(0);
    expect(framesUsingLens(rolls, 'l50')).toBe(2);
    expect(framesUsingLens(rolls, 'l35')).toBe(1);
    expect(framesUsingLens(rolls, 'none')).toBe(0);
  });
});

describe('deleteCameraAlert', () => {
  it('says the rolls stay and show "Unknown camera"', () => {
    expect(deleteCameraAlert('Nikon FM2', 3)).toEqual({
      title: 'Delete camera?',
      message:
        'Nikon FM2 is removed from your cameras. 3 rolls used it. They stay in your film log, and their pages show "Unknown camera".',
    });
    expect(deleteCameraAlert('Nikon FM2', 1).message).toBe(
      'Nikon FM2 is removed from your cameras. 1 roll used it. It stays in your film log, and its page shows "Unknown camera".'
    );
  });

  it('says so when no roll uses it', () => {
    expect(deleteCameraAlert('Leica M6', 0).message).toBe(
      'Leica M6 is removed from your cameras. No rolls use it.'
    );
  });
});

describe('deleteLensAlert', () => {
  it('says the frames stay but lose their lens', () => {
    expect(deleteLensAlert('50mm f1.8', 2)).toEqual({
      title: 'Delete lens?',
      message:
        '50mm f1.8 is removed from your lenses. 2 frames used it. They stay in your film log but no longer show a lens.',
    });
    expect(deleteLensAlert('50mm f1.8', 1).message).toBe(
      '50mm f1.8 is removed from your lenses. 1 frame used it. It stays in your film log but no longer shows a lens.'
    );
    expect(deleteLensAlert('50mm f1.8', 0).message).toBe(
      '50mm f1.8 is removed from your lenses. No frames use it.'
    );
  });
});
