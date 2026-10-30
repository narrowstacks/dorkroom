import { encodePreset } from '@dorkroom/logic';
import { MeasurementProvider } from '@dorkroom/ui';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBorderCalculatorController } from '../use-border-calculator-controller';

function wrapper({ children }: { children: ReactNode }) {
  return <MeasurementProvider>{children}</MeasurementProvider>;
}

const shareEvent = (method: string) => [
  'event',
  { name: 'share', data: { tool: 'border', method }, options: undefined },
];

function stubClipboard(writeText?: (text: string) => Promise<void>) {
  vi.stubGlobal('navigator', {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    maxTouchPoints: 0,
    ...(writeText ? { clipboard: { writeText } } : {}),
  });
}

const renderController = () =>
  renderHook(() => useBorderCalculatorController(), { wrapper }).result;

/**
 * Pins the border share modal: the link it shows and the `share` event the
 * copy button sends. `window.va` is the queue `@vercel/analytics` forwards to.
 */
describe('useBorderCalculatorController sharing', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/border');
    window.va = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete window.va;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('asks for a name before sharing unsaved settings', async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const result = renderController();

    await act(() => result.current.handleShareClick());

    expect(result.current.isSaveBeforeShareOpen).toBe(true);
    expect(result.current.isShareModalOpen).toBe(false);
  });

  it('shows the link for named settings', async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const result = renderController();

    act(() => result.current.setPresetName('  My preset  '));
    await act(() => result.current.handleShareClick());

    expect(result.current.isShareModalOpen).toBe(true);
    expect(result.current.shareUrls).toEqual({
      webUrl: `http://localhost:3000/border?preset=${encodePreset({
        name: 'My preset',
        settings: result.current.currentSettings,
      })}`,
    });
  });

  it('shares a matched saved preset under its own name', async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const result = renderController();

    await act(() => result.current.handleSaveAndShare('Saved'));
    act(() => result.current.setIsShareModalOpen(false));
    act(() => result.current.setPresetName(''));
    await act(() => result.current.handleShareClick());

    expect(result.current.isSaveBeforeShareOpen).toBe(false);
    expect(result.current.shareUrls?.webUrl).toBe(
      `http://localhost:3000/border?preset=${encodePreset({
        name: 'Saved',
        settings: result.current.currentSettings,
      })}`
    );
  });

  it('saves then shows the link', async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const result = renderController();

    await act(() => result.current.handleSaveAndShare('Saved'));

    expect(result.current.isSaveBeforeShareOpen).toBe(false);
    expect(result.current.isShareModalOpen).toBe(true);
    expect(result.current.shareUrls?.webUrl).toBe(
      `http://localhost:3000/border?preset=${encodePreset({
        name: 'Saved',
        settings: result.current.currentSettings,
      })}`
    );
    expect(result.current.presets.some((p) => p.name === 'Saved')).toBe(true);
  });

  it('copies the link and tracks a clipboard share', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const result = renderController();

    expect(result.current.canCopyToClipboard).toBe(true);
    expect(result.current.canShareNatively).toBe(false);
    await act(() => result.current.handleCopyToClipboard('https://x.test/a'));

    expect(writeText).toHaveBeenCalledWith('https://x.test/a');
    expect(window.va).toHaveBeenCalledTimes(1);
    expect(window.va).toHaveBeenCalledWith(...shareEvent('clipboard'));
  });

  it('rethrows a failed copy without tracking it', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    const result = renderController();

    await expect(
      act(() => result.current.handleCopyToClipboard('https://x.test/a'))
    ).rejects.toThrow('denied');
    expect(window.va).not.toHaveBeenCalled();
  });

  it('reports no clipboard support when the API is missing', () => {
    stubClipboard();
    const result = renderController();

    expect(result.current.canCopyToClipboard).toBe(false);
  });
});
