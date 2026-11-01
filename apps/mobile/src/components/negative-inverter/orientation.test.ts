import { describe, expect, it } from 'vitest';
import {
  applyMatrix,
  describeOrientation,
  frameMatrix,
  frameSize,
  frameToScreenMatrix,
  fromFrame,
  IDENTITY_ORIENTATION,
  inFrame,
  isIdentity,
  orient,
  type Orientation,
  orientationMatrix,
  type OrientationStep,
  orientedSize,
  orientPoint,
  orientRect,
  rectFromFrame,
  rectToFrame,
  toFrame,
  unorientPoint,
  unorientRect,
  type ViewFrame,
} from './orientation';

const size = { width: 300, height: 200 };
const ALL: Orientation[] = ([0, 1, 2, 3] as const).flatMap((quarterTurns) =>
  [false, true].map((mirrored) => ({ quarterTurns, mirrored }))
);
const STEPS: OrientationStep[] = [
  'rotate-left',
  'rotate-right',
  'flip-horizontal',
  'flip-vertical',
];
const point = { x: 40, y: 30 };

describe('orientPoint and unorientPoint', () => {
  it.each(ALL)('round-trips a point (%o)', (o) => {
    const there = orientPoint(point, size, o);
    expect(unorientPoint(there, size, o)).toEqual(point);
  });

  it.each(ALL)('keeps the photo inside its oriented size (%o)', (o) => {
    const out = orientedSize(size, o);
    for (const corner of [
      { x: 0, y: 0 },
      { x: size.width, y: size.height },
    ]) {
      const p = orientPoint(corner, size, o);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(out.width);
      expect(p.y).toBeLessThanOrEqual(out.height);
    }
  });

  it('turns clockwise and mirrors left to right', () => {
    const right = { quarterTurns: 1, mirrored: false } as const;
    // The top-left corner goes to the top-right of the turned photo.
    expect(orientPoint({ x: 0, y: 0 }, size, right)).toEqual({
      x: 200,
      y: 0,
    });
    expect(
      orientPoint({ x: 0, y: 0 }, size, { quarterTurns: 0, mirrored: true })
    ).toEqual({ x: 300, y: 0 });
  });
});

describe('orientRect and unorientRect', () => {
  const rect = { x: 10, y: 20, width: 100, height: 50 };
  it.each(ALL)('round-trips a rectangle (%o)', (o) => {
    expect(unorientRect(orientRect(rect, size, o), size, o)).toEqual(rect);
  });

  it.each(ALL)('swaps width and height on odd turns (%o)', (o) => {
    const r = orientRect(rect, size, o);
    expect([r.width, r.height]).toEqual(
      o.quarterTurns % 2 ? [50, 100] : [100, 50]
    );
  });
});

describe('orient', () => {
  // A step on the orientation must act on the picture as shown.
  const shown = (o: Orientation) => orientPoint(point, size, o);
  const viewOf = (o: Orientation) => orientedSize(size, o);

  it.each(ALL)('rotates right as shown (%o)', (o) => {
    const before = shown(o);
    const { height } = viewOf(o);
    expect(shown(orient(o, 'rotate-right'))).toEqual({
      x: height - before.y,
      y: before.x,
    });
  });

  it.each(ALL)('flips horizontally as shown (%o)', (o) => {
    const before = shown(o);
    expect(shown(orient(o, 'flip-horizontal'))).toEqual({
      x: viewOf(o).width - before.x,
      y: before.y,
    });
  });

  it.each(ALL)('flips vertically as shown (%o)', (o) => {
    const before = shown(o);
    expect(shown(orient(o, 'flip-vertical'))).toEqual({
      x: before.x,
      y: viewOf(o).height - before.y,
    });
  });

  it.each(ALL)('undoes each step with its opposite (%o)', (o) => {
    expect(orient(orient(o, 'rotate-left'), 'rotate-right')).toEqual(o);
    expect(orient(orient(o, 'flip-horizontal'), 'flip-horizontal')).toEqual(o);
    expect(orient(orient(o, 'flip-vertical'), 'flip-vertical')).toEqual(o);
  });

  it('reaches every orientation from upright', () => {
    const seen = new Set<string>();
    let frontier = [IDENTITY_ORIENTATION];
    while (frontier.length) {
      const next: Orientation[] = [];
      for (const o of frontier) {
        const key = JSON.stringify(o);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(...STEPS.map((s) => orient(o, s)));
      }
      frontier = next;
    }
    expect(seen.size).toBe(8);
  });

  it('knows upright', () => {
    expect(isIdentity(IDENTITY_ORIENTATION)).toBe(true);
    expect(isIdentity(orient(IDENTITY_ORIENTATION, 'flip-vertical'))).toBe(
      false
    );
  });
});

describe('orientationMatrix', () => {
  it.each(ALL)('agrees with orientPoint (%o)', (o) => {
    const m = orientationMatrix(size, o);
    expect(applyMatrix(m, point)).toEqual(orientPoint(point, size, o));
    expect(m.slice(6)).toEqual([0, 0, 1]);
  });
});

describe('view frames: crop, then orientation', () => {
  const crop = { x: 50, y: 40, width: 120, height: 80 };
  const frames: ViewFrame[] = ALL.map((orientation) => ({
    region: crop,
    orientation,
  }));

  it.each(frames)('sizes the frame as the oriented crop (%o)', (f) => {
    expect(frameSize(f)).toEqual(
      f.orientation.quarterTurns % 2
        ? { width: 80, height: 120 }
        : { width: 120, height: 80 }
    );
  });

  it.each(frames)('round-trips a pick inside the crop (%o)', (f) => {
    const pick = { x: 60, y: 100 };
    expect(fromFrame(toFrame(pick, f), f)).toEqual(pick);
  });

  it.each(frames)('maps the crop onto the whole frame (%o)', (f) => {
    const { width, height } = frameSize(f);
    expect(rectToFrame(crop, f)).toEqual({ x: 0, y: 0, width, height });
    expect(rectFromFrame({ x: 0, y: 0, width, height }, f)).toEqual(crop);
  });

  it.each(frames)('has a matrix that agrees with toFrame (%o)', (f) => {
    const pick = { x: 70, y: 55 };
    expect(applyMatrix(frameMatrix(f), pick)).toEqual(toFrame(pick, f));
  });

  it.each(frames)('draws the crop into its screen box (%o)', (f) => {
    const shown = frameSize(f);
    const box = { left: 10, top: 20, width: shown.width * 2 };
    const m = frameToScreenMatrix(f, box);
    const pick = { x: 70, y: 55 };
    const v = toFrame(pick, f);
    expect(applyMatrix(m, pick)).toEqual({
      x: 10 + v.x * 2,
      y: 20 + v.y * 2,
    });
  });

  it('tells picks inside the crop from those outside', () => {
    const f = frames[0];
    expect(inFrame({ x: 60, y: 50 }, f)).toBe(true);
    expect(inFrame({ x: 10, y: 50 }, f)).toBe(false);
  });
});

describe('describeOrientation', () => {
  it('reads well', () => {
    expect(describeOrientation(IDENTITY_ORIENTATION)).toBe('Upright');
    expect(describeOrientation({ quarterTurns: 1, mirrored: false })).toBe(
      'Turned 90 degrees right'
    );
    expect(describeOrientation({ quarterTurns: 2, mirrored: true })).toBe(
      'Mirrored and turned 180 degrees right'
    );
    expect(describeOrientation({ quarterTurns: 0, mirrored: true })).toBe(
      'Mirrored'
    );
  });
});
