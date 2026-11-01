import { describe, expect, it } from 'vitest';
import {
  fitContain,
  HANDLE_SLOP,
  hitCropHandle,
  imagePointToScreen,
  imageRectToScreen,
  LOUPE_GAP,
  LOUPE_SIZE,
  placeLoupe,
  stageHeight,
  viewDeltaToImage,
} from './stage-geometry';

const image = { width: 2048, height: 1365 };

describe('fitContain', () => {
  it('letterboxes a landscape photo in a square view', () => {
    const box = fitContain(image, { width: 400, height: 400 });
    expect(box.width).toBe(400);
    expect(box.height).toBeCloseTo(266.6, 1);
    expect(box.left).toBe(0);
    expect(box.top).toBeCloseTo((400 - box.height) / 2, 6);
  });

  it('pillarboxes a portrait photo', () => {
    const box = fitContain(
      { width: 1000, height: 2000 },
      { width: 400, height: 400 }
    );
    expect(box).toEqual({ left: 100, top: 0, width: 200, height: 400 });
  });

  it('survives an empty image', () => {
    expect(
      fitContain({ width: 0, height: 0 }, { width: 10, height: 10 })
    ).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });
});

describe('stageHeight', () => {
  it('follows the aspect ratio up to the cap', () => {
    expect(stageHeight({ width: 300, height: 200 }, 390, 600)).toBe(260);
    expect(stageHeight({ width: 200, height: 300 }, 390, 500)).toBe(500);
  });
});

describe('image to screen mapping', () => {
  const box = { left: 10, top: 20, width: 1024, height: 682.5 };

  it('maps rects and points by the fit scale', () => {
    expect(
      imageRectToScreen({ x: 0, y: 0, width: 2048, height: 1365 }, box, image)
    ).toEqual(box);
    expect(imagePointToScreen({ x: 1024, y: 0 }, box, image)).toEqual({
      x: 522,
      y: 20,
    });
  });

  it('turns a drag on screen into image pixels', () => {
    expect(viewDeltaToImage(10, -5, box, image)).toEqual({ x: 20, y: -10 });
    expect(
      viewDeltaToImage(10, 10, { left: 0, top: 0, width: 0, height: 0 }, image)
    ).toEqual({ x: 0, y: 0 });
  });
});

describe('hitCropHandle', () => {
  const crop = { left: 100, top: 100, width: 200, height: 150 };

  it('grabs corners, edges and the middle', () => {
    expect(hitCropHandle({ x: 102, y: 98 }, crop)).toBe('nw');
    expect(hitCropHandle({ x: 305, y: 255 }, crop)).toBe('se');
    expect(hitCropHandle({ x: 200, y: 100 }, crop)).toBe('n');
    expect(hitCropHandle({ x: 300, y: 175 }, crop)).toBe('e');
    expect(hitCropHandle({ x: 200, y: 175 }, crop)).toBe('move');
  });

  it('allows the slop outside the crop, and nothing beyond it', () => {
    expect(hitCropHandle({ x: 100 - HANDLE_SLOP, y: 175 }, crop)).toBe('w');
    expect(
      hitCropHandle({ x: 100 - HANDLE_SLOP - 1, y: 175 }, crop)
    ).toBeNull();
  });

  it('prefers the nearer edge on a crop smaller than the slop', () => {
    const tiny = { left: 100, top: 100, width: 20, height: 20 };
    expect(hitCropHandle({ x: 117, y: 103 }, tiny)).toBe('ne');
  });
});

describe('placeLoupe', () => {
  const view = { width: 390, height: 300 };

  it('floats above the finger', () => {
    const p = placeLoupe({ x: 200, y: 250 }, view);
    expect(p.below).toBe(false);
    expect(p.y).toBe(250 - LOUPE_SIZE / 2 - LOUPE_GAP);
  });

  it('drops below near the top and stays inside the view', () => {
    const p = placeLoupe({ x: 5, y: 40 }, view);
    expect(p.below).toBe(true);
    expect(p.y).toBeGreaterThan(40);
    expect(p.x).toBe(LOUPE_SIZE / 2);
  });
});
