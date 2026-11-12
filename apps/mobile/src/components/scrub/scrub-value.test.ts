import { describe, expect, it } from 'vitest';
import {
  adaptiveFocalStep,
  adaptiveTimeStep,
  decimalsOf,
  directedSteps,
  effectiveDx,
  formatScrubbed,
  resolveScrubStart,
  SCRUB_PX_PER_STEP,
  SCRUB_SLOP,
  scrubbedText,
  scrubOutcome,
  stepsFromTranslation,
} from './scrub-value';

const wide = { min: -1000, max: 1000 };
const two = (n: number) => String(Number(n.toFixed(2)));
const third = 1 / 3;

describe('scrubOutcome', () => {
  it('lands on an off-grid bound first when entering the range from outside', () => {
    const up = scrubOutcome({
      start: 0.01,
      steps: 1,
      step: 0.25,
      min: 0.1,
      max: 9,
    });
    expect(up.value).toBe(0.1);
    expect(up.applied).toBe(1);
    const down = scrubOutcome({
      start: 99,
      steps: -1,
      step: 0.25,
      min: 0.1,
      max: 9.1,
    });
    expect(down.value).toBe(9.1);
    expect(
      scrubOutcome({ start: 0.01, steps: -1, step: 0.25, min: 0.1, max: 9 })
        .moved
    ).toBe(false);
  });

  it('moves one whole step per step from an on-grid start', () => {
    expect(SCRUB_PX_PER_STEP).toBe(10);
    expect(scrubOutcome({ start: 5, steps: 1, step: 0.5, ...wide }).value).toBe(
      5.5
    );
    expect(scrubOutcome({ start: 5, steps: 3, step: 0.5, ...wide }).value).toBe(
      6.5
    );
    expect(scrubOutcome({ start: 5, steps: -2, step: 1, ...wide }).value).toBe(
      3
    );
    expect(
      scrubOutcome({ start: 1, steps: -5, step: 0.5, ...wide }).value
    ).toBe(-1.5);
  });

  it('clamps at both ends', () => {
    const b = { step: 1, min: 0.1, max: 9 };
    expect(scrubOutcome({ start: 1, steps: -50, ...b }).value).toBe(0.1);
    expect(scrubOutcome({ start: 8, steps: 50, ...b }).value).toBe(9);
  });

  it('does not accumulate float drift over many 0.1 steps', () => {
    expect(
      scrubOutcome({ start: 0, steps: 30, step: 0.1, ...wide }).value
    ).toBe(3);
    expect(
      scrubOutcome({ start: 0.1, steps: 2, step: 0.1, ...wide }).value
    ).toBe(0.3);
  });

  it('walks thirds without drift', () => {
    const v = scrubOutcome({ start: 0, steps: 3, step: third, ...wide }).value;
    expect(v).toBeCloseTo(1, 8);
  });

  it('treats a stored 0.33 as the third it stands for', () => {
    expect(
      two(scrubOutcome({ start: 0.33, steps: 1, step: third, ...wide }).value)
    ).toBe('0.67');
    expect(
      two(scrubOutcome({ start: 0.67, steps: -1, step: third, ...wide }).value)
    ).toBe('0.33');
  });

  it('goes to the next grid point first from an off-grid start', () => {
    const up = scrubOutcome({ start: 0.5, steps: 1, step: third, ...wide });
    const down = scrubOutcome({ start: 0.5, steps: -1, step: third, ...wide });
    expect(two(up.value)).toBe('0.67');
    expect(two(down.value)).toBe('0.33');
    expect(
      scrubOutcome({ start: 12.3, steps: 1, step: 0.5, ...wide }).value
    ).toBe(12.5);
    expect(
      scrubOutcome({ start: 12.3, steps: -1, step: 0.5, ...wide }).value
    ).toBe(12);
    expect(
      two(scrubOutcome({ start: 1.17, steps: 1, step: third, ...wide }).value)
    ).toBe('1.33');
  });

  it('takes whole steps after the first grid point', () => {
    expect(
      scrubOutcome({ start: 12.3, steps: 3, step: 0.5, ...wide }).value
    ).toBe(13.5);
  });

  it('never moves against the direction of travel', () => {
    const lens = { step: 1, min: 1, max: 2000 };
    const lowered = scrubOutcome({ start: 0.5, steps: -3, ...lens });
    expect(lowered.value).toBe(0.5);
    expect(lowered.moved).toBe(false);
    const raised = scrubOutcome({ start: 3000, steps: 2, ...lens });
    expect(raised.value).toBe(3000);
    expect(raised.moved).toBe(false);
    expect(scrubOutcome({ start: 0.5, steps: 1, ...lens }).value).toBe(1);
  });

  it('formats with the step alone when nothing is clamped', () => {
    const out = scrubOutcome({
      start: 60,
      steps: 1,
      step: 1,
      min: 0.1,
      max: 3600,
    });
    expect(out.value).toBe(61);
    expect(formatScrubbed(out.value, out.formatStep)).toBe('61');
  });

  it('adds the bound decimals only when clamped to that bound', () => {
    const out = scrubOutcome({
      start: 2,
      steps: -9,
      step: 1,
      min: 0.1,
      max: 3600,
    });
    expect(out.value).toBe(0.1);
    expect(formatScrubbed(out.value, out.formatStep)).toBe('0.1');
  });

  it('does not add decimals when the value merely equals a bound', () => {
    const out = scrubOutcome({ start: 3, steps: -2, step: 1, min: 1, max: 9 });
    expect(out.value).toBe(1);
    expect(out.formatStep).toBe(1);
  });

  describe('with an adaptive step', () => {
    const time = { step: adaptiveTimeStep, min: 0.1, max: 3600 };

    it('coarsens crossing 10 s and 60 s going up', () => {
      expect(scrubOutcome({ start: 9.9, steps: 1, ...time }).value).toBe(10);
      expect(scrubOutcome({ start: 9.9, steps: 2, ...time }).value).toBe(10.5);
      expect(scrubOutcome({ start: 59.5, steps: 1, ...time }).value).toBe(60);
      expect(scrubOutcome({ start: 59.5, steps: 2, ...time }).value).toBe(61);
    });

    it('refines crossing 60 s and 10 s going down', () => {
      expect(scrubOutcome({ start: 61, steps: -1, ...time }).value).toBe(60);
      expect(scrubOutcome({ start: 61, steps: -2, ...time }).value).toBe(59.5);
      expect(scrubOutcome({ start: 10.5, steps: -2, ...time }).value).toBe(9.9);
    });

    it('retraces the same points down as up', () => {
      const path = [9.9, 10, 10.5, 11, 59.5, 60, 61];
      for (let i = 1; i < path.length; i += 1) {
        const up = scrubOutcome({ start: path[i - 1], steps: 1, ...time });
        const down = scrubOutcome({ start: path[i], steps: -1, ...time });
        if (path[i] - path[i - 1] <= 1) {
          expect(up.value).toBe(path[i]);
          expect(down.value).toBe(path[i - 1]);
        }
      }
    });

    it('coarsens the focal step at 100 mm and 500 mm', () => {
      const lens = { step: adaptiveFocalStep, min: 1, max: 10000 };
      expect(scrubOutcome({ start: 99, steps: 1, ...lens }).value).toBe(100);
      expect(scrubOutcome({ start: 99, steps: 2, ...lens }).value).toBe(105);
      expect(scrubOutcome({ start: 105, steps: -2, ...lens }).value).toBe(99);
      expect(scrubOutcome({ start: 495, steps: 2, ...lens }).value).toBe(510);
      expect(scrubOutcome({ start: 510, steps: -2, ...lens }).value).toBe(495);
    });
  });
});

