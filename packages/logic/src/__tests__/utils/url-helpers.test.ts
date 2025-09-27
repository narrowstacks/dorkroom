import {
  getDynamicShareUrl,
  getNativeUrl,
  generateSharingUrls,
  getPresetFromUrl,
  updateUrlWithPreset,
  clearPresetFromUrl,
  isWebShareSupported,
  isClipboardSupported,
  getDisplayUrl
} from '../../utils/url-helpers';

// Mock window object for testing
const mockWindow = {
  location: {
    hostname: 'localhost',
    port: '4200',
    protocol: 'http:',
    pathname: '/border',
    search: '?test=1',
    hash: '#encoded-preset'
  },
  history: {
    replaceState: vi.fn()
  }
};

describe('url helpers', () => {
  const originalWindow = (global as any).window;
  const originalNavigator = (global as any).navigator;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (global as any).window = originalWindow;
    (global as any).navigator = originalNavigator;
  });

  describe('getDynamicShareUrl', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true
      });
    });


    it('should generate localhost URL in development', () => {
      const url = getDynamicShareUrl();
      expect(url).toBe('http://localhost:4200/border');
    });

    it('should use custom path when provided', () => {
      const url = getDynamicShareUrl('/custom-path');
      expect(url).toBe('http://localhost:4200/custom-path');
    });

    it('should handle production hostname', () => {
      mockWindow.location.hostname = 'beta.dorkroom.art';
      mockWindow.location.protocol = 'https:';
      delete (mockWindow.location as any).port;

      const url = getDynamicShareUrl();
      expect(url).toBe('https://beta.dorkroom.art/border');
    });

    it('should handle SSR (no window)', () => {
      delete (global as any).window;
      const url = getDynamicShareUrl();
      expect(url).toBe('https://beta.dorkroom.art/border');
    });
  });

  describe('getNativeUrl', () => {
    it('should generate native app URL', () => {
      const encoded = 'abc123';
      const url = getNativeUrl(encoded);
      expect(url).toBe('dorkroom://preset/abc123');
    });

    it('should handle empty encoded string', () => {
      const url = getNativeUrl('');
      expect(url).toBe('dorkroom://preset/');
    });
  });

  describe('generateSharingUrls', () => {
    beforeEach(() => {
      // Reset mockWindow to localhost configuration before each test
      mockWindow.location.hostname = 'localhost';
      mockWindow.location.port = '4200';
      mockWindow.location.protocol = 'http:';

      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true
      });
    });


    it('should generate both web and native URLs', () => {
      const encoded = 'abc123';
      const urls = generateSharingUrls(encoded);

      expect(urls.webUrl).toBe('http://localhost:4200/border#abc123');
      expect(urls.nativeUrl).toBe('dorkroom://preset/abc123');
    });
  });

  describe('getPresetFromUrl', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true
      });
    });


    it('should extract preset from URL hash', () => {
      const preset = getPresetFromUrl();
      expect(preset).toBe('encoded-preset');
    });

    it('should return null when no hash', () => {
      mockWindow.location.hash = '';
      const preset = getPresetFromUrl();
      expect(preset).toBeNull();
    });

    it('should return null when hash does not start with #', () => {
      mockWindow.location.hash = 'no-hash-prefix';
      const preset = getPresetFromUrl();
      expect(preset).toBeNull();
    });

    it('should return null in SSR environment', () => {
      delete (global as any).window;
      const preset = getPresetFromUrl();
      expect(preset).toBeNull();
    });

    it('should handle hash with only #', () => {
      mockWindow.location.hash = '#';
      const preset = getPresetFromUrl();
      expect(preset).toBe('');
    });
  });

  describe('updateUrlWithPreset', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true
      });
    });


    it('should update URL with encoded preset', () => {
      updateUrlWithPreset('new-preset');

      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/border?test=1#new-preset'
      );
    });

    it('should handle SSR environment gracefully', () => {
      delete (global as any).window;
      expect(() => updateUrlWithPreset('preset')).not.toThrow();
    });
  });

  describe('clearPresetFromUrl', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true
      });
    });


    it('should clear preset from URL', () => {
      clearPresetFromUrl();

      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/border?test=1'
      );
    });

    it('should handle SSR environment gracefully', () => {
      delete (global as any).window;
      expect(() => clearPresetFromUrl()).not.toThrow();
    });
  });

  describe('isWebShareSupported', () => {
    it('should return true when navigator.share exists', () => {
      Object.defineProperty(global, 'navigator', {
        value: { share: vi.fn() },
        writable: true
      });

      expect(isWebShareSupported()).toBe(true);
    });

    it('should return false when navigator does not exist', () => {
      expect(isWebShareSupported()).toBe(false);
    });

    it('should return false when navigator.share does not exist', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });

      expect(isWebShareSupported()).toBe(false);
    });
  });

  describe('isClipboardSupported', () => {
    it('should return true when navigator.clipboard.writeText exists', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: vi.fn()
          }
        },
        writable: true
      });

      expect(isClipboardSupported()).toBe(true);
    });

    it('should return false when navigator does not exist', () => {
      expect(isClipboardSupported()).toBe(false);
    });

    it('should return false when clipboard does not exist', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });

      expect(isClipboardSupported()).toBe(false);
    });

    it('should return false when writeText does not exist', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {}
        },
        writable: true
      });

      expect(isClipboardSupported()).toBe(false);
    });
  });

  describe('getDisplayUrl', () => {
    it('should remove protocol from valid URLs', () => {
      const url = 'https://beta.dorkroom.art/border?test=1#preset';
      const display = getDisplayUrl(url);
      expect(display).toBe('beta.dorkroom.art/border?test=1#preset');
    });

    it('should handle URLs with port numbers', () => {
      const url = 'http://localhost:4200/border';
      const display = getDisplayUrl(url);
      expect(display).toBe('localhost:4200/border');
    });

    it('should return original string for invalid URLs', () => {
      const invalid = 'not-a-url';
      const display = getDisplayUrl(invalid);
      expect(display).toBe('not-a-url');
    });

    it('should handle URLs without path', () => {
      const url = 'https://example.com';
      const display = getDisplayUrl(url);
      expect(display).toBe('example.com/');
    });

    it('should handle complex URLs', () => {
      const url = 'https://subdomain.example.com:8080/path/to/resource?query=value&other=param#fragment';
      const display = getDisplayUrl(url);
      expect(display).toBe('subdomain.example.com:8080/path/to/resource?query=value&other=param#fragment');
    });
  });
});