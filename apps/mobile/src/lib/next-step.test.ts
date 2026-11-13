import {
  exposureCalculatorLink,
  RECIPROCITY_FILM_TYPES,
  reciprocityCalculatorLink,
} from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import { resolveIncomingLink, resolveLegacyPath } from '@/lib/deep-link';
import { linkSearchFromParams } from '@/lib/link-prefill';
import {
  exposureTimerStep,
  meterShutterForLink,
  printTimeStep,
  reciprocityFilmFor,
  reciprocityStep,
} from './next-step';

/** Reads a path's query the way a screen does (`useLocalSearchParams`). */
function paramsOf(path: string): Record<string, string> {
  const query = path.split('?')[1] ?? '';
  return Object.fromEntries(
    query
      .split('&')
      .filter(Boolean)
      .map((pair) => {
        const [key, value] = pair.split('=');
        return [decodeURIComponent(key), decodeURIComponent(value)];
      })
  );
}

describe('reciprocityStep (Meter to Reciprocity)', () => {
  it('is null below one second and starts at exactly one', () => {
    expect(reciprocityStep({ shutterSeconds: 0.99, opened: 1 })).toBeNull();
    expect(reciprocityStep({ shutterSeconds: 1 / 125, opened: 1 })).toBeNull();
    expect(reciprocityStep({ shutterSeconds: 1, opened: 1 })).not.toBeNull();
  });

  it('is null for a non-finite shutter', () => {
    expect(
      reciprocityStep({ shutterSeconds: Number.NaN, opened: 1 })
    ).toBeNull();
    expect(
      reciprocityStep({ shutterSeconds: Number.POSITIVE_INFINITY, opened: 1 })
    ).toBeNull();
  });

  it('builds the exact path with the metered time and the opening marker', () => {
    expect(reciprocityStep({ shutterSeconds: 8, opened: 42 })).toEqual({
      label: 'Reciprocity',
      accessibilityLabel: 'Correct 8 seconds for reciprocity',
      path: '/shoot/reciprocity?time=8s&at=42',
    });
    expect(reciprocityStep({ shutterSeconds: 2.5, opened: 7 })?.path).toBe(
      '/shoot/reciprocity?time=2.5s&at=7'
    );
  });

  it('names the film and sets it only when the stock matches one', () => {
    expect(
      reciprocityStep({
        shutterSeconds: 4,
        filmStockName: 'Ilford HP5 Plus',
        opened: 1,
      })
    ).toEqual({
      label: 'Ilford HP5+ reciprocity',
      accessibilityLabel: 'Correct 4 seconds for Ilford HP5+ reciprocity',
      path: '/shoot/reciprocity?film=hp5&time=4s&at=1',
    });
  });

  it('carries only the time when the stock matches nothing', () => {
    expect(
      reciprocityStep({
        shutterSeconds: 4,
        filmStockName: 'Kodak Portra 400',
        opened: 1,
      })
    ).toEqual({
      label: 'Reciprocity',
      accessibilityLabel: 'Correct 4 seconds for reciprocity',
      path: '/shoot/reciprocity?time=4s&at=1',
    });
  });

  it('round-trips through the reciprocity link', () => {
    const step = reciprocityStep({ shutterSeconds: 30, opened: 5 });
    if (!step) throw new Error('expected a step');
    expect(
      reciprocityCalculatorLink.read(linkSearchFromParams(paramsOf(step.path)))
    ).toEqual({ meteredTime: '30s' });
  });

  it('round-trips the matched film', () => {
    const step = reciprocityStep({
      shutterSeconds: 30,
      filmStockName: 'Kodak Tri-X 400',
      opened: 5,
    });
    if (!step) throw new Error('expected a step');
    expect(
      reciprocityCalculatorLink.read(linkSearchFromParams(paramsOf(step.path)))
    ).toEqual({ filmType: 'tri-x', meteredTime: '30s' });
  });
});

