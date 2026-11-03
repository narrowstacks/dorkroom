import { describe, expect, it } from 'vitest';
import {
  borderAnnouncement,
  cameraExposureAnnouncement,
  exposureAnnouncement,
  lensAnnouncement,
  matAnnouncement,
  normalizeAnnouncement,
  reciprocityAnnouncement,
  resizeAnnouncement,
  resolveAnnouncement,
  speakExposureTime,
  speakFocalLength,
  speakLength,
} from './announce-result';

describe('normalizeAnnouncement', () => {
  it('treats empty, blank and missing text as nothing to say', () => {
    expect(normalizeAnnouncement(null)).toBeNull();
    expect(normalizeAnnouncement(undefined)).toBeNull();
    expect(normalizeAnnouncement('')).toBeNull();
    expect(normalizeAnnouncement('   ')).toBeNull();
  });

  it('trims real text', () => {
    expect(normalizeAnnouncement('  New time 5 seconds ')).toBe(
      'New time 5 seconds'
    );
  });
});

describe('resolveAnnouncement', () => {
  it('speaks a changed result and remembers it', () => {
    expect(resolveAnnouncement('a', 'b')).toEqual({
      speak: 'b',
      settled: 'b',
    });
  });

  it('stays silent when the text did not change', () => {
    expect(resolveAnnouncement('a', 'a')).toEqual({
      speak: null,
      settled: 'a',
    });
  });

  it('stays silent for invalid input and remembers the gap', () => {
    expect(resolveAnnouncement('a', null)).toEqual({
      speak: null,
      settled: null,
    });
    expect(resolveAnnouncement('a', '')).toEqual({
      speak: null,
      settled: null,
    });
  });

  it('announces again when a result returns after an invalid state', () => {
    const gap = resolveAnnouncement('a', null);
    expect(resolveAnnouncement(gap.settled, 'a').speak).toBe('a');
  });

  it('speaks the first valid result after starting invalid', () => {
    expect(resolveAnnouncement(null, 'a').speak).toBe('a');
  });
});

describe('speakExposureTime', () => {
  it('spells out seconds and minutes', () => {
    expect(speakExposureTime('14.2s')).toBe('14.2 seconds');
    expect(speakExposureTime('1s')).toBe('1 second');
    expect(speakExposureTime('2m 5s')).toBe('2 minutes 5 seconds');
    expect(speakExposureTime('1m')).toBe('1 minute');
    expect(speakExposureTime('1m 30.5s')).toBe('1 minute 30.5 seconds');
  });
});

describe('speakFocalLength', () => {
  it('spells out millimeters', () => {
    expect(speakFocalLength('75mm')).toBe('75 millimeters');
    expect(speakFocalLength('12.5mm')).toBe('12.5 millimeters');
  });
});

describe('resolveAnnouncement focus', () => {
  it('is silent while unfocused and re-baselines to the current text', () => {
    expect(resolveAnnouncement('a', 'b', false)).toEqual({
      speak: null,
      settled: 'b',
    });
  });

  it('does not replay a change made while hidden once focus returns', () => {
    const hidden = resolveAnnouncement('a', 'b', false);
    expect(resolveAnnouncement(hidden.settled, 'b', true).speak).toBeNull();
  });

  it('speaks a change made after focus returns', () => {
    const hidden = resolveAnnouncement('a', 'b', false);
    expect(resolveAnnouncement(hidden.settled, 'c', true).speak).toBe('c');
  });
});

describe('speakLength', () => {
  it('reads fractions in words, not as a date', () => {
    expect(speakLength('8 3/4"')).toBe('8 and three quarters inches');
    expect(speakLength('3/4"')).toBe('three quarters of an inch');
    expect(speakLength('1/2"')).toBe('one half of an inch');
    expect(speakLength('3 1/2"')).toBe('3 and one half inches');
    expect(speakLength('5/16"')).toBe('five sixteenths of an inch');
  });

  it('reads whole and decimal inches', () => {
    expect(speakLength('1"')).toBe('1 inch');
    expect(speakLength('10"')).toBe('10 inches');
    expect(speakLength('7.25"')).toBe('7.25 inches');
  });

  it('reads centimeters', () => {
    expect(speakLength('17.8cm')).toBe('17.8 centimeters');
    expect(speakLength('1cm')).toBe('1 centimeter');
  });

  it('leaves anything else alone', () => {
    expect(speakLength('· · ·')).toBe('· · ·');
    expect(speakLength('')).toBe('');
  });
});

describe('phrases', () => {
  it('exposure', () => {
    const fmt = (n: number) => `${n}s`;
    expect(exposureAnnouncement(14.2, fmt)).toBe('New time 14.2 seconds');
    expect(exposureAnnouncement(Infinity, fmt)).toBeNull();
    expect(exposureAnnouncement(Number.NaN, fmt)).toBeNull();
  });

  it('resize', () => {
    expect(resizeAnnouncement('14.2')).toBe('New time 14.2 seconds');
    expect(resizeAnnouncement('')).toBeNull();
    expect(resizeAnnouncement('NaN')).toBeNull();
  });

  it('reciprocity', () => {
    const fmt = () => '2m 5s';
    expect(reciprocityAnnouncement(125, fmt)).toBe(
      'Adjusted exposure 2 minutes 5 seconds'
    );
    expect(reciprocityAnnouncement(Infinity, fmt)).toBeNull();
  });

  it('lens', () => {
    const fmt = (n: number) => `${n}mm`;
    expect(lensAnnouncement(75, fmt, 'Full frame')).toBe(
      'Equivalent focal length 75 millimeters on Full frame'
    );
    expect(lensAnnouncement(Infinity, fmt, 'Full frame')).toBeNull();
  });

  it('mat is silent while invalid', () => {
    expect(matAnnouncement(false, '· · ·', '· · ·')).toBeNull();
    expect(matAnnouncement(true, '8 3/4"', '10 3/4"')).toBe(
      'Window opening 8 and three quarters inches by 10 and three quarters inches'
    );
  });

  it('camera exposure', () => {
    expect(cameraExposureAnnouncement(12)).toBe('Exposure value 12');
  });

  it('border', () => {
    expect(borderAnnouncement('7"', '9"', '8×10')).toBe(
      'Border layout, image 7 inches by 9 inches on 8 by 10 paper'
    );
    expect(borderAnnouncement('17.8cm', '22.9cm', '8×10')).toBe(
      'Border layout, image 17.8 centimeters by 22.9 centimeters on 8 by 10 paper'
    );
  });
});
