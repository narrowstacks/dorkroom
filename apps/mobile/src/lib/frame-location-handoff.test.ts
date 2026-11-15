import { afterEach, describe, expect, it } from 'vitest';
import {
  clearFrameLocationHandoff,
  peekFrameLocationHandoff,
  setFrameLocationHandoff,
} from './frame-location-handoff';

const location = { latitude: 37.7749, longitude: -122.4194 };

afterEach(clearFrameLocationHandoff);

describe('frame location hand-off', () => {
  it('delivers only to the matching capture', () => {
    setFrameLocationHandoff('a.jpg', location);
    expect(peekFrameLocationHandoff('b.jpg')).toBeUndefined();
    expect(peekFrameLocationHandoff('a.jpg')).toEqual(location);
  });

  it('is replaced by a newer capture', () => {
    setFrameLocationHandoff('a.jpg', location);
    setFrameLocationHandoff('b.jpg', { latitude: 1, longitude: 2 });
    expect(peekFrameLocationHandoff('a.jpg')).toBeUndefined();
    expect(peekFrameLocationHandoff('b.jpg')).toEqual({
      latitude: 1,
      longitude: 2,
    });
  });

  it('peek leaves it for clear to drop, and a missing key gets nothing', () => {
    setFrameLocationHandoff('a.jpg', location);
    expect(peekFrameLocationHandoff(undefined)).toBeUndefined();
    expect(peekFrameLocationHandoff('a.jpg')).toEqual(location);
    clearFrameLocationHandoff();
    expect(peekFrameLocationHandoff('a.jpg')).toBeUndefined();
  });
});
