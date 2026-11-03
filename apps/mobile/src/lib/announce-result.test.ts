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

describe('phrases', () => {
  it('exposure', () => {
    expect(exposureAnnouncement('14.2s')).toBe('New time 14.2 seconds');
  });

  it('resize', () => {
    expect(resizeAnnouncement('14.2')).toBe('New time 14.2 seconds');
    expect(resizeAnnouncement('')).toBeNull();
    expect(resizeAnnouncement('NaN')).toBeNull();
  });

  it('reciprocity', () => {
    expect(reciprocityAnnouncement('2m 5s')).toBe(
      'Adjusted exposure 2 minutes 5 seconds'
    );
  });

  it('lens', () => {
    expect(lensAnnouncement('75mm', 'Full frame')).toBe(
      'Equivalent focal length 75 millimeters on Full frame'
    );
  });

  it('mat is silent while invalid', () => {
    expect(matAnnouncement(false, '· · ·', '· · ·')).toBeNull();
    expect(matAnnouncement(true, '8 3/4"', '10 3/4"')).toBe(
      'Window opening 8 3/4" by 10 3/4"'
    );
  });

  it('camera exposure', () => {
    expect(cameraExposureAnnouncement(12)).toBe('Exposure value 12');
  });

  it('border', () => {
    expect(borderAnnouncement('7" × 9" image on 8×10')).toBe(
      'Border layout, 7" × 9" image on 8×10'
    );
  });
});
