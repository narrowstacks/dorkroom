import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createResultRecorder,
  formatReadoutSummary,
  RECORD_DELAY_MS,
} from './result-recorder';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('createResultRecorder', () => {
  it('coalesces a drag into the value it settles on', () => {
    const write = vi.fn();
    const recorder = createResultRecorder(write);
    recorder.report('exposure', '12 s');
    recorder.report('exposure', '13 s');
    vi.advanceTimersByTime(RECORD_DELAY_MS - 1);
    recorder.report('exposure', '14 s');
    vi.advanceTimersByTime(RECORD_DELAY_MS - 1);
    expect(write).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith('exposure', '14 s');
  });

  it('writes the pending value when the screen goes away', () => {
    const write = vi.fn();
    const recorder = createResultRecorder(write);
    recorder.report('lens', '50 mm');
    recorder.report('lens', '85 mm');
    recorder.flush();
    expect(write).toHaveBeenCalledWith('lens', '85 mm');
    vi.advanceTimersByTime(RECORD_DELAY_MS * 2);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('does not write the value the screen opened with', () => {
    const write = vi.fn();
    const recorder = createResultRecorder(write);
    recorder.report('resize', '20 s');
    vi.advanceTimersByTime(RECORD_DELAY_MS * 2);
    recorder.flush();
    expect(write).not.toHaveBeenCalled();
  });

  it('writes after the value changes, including back to the opening value', () => {
    const write = vi.fn();
    const recorder = createResultRecorder(write);
    recorder.report('resize', '20 s');
    recorder.report('resize', '24 s');
    vi.advanceTimersByTime(RECORD_DELAY_MS);
    recorder.report('resize', '20 s');
    vi.advanceTimersByTime(RECORD_DELAY_MS);
    expect(write.mock.calls).toEqual([
      ['resize', '24 s'],
      ['resize', '20 s'],
    ]);
  });

  it('writes the value on screen when leaving after A, B, A', () => {
    const write = vi.fn();
    const recorder = createResultRecorder(write);
    recorder.report('exposure', 'A');
    recorder.report('exposure', 'B');
    vi.advanceTimersByTime(RECORD_DELAY_MS);
    recorder.report('exposure', 'A');
    // Leaving inside the quiet period: the flush must write A, not leave B.
    recorder.flush();
    expect(write.mock.calls).toEqual([
      ['exposure', 'B'],
      ['exposure', 'A'],
    ]);
  });

  it('does not write a withdrawn result, nor one without a tool', () => {
    const write = vi.fn();
    const recorder = createResultRecorder(write);
    recorder.report('mat', '1 in');
    recorder.report('mat', '2 in');
    recorder.report('mat', null);
    recorder.flush();
    recorder.report(undefined, '3 in');
    recorder.flush();
    vi.advanceTimersByTime(RECORD_DELAY_MS * 2);
    expect(write).not.toHaveBeenCalled();
  });

  it('flush with nothing pending is harmless', () => {
    const write = vi.fn();
    createResultRecorder(write).flush();
    expect(write).not.toHaveBeenCalled();
  });
});

describe('formatReadoutSummary', () => {
  it('sets a unit right against its value, like every other tool writes a time', () => {
    expect(formatReadoutSummary('20', 's')).toBe('20s');
    expect(formatReadoutSummary('22.5', 's')).toBe('22.5s');
    expect(formatReadoutSummary('17m 2.2s')).toBe('17m 2.2s');
    expect(formatReadoutSummary('EV 7')).toBe('EV 7');
    expect(formatReadoutSummary('85 mm')).toBe('85 mm');
  });

  it('is null when there is no result', () => {
    expect(formatReadoutSummary(null, 's')).toBeNull();
    expect(formatReadoutSummary('')).toBeNull();
  });
});
