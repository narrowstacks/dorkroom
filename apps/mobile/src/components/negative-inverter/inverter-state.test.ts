import {
  AUTO_BASE_MIN_CONFIDENCE,
  DEFAULT_INVERSION_ADJUSTMENTS,
  type DetectedBase,
  linearToSrgb,
  type Rgb,
  type RgbaImage,
} from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  initialInverterState,
  type InverterAction,
  inverterCoefficients,
  inverterReducer,
  type InverterState,
  inverterStatistics,
  isUnsureBase,
  type PickedSample,
} from './inverter-state';
import { IDENTITY_ORIENTATION } from './orientation';

type Negative = { id: string };
type Action = InverterAction<Negative>;

const size = { width: 300, height: 200 };
const detected: DetectedBase = {
  rgb: [0.7, 0.4, 0.2],
  point: { x: 4, y: 9 },
  confidence: 0.9,
};
const otherDetected: DetectedBase = {
  rgb: [0.6, 0.35, 0.18],
  point: { x: 40, y: 9 },
  confidence: 0.9,
};

function run(actions: Action[], from = initialInverterState<Negative>()) {
  return actions.reduce<InverterState<Negative>>(inverterReducer, from);
}

const load = (autoBase: DetectedBase | null): Action => ({
  type: 'load-success',
  negative: { id: 'a' },
  size,
  autoBase,
});

describe('inverterReducer', () => {
  it('starts on C-41 with the default adjustments', () => {
    const state = initialInverterState<Negative>();
    expect(state.filmType).toBe('c41');
    expect(state.adjustments).toEqual(DEFAULT_INVERSION_ADJUSTMENTS);
  });

  it('shows the positive at once with an automatic base', () => {
    const state = run([{ type: 'load-start' }, load(detected)]);
    expect(state.loading).toBe(false);
    expect(state.crop).toEqual({ x: 0, y: 0, ...size });
    expect(state.base).toEqual({ ...detected, auto: true });
    expect(state.view).toBe('positive');
    expect(state.tool).toBeNull();
    expect(state.generation).toBe(1);
  });

  it('starts from the base carried over from live mode, uncropped', () => {
    const picked = {
      point: { x: 30, y: 25 },
      rgb: [0.7, 0.4, 0.2] as const,
      auto: false,
      confidence: 1,
    };
    const state = run([
      {
        type: 'load-success',
        negative: { id: 'a' },
        size,
        autoBase: detected,
        carried: { base: picked },
      },
    ]);
    expect(state.crop).toEqual({ x: 0, y: 0, ...size });
    expect(state.base).toEqual(picked);
    expect(state.view).toBe('positive');
    expect(state.tool).toBeNull();
  });

  it('asks for a base on the negative when none was found', () => {
    const state = run([load(null)]);
    expect(state.base).toBeNull();
    expect(state.tool).toBe('base');
    expect(state.view).toBe('negative');
  });

  it('re-proposes an automatic base on crop and film type changes', () => {
    const crop = { x: 10, y: 10, width: 100, height: 100 };
    const cropped = run([
      load(detected),
      { type: 'crop', crop, autoBase: otherDetected },
    ]);
    expect(cropped.base?.point).toEqual(otherDetected.point);
    const bw = run(
      [{ type: 'film-type', filmType: 'bw', autoBase: detected }],
      cropped
    );
    expect(bw.base?.point).toEqual(detected.point);
  });

  it('keeps a picked base through crop and film type changes', () => {
    const grey: Rgb = [0.5, 0.5, 0.5];
    const sample = { point: { x: 1, y: 1 }, rgb: grey };
    const state = run([
      load(detected),
      { type: 'tool', tool: 'base' },
      { type: 'base', sample },
      {
        type: 'crop',
        crop: { x: 0, y: 0, width: 50, height: 50 },
        autoBase: otherDetected,
      },
      { type: 'film-type', filmType: 'bw', autoBase: otherDetected },
    ]);
    expect(state.base).toEqual({ ...sample, auto: false, confidence: 1 });
    expect(state.view).toBe('positive');
  });

  it('drops the neutral and the neutral tool for B&W', () => {
    const dark: Rgb = [0.2, 0.2, 0.2];
    const neutral = { point: { x: 5, y: 5 }, rgb: dark };
    const state = run([
      load(detected),
      { type: 'neutral', sample: neutral },
      { type: 'tool', tool: 'neutral' },
      { type: 'film-type', filmType: 'bw', autoBase: detected },
    ]);
    expect(state.neutral).toBeNull();
    expect(state.tool).toBeNull();
  });

  it('switches view with the picker tools', () => {
    const base = run([load(detected), { type: 'tool', tool: 'base' }]);
    expect(base.view).toBe('negative');
    const neutral = run([{ type: 'tool', tool: 'neutral' }], base);
    expect(neutral.view).toBe('positive');
  });

  it('returns to the positive when the base picker is put away', () => {
    const picking = run([load(detected), { type: 'tool', tool: 'base' }]);
    expect(run([{ type: 'tool', tool: null }], picking).view).toBe('positive');
    expect(run([{ type: 'tool', tool: 'crop' }], picking).view).toBe(
      'positive'
    );
  });

  it('stays on the negative without a base to convert with', () => {
    const state = run([load(null), { type: 'tool', tool: null }]);
    expect(state.view).toBe('negative');
  });

  it('resets adjustments and neutral but keeps photo, crop and base', () => {
    const loaded = run([load(detected)]);
    const state = run(
      [
        { type: 'adjust', key: 'exposure', value: 1 },
        {
          type: 'neutral',
          sample: { point: { x: 1, y: 1 }, rgb: [0.1, 0.1, 0.1] },
        },
        { type: 'reset' },
      ],
      loaded
    );
    expect(state.adjustments).toEqual(DEFAULT_INVERSION_ADJUSTMENTS);
    expect(state.neutral).toBeNull();
    expect(state.base).toEqual(loaded.base);
    expect(state.crop).toEqual(loaded.crop);
  });

  it('turns the photo, keeps it through reset, and starts upright', () => {
    const turned = run([
      load(detected),
      { type: 'orient', step: 'rotate-right' },
      { type: 'orient', step: 'flip-horizontal' },
      { type: 'adjust', key: 'exposure', value: 1 },
      { type: 'reset' },
    ]);
    expect(turned.orientation).toEqual({ quarterTurns: 3, mirrored: true });
    // Picks and the crop stay in proxy pixels.
    expect(turned.crop).toEqual({ x: 0, y: 0, ...size });
    expect(turned.base?.point).toEqual(detected.point);
    expect(run([load(detected)], turned).orientation).toEqual(
      IDENTITY_ORIENTATION
    );
    expect(run([{ type: 'unload' }], turned).orientation).toEqual(
      IDENTITY_ORIENTATION
    );
  });

  it('shows the positive while rotating once there is a base', () => {
    const state = run([load(detected), { type: 'tool', tool: 'rotate' }]);
    expect(state.view).toBe('positive');
  });

  it('keeps film type and adjustments across photos', () => {
    const state = run([
      load(detected),
      { type: 'film-type', filmType: 'bw', autoBase: detected },
      { type: 'adjust', key: 'contrast', value: 1.4 },
      { type: 'unload' },
    ]);
    expect(state.negative).toBeNull();
    expect(state.filmType).toBe('bw');
    expect(state.adjustments.contrast).toBe(1.4);
    expect(state.generation).toBe(2);
  });

  it('records a load failure', () => {
    const state = run([
      { type: 'load-start' },
      { type: 'load-failure', error: 'nope' },
    ]);
    expect(state).toMatchObject({ loading: false, error: 'nope' });
  });
});