describe('reciprocityStep labels', () => {
  it('speaks minutes and seconds in words', () => {
    expect(
      reciprocityStep({ shutterSeconds: 125, opened: 1 })?.accessibilityLabel
    ).toBe('Correct 2 minutes 5 seconds for reciprocity');
  });
});

describe('reciprocityFilmFor (against the real film list)', () => {
  const valueOf = (name: string | undefined) =>
    reciprocityFilmFor(name, RECIPROCITY_FILM_TYPES)?.value;

  it('matches real stock names', () => {
    expect(valueOf('Ilford HP5 Plus')).toBe('hp5');
    expect(valueOf('Ilford HP5 Plus 400')).toBe('hp5');
    expect(valueOf('Kodak Tri-X 400')).toBe('tri-x');
    expect(valueOf('Ilford Delta 100 Professional')).toBe('delta100');
    expect(valueOf('Ilford Delta 400 Professional')).toBe('delta400');
    expect(valueOf('Ilford Pan F Plus 50')).toBe('panf');
    expect(valueOf('Kentmere Pan 400')).toBe('kentmere400');
    expect(valueOf('Kodak T-Max 100 Professional')).toBe('tmax100');
    expect(valueOf('Ilford XP2 Super')).toBe('xp2');
    expect(valueOf('Ilford XP2 Super 400')).toBe('xp2');
  });

  it('does not match a different film that shares words', () => {
    expect(valueOf('Rollei Ortho 25 Plus')).toBeUndefined();
    expect(valueOf('Adox Ortho 25')).toBeUndefined();
    expect(valueOf('Fomapan Ortho')).toBeUndefined();
    expect(valueOf('Ilford Pan')).toBeUndefined();
    expect(valueOf('Kentmere Pan')).toBeUndefined();
    expect(valueOf('Pan')).toBeUndefined();
    expect(valueOf('X')).toBeUndefined();
    expect(valueOf('Tri')).toBeUndefined();
    expect(valueOf('Kodak Tri-X 320')).toBeUndefined();
    expect(valueOf('Ilford Delta 100 Super')).toBeUndefined();
    expect(valueOf('Kodak Portra 400')).toBeUndefined();
    expect(valueOf('Fujifilm Velvia 50')).toBeUndefined();
  });

  it('misses safely when the brand is missing or the name is ambiguous', () => {
    expect(valueOf('my tri-x')).toBeUndefined();
    expect(valueOf('Tri-X 400')).toBeUndefined();
    expect(valueOf('Ilford Delta')).toBeUndefined();
    expect(valueOf('Ilford')).toBeUndefined();
    expect(valueOf('Kentmere')).toBeUndefined();
  });

  it('does not match an empty or missing name, or Custom', () => {
    expect(valueOf(undefined)).toBeUndefined();
    expect(valueOf('')).toBeUndefined();
    expect(valueOf('  +  ')).toBeUndefined();
    expect(valueOf('Custom')).toBeUndefined();
  });
});

describe('meterShutterForLink', () => {
  const base = {
    displayed: 30,
    solved: 180,
    locked: false,
    outOfRange: true,
    max: 30,
  };

  it('sends the unsnapped solved shutter when it is past the meter max', () => {
    expect(meterShutterForLink(base)).toBe(180);
  });

  it('sends the displayed shutter when locked, in range, or fast out of range', () => {
    expect(meterShutterForLink({ ...base, locked: true })).toBe(30);
    expect(meterShutterForLink({ ...base, outOfRange: false })).toBe(30);
    expect(
      meterShutterForLink({ ...base, displayed: 1 / 8000, solved: 0.0001 })
    ).toBe(1 / 8000);
  });

  it('falls back to the displayed shutter for a non-finite solution', () => {
    expect(meterShutterForLink({ ...base, solved: Number.NaN })).toBe(30);
  });
});

