import { describe, expect, it } from 'vitest';
import { summarizeEasel } from './easel-summary';

describe('summarizeEasel', () => {
  it('is null with nothing stored or an unreadable snapshot', () => {
    expect(summarizeEasel(undefined, 'imperial')).toBeNull();
    expect(summarizeEasel('', 'imperial')).toBeNull();
    expect(summarizeEasel('not json', 'imperial')).toBeNull();
    expect(summarizeEasel('[1,2]', 'imperial')).toBeNull();
  });

  it('describes the stored setup', () => {
    const summary = summarizeEasel(
      JSON.stringify({
        paperSize: '11x14',
        aspectRatio: '7:6',
        minBorder: 0.5,
        enableOffset: false,
      }),
      'imperial'
    );
    expect(summary).not.toBeNull();
    // Paper is named as the Border screen names it: oriented, width first.
    expect(summary?.title).toBe('11.67" × 10" image on 14×11');
    expect(summary?.detail).toBe('7:6 print, 0.5" minimum border, centered');
  });

  it('shows lengths in the chosen unit', () => {
    const summary = summarizeEasel(
      JSON.stringify({ paperSize: '8x10', minBorder: 0.5 }),
      'metric'
    );
    expect(summary?.detail).toContain('cm');
  });

  it('fills what the snapshot leaves out from the defaults', () => {
    expect(summarizeEasel('{}', 'imperial')).not.toBeNull();
  });
});
