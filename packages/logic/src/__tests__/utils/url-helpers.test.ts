import { isClipboardSupported } from '../../utils/share-link';
import {
  clearPresetFromUrl,
  getPresetFromUrl,
  isFilmDevOrgUrl,
  updateUrlWithPreset,
} from '../../utils/url-helpers';

// Mock window object for testing
interface MockLocation {
  hostname: string;
  port?: string;
  protocol: string;
  pathname: string;
  search: string;
  hash: string;
}

interface MockWindow {
  location: MockLocation;
  history: Pick<History, 'replaceState'>;
}

const mockWindow: MockWindow = {
  location: {
    hostname: 'localhost',
    port: '4200',
    protocol: 'http:',
    pathname: '/border',
    search: '?test=1',
    hash: '#encoded-preset',
  },
  history: {
    replaceState: vi.fn(),
  },
};

describe('url helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Auto-restores window/navigator stubbed via vi.stubGlobal below.
    vi.unstubAllGlobals();
  });

  describe('getPresetFromUrl', () => {
    beforeEach(() => {
      vi.stubGlobal('window', mockWindow);
    });

    it('should prefer query param over hash', () => {
      mockWindow.location.search = '?preset=from-param';
      mockWindow.location.hash = '#from-hash';
      const preset = getPresetFromUrl();
      expect(preset).toBe('from-param');
    });

    it('should fall back to hash when no query param', () => {
      mockWindow.location.search = '?test=1';
      mockWindow.location.hash = '#encoded-preset';
      const preset = getPresetFromUrl();
      expect(preset).toBe('encoded-preset');
    });

    it('should return null when no param or hash', () => {
      mockWindow.location.search = '';
      mockWindow.location.hash = '';
      const preset = getPresetFromUrl();
      expect(preset).toBeNull();
    });

    it('should return null in SSR environment', () => {
      vi.stubGlobal('window', undefined);
      const preset = getPresetFromUrl();
      expect(preset).toBeNull();
    });

    it('should handle hash with only #', () => {
      mockWindow.location.search = '';
      mockWindow.location.hash = '#';
      const preset = getPresetFromUrl();
      expect(preset).toBe('');
    });
  });

  describe('updateUrlWithPreset', () => {
    beforeEach(() => {
      mockWindow.location.search = '?test=1';
      vi.stubGlobal('window', mockWindow);
    });

    it('should update URL with encoded preset as query param', () => {
      updateUrlWithPreset('new-preset');

      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/border?test=1&preset=new-preset'
      );
    });

    it('should handle SSR environment gracefully', () => {
      vi.stubGlobal('window', undefined);
      expect(() => updateUrlWithPreset('preset')).not.toThrow();
    });
  });

  describe('clearPresetFromUrl', () => {
    beforeEach(() => {
      vi.stubGlobal('window', mockWindow);
    });

    it('should remove preset query param from URL', () => {
      mockWindow.location.search = '?test=1&preset=some-preset';
      clearPresetFromUrl();

      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/border?test=1'
      );
    });

    it('should drop the "?" entirely when preset was the only param', () => {
      mockWindow.location.search = '?preset=some-preset';
      clearPresetFromUrl();

      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/border'
      );
    });

    it('should handle SSR environment gracefully', () => {
      vi.stubGlobal('window', undefined);
      expect(() => clearPresetFromUrl()).not.toThrow();
    });
  });

  describe('isClipboardSupported', () => {
    it('should return true when navigator.clipboard.writeText exists', () => {
      vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });

      expect(isClipboardSupported()).toBe(true);
    });

    it('should return false when navigator does not exist', () => {
      vi.stubGlobal('navigator', undefined);

      expect(isClipboardSupported()).toBe(false);
    });

    it('should return false when clipboard does not exist', () => {
      vi.stubGlobal('navigator', {});

      expect(isClipboardSupported()).toBe(false);
    });

    it('should return false when writeText does not exist', () => {
      vi.stubGlobal('navigator', { clipboard: {} });

      expect(isClipboardSupported()).toBe(false);
    });
  });

  describe('isFilmDevOrgUrl', () => {
    it.each([
      'https://filmdev.org/recipe/123',
      'https://www.filmdev.org/recipe/123',
      'https://api.filmdev.org',
      'http://filmdev.org/recipe/123',
      'HTTPS://FILMDEV.ORG/recipe/123',
      'filmdev.org/12345',
      'www.filmdev.org/recipe/123',
      '  https://filmdev.org/recipe/123  ',
    ])('accepts %s', (value) => {
      expect(isFilmDevOrgUrl(value)).toBe(true);
    });

    it.each([
      // lookalike hosts
      'https://filmdev.org.attacker.com/recipe/123',
      'https://evilfilmdev.org/recipe/123',
      'https://filmdev.organic.com',
      'https://filmdev.com/recipe/123',
      // filmdev.org only in the path, query, or credentials
      'https://evil.com/filmdev.org',
      'https://evil.com/?next=https://filmdev.org',
      'https://filmdev.org@evil.com/recipe/123',
      'evil.com/filmdev.org',
      // not a URL at all
      'not a url',
      '',
    ])('rejects %s', (value) => {
      expect(isFilmDevOrgUrl(value)).toBe(false);
    });

    it('rejects null and undefined', () => {
      expect(isFilmDevOrgUrl(null)).toBe(false);
      expect(isFilmDevOrgUrl(undefined)).toBe(false);
    });
  });
});
