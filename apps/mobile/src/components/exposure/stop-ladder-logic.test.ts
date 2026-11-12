import {
  calculateExposureAdjustment,
  inSeparatorOf,
  parseDecimalInput,
  roundToStandardPrecision,
} from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  buildStopLadder,
  formatStopsFact,
  formatStopsLabel,
  LADDER_INCREMENTS,
  ladderFontSize,
  spokenStops,
  storedStopsText,
} from './stop-ladder-logic';

/** Store a cell the way a tap does and read it back as the hook does. */
function selectedSecondsAfterTap(baseSeconds: number, cellStops: number) {
  const text = storedStopsText(cellStops);
  const hookStops = roundToStandardPrecision(parseDecimalInput(text));
  return calculateExposureAdjustment(baseSeconds, hookStops)?.newTimeValue;
}

describe('buildStopLadder', () => {
  it('returns five cells with the centre selected', () => {
    const cells = buildStopLadder({ baseSeconds: 10, stops: 0, increment: 1 });
    expect(cells.map((c) => c.stops)).toEqual([-2, -1, 0, 1, 2]);
    expect(cells.map((c) => c.selected)).toEqual([
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(cells.map((c) => c.seconds)).toEqual([2.5, 5, 10, 20, 40]);
  });

  it('snaps the centre to the increment and selects nothing when off it', () => {
    const cells = buildStopLadder({
      baseSeconds: 12,
      stops: 1 / 3,
      increment: 0.5,
    });
    expect(cells.map((c) => c.stops)).toEqual([-0.5, 0, 0.5, 1, 1.5]);
    expect(cells.some((c) => c.selected)).toBe(false);
  });

  it('snaps 0.83 to the nearest third and selects nothing', () => {
    const cells = buildStopLadder({
      baseSeconds: 12,
      stops: 0.83,
      increment: 1 / 3,
    });
    expect(cells.map((c) => c.stops)).toEqual([0, 0.33, 0.67, 1, 1.33]);
    expect(cells.some((c) => c.selected)).toBe(false);
  });

  it('selects the centre when the entered stops are within 0.005 of it', () => {
    const cells = buildStopLadder({
      baseSeconds: 10,
      stops: 0.33,
      increment: 1 / 3,
    });
    expect(cells[2].selected).toBe(true);
    expect(cells.filter((c) => c.selected)).toHaveLength(1);
  });

  it('every cell shows exactly the time its tap selects', () => {
    const cases = [
      { baseSeconds: 12, stops: 1 / 3, increment: 0.5 },
      { baseSeconds: 12, stops: 0.83, increment: 1 / 3 },
      { baseSeconds: 12, stops: -0.67, increment: 1 / 3 },
      { baseSeconds: 7.5, stops: -1.5, increment: 0.5 },
      { baseSeconds: 30, stops: -4.9, increment: 1 },
      { baseSeconds: 0.4, stops: -0.01, increment: 1 / 3 },
    ];
    for (const input of cases) {
      for (const cell of buildStopLadder(input)) {
        expect(selectedSecondsAfterTap(input.baseSeconds, cell.stops)).toBe(
          cell.seconds
        );
      }
    }
  });

  it('never produces a negative zero', () => {
    const cells = buildStopLadder({
      baseSeconds: 10,
      stops: -0.1,
      increment: 1,
    });
    expect(Object.is(cells[2].stops, -0)).toBe(false);
  });
});

describe('buildStopLadder range and selection', () => {
  it('disables cells outside the calculator range', () => {
    const cells = buildStopLadder({ baseSeconds: 10, stops: 4, increment: 1 });
    expect(cells.map((c) => c.stops)).toEqual([2, 3, 4, 5, 6]);
    expect(cells.map((c) => c.enabled)).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
    const low = buildStopLadder({ baseSeconds: 10, stops: -5, increment: 1 });
    expect(low.map((c) => c.enabled)).toEqual([false, false, true, true, true]);
  });

  it('selects nothing when there is no result', () => {
    const cells = buildStopLadder({
      baseSeconds: 10,
      stops: null,
      increment: 1 / 3,
    });
    expect(cells.some((c) => c.selected)).toBe(false);
    expect(cells[2].stops).toBe(0);
  });

  it('writes a comma entry back with a comma and the same stored stops', () => {
    for (const cell of buildStopLadder({
      baseSeconds: 12,
      stops: 0.5,
      increment: 1 / 3,
    })) {
      const written = inSeparatorOf('0,5', storedStopsText(cell.stops));
      expect(written.includes('.')).toBe(false);
      expect(roundToStandardPrecision(parseDecimalInput(written))).toBe(
        cell.stops
      );
      expect(
        calculateExposureAdjustment(12, parseDecimalInput(written))
          ?.newTimeValue
      ).toBe(cell.seconds);
    }
  });
});

describe('storedStopsText', () => {
  it('keeps at most two decimals and drops trailing zeros', () => {
    expect(storedStopsText(1 / 3)).toBe('0.33');
    expect(storedStopsText(1)).toBe('1');
    expect(storedStopsText(-0.5)).toBe('-0.5');
  });
});

describe('formatStopsFact', () => {
  it('is "base" alone at zero stops', () => {
    expect(formatStopsFact(0)).toBe('base');
  });

  it('says "stop" up to a whole one and "stops" beyond', () => {
    expect(formatStopsFact(1 / 3)).toBe('+⅓ stop');
    expect(formatStopsFact(1)).toBe('+1 stop');
    expect(formatStopsFact(-1)).toBe('−1 stop');
    expect(formatStopsFact(4 / 3)).toBe('+1⅓ stops');
    expect(formatStopsFact(-2)).toBe('−2 stops');
  });
});

describe('formatStopsLabel', () => {
  it('reads zero as base', () => {
    expect(formatStopsLabel(0)).toBe('base');
    expect(formatStopsLabel(0.00001)).toBe('base');
  });

  it('uses glyphs for thirds and halves with a sign', () => {
    expect(formatStopsLabel(1 / 3)).toBe('+⅓');
    expect(formatStopsLabel(-2 / 3)).toBe('−⅔');
    expect(formatStopsLabel(1)).toBe('+1');
    expect(formatStopsLabel(4 / 3)).toBe('+1⅓');
    expect(formatStopsLabel(0.5)).toBe('+½');
    expect(formatStopsLabel(-1.5)).toBe('−1½');
  });

  it('reads 1/3 + 1/3 as two thirds', () => {
    expect(formatStopsLabel(1 / 3 + 1 / 3)).toBe('+⅔');
  });

  it('reads the rounded 0.33 and 0.67 the calculator stores as thirds', () => {
    expect(formatStopsLabel(0.33)).toBe('+⅓');
    expect(formatStopsLabel(-0.67)).toBe('−⅔');
  });

  it('signs anything else with two decimals', () => {
    expect(formatStopsLabel(0.25)).toBe('+0.25');
    expect(formatStopsLabel(-1.2)).toBe('−1.20');
  });
});

describe('spokenStops', () => {
  it('speaks the cell offset', () => {
    expect(spokenStops(0)).toBe('base time');
    expect(spokenStops(1 / 3)).toBe('plus one third stop');
    expect(spokenStops(-0.5)).toBe('minus one half stop');
    expect(spokenStops(1)).toBe('plus 1 stop');
    expect(spokenStops(2)).toBe('plus 2 stops');
    expect(spokenStops(4 / 3)).toBe('plus 1 and one third stops');
  });
});

describe('LADDER_INCREMENTS', () => {
  it('defaults to a third', () => {
    expect(LADDER_INCREMENTS[0].stops).toBeCloseTo(1 / 3, 10);
  });
});

describe('tiny base times', () => {
  it('disables cells whose time rounds to nothing, as the hook would', () => {
    const cells = buildStopLadder({
      baseSeconds: 0.1,
      stops: -4,
      increment: 1,
    });
    // 0.1 s at -5 stops is 0.003 s, which the calculator stores as 0.
    expect(cells.map((c) => c.stops)).toEqual([-6, -5, -4, -3, -2]);
    for (const cell of cells) {
      const stored = roundToStandardPrecision(cell.seconds);
      expect(cell.enabled).toBe(
        cell.stops >= -5 && cell.stops <= 5 && stored > 0
      );
    }
    expect(cells[0].enabled).toBe(false);
    expect(cells[1].enabled).toBe(false);
    expect(cells[2].enabled).toBe(true);
    expect(cells[4].enabled).toBe(true);
  });

  it('leaves normal cells enabled', () => {
    const cells = buildStopLadder({ baseSeconds: 10, stops: 0, increment: 1 });
    expect(cells.every((c) => c.enabled)).toBe(true);
  });
});

describe('ladderFontSize', () => {
  it('shrinks with the longest label, the same for every cell', () => {
    expect(ladderFontSize(['2.5s', '5s', '10s'])).toBe(15);
    expect(ladderFontSize(['10.08s', '5s'])).toBe(14);
    expect(ladderFontSize(['1m 5s', '9s'])).toBe(15);
    expect(ladderFontSize(['10m 24s', '5s'])).toBe(13);
    expect(ladderFontSize(['59m 59.9s'])).toBe(11);
    expect(ladderFontSize([])).toBe(15);
  });
});
