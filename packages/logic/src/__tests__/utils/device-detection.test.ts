import {
  isMobileDevice,
  isIOS,
  isAndroid,
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
} & Record<string, unknown>;

const createMockWindow = (overrides: Partial<MockWindow> = {}): MockWindow => {
  return {
    navigator: {
      userAgent: '',
      maxTouchPoints: 0,
      ...(overrides.navigator as MockNavigator | undefined),
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
  type MutableGlobal = typeof globalThis & {
    window?: unknown;
    navigator?: unknown;
  };
  const g = globalThis as MutableGlobal;
  const originalWindow = g.window;
  const originalNavigator = g.navigator;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    g.window = originalWindow;
    g.navigator = originalNavigator;
  });

  describe('isMobileDevice', () => {
    it('should return false in SSR environment', () => {
      // Properly simulate SSR by unsetting window
      delete g.window;
      expect(isMobileDevice()).toBe(false);
    });

    it('should return false for desktop without touch', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
          },
          innerWidth: 1920,
          innerHeight: 1080,
        }),
        writable: true,
      });

      expect(isMobileDevice()).toBe(false);
    });

    it('should return true for mobile user agent with touch', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
            maxTouchPoints: 5,
          },
          ontouchstart: true,
          innerWidth: 375,
          innerHeight: 667,
        }),
        writable: true,
      });

      expect(isMobileDevice()).toBe(true);
    });

    it('should return true for Android devices', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G975F)',
            maxTouchPoints: 5,
          },
          ontouchstart: true,
          innerWidth: 360,
          innerHeight: 640,
        }),
        writable: true,
      });

      expect(isMobileDevice()).toBe(true);
    });

    it('should return true for touch device with small screen', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
            maxTouchPoints: 1,
          },
          ontouchstart: true,
          innerWidth: 600,
          innerHeight: 800,
        }),
        writable: true,
      });

      expect(isMobileDevice()).toBe(true);
    });

    it('should return false for touch device with large screen and desktop user agent', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
            maxTouchPoints: 1,
          },
          ontouchstart: true,
          innerWidth: 1920,
          innerHeight: 1080,
        }),
        writable: true,
      });

      expect(isMobileDevice()).toBe(false);
    });

    it('should handle iPad user agent', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X)',
            maxTouchPoints: 5,
          },
          ontouchstart: true,
          innerWidth: 768,
          innerHeight: 1024,
        }),
        writable: true,
      });

      expect(isMobileDevice()).toBe(true);
    });

    it('should handle missing navigator properties gracefully', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {},
        }),
        writable: true,
      });

      expect(isMobileDevice()).toBe(false);
    });
  });

  describe('isIOS', () => {
    it('should return false in SSR environment', () => {
      expect(isIOS()).toBe(false);
    });

    it('should return true for iPhone', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          },
        }),
        writable: true,
      });

      expect(isIOS()).toBe(true);
    });

    it('should return true for iPad', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X)',
          },
        }),
        writable: true,
      });

      expect(isIOS()).toBe(true);
    });

    it('should return true for iPod', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {
            userAgent:
              'Mozilla/5.0 (iPod touch; CPU iPhone OS 14_6 like Mac OS X)',
          },
        }),
        writable: true,
      });

      expect(isIOS()).toBe(true);
    });

    it('should return false for Android', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G975F)' },
        }),
        writable: true,
      });

      expect(isIOS()).toBe(false);
    });

    it('should return false for desktop', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
          },
        }),
        writable: true,
      });

      expect(isIOS()).toBe(false);
    });

    it('should handle missing navigator gracefully', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {},
        }),
        writable: true,
      });

      expect(isIOS()).toBe(false);
    });
  });

  describe('isAndroid', () => {
    it('should return false in SSR environment', () => {
      expect(isAndroid()).toBe(false);
    });

    it('should return true for Android devices', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G975F)' },
        }),
        writable: true,
      });

      expect(isAndroid()).toBe(true);
    });

    it('should return false for iOS devices', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          },
        }),
        writable: true,
      });

      expect(isAndroid()).toBe(false);
    });

    it('should return false for desktop', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
          },
        }),
        writable: true,
      });

      expect(isAndroid()).toBe(false);
    });

    it('should handle missing navigator gracefully', () => {
      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: {},
        }),
        writable: true,
      });

      expect(isAndroid()).toBe(false);
    });
  });

  describe('shouldUseWebShare', () => {
    it('should return false when navigator is undefined', () => {
      expect(shouldUseWebShare()).toBe(false);
    });

    it('should return false when navigator.share is not a function', () => {
      Object.defineProperty(global, 'navigator', {
        value: createMockNavigator(),
        writable: true,
      });

      expect(shouldUseWebShare()).toBe(false);
    });

    it('should return false on desktop even with Web Share API', () => {
      Object.defineProperty(global, 'navigator', {
        value: createMockNavigator({
          share: vi.fn(),
        }),
        writable: true,
      });

      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: createMockNavigator({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
          }),
          innerWidth: 1920,
          innerHeight: 1080,
        }),
        writable: true,
      });

      expect(shouldUseWebShare()).toBe(false);
    });

    it('should return true on mobile with Web Share API', () => {
      Object.defineProperty(global, 'navigator', {
        value: createMockNavigator({
          share: vi.fn(),
        }),
        writable: true,
      });

      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: createMockNavigator({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
            maxTouchPoints: 5,
            share: vi.fn(),
          }),
          ontouchstart: true,
          innerWidth: 375,
          innerHeight: 667,
        }),
        writable: true,
      });

      expect(shouldUseWebShare()).toBe(true);
    });

    it('should return false on mobile without Web Share API', () => {
      Object.defineProperty(global, 'navigator', {
        value: createMockNavigator(),
        writable: true,
      });

      Object.defineProperty(global, 'window', {
        value: createMockWindow({
          navigator: createMockNavigator({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
            maxTouchPoints: 5,
          }),
          ontouchstart: true,
          innerWidth: 375,
          innerHeight: 667,
        }),
        writable: true,
      });

      expect(shouldUseWebShare()).toBe(false);
    });
  });
});