describe('exposureTimerStep (Reciprocity to timer)', () => {
  it('is null for a non-finite time, under 2 s once rounded, or over 24 h', () => {
    expect(exposureTimerStep({ seconds: Number.NaN, opened: 1 })).toBeNull();
    expect(exposureTimerStep({ seconds: 0.99, opened: 1 })).toBeNull();
    expect(exposureTimerStep({ seconds: 1.4, opened: 1 })).toBeNull();
    expect(exposureTimerStep({ seconds: 1.5, opened: 1 })).not.toBeNull();
    expect(exposureTimerStep({ seconds: 86_400, opened: 1 })).not.toBeNull();
    expect(exposureTimerStep({ seconds: 86_400.6, opened: 1 })).toBeNull();
  });

  it('builds the exact path, labelled with the whole seconds it loads', () => {
    expect(exposureTimerStep({ seconds: 188.3, opened: 9 })).toEqual({
      label: 'Start a 3m 8s exposure',
      path: '/develop/recipes/timer?exposure=188&label=Exposure&at=9',
    });
    expect(exposureTimerStep({ seconds: 2, opened: 1 })?.path).toBe(
      '/develop/recipes/timer?exposure=2&label=Exposure&at=1'
    );
  });

  it('offers to open the timer, without the exposure, while a run is active', () => {
    expect(
      exposureTimerStep({ seconds: 188.3, opened: 9, runActive: true })
    ).toEqual({
      label: 'Timer running',
      detail: 'Open timer',
      path: '/develop/recipes/timer',
    });
    expect(
      exposureTimerStep({ seconds: 0.5, opened: 9, runActive: true })
    ).toBeNull();
  });

  it('survives the deep-link resolvers with its query intact', () => {
    const path = '/develop/recipes/timer?exposure=112&label=Exposure&at=3';
    expect(resolveLegacyPath(path)).toBe(path);
    expect(resolveIncomingLink(path)).toBe(path);
  });
});

describe('printTimeStep (Resize to Exposure)', () => {
  it('is null for a number the stops calculator does not accept', () => {
    expect(
      printTimeStep({ originalTimeSeconds: Number.NaN, stops: 1, opened: 1 })
    ).toBeNull();
    expect(
      printTimeStep({ originalTimeSeconds: 10, stops: Number.NaN, opened: 1 })
    ).toBeNull();
    expect(
      printTimeStep({ originalTimeSeconds: 10, stops: 6, opened: 1 })
    ).toBeNull();
    expect(
      printTimeStep({ originalTimeSeconds: 0, stops: 1, opened: 1 })
    ).toBeNull();
    expect(
      printTimeStep({ originalTimeSeconds: 100000, stops: 1, opened: 1 })
    ).toBeNull();
  });

  it('is null when the difference rounds to 0.00 stops', () => {
    expect(
      printTimeStep({ originalTimeSeconds: 10, stops: 0, opened: 1 })
    ).toBeNull();
    expect(
      printTimeStep({ originalTimeSeconds: 10, stops: 0.004, opened: 1 })
    ).toBeNull();
    expect(
      printTimeStep({ originalTimeSeconds: 10, stops: -0.004, opened: 1 })
    ).toBeNull();
    expect(
      printTimeStep({ originalTimeSeconds: 10, stops: 0.01, opened: 1 })
    ).not.toBeNull();
  });

  it('builds the exact path with a signed detail', () => {
    expect(
      printTimeStep({ originalTimeSeconds: 10, stops: 1.17, opened: 3 })
    ).toEqual({
      label: 'New print time',
      detail: '+1.17 stops',
      path: '/print/exposure?time=10&stops=1.17&at=3',
    });
    expect(
      printTimeStep({ originalTimeSeconds: 12.5, stops: -0.5, opened: 3 })
    ).toEqual({
      label: 'New print time',
      detail: '−0.50 stops',
      path: '/print/exposure?time=12.5&stops=-0.5&at=3',
    });
  });

  it('round-trips through the exposure link', () => {
    const step = printTimeStep({
      originalTimeSeconds: 10,
      stops: 1.17,
      opened: 3,
    });
    if (!step) throw new Error('expected a step');
    expect(
      exposureCalculatorLink.read(linkSearchFromParams(paramsOf(step.path)))
    ).toEqual({ originalTime: 10, stops: 1.17 });
  });
});
