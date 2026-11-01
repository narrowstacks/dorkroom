import {
  borderCalculatorLink,
  borderStateFromLink,
  calculateMatLayout,
  calculateReciprocityForForm,
  calculateResizeExposure,
  computeBorderLayout,
  exposureCalculatorLink,
  lensCalculatorLink,
  MAT_CALCULATOR_DEFAULTS,
  RECIPROCITY_FORM_DEFAULTS,
  RESIZE_FORM_DEFAULTS,
} from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  calculatorLinkParamNames,
  getCalculatorShareMetadata,
  isCalculatorRoute,
  readCalculatorShare,
} from '../calculatorShare';

describe('calculatorLinkParamNames', () => {
  it('lists each calculator route’s link params from @dorkroom/logic', () => {
    expect(calculatorLinkParamNames('/lenses')).toEqual([
      'focal',
      'from',
      'to',
    ]);
    expect(calculatorLinkParamNames('/stops')).toEqual(['time', 'stops']);
    expect(calculatorLinkParamNames('/exposure')).toEqual([
      'aperture',
      'shutter',
      'iso',
      'solve',
    ]);
  });

  it('lists nothing for a route without a calculator link', () => {
    expect(calculatorLinkParamNames('/films')).toEqual([]);
    expect(calculatorLinkParamNames('/lenses/')).toEqual([]);
    expect(calculatorLinkParamNames('constructor')).toEqual([]);
    expect(isCalculatorRoute('toString')).toBe(false);
  });
});

describe('readCalculatorShare - lenses', () => {
  it('builds the equivalence title from the calculator’s math', () => {
    const share = readCalculatorShare('/lenses', {
      focal: '80',
      from: 'film-6x6',
      to: 'full-frame',
    });
    expect(share?.title).toBe('80mm on 6×6 ≈ 43.7mm on Full Frame');
    expect(share?.description).toBe(
      '80mm on 6×6 (Square) gives the same field of view as 43.7mm on Full Frame (35mm): 52.7° diagonal.'
    );
    expect(share?.drawing).toEqual({
      kind: 'lens',
      source: { w: 56, h: 56, label: '6×6 · 80mm' },
      target: { w: 36, h: 24, label: 'Full Frame · 43.7mm' },
    });
  });

  it('fills a missing param with the calculator default', () => {
    // LENS_DEFAULTS: full-frame to aps-c-nikon
    const share = readCalculatorShare('/lenses', { focal: '80' });
    expect(share?.title).toBe('80mm on Full Frame ≈ 52.1mm on APS-C');
    expect(share?.search).toEqual({ focal: '80' });
  });

  it('drops an invalid value, and falls back when nothing usable is left', () => {
    expect(readCalculatorShare('/lenses', { focal: 'abc' })).toBeNull();
    expect(readCalculatorShare('/lenses', { focal: '-5' })).toBeNull();
    expect(readCalculatorShare('/lenses', { from: 'nope' })).toBeNull();
    expect(readCalculatorShare('/lenses', {})).toBeNull();

    const share = readCalculatorShare('/lenses', {
      focal: '35',
      from: 'not-a-format',
    });
    expect(share?.search).toEqual(
      lensCalculatorLink.build({ focalLength: 35 })
    );
  });

  it('ignores params the link does not define', () => {
    const share = readCalculatorShare('/lenses', {
      focal: '80',
      source: 'share',
      utm_source: 'x',
    });
    expect(share?.search).toEqual({ focal: '80' });
  });
});