describe('adaptiveTimeStep', () => {
  it('is 0.1 below 10 seconds', () => {
    expect(adaptiveTimeStep(0.1)).toBe(0.1);
    expect(adaptiveTimeStep(9.9)).toBe(0.1);
  });

  it('is 0.5 from 10 to under 60', () => {
    expect(adaptiveTimeStep(10)).toBe(0.5);
    expect(adaptiveTimeStep(59.9)).toBe(0.5);
  });

  it('is 1 from 60 up', () => {
    expect(adaptiveTimeStep(60)).toBe(1);
    expect(adaptiveTimeStep(3600)).toBe(1);
  });
});

describe('adaptiveFocalStep', () => {
  it('is 1 below 100, 5 below 500, 10 from 500', () => {
    expect(adaptiveFocalStep(99)).toBe(1);
    expect(adaptiveFocalStep(100)).toBe(5);
    expect(adaptiveFocalStep(499)).toBe(5);
    expect(adaptiveFocalStep(500)).toBe(10);
  });
});

describe('formatScrubbed', () => {
  it('uses the step decimals', () => {
    expect(formatScrubbed(3, 0.1)).toBe('3.0');
    expect(formatScrubbed(3.25, 0.25)).toBe('3.25');
    expect(formatScrubbed(60, 1)).toBe('60');
    expect(formatScrubbed(12.5, 0.5)).toBe('12.5');
  });
});

describe('decimalsOf', () => {
  it('counts decimals and caps a repeating step', () => {
    expect(decimalsOf(1)).toBe(0);
    expect(decimalsOf(0.25)).toBe(2);
    expect(decimalsOf(1 / 3)).toBe(6);
  });
});