describe('coefficients', () => {
  // A neutral wedge on an orange-masked negative, rebate on the left.
  const base: Rgb = [0.75, 0.42, 0.2];
  const proxy: RgbaImage = (() => {
    const width = 80;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const density = x < 10 ? 0 : (x - 10) / 50;
        const i = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          data[i + c] = Math.round(
            linearToSrgb(base[c] * 10 ** (-density * (0.55 + 0.07 * c))) * 255
          );
        }
        data[i + 3] = 255;
      }
    }
    return { data, width, height };
  })();
  const crop = { x: 0, y: 0, width: 80, height: 10 };
  const sample = { point: { x: 5, y: 5 }, rgb: base };

  const inputs = (
    neutral: PickedSample | null,
    filmType: 'bw' | 'c41' = 'c41'
  ) => ({
    base: { ...sample, auto: false, confidence: 1 },
    filmType,
    adjustments: DEFAULT_INVERSION_ADJUSTMENTS,
    neutral,
  });

  it('is null until there is a photo, base and crop', () => {
    expect(inverterStatistics(null, sample, 'c41', crop)).toBeNull();
    expect(inverterStatistics(proxy, null, 'c41', crop)).toBeNull();
    expect(inverterCoefficients(null, inputs(null))).toBeNull();
  });

  it('applies a neutral pick without compounding', () => {
    const statistics = inverterStatistics(proxy, sample, 'c41', crop);
    const plain = inverterCoefficients(statistics, inputs(null));
    const brown: Rgb = [0.2, 0.1, 0.06];
    const neutral = { point: { x: 40, y: 5 }, rgb: brown };
    const once = inverterCoefficients(statistics, inputs(neutral));
    expect(plain?.offset).toEqual([0, 0, 0]);
    expect(once?.offset).not.toEqual([0, 0, 0]);
    // Same inputs give the same correction: nothing accumulates.
    expect(inverterCoefficients(statistics, inputs(neutral))).toEqual(once);
    // B&W ignores the neutral.
    const bw = inverterStatistics(proxy, sample, 'bw', crop);
    expect(inverterCoefficients(bw, inputs(neutral, 'bw'))?.offset).toEqual([
      0, 0, 0,
    ]);
  });
});

describe('isUnsureBase', () => {
  const at = (confidence: number, auto = true) => ({
    point: { x: 0, y: 0 },
    rgb: [0.7, 0.4, 0.2] as const,
    auto,
    confidence,
  });

  it('doubts an automatic base below the threshold only', () => {
    expect(isUnsureBase(at(AUTO_BASE_MIN_CONFIDENCE - 0.01))).toBe(true);
    expect(isUnsureBase(at(AUTO_BASE_MIN_CONFIDENCE))).toBe(false);
  });

  it('never doubts a picked base or no base', () => {
    expect(isUnsureBase(at(0, false))).toBe(false);
    expect(isUnsureBase(null)).toBe(false);
  });
});