describe('readCalculatorShare - border', () => {
  it('draws the paper and print from computeBorderLayout', () => {
    const search = { paper: '8x10', ratio: '3:2', border: '0.5' };
    const share = readCalculatorShare('/border', search);
    const { calculation } = computeBorderLayout(
      borderStateFromLink(borderCalculatorLink.read(search)),
      { viewport: { width: 0, height: 0 } }
    );

    expect(share?.title).toBe('3:2 on 8x10 paper: 9×6in print');
    expect(share?.drawing).toMatchObject({
      kind: 'border',
      paperW: calculation.paperWidth,
      paperH: calculation.paperHeight,
      printLeft: calculation.leftBorder,
      printTop: calculation.topBorder,
      printW: calculation.printWidth,
      printH: calculation.printHeight,
    });
    expect(share?.details).toEqual([
      '0.5in left · 0.5in right',
      '1in top · 1in bottom',
    ]);
  });

  it('orients custom paper from its dimensions, as the calculator does', () => {
    const share = readCalculatorShare('/border', {
      paper: 'custom',
      paperW: '9.5',
      paperH: '12',
      ratio: '1:1',
      border: '1',
    });
    expect(share?.title).toBe('1:1 on 9.5×12in paper: 7.5×7.5in print');
    expect(share?.drawing).toMatchObject({ paperW: 12, paperH: 9.5 });
  });

  it('reduces a min border too big for the paper, as the calculator does', () => {
    const state = borderStateFromLink(
      borderCalculatorLink.read({ paper: '5x7', border: '4' })
    );
    expect(state.minBorder).toBeLessThan(4);
    expect(state.lastValidMinBorder).toBe(state.minBorder);
    const share = readCalculatorShare('/border', { paper: '5x7', border: '4' });
    expect(share?.drawing).toMatchObject({ kind: 'border' });
  });
});

describe('readCalculatorShare - resize', () => {
  it('uses calculateResizeExposure for the new time', () => {
    const search = {
      fromW: '8',
      fromL: '10',
      toW: '11',
      toL: '14',
      time: '12',
    };
    const expected = calculateResizeExposure({
      ...RESIZE_FORM_DEFAULTS,
      originalWidth: 8,
      originalLength: 10,
      newWidth: 11,
      newLength: 14,
      originalTime: 12,
    });
    const share = readCalculatorShare('/resize', search);
    expect(expected.newTime).toBe('23.1');
    expect(share?.title).toBe('12s at 8×10in ≈ 23.1s at 11×14in');
    expect(share?.details).toEqual(['0.94 stops']);
    expect(share?.drawing).toMatchObject({
      kind: 'resize',
      from: { w: 8, h: 10, time: '12s' },
      to: { w: 11, h: 14, time: '23.1s' },
    });
  });

  it('handles enlarger height mode', () => {
    const share = readCalculatorShare('/resize', {
      height: 'true',
      fromH: '20',
      toH: '30',
      time: '10',
    });
    expect(share?.title).toBe('10s at 20in ≈ 22.5s at 30in');
    expect(share?.details).toEqual(['1.17 stops', 'Enlarger height']);
  });
});

describe('readCalculatorShare - mat', () => {
  const search = {
    outerW: '16',
    outerH: '20',
    top: '3',
    bottom: '3 1/2',
    left: '2 3/4',
    right: '2 3/4',
    artW: '11',
    artH: '14',
    reveal: '1/4',
  };

  it('draws the board, window and artwork from calculateMatLayout', () => {
    const layout = calculateMatLayout({
      ...MAT_CALCULATOR_DEFAULTS,
      borderBottom: '3 1/2',
    });
    const share = readCalculatorShare('/mat', search);
    expect(share?.title).toBe('16" × 20" mat with a 10 1/2" × 13 1/2" window');
    expect(share?.drawing).toEqual({
      kind: 'mat',
      boardW: 16,
      boardH: 20,
      window: { left: 2.75, top: 3, w: layout.windowW, h: layout.windowH },
      art: { left: 2.5, top: 2.75, w: 11, h: 14 },
      windowLabel: '10 1/2" × 13 1/2"',
      caption: '16" × 20" board',
    });
  });

  it('leaves the artwork out when the link clears it', () => {
    const share = readCalculatorShare('/mat', {
      ...search,
      artW: '',
      artH: '',
    });
    expect(share?.drawing).toMatchObject({ art: null });
    expect(share?.search).toMatchObject({ artW: '', artH: '' });
  });

  it('falls back when the borders leave no window', () => {
    expect(
      readCalculatorShare('/mat', { outerW: '8', left: '4', right: '4' })
    ).toBeNull();
  });
});

