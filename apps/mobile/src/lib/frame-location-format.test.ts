import { describe, expect, it } from 'vitest';
import {
  describeLocation,
  formatAccuracy,
  formatAccuracyMeters,
  formatCoordinateNumber,
  formatCoordinates,
  formatCoordinatesCompact,
  gateStatus,
  isCommitDisabled,
  isUsableLocation,
  locationFromPosition,
} from './frame-location-format';

const now = new Date('2026-11-13T23:04:05.000Z');
const fix = (coords: {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
}) => ({
  coords: { altitude: null, accuracy: null, ...coords },
});

describe('formatCoordinates', () => {
  it('writes four decimals with hemispheres', () => {
    expect(
      formatCoordinates({ latitude: 37.77490001, longitude: -122.4194 })
    ).toBe('37.7749° N, 122.4194° W');
    expect(formatCoordinates({ latitude: -33.8688, longitude: 151.2093 })).toBe(
      '33.8688° S, 151.2093° E'
    );
  });

  it('reads zero as north and east', () => {
    expect(formatCoordinates({ latitude: 0, longitude: -0 })).toBe(
      '0.0000° N, 0.0000° E'
    );
  });

  it('has a compact form', () => {
    expect(
      formatCoordinatesCompact({ latitude: 37.7749, longitude: -122.4194 })
    ).toBe('37.77 N 122.42 W');
  });
});