describe('effectiveDx', () => {
  it('is zero until the direction is known', () => {
    expect(effectiveDx(25, 0)).toBe(0);
    expect(effectiveDx(-25, 0)).toBe(0);
  });

  it('follows the finger at once on the side the drag started toward', () => {
    expect(effectiveDx(0, 1)).toBe(0);
    expect(effectiveDx(3, 1)).toBe(3);
    expect(effectiveDx(40, 1)).toBe(40);
    expect(effectiveDx(-3, -1)).toBe(-3);
    expect(effectiveDx(-40, -1)).toBe(-40);
  });

  it('gives the slop back on the reverse side, to zero at touch-down', () => {
    expect(effectiveDx(-SCRUB_SLOP, 1)).toBe(0);
    expect(effectiveDx(-3, 1)).toBe(0);
    expect(effectiveDx(-SCRUB_SLOP - 5, 1)).toBe(-5);
    expect(effectiveDx(SCRUB_SLOP, -1)).toBe(0);
    expect(effectiveDx(3, -1)).toBe(0);
    expect(effectiveDx(SCRUB_SLOP + 5, -1)).toBe(5);
  });

  it('is continuous and monotonic, in both directions', () => {
    for (const dir of [1, -1]) {
      let previous = effectiveDx(-60, dir);
      for (let t = -59.5; t <= 60; t += 0.5) {
        const now = effectiveDx(t, dir);
        expect(now).toBeGreaterThanOrEqual(previous);
        expect(now - previous).toBeLessThanOrEqual(0.5 + 1e-9);
        previous = now;
      }
    }
  });

  it('never returns negative zero', () => {
    expect(Object.is(effectiveDx(-3, 1), 0)).toBe(true);
    expect(Object.is(effectiveDx(3, -1), 0)).toBe(true);
  });
});

describe('stepsFromTranslation', () => {
  it('takes no step for no travel', () => {
    expect(stepsFromTranslation(0)).toBe(0);
    expect(stepsFromTranslation(effectiveDx(2, 1))).toBe(0);
  });

  it('counts whole steps of effective travel, either direction', () => {
    expect(stepsFromTranslation(20)).toBe(2);
    expect(stepsFromTranslation(-20)).toBe(-2);
    expect(stepsFromTranslation(effectiveDx(13, 1))).toBe(1);
  });
});

describe('resolveScrubStart', () => {
  const bounds = { min: 0.1, max: 3600 };

  it('uses the parsed text first', () => {
    expect(resolveScrubStart({ parsed: 12, lastParsed: 5, ...bounds })).toBe(
      12
    );
  });

  it('falls back to the last value that parsed', () => {
    expect(
      resolveScrubStart({ parsed: Number.NaN, lastParsed: 5, ...bounds })
    ).toBe(5);
    expect(resolveScrubStart({ parsed: null, lastParsed: 5, ...bounds })).toBe(
      5
    );
  });

  it('falls back to zero held inside the bounds when nothing ever parsed', () => {
    expect(
      resolveScrubStart({ parsed: null, lastParsed: null, ...bounds })
    ).toBe(0.1);
    expect(
      resolveScrubStart({ parsed: null, lastParsed: null, min: -10, max: 10 })
    ).toBe(0);
  });
});

describe('scrubbedText', () => {
  const base = { step: 0.5, min: 0.1, max: 3600 };

  it('restores the exact starting text at zero steps', () => {
    expect(
      scrubbedText({ startText: '12.37', start: 12.37, steps: 0, ...base })
    ).toBe('12.37');
  });

  it('restores the starting text after an adaptive round trip', () => {
    expect(
      scrubbedText({
        startText: '9.9',
        start: 9.9,
        steps: 0,
        step: adaptiveTimeStep,
        min: 0.1,
        max: 3600,
      })
    ).toBe('9.9');
  });

  it('snaps an off-grid start to the next grid point first', () => {
    expect(
      scrubbedText({ startText: '12.3', start: 12.3, steps: 1, ...base })
    ).toBe('12.5');
    expect(
      scrubbedText({ startText: '12.3', start: 12.3, steps: -1, ...base })
    ).toBe('12.0');
  });

  it('leaves the text alone when the scrub cannot move', () => {
    expect(
      scrubbedText({
        startText: '0.5',
        start: 0.5,
        steps: -2,
        step: 1,
        min: 1,
        max: 10000,
      })
    ).toBe('0.5');
  });

  it('writes the step decimals only', () => {
    expect(
      scrubbedText({
        startText: '60',
        start: 60,
        steps: 1,
        step: 1,
        min: 0.1,
        max: 3600,
      })
    ).toBe('61');
  });

  it('keeps a comma separator', () => {
    expect(
      scrubbedText({ startText: '12,5', start: 12.5, steps: 1, ...base })
    ).toBe('13,0');
  });

  it('uses a custom formatter and still keeps the separator', () => {
    expect(
      scrubbedText({
        startText: '0,5',
        start: 0.5,
        steps: 1,
        step: 0.25,
        min: -10,
        max: 10,
        format: two,
      })
    ).toBe('0,75');
  });
});

describe('scrub direction', () => {
  it('maps finger steps to the opposite value steps', () => {
    expect(directedSteps(3)).toBe(-3);
    expect(directedSteps(-2)).toBe(2);
  });

  it('keeps a zero drag at exactly zero', () => {
    expect(Object.is(directedSteps(0), 0)).toBe(true);
  });

  it('lowers a scrubbed value for a rightward drag', () => {
    const steps = directedSteps(stepsFromTranslation(effectiveDx(40, 1)));
    expect(
      scrubbedText({
        startText: '50',
        start: 50,
        steps,
        step: 1,
        min: 0,
        max: 100,
      })
    ).toBe('46');
  });
});