describe('readCalculatorShare - text cards', () => {
  it('stops: new time from calculateExposureAdjustment', () => {
    const share = readCalculatorShare('/stops', { time: '10', stops: '1' });
    expect(share?.title).toBe('10s +1 stop = 20s');
    expect(share?.details).toEqual(['Add 10s', '100.0% change']);
    expect(share?.drawing).toBeNull();
  });

  it('stops: a fractional link value reads as a number, rounded for display', () => {
    const share = readCalculatorShare('/stops', { time: '10', stops: '-1/3' });
    expect(share?.title).toBe('10s -0.33 stops = 7.94s');
    expect(share?.search).toEqual(
      exposureCalculatorLink.build({ originalTime: 10, stops: -1 / 3 })
    );
  });

  it('reciprocity: corrected time for a film profile', () => {
    const share = readCalculatorShare('/reciprocity', {
      film: 'tri-x',
      time: '30s',
    });
    const expected = calculateReciprocityForForm({
      ...RECIPROCITY_FORM_DEFAULTS,
      filmType: 'tri-x',
      meteredTime: '30s',
    });
    expect(expected?.factor).toBe(1.54);
    expect(share?.title).toBe('30s metered ≈ 3m 8.3s exposure');
    expect(share?.subtitle).toBe('on Kodak Tri-X 400');
    expect(share?.details).toEqual(['Factor 1.54', '+528% time']);
  });

  it('reciprocity: an unknown film id is dropped, not guessed', () => {
    const share = readCalculatorShare('/reciprocity', {
      film: 'not-a-film',
      time: '30s',
    });
    // The default film applies, as on a first visit.
    expect(share?.search).toEqual({ time: '30s' });
  });

  it('exposure: EV from calculateExposureValue', () => {
    const share = readCalculatorShare('/exposure', {
      aperture: '16',
      shutter: '1/125',
      iso: '100',
    });
    expect(share?.title).toBe('EV 15: f/16 at 1/125, ISO 100');
    expect(share?.subtitle).toBe('Bright sun, distinct shadows');
    expect(share?.details).toEqual(['f/16', '1/125', 'ISO 100']);
  });

  it('exposure: an invalid value is dropped', () => {
    expect(readCalculatorShare('/exposure', { aperture: '0' })).toBeNull();
  });
});

describe('copy', () => {
  it('never uses an em dash', () => {
    const shares = [
      readCalculatorShare('/lenses', { focal: '80' }),
      readCalculatorShare('/border', { paper: '8x10' }),
      readCalculatorShare('/resize', { time: '12' }),
      readCalculatorShare('/mat', { outerW: '16' }),
      readCalculatorShare('/stops', { stops: '2' }),
      readCalculatorShare('/reciprocity', { time: '1m' }),
      readCalculatorShare('/exposure', { iso: '400' }),
    ];
    for (const share of shares) {
      expect(share).not.toBeNull();
      const text = [
        share?.title,
        share?.description,
        share?.subtitle,
        ...(share?.details ?? []),
      ].join(' ');
      expect(text).not.toContain('—');
    }
  });
});

describe('getCalculatorShareMetadata', () => {
  it('keeps the link params in the canonical and card URLs', () => {
    const share = readCalculatorShare('/lenses', {
      focal: '80',
      from: 'film-6x6',
      to: 'full-frame',
    });
    expect(share).not.toBeNull();
    if (!share) return;
    expect(getCalculatorShareMetadata(share)).toEqual({
      title: '80mm on 6×6 ≈ 43.7mm on Full Frame | Dorkroom',
      description: share.description,
      url: 'https://dorkroom.art/lenses?focal=80&from=film-6x6&to=full-frame',
      ogImageUrl:
        'https://dorkroom.art/api/og?route=%2Flenses&focal=80&from=film-6x6&to=full-frame',
    });
  });
});
