import { describe, expect, it } from 'vitest';
import type { Shot } from '@/schemas/film-log.schema';
import {
  FRAME_NUMBER_COLUMN_WIDTH,
  frameNumberColumnWidth,
  frameNumberLabel,
  frameRowText,
} from './frame-row-text';

function shot(over: Partial<Shot> = {}): Shot {
  return { id: 's1', frameNumber: 7, source: 'manual', ...over };
}

const LOCATION = { latitude: 37.7955, longitude: -122.3937 };

describe('frameNumberLabel', () => {
  it('pads to two digits like an edge number', () => {
    expect(frameNumberLabel(7)).toBe('07');
    expect(frameNumberLabel(36)).toBe('36');
    expect(frameNumberLabel(112)).toBe('112');
  });
});

describe('frameRowText', () => {
  it('shows aperture and shutter, then lens and place', () => {
    const text = frameRowText(
      shot({ aperture: 8, shutterSpeed: 1 / 125, place: 'Embarcadero' }),
      'Color Skopar'
    );
    expect(text.number).toBe('07');
    expect(text.exposure).toBe('f/8 · 1/125');
    expect(text.detail).toBe('Color Skopar · Embarcadero');
  });

  it('never repeats the ISO, and says when no exposure is set', () => {
    const text = frameRowText(shot(), undefined);
    expect(text.exposure).toBe('No exposure set');
    expect(text.exposure).not.toContain('ISO');
    expect(text.detail).toBe('');
  });

  it('keeps a back override, and the first line of the notes', () => {
    const text = frameRowText(
      shot({
        back: 'Holder 3',
        notes: '  Window light\nPushed one stop',
        place: ' ',
      }),
      undefined
    );
    expect(text.detail).toBe('Holder 3');
    expect(text.notes).toBe('Window light');
    expect(text.accessibilityLabel).toBe(
      'Frame 7, No exposure set, Holder 3, Window light'
    );
    expect(frameRowText(shot({ notes: '  ' }), undefined).notes).toBe('');
  });

  it('reads everything, the glyphs included, as one label without coordinates', () => {
    const text = frameRowText(
      shot({
        aperture: 8,
        shutterSpeed: 1 / 125,
        place: 'Embarcadero',
        location: LOCATION,
        source: 'meter',
      }),
      'Color Skopar'
    );
    expect(text.located).toBe(true);
    expect(text.fromMeter).toBe(true);
    expect(text.accessibilityLabel).toBe(
      'Frame 7, f/8, 1/125, Color Skopar, Embarcadero, has location, logged from the Meter'
    );
    expect(text.accessibilityLabel).not.toMatch(/37\.|122\./);
  });

  it('mentions a photo, and a missing exposure', () => {
    const text = frameRowText(
      shot({
        photo: {
          fileName: 'a.jpg',
          width: 1,
          height: 1,
          capturedAt: '2026-11-13T00:00:00.000Z',
          source: 'meter',
        },
      }),
      undefined
    );
    expect(text.accessibilityLabel).toBe('Frame 7, No exposure set, has photo');
  });

  it('treats an unusable location as none', () => {
    expect(
      frameRowText(
        shot({ location: { latitude: Number.NaN, longitude: 0 } }),
        undefined
      ).located
    ).toBe(false);
  });
});

describe('frameNumberColumnWidth', () => {
  it('fits three digits and scales with the text size', () => {
    expect(frameNumberColumnWidth(1)).toBe(FRAME_NUMBER_COLUMN_WIDTH);
    expect(frameNumberColumnWidth(1.35)).toBe(
      Math.ceil(FRAME_NUMBER_COLUMN_WIDTH * 1.35)
    );
    expect(frameNumberColumnWidth(3.1)).toBeGreaterThan(
      frameNumberColumnWidth(1.35)
    );
  });

  it('falls back to the normal width for a bad scale', () => {
    expect(frameNumberColumnWidth(0)).toBe(FRAME_NUMBER_COLUMN_WIDTH);
    expect(frameNumberColumnWidth(Number.NaN)).toBe(FRAME_NUMBER_COLUMN_WIDTH);
  });
});
