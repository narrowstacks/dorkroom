import { describe, expect, it } from 'vitest';
import { shouldIgnoreExportTap, TAP_WINDOW_MS } from './export-tap-guard';

describe('shouldIgnoreExportTap', () => {
  it('ignores a tap while exporting', () => {
    expect(
      shouldIgnoreExportTap({ exporting: true, now: 10_000, lastShareCall: 0 })
    ).toBe(true);
  });

  it('ignores a tap inside the window after the share call', () => {
    expect(
      shouldIgnoreExportTap({
        exporting: false,
        now: 5_000 + TAP_WINDOW_MS - 1,
        lastShareCall: 5_000,
      })
    ).toBe(true);
    expect(
      shouldIgnoreExportTap({
        exporting: false,
        now: 5_000,
        lastShareCall: 5_000,
      })
    ).toBe(true);
  });

  it('allows a tap once the window has passed', () => {
    expect(
      shouldIgnoreExportTap({
        exporting: false,
        now: 5_000 + TAP_WINDOW_MS,
        lastShareCall: 5_000,
      })
    ).toBe(false);
  });

  it('allows the first tap', () => {
    expect(
      shouldIgnoreExportTap({
        exporting: false,
        now: 1_700_000_000_000,
        lastShareCall: 0,
      })
    ).toBe(false);
  });

  it('does not lock out a tap when the clock went backwards', () => {
    expect(
      shouldIgnoreExportTap({
        exporting: false,
        now: 1_000,
        lastShareCall: 9_000,
      })
    ).toBe(false);
  });

  it('still ignores a tap while exporting when the clock went backwards', () => {
    expect(
      shouldIgnoreExportTap({
        exporting: true,
        now: 1_000,
        lastShareCall: 9_000,
      })
    ).toBe(true);
  });
});
