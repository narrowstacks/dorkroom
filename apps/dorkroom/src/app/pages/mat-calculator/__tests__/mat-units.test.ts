import {
  convertDisplayToInches,
  MAT_PRESETS,
  parseMatInput,
  useMatCalculator,
} from '@dorkroom/logic';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  formatMatPresetLabel,
  formatMatPreview,
  formatMatValue,
  matDisplayToValue,
  matStepLabel,
  matValueToDisplay,
  stepMatDisplay,
} from '../mat-units';

describe('formatMatValue', () => {
  it('renders imperial as a nearest-1/16 fraction with an inch mark', () => {
    expect(formatMatValue(3.5, 'imperial')).toBe('3 1/2"');
    expect(formatMatValue(0.25, 'imperial')).toBe('1/4"');
    expect(formatMatValue(16, 'imperial')).toBe('16"');
  });

  it('renders metric as millimetre-precision centimetres', () => {
    expect(formatMatValue(10.5, 'metric')).toBe('26.7cm');
    expect(formatMatValue(16, 'metric')).toBe('40.6cm');
    expect(formatMatValue(0, 'metric')).toBe('0.0cm');
  });

  it('returns an empty string for NaN or negative values in either unit', () => {
    expect(formatMatValue(NaN, 'imperial')).toBe('');
    expect(formatMatValue(NaN, 'metric')).toBe('');
    expect(formatMatValue(-1, 'imperial')).toBe('');
    expect(formatMatValue(-1, 'metric')).toBe('');
  });
});

describe('formatMatPreview', () => {
  it('uses a prime mark in imperial, matching the preview line', () => {
    expect(formatMatPreview(3.25, 'imperial')).toBe('3 1/4″');
  });

  it('uses centimetres in metric, at the field precision', () => {
    // 3.25in is 3 1/4in, which the border field will show as 8.26cm.
    expect(formatMatPreview(3.25, 'metric')).toBe('8.26cm');
  });
});

describe('matValueToDisplay', () => {
  it('passes imperial text through untouched', () => {
    expect(matValueToDisplay('2 3/4', 'imperial')).toBe('2 3/4');
    expect(matValueToDisplay('', 'imperial')).toBe('');
  });

  it('converts inches to centimetres for display', () => {
    expect(matValueToDisplay('16', 'metric')).toBe('40.64');
    expect(matValueToDisplay('20', 'metric')).toBe('50.8');
    expect(matValueToDisplay('3 1/2', 'metric')).toBe('8.89');
  });

  it('blanks unparseable text in metric', () => {
    expect(matValueToDisplay('', 'metric')).toBe('');
    expect(matValueToDisplay('abc', 'metric')).toBe('');
  });
});

describe('matDisplayToValue', () => {
  it('passes imperial text through untouched', () => {
    expect(matDisplayToValue('2 3/4', 'imperial')).toBe('2 3/4');
    expect(matDisplayToValue('abc', 'imperial')).toBe('abc');
  });

  it('converts centimetres back to inches', () => {
    expect(matDisplayToValue('40.64', 'metric')).toBe('16');
    expect(matDisplayToValue('50', 'metric')).toBe('19.685');
    expect(matDisplayToValue('30.', 'metric')).toBe('11.811');
  });

  it('commits an empty string when metric input is unparseable', () => {
    expect(matDisplayToValue('', 'metric')).toBe('');
    expect(matDisplayToValue('abc', 'metric')).toBe('');
  });

  it('round-trips a centimetre entry back to the same display text', () => {
    for (const cm of ['0.64', '6.99', '20.3', '20.4', '40.64', '50.8']) {
      expect(matValueToDisplay(matDisplayToValue(cm, 'metric'), 'metric')).toBe(
        cm
      );
    }
  });

  it('round-trips an inch entry back to the same stored text', () => {
    for (const inches of ['16', '3.5', '20']) {
      expect(
        matDisplayToValue(matValueToDisplay(inches, 'metric'), 'metric')
      ).toBe(inches);
    }
  });

  it('shows a sub-millimetre inch value at the field precision', () => {
    // 1/4" is 0.635cm; the field rounds to 0.64cm, and only an edit there
    // (not the preference switch itself) writes that back as inches.
    expect(matValueToDisplay('1/4', 'metric')).toBe('0.64');
    expect(matDisplayToValue('0.64', 'metric')).toBe('0.252');
  });
});

describe('stepMatDisplay', () => {
  it('steps imperial by 1/16 inch, snapped to the grid', () => {
    expect(stepMatDisplay('3', 'imperial', 1)).toBe('3 1/16');
    expect(stepMatDisplay('3', 'imperial', -1)).toBe('2 15/16');
    expect(stepMatDisplay('1/4', 'imperial', 1)).toBe('5/16');
  });

  it('steps metric by 1mm, snapped to the grid', () => {
    expect(stepMatDisplay('40.64', 'metric', 1)).toBe('40.7');
    expect(stepMatDisplay('40.64', 'metric', -1)).toBe('40.5');
    expect(stepMatDisplay('20.3', 'metric', 1)).toBe('20.4');
  });

  it('treats unparseable text as zero and clamps at zero', () => {
    expect(stepMatDisplay('', 'metric', 1)).toBe('0.1');
    expect(stepMatDisplay('0', 'metric', -1)).toBe('0');
    expect(stepMatDisplay('0', 'imperial', -1)).toBe('0');
  });
});

describe('matStepLabel', () => {
  it('names the step in the active unit', () => {
    expect(matStepLabel('imperial')).toBe('1/16 inch');
    expect(matStepLabel('metric')).toBe('1 mm');
  });
});

describe('formatMatPresetLabel', () => {
  const sixteenByTwenty = MAT_PRESETS.find((p) => p.label === '16×20');

  it('keeps the conventional inch name in imperial', () => {
    expect(formatMatPresetLabel(sixteenByTwenty!, 'imperial')).toBe('16×20');
  });

  it('shows the converted board in centimetres in metric', () => {
    expect(formatMatPresetLabel(sixteenByTwenty!, 'metric')).toBe(
      '40.6×50.8cm'
    );
    expect(formatMatPresetLabel({ label: '8×10', w: 8, h: 10 }, 'metric')).toBe(
      '20.3×25.4cm'
    );
  });
});

describe('best fit and the displayed cut cards (issue #341)', () => {
  const num = (text: string) => parseMatInput(text.replace(/(cm|")$/, ''));

  interface Inputs {
    outerW?: string;
    outerH?: string;
    artW: string;
    artH: string;
    reveal: string;
  }

  const cards = (unit: 'imperial' | 'metric', inputs: Inputs) => {
    window.localStorage.clear();
    const hook = renderHook(() =>
      useMatCalculator({ unit, formatValue: (v) => formatMatValue(v, unit) })
    );
    act(() => {
      const { set } = hook.result.current;
      if (inputs.outerW) set('outerW', inputs.outerW);
      if (inputs.outerH) set('outerH', inputs.outerH);
      set('artW', inputs.artW);
      set('artH', inputs.artH);
      set('reveal', inputs.reveal);
    });
    act(() => hook.result.current.applyBestFit());
    return hook.result.current;
  };

  it('imperial cut-card offsets and stops sum to the outer board', () => {
    const calc = cards('imperial', {
      artW: '8 1/16',
      artH: '10',
      reveal: '1/4',
    });
    const [top, , left] = calc.guideBarCuts;
    const rightBorder = 16 - num(top.stop);
    // Displayed left + right border + target window (7 9/16) = 16.
    expect(num(left.offset) + rightBorder + (8 + 1 / 16 - 0.5)).toBeCloseTo(
      16,
      9
    );
  });

  it('metric cut-card offsets and stops sum to the outer board', () => {
    const cm = (v: number) => String(convertDisplayToInches(v, 'metric'));
    const calc = cards('metric', {
      outerW: cm(40),
      outerH: cm(50),
      artW: cm(20),
      artH: cm(25),
      reveal: cm(0.5),
    });
    const [top, , left] = calc.guideBarCuts;
    // left border + right border + 19cm window = 40cm, to the displayed mm.
    expect(num(left.offset) + (40 - num(top.stop)) + 19).toBeCloseTo(40, 6);
  });
});

describe('inch strings written by metric best fit', () => {
  it('a 5-decimal inch string parses back losslessly', () => {
    expect(parseMatInput('4.13386')).toBe(4.13386);
    expect(parseMatInput('0.03937')).toBe(0.03937);
  });
});
