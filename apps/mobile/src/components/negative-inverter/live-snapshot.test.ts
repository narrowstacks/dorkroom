import { describe, expect, it } from 'vitest';
import {
  EXPOSURE_SETTLE_MS,
  exposureSettled,
  IDLE_SNAPSHOT_CLOCK,
  SNAPSHOT_INTERVAL_MS,
  SNAPSHOT_SAME_MEAN,
  SNAPSHOT_TIMEOUT_MS,
  snapshotChanged,
  snapshotDue,
  snapshotReceived,
  snapshotRequested,
} from './live-snapshot';

describe('snapshot pacing', () => {
  it('asks at once the first time', () => {
    expect(snapshotDue(IDLE_SNAPSHOT_CLOCK, 0)).toBe(true);
  });

  it('waits for the snapshot on its way', () => {
    const clock = snapshotRequested(1000);
    expect(snapshotDue(clock, 1000 + SNAPSHOT_INTERVAL_MS * 2)).toBe(false);
  });

  it('asks again once the interval has passed after it arrived', () => {
    const clock = snapshotReceived(snapshotRequested(1000));
    expect(snapshotDue(clock, 1000 + SNAPSHOT_INTERVAL_MS - 1)).toBe(false);
    expect(snapshotDue(clock, 1000 + SNAPSHOT_INTERVAL_MS)).toBe(true);
  });

  it('gives up on a snapshot that never came', () => {
    const clock = snapshotRequested(1000);
    expect(snapshotDue(clock, 1000 + SNAPSHOT_TIMEOUT_MS - 1)).toBe(false);
    expect(snapshotDue(clock, 1000 + SNAPSHOT_TIMEOUT_MS)).toBe(true);
  });
});

describe('exposureSettled', () => {
  it('is settled before any change', () => {
    expect(exposureSettled(null, 0)).toBe(true);
  });

  it('waits for auto-exposure to follow a change', () => {
    expect(exposureSettled(500, 500 + EXPOSURE_SETTLE_MS - 1)).toBe(false);
    expect(exposureSettled(500, 500 + EXPOSURE_SETTLE_MS)).toBe(true);
  });
});

describe('snapshotChanged', () => {
  const flat = (v: number, width = 16, height = 12) => ({
    data: new Uint8Array(width * height * 4).fill(v),
    width,
    height,
  });

  it('is a change with nothing to compare to, or a new size', () => {
    expect(snapshotChanged(null, flat(10))).toBe(true);
    expect(snapshotChanged(flat(10), flat(10, 12, 16))).toBe(true);
  });

  it('ignores sensor noise', () => {
    expect(snapshotChanged(flat(100), flat(100 + SNAPSHOT_SAME_MEAN))).toBe(
      false
    );
  });

  it('sees a real change', () => {
    expect(snapshotChanged(flat(100), flat(110))).toBe(true);
  });
});
