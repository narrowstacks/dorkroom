import { describe, expect, it } from 'vitest';
import { landCapture, rollChanged, takeCapture } from './meter-capture-keeping';

const cap = (rollId: string, fileName: string) => ({ rollId, fileName });

describe('landCapture', () => {
  it('makes a capture for the active roll current', () => {
    expect(landCapture(null, cap('r1', 'a'), 'r1')).toEqual({
      current: cap('r1', 'a'),
      discard: [],
    });
  });

  it('deletes the capture it replaces', () => {
    expect(landCapture(cap('r1', 'a'), cap('r1', 'b'), 'r1')).toEqual({
      current: cap('r1', 'b'),
      discard: ['a'],
    });
  });

  it('deletes a capture that lands after the roll changed, keeping the current one', () => {
    expect(landCapture(null, cap('r1', 'a'), 'r2')).toEqual({
      current: null,
      discard: ['a'],
    });
    expect(landCapture(cap('r2', 'x'), cap('r1', 'a'), 'r2')).toEqual({
      current: cap('r2', 'x'),
      discard: ['a'],
    });
  });

  it('deletes a capture that lands when there is no active roll', () => {
    expect(landCapture(null, cap('r1', 'a'), undefined).discard).toEqual(['a']);
  });
});

describe('rollChanged', () => {
  it('keeps a capture for the active roll', () => {
    expect(rollChanged(cap('r1', 'a'), 'r1')).toEqual({
      current: cap('r1', 'a'),
      discard: [],
    });
    expect(rollChanged(null, 'r1')).toEqual({ current: null, discard: [] });
  });

  it('deletes a capture for another roll or for no roll', () => {
    expect(rollChanged(cap('r1', 'a'), 'r2')).toEqual({
      current: null,
      discard: ['a'],
    });
    expect(rollChanged(cap('r1', 'a'), undefined).discard).toEqual(['a']);
  });
});

describe('takeCapture', () => {
  it('takes the current capture once', () => {
    const first = takeCapture(cap('r1', 'a'), 'a');
    expect(first).toEqual({ taken: cap('r1', 'a'), current: null });
    expect(takeCapture(first.current, 'a').taken).toBeNull();
  });

  it('ignores a stale name and leaves a newer capture alone', () => {
    expect(takeCapture(cap('r1', 'b'), 'a')).toEqual({
      taken: null,
      current: cap('r1', 'b'),
    });
  });
});
