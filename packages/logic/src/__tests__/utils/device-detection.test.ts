import {
  isIOS,
  isMobileDevice,
  shouldUseWebShare,
} from '../../utils/device-detection';

// Mock window and navigator objects
type MockNavigator = {
  userAgent?: string;
  maxTouchPoints?: number;
  share?: unknown;
};

type MockWindow = {
  navigator: MockNavigator;
  innerWidth: number;
  innerHeight: number;
  ontouchstart?: unknown;
};

const createMockWindow = (overrides: Partial<MockWindow> = {}): MockWindow => {
  return {
    navigator: {
      userAgent: '',
      maxTouchPoints: 0,
      ...overrides.navigator,
    },
    innerWidth: 1920,
    innerHeight: 1080,
    ontouchstart: undefined,
    ...overrides,
  };
};

const createMockNavigator = (
  overrides: Partial<MockNavigator> = {}
): MockNavigator => {
  return {
    userAgent: '',
    maxTouchPoints: 0,
    share: undefined,
    ...overrides,
  };
};

describe('device detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isMobileDevice', () => {
    it('should return false in SSR environment', () => {
      vi.stubGlobal('window', undefined);
      expect(isMobileDevice()).toBe(false);
    });

    it('should return false for desktop without touch', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
          },
          innerWidth: 1920,
          innerHeight: 1080,
        })
      );

      expect(isMobileDevice()).toBe(false);
    });

    it('should return true for mobile user agent with touch', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
            maxTouchPoints: 5,
          },
          ontouchstart: true,
          innerWidth: 375,
          innerHeight: 667,
        })
      );

      expect(isMobileDevice()).toBe(true);
    });

    it('should return true for Android devices', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G975F)',
            maxTouchPoints: 5,
          },
          ontouchstart: true,
          innerWidth: 360,
          innerHeight: 640,
        })
      );

      expect(isMobileDevice()).toBe(true);
    });

    it('should return true for touch device with small screen', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
            maxTouchPoints: 1,
          },
          ontouchstart: true,
          innerWidth: 600,
          innerHeight: 800,
        })
      );

      expect(isMobileDevice()).toBe(true);
    });

    it('should return false for touch device with large screen and desktop user agent', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
            maxTouchPoints: 1,
          },
          ontouchstart: true,
          innerWidth: 1920,
          innerHeight: 1080,
        })
      );

      expect(isMobileDevice()).toBe(false);
    });

    it('should handle iPad user agent', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X)',
            maxTouchPoints: 5,
          },
          ontouchstart: true,
          innerWidth: 768,
          innerHeight: 1024,
        })
      );

      expect(isMobileDevice()).toBe(true);
    });

    it('should handle missing navigator properties gracefully', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: {},
        })
      );

      expect(isMobileDevice()).toBe(false);
    });
  });

  describe('isIOS', () => {
    it('should return false in SSR environment', () => {
      expect(isIOS()).toBe(false);
    });

    it('should return true for iPhone', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          },
        })
      );

      expect(isIOS()).toBe(true);
    });

    it('should return true for iPad', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X)',
          },
        })
      );

      expect(isIOS()).toBe(true);
    });

    it('should return true for iPod', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: {
            userAgent:
              'Mozilla/5.0 (iPod touch; CPU iPhone OS 14_6 like Mac OS X)',
          },
        })
      );

      expect(isIOS()).toBe(true);
    });

    it('should return false for Android', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G975F)' },
        })
      );

      expect(isIOS()).toBe(false);
    });

    it('should return false for desktop', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
          },
        })
      );

      expect(isIOS()).toBe(false);
    });

    it('should handle missing navigator gracefully', () => {
      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: {},
        })
      );

      expect(isIOS()).toBe(false);
    });
  });

  describe('shouldUseWebShare', () => {
    it('should return false when navigator is undefined', () => {
      expect(shouldUseWebShare()).toBe(false);
    });

    it('should return false when navigator.share is not a function', () => {
      vi.stubGlobal('navigator', createMockNavigator());

      expect(shouldUseWebShare()).toBe(false);
    });

    it('should return false on desktop even with Web Share API', () => {
      vi.stubGlobal(
        'navigator',
        createMockNavigator({
          share: vi.fn(),
        })
      );

      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: createMockNavigator({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
          }),
          innerWidth: 1920,
          innerHeight: 1080,
        })
      );

      expect(shouldUseWebShare()).toBe(false);
    });

    it('should return true on mobile with Web Share API', () => {
      vi.stubGlobal(
        'navigator',
        createMockNavigator({
          share: vi.fn(),
        })
      );

      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: createMockNavigator({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
            maxTouchPoints: 5,
            share: vi.fn(),
          }),
          ontouchstart: true,
          innerWidth: 375,
          innerHeight: 667,
        })
      );

      expect(shouldUseWebShare()).toBe(true);
    });

    it('should return false on mobile without Web Share API', () => {
      vi.stubGlobal('navigator', createMockNavigator());

      vi.stubGlobal(
        'window',
        createMockWindow({
          navigator: createMockNavigator({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
            maxTouchPoints: 5,
          }),
          ontouchstart: true,
          innerWidth: 375,
          innerHeight: 667,
        })
      );

      expect(shouldUseWebShare()).toBe(false);
    });
  });
});
