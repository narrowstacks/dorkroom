/**
 * Pins what every share path produces: the exact link for each payload type
 * and host, and which fallback (native sheet, clipboard, manual) is chosen for
 * each combination of `navigator.share` and `navigator.clipboard` support.
 *
 * Written against the pre-#447 hooks so the share-link refactor could be
 * checked against them; the expectations must not move.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_BORDER_PRESETS } from '../../constants/border-calculator';
import { useCalculatorSharing } from '../../hooks/border-calculator/use-calculator-sharing';
import { useRecipeSharing } from '../../hooks/development-recipes/use-recipe-sharing';
import type { CustomRecipe } from '../../types/custom-recipes';
import {
  buildPresetShareUrl,
  encodePreset,
  type PresetToShare,
} from '../../utils/preset-sharing';
import { encodeCustomRecipe } from '../../utils/recipe-sharing';

// ---------------------------------------------------------------------------
// Adapters: the only part of this file that names the implementation.
// ---------------------------------------------------------------------------

/** The link the border calculator's share modal shows for a preset. */
function borderShareUrl(preset: PresetToShare): string {
  const url = buildPresetShareUrl(preset);
  if (!url) throw new Error('preset failed to encode');
  return url;
}

/**
 * Opens the border share modal on a preset, then runs its native-first share.
 * `reportedMethod` is what reaches analytics; `modalOpen` and `shownUrl` are
 * the modal and the link it shows afterwards.
 */
async function shareBorderPreset(preset: PresetToShare) {
  const onShared = vi.fn();
  const { result } = renderHook(() =>
    useCalculatorSharing({
      presets: [],
      currentSettings: preset.settings,
      presetName: preset.name,
      onAddPreset: vi.fn(),
      onShared,
    })
  );
  await act(() => result.current.handleShareClick());
  await act(() => result.current.handleNativeShare());
  expect(onShared.mock.calls.length).toBeLessThanOrEqual(1);
  // The link that went out travels with the method, for per-link dedupe.
  if (onShared.mock.calls[0]) {
    expect(onShared.mock.calls[0][1]).toBe(result.current.shareUrls?.webUrl);
  }
  return {
    reportedMethod: onShared.mock.calls[0]?.[0],
    modalOpen: result.current.isShareModalOpen,
    shownUrl: result.current.shareUrls?.webUrl,
  };
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

/** Points `window.location` (the page the link is built from) at `url`. */
const setUrl = (url: string) => {
  vi.stubGlobal('location', new URL(url));
};

/** The slice of `navigator` the share flow reads. */
interface FakeNavigator {
  userAgent: string;
  maxTouchPoints: number;
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

interface FakeNavigatorOptions {
  share?: (data: ShareData) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
}

/**
 * Stubs `navigator` as a touch phone (so `shouldUseWebShare` is decided by
 * whether `share` exists) with optional Web Share and Clipboard APIs.
 */
function stubNavigator({ share, writeText }: FakeNavigatorOptions = {}) {
  const fake: FakeNavigator = {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    maxTouchPoints: 5,
  };
  if (share) fake.share = share;
  if (writeText) fake.clipboard = { writeText };
  vi.stubGlobal('navigator', fake);
}

const abortError = () =>
  Object.assign(new Error('Share canceled'), { name: 'AbortError' });

const borderPreset: PresetToShare = {
  name: 'My 8x10 & friends',
  settings: DEFAULT_BORDER_PRESETS[0].settings,
};

const customRecipe: CustomRecipe = {
  id: 'recipe-123',
  name: 'Test Recipe',
  filmId: 'film-456',
  developerId: 'developer-789',
  temperatureF: 68,
  timeMinutes: 8.5,
  shootingIso: 400,
  pushPull: 0,
  agitationSchedule: 'Continuous for first 30s, then 10s every minute',
  notes: 'Notes',
  dilutionId: '1',
  customDilution: '1+1',
  isCustomFilm: false,
  isCustomDeveloper: false,
  isPublic: true,
  dateCreated: '2024-01-01T00:00:00.000Z',
  dateModified: '2024-01-01T00:00:00.000Z',
};

const regularRecipe = {
  recipeId: 'abc-123',
  recipeName: 'HC-110 B',
  filmSlug: 'kodak-tri-x-400',
  developerSlug: 'kodak-hc-110',
};

const renderRecipeSharing = () => renderHook(() => useRecipeSharing()).result;

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Generated links
// ---------------------------------------------------------------------------

describe('share link URLs', () => {
  const encodedPreset = encodePreset(borderPreset);
  const encodedRecipe = encodeCustomRecipe(customRecipe);

  describe.each([
    {
      page: 'http://localhost:4200/border',
      border: 'http://localhost:4200',
      recipe: 'http://localhost:4200',
    },
    {
      page: 'http://127.0.0.1:4503/development',
      border: 'http://127.0.0.1:4503',
      recipe: 'http://127.0.0.1:4503',
    },
    // A LAN or Tailscale dev host: border links have always dropped the port
    // here while recipe links keep it.
    {
      page: 'http://192.168.1.5:4503/border',
      border: 'http://192.168.1.5',
      recipe: 'http://192.168.1.5:4503',
    },
    {
      page: 'https://dorkroom.art/development',
      border: 'https://dorkroom.art',
      recipe: 'https://dorkroom.art',
    },
  ])('on $page', ({ page, border, recipe }) => {
    beforeEach(() => setUrl(page));

    it('builds the border preset link', () => {
      expect(borderShareUrl(borderPreset)).toBe(
        `${border}/border?preset=${encodedPreset}`
      );
    });

    it('builds the regular recipe link', () => {
      const result = renderRecipeSharing();
      expect(result.current.generateRegularRecipeShareUrl(regularRecipe)).toBe(
        `${recipe}/development?film=kodak-tri-x-400&developer=kodak-hc-110&recipe=abc-123&source=share`
      );
    });

    it('builds the custom recipe link', () => {
      const result = renderRecipeSharing();
      expect(
        result.current.generateCustomRecipeShareUrl({ recipe: customRecipe })
      ).toBe(`${recipe}/development?recipe=${encodedRecipe}&source=share`);
    });
  });

  describe('regular recipe link options', () => {
    beforeEach(() => setUrl('https://dorkroom.art/development'));

    it('omits missing slugs and encodes the id', () => {
      const result = renderRecipeSharing();
      expect(
        result.current.generateRegularRecipeShareUrl({
          recipeId: 'id with space&x',
        })
      ).toBe(
        'https://dorkroom.art/development?recipe=id+with+space%26x&source=share'
      );
    });

    it('drops the source marker when asked', () => {
      const result = renderRecipeSharing();
      expect(
        result.current.generateRegularRecipeShareUrl({
          ...regularRecipe,
          includeSource: false,
        })
      ).toBe(
        'https://dorkroom.art/development?film=kodak-tri-x-400&developer=kodak-hc-110&recipe=abc-123'
      );
    });

    it('uses an explicit base URL', () => {
      const result = renderRecipeSharing();
      expect(
        result.current.generateRegularRecipeShareUrl({
          recipeId: 'r1',
          baseUrl: 'https://example.test',
        })
      ).toBe('https://example.test/development?recipe=r1&source=share');
    });
  });

  describe('custom recipe link options', () => {
    beforeEach(() => setUrl('https://dorkroom.art/development'));

    it('drops the source marker when asked', () => {
      const result = renderRecipeSharing();
      expect(
        result.current.generateCustomRecipeShareUrl({
          recipe: customRecipe,
          includeSource: false,
        })
      ).toBe(`https://dorkroom.art/development?recipe=${encodedRecipe}`);
    });

    it('uses an explicit base URL', () => {
      const result = renderRecipeSharing();
      expect(
        result.current.generateCustomRecipeShareUrl({
          recipe: customRecipe,
          baseUrl: 'https://example.test',
        })
      ).toBe(
        `https://example.test/development?recipe=${encodedRecipe}&source=share`
      );
    });
  });

  describe('without a browser window', () => {
    it('border links fall back to the beta host', () => {
      vi.stubGlobal('window', undefined);
      expect(borderShareUrl(borderPreset)).toBe(
        `https://beta.dorkroom.art/border?preset=${encodedPreset}`
      );
    });

    it('regular recipe links fall back to a relative path', () => {
      const result = renderRecipeSharing();
      vi.stubGlobal('window', undefined);
      expect(
        result.current.generateRegularRecipeShareUrl({ recipeId: 'r1' })
      ).toBe('/development?recipe=r1&source=share');
    });

    it('custom recipe links fall back to dorkroom.art', () => {
      const result = renderRecipeSharing();
      vi.stubGlobal('window', undefined);
      expect(
        result.current.generateCustomRecipeShareUrl({ recipe: customRecipe })
      ).toBe(
        `https://dorkroom.art/development?recipe=${encodedRecipe}&source=share`
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Fallback order
// ---------------------------------------------------------------------------

describe('border preset share fallback', () => {
  const url = () => borderShareUrl(borderPreset);

  beforeEach(() => setUrl('https://dorkroom.art/border'));

  it('opens the share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share, writeText });

    const outcome = await shareBorderPreset(borderPreset);

    expect(outcome).toEqual({
      reportedMethod: 'native',
      modalOpen: false,
      shownUrl: url(),
    });
    expect(share).toHaveBeenCalledWith({
      title: borderPreset.name,
      text: `Check out this border calculator preset: ${borderPreset.name}`,
      url: url(),
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('stops quietly when the user cancels the sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({
      share: vi.fn().mockRejectedValue(abortError()),
      writeText,
    });

    const outcome = await shareBorderPreset(borderPreset);

    expect(outcome).toEqual({
      reportedMethod: undefined,
      modalOpen: true,
      shownUrl: url(),
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the link when the sheet fails', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({
      share: vi.fn().mockRejectedValue(new Error('boom')),
      writeText,
    });

    const outcome = await shareBorderPreset(borderPreset);

    expect(outcome).toEqual({
      reportedMethod: 'clipboard',
      modalOpen: true,
      shownUrl: url(),
    });
    expect(writeText).toHaveBeenCalledWith(url());
  });

  it('copies the link when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ writeText });

    const outcome = await shareBorderPreset(borderPreset);

    expect(outcome.reportedMethod).toBe('clipboard');
    expect(writeText).toHaveBeenCalledWith(url());
  });

  it('falls back to manual copy when the clipboard write fails', async () => {
    stubNavigator({ writeText: vi.fn().mockRejectedValue(new Error('no')) });

    const outcome = await shareBorderPreset(borderPreset);

    expect(outcome).toEqual({
      reportedMethod: 'manual',
      modalOpen: true,
      shownUrl: url(),
    });
  });

  it('falls back to manual copy with no clipboard at all', async () => {
    stubNavigator();

    const outcome = await shareBorderPreset(borderPreset);

    expect(outcome.reportedMethod).toBe('manual');
    expect(outcome.shownUrl).toBe(url());
  });
});

describe('recipe share fallback', () => {
  const regularUrl =
    'https://dorkroom.art/development?film=kodak-tri-x-400&developer=kodak-hc-110&recipe=abc-123&source=share';
  const customUrl = () =>
    `https://dorkroom.art/development?recipe=${encodeCustomRecipe(customRecipe)}&source=share`;

  beforeEach(() => setUrl('https://dorkroom.art/development'));

  describe('regular recipe', () => {
    it('opens the share sheet when available', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubNavigator({ share, writeText });
      const result = renderRecipeSharing();

      await expect(
        result.current.shareRegularRecipe(regularRecipe)
      ).resolves.toEqual({
        success: true,
        method: 'webShare',
        url: regularUrl,
      });
      expect(share).toHaveBeenCalledWith({
        title: 'Development Recipe: HC-110 B',
        url: regularUrl,
      });
      expect(writeText).not.toHaveBeenCalled();
    });

    it('titles the sheet without a name when none is given', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      stubNavigator({ share });
      const result = renderRecipeSharing();

      await result.current.shareRegularRecipe({ recipeId: 'r1' });

      expect(share).toHaveBeenCalledWith({
        title: 'Development Recipe',
        url: 'https://dorkroom.art/development?recipe=r1&source=share',
      });
    });

    it('stops quietly when the user cancels the sheet', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubNavigator({
        share: vi.fn().mockRejectedValue(abortError()),
        writeText,
      });
      const result = renderRecipeSharing();

      await expect(
        result.current.shareRegularRecipe(regularRecipe)
      ).resolves.toEqual({ success: false, showToast: false });
      expect(writeText).not.toHaveBeenCalled();
    });

    it('copies the link when the sheet fails', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubNavigator({
        share: vi.fn().mockRejectedValue(new Error('boom')),
        writeText,
      });
      const result = renderRecipeSharing();

      await expect(
        result.current.shareRegularRecipe(regularRecipe)
      ).resolves.toEqual({
        success: true,
        method: 'clipboard',
        url: regularUrl,
        showToast: true,
      });
      expect(writeText).toHaveBeenCalledWith(regularUrl);
    });

    it('copies the link when there is no share sheet', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubNavigator({ writeText });
      const result = renderRecipeSharing();

      await expect(
        result.current.shareRegularRecipe(regularRecipe)
      ).resolves.toEqual({
        success: true,
        method: 'clipboard',
        url: regularUrl,
        showToast: true,
      });
    });

    it('reports a failed clipboard write', async () => {
      stubNavigator({ writeText: vi.fn().mockRejectedValue(new Error('no')) });
      const result = renderRecipeSharing();

      await expect(
        result.current.shareRegularRecipe(regularRecipe)
      ).resolves.toEqual({ success: false, error: 'no', showToast: true });
      await expect(
        result.current.copyRegularRecipeToClipboard(regularRecipe)
      ).resolves.toEqual({ success: false, error: 'no', showToast: true });
    });

    it('uses execCommand when there is no Clipboard API', async () => {
      stubNavigator();
      const execCommand = vi.fn().mockReturnValue(true);
      document.execCommand = execCommand;
      const result = renderRecipeSharing();

      await expect(
        result.current.shareRegularRecipe(regularRecipe)
      ).resolves.toEqual({
        success: true,
        method: 'clipboard',
        url: regularUrl,
        showToast: true,
      });
      expect(execCommand).toHaveBeenCalledWith('copy');
      expect(document.querySelector('textarea')).toBeNull();
    });

    it('copy never opens the share sheet', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubNavigator({ share, writeText });
      const result = renderRecipeSharing();

      await expect(
        result.current.copyRegularRecipeToClipboard(regularRecipe)
      ).resolves.toEqual({
        success: true,
        method: 'clipboard',
        url: regularUrl,
        showToast: true,
      });
      expect(share).not.toHaveBeenCalled();
      expect(writeText).toHaveBeenCalledWith(regularUrl);
    });
  });

  describe('custom recipe', () => {
    it('opens the share sheet when available', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      stubNavigator({ share, writeText: vi.fn() });
      const result = renderRecipeSharing();

      await expect(
        result.current.shareCustomRecipe({ recipe: customRecipe })
      ).resolves.toEqual({
        success: true,
        method: 'webShare',
        url: customUrl(),
      });
      expect(share).toHaveBeenCalledWith({
        title: 'Custom Development Recipe: Test Recipe',
        url: customUrl(),
      });
    });

    // Unlike the other two paths, a cancelled sheet has always fallen through
    // to the clipboard here.
    it('copies the link even when the user cancels the sheet', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubNavigator({
        share: vi.fn().mockRejectedValue(abortError()),
        writeText,
      });
      const result = renderRecipeSharing();

      await expect(
        result.current.shareCustomRecipe({ recipe: customRecipe })
      ).resolves.toEqual({
        success: true,
        method: 'clipboard',
        url: customUrl(),
        showToast: true,
      });
      expect(writeText).toHaveBeenCalledWith(customUrl());
    });

    it('copies the link when the sheet fails', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubNavigator({
        share: vi.fn().mockRejectedValue(new Error('boom')),
        writeText,
      });
      const result = renderRecipeSharing();

      await expect(
        result.current.shareCustomRecipe({ recipe: customRecipe })
      ).resolves.toEqual({
        success: true,
        method: 'clipboard',
        url: customUrl(),
        showToast: true,
      });
    });

    it('copies the link when there is no share sheet', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubNavigator({ writeText });
      const result = renderRecipeSharing();

      await expect(
        result.current.copyCustomRecipeToClipboard({ recipe: customRecipe })
      ).resolves.toEqual({
        success: true,
        method: 'clipboard',
        url: customUrl(),
        showToast: true,
      });
      expect(writeText).toHaveBeenCalledWith(customUrl());
    });

    it('reports a failed clipboard write', async () => {
      stubNavigator({ writeText: vi.fn().mockRejectedValue(new Error('no')) });
      const result = renderRecipeSharing();

      await expect(
        result.current.shareCustomRecipe({ recipe: customRecipe })
      ).resolves.toEqual({ success: false, error: 'no', showToast: true });
      await expect(
        result.current.copyCustomRecipeToClipboard({ recipe: customRecipe })
      ).resolves.toEqual({ success: false, error: 'no', showToast: true });
    });

    it('uses execCommand when there is no Clipboard API', async () => {
      stubNavigator();
      const execCommand = vi.fn().mockReturnValue(true);
      document.execCommand = execCommand;
      const result = renderRecipeSharing();

      await expect(
        result.current.shareCustomRecipe({ recipe: customRecipe })
      ).resolves.toEqual({
        success: true,
        method: 'clipboard',
        url: customUrl(),
        showToast: true,
      });
      expect(execCommand).toHaveBeenCalledWith('copy');
      expect(document.querySelector('textarea')).toBeNull();
    });

    it('reports an unencodable recipe', async () => {
      stubNavigator({ writeText: vi.fn() });
      const result = renderRecipeSharing();
      // Past the encoder's URL length limit, so it returns ''.
      const broken = { ...customRecipe, notes: 'x'.repeat(20_000) };
      expect(encodeCustomRecipe(broken)).toBe('');

      await expect(
        result.current.shareCustomRecipe({ recipe: broken })
      ).resolves.toEqual({
        success: false,
        error: 'Failed to generate share URL',
        showToast: true,
      });
    });
  });
});