describe('isUsableLocation', () => {
  it('accepts coordinates on the globe, edges included', () => {
    expect(isUsableLocation({ latitude: 90, longitude: -180 })).toBe(true);
    expect(isUsableLocation({ latitude: 0, longitude: 0 })).toBe(true);
  });

  it('rejects missing, out of range and non finite values', () => {
    expect(isUsableLocation(undefined)).toBe(false);
    expect(isUsableLocation(null)).toBe(false);
    expect(isUsableLocation({ latitude: 1 })).toBe(false);
    expect(isUsableLocation({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isUsableLocation({ latitude: 0, longitude: 181 })).toBe(false);
    expect(isUsableLocation({ latitude: Number.NaN, longitude: 0 })).toBe(
      false
    );
    expect(
      isUsableLocation({ latitude: 0, longitude: Number.POSITIVE_INFINITY })
    ).toBe(false);
  });
});

describe('locationFromPosition', () => {
  it('maps a full fix and rounds coordinates to 6 decimals', () => {
    expect(
      locationFromPosition(
        fix({
          latitude: 37.774912345678,
          longitude: -122.419412345678,
          accuracy: 12.34,
          altitude: 15.96,
        }),
        now
      )
    ).toEqual({
      latitude: 37.774912,
      longitude: -122.419412,
      accuracyMeters: 12.3,
      altitudeMeters: 16,
      capturedAt: '2026-11-13T23:04:05.000Z',
    });
  });

  it('drops null, negative and non finite accuracy and altitude', () => {
    const location = locationFromPosition(
      fix({
        latitude: 1,
        longitude: 2,
        accuracy: -1,
        altitude: Number.NaN,
      }),
      now
    );
    expect(location).toEqual({
      latitude: 1,
      longitude: 2,
      capturedAt: '2026-11-13T23:04:05.000Z',
    });
  });

  it('returns nothing for an unusable fix', () => {
    expect(
      locationFromPosition(fix({ latitude: Number.NaN, longitude: 2 }), now)
    ).toBeUndefined();
    expect(
      locationFromPosition(fix({ latitude: 95, longitude: 2 }), now)
    ).toBeUndefined();
  });
});

describe('formatCoordinateNumber', () => {
  it('writes a plain decimal with 6 places', () => {
    expect(formatCoordinateNumber(37.7749)).toBe('37.774900');
    expect(formatCoordinateNumber(-122.419412)).toBe('-122.419412');
    expect(formatCoordinateNumber(0.0000001)).toBe('0.000000');
  });

  it('is empty when absent or not finite', () => {
    expect(formatCoordinateNumber(undefined)).toBe('');
    expect(formatCoordinateNumber(Number.NaN)).toBe('');
  });
});

describe('negative zero', () => {
  it('never prints a signed zero', () => {
    expect(
      formatCoordinates({ latitude: -0.0000001, longitude: -0.0000004 })
    ).toBe('0.0000° N, 0.0000° E');
    expect(
      formatCoordinatesCompact({ latitude: -0.0000001, longitude: 0 })
    ).toBe('0.00 N 0.00 E');
    expect(formatCoordinateNumber(-0.0000001)).toBe('0.000000');
    expect(formatCoordinateNumber(-0.000001)).toBe('-0.000001');
  });
});

describe('formatAccuracy', () => {
  it('reads meters under a kilometer and kilometers above', () => {
    expect(formatAccuracy(12.4)).toBe('±12 m');
    expect(formatAccuracy(999.4)).toBe('±999 m');
    expect(formatAccuracy(1000)).toBe('±1.0 km');
    expect(formatAccuracy(2540)).toBe('±2.5 km');
  });

  it('is empty when unknown', () => {
    expect(formatAccuracy(undefined)).toBe('');
    expect(formatAccuracy(Number.NaN)).toBe('');
    expect(formatAccuracy(-1)).toBe('');
  });

  it('writes integer meters for the CSV', () => {
    expect(formatAccuracyMeters(12.6)).toBe('13');
    expect(formatAccuracyMeters(undefined)).toBe('');
  });
});

describe('describeLocation', () => {
  const at = { latitude: 37.774912, longitude: -122.419412 };

  it('shows 4 decimals and no accuracy for a precise fix', () => {
    expect(describeLocation({ ...at, accuracyMeters: 100 })).toEqual({
      text: '37.7749° N, 122.4194° W',
      accuracy: '',
    });
    expect(describeLocation(at).accuracy).toBe('');
  });

  it('shows 2 decimals and the accuracy for a coarse fix', () => {
    expect(describeLocation({ ...at, accuracyMeters: 2500 })).toEqual({
      text: '37.77° N, 122.42° W',
      accuracy: '±2.5 km',
    });
  });
});

describe('isCommitDisabled', () => {
  it('holds Log or Save while a location is being found', () => {
    expect(isCommitDisabled({ locating: true })).toBe(true);
    expect(isCommitDisabled({ locating: false })).toBe(false);
  });

  it('keeps the other reasons', () => {
    expect(isCommitDisabled({ locating: false, blocked: true })).toBe(true);
    expect(isCommitDisabled({ locating: false, rollGone: true })).toBe(true);
  });
});

describe('capturedAt', () => {
  it("uses the fix's own timestamp, else the call time", () => {
    const stamp = Date.UTC(2026, 10, 13, 20, 0, 0);
    const base = {
      coords: { latitude: 1, longitude: 2, altitude: null, accuracy: null },
    };
    expect(
      locationFromPosition({ ...base, timestamp: stamp }, now)?.capturedAt
    ).toBe('2026-11-13T20:00:00.000Z');
    expect(locationFromPosition(base, now)?.capturedAt).toBe(now.toISOString());
    expect(
      locationFromPosition({ ...base, timestamp: Number.NaN }, now)?.capturedAt
    ).toBe(now.toISOString());
    expect(
      locationFromPosition({ ...base, timestamp: 1e20 }, now)?.capturedAt
    ).toBe(now.toISOString());
  });
});

describe('gateStatus', () => {
  it('reports Location Services off before anything else', () => {
    expect(gateStatus({ servicesEnabled: false, granted: false })).toBe(
      'servicesOff'
    );
    expect(gateStatus({ servicesEnabled: false, granted: true })).toBe(
      'servicesOff'
    );
  });

  it('reports a denied permission with services on', () => {
    expect(gateStatus({ servicesEnabled: true, granted: false })).toBe(
      'denied'
    );
  });

  it('lets a granted permission with services on continue', () => {
    expect(gateStatus({ servicesEnabled: true, granted: true })).toBe('ok');
  });
});
