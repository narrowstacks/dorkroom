/**
 * Headless capture on top of `Bun.WebView` — the shared mechanism behind
 * `screenshot-homepage.ts` and `pr-screenshots.ts`.
 *
 * Bun ships a headless browser and an image codec, so neither script needs
 * Playwright's Chromium download or sharp's native module. What Bun's own API
 * doesn't cover, Chrome DevTools Protocol does; every `cdp()` call below stands
 * in for a Playwright convenience that has no `Bun.WebView` equivalent yet.
 *
 * Chrome is the only backend used here, on every platform. macOS defaults to
 * WebKit, which has no `cdp()` at all (`ERR_METHOD_NOT_IMPLEMENTED`), so a local
 * run would take a different code path than CI. `url: false` forces a fresh
 * spawn — without it Bun auto-connects to whatever Chrome the developer already
 * has open, inheriting their profile, extensions and window size.
 */

/** Bun.WebView is experimental; `Bun.WebView` is not in the published types as a type. */
type View = InstanceType<typeof Bun.WebView>;

export const VIEWPORTS = {
  desktop: { width: 1280, height: 918 },
  mobile: { width: 390, height: 844 },
} as const;

export type Viewport = keyof typeof VIEWPORTS;

export interface OpenOptions {
  width: number;
  height: number;
  /** Backing scale. 2 renders retina-sharp text at double the pixel count. */
  deviceScaleFactor?: number;
  /** Drives `prefers-color-scheme`. */
  colorScheme?: 'light' | 'dark';
  /** When true, emulates `prefers-reduced-motion: reduce`. */
  reducedMotion?: boolean;
  /**
   * JavaScript to run before any page script, on every navigation — the
   * `context.addInitScript()` equivalent. Used to seed the persisted theme so
   * the first paint is already correct.
   */
  initScript?: string;
}

/** A view plus the CDP plumbing that makes it behave like a Playwright page. */
export class CaptureView {
  private constructor(
    private readonly view: View,
    private readonly state: { networkIdle: boolean }
  ) {}

  static async open(options: OpenOptions): Promise<CaptureView> {
    const view = new Bun.WebView({
      width: options.width,
      height: options.height,
      backend: { type: 'chrome', url: false },
    });

    // The first navigate is what establishes the CDP session; every cdp() call
    // has to come after it. about:blank costs nothing and gets us there.
    await view.navigate('about:blank');

    // Chrome ignores the constructor's width/height until resize() is called —
    // without this the screenshot comes back at Chrome's own default size.
    await view.resize(options.width, options.height);

    if (options.deviceScaleFactor && options.deviceScaleFactor !== 1) {
      await view.cdp('Emulation.setDeviceMetricsOverride', {
        width: options.width,
        height: options.height,
        deviceScaleFactor: options.deviceScaleFactor,
        mobile: false,
      });
    }

    const features: { name: string; value: string }[] = [
      { name: 'prefers-color-scheme', value: options.colorScheme ?? 'dark' },
    ];
    if (options.reducedMotion) {
      features.push({ name: 'prefers-reduced-motion', value: 'reduce' });
    }
    await view.cdp('Emulation.setEmulatedMedia', { features });

    // Playwright's headless Chromium hides scrollbars; Bun's does not, and an
    // 8px scrollbar down the right edge is the single largest pixel difference
    // between the two capture paths.
    await view.cdp('Emulation.setScrollbarsHidden', { hidden: true });

    if (options.initScript) {
      await view.cdp('Page.addScriptToEvaluateOnNewDocument', {
        source: options.initScript,
      });
    }

    // `waitUntil: 'networkidle'` equivalent. Page lifecycle events are the only
    // way to observe it; navigate() alone resolves at load, before the app's
    // data fetches have settled.
    const state = { networkIdle: false };
    await view.cdp('Page.enable');
    await view.cdp('Page.setLifecycleEventsEnabled', { enabled: true });
    view.addEventListener<{ name?: string }>('Page.lifecycleEvent', (event) => {
      if (event.data?.name === 'networkIdle') state.networkIdle = true;
    });

    return new CaptureView(view, state);
  }

  /** Navigate and wait for the network to go idle, like Playwright's goto(). */
  async goto(url: string, timeoutMs = 60_000): Promise<void> {
    this.state.networkIdle = false;
    await this.view.navigate(url);
    const deadline = Date.now() + timeoutMs;
    while (!this.state.networkIdle) {
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for network idle at ${url}`);
      }
      await Bun.sleep(50);
    }
  }

  /**
   * Wait for the first match of `selector` to be rendered — attached with a
   * non-zero box. `Bun.WebView` only bundles this wait inside click(), so a
   * standalone wait has to poll.
   */
  async waitForVisible(selector: string, timeoutMs = 15_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const visible = await this.evaluate<boolean>(
        `(() => { const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' })()`
      );
      if (visible) return;
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for "${selector}" to be visible`);
      }
      await Bun.sleep(100);
    }
  }

  /** Click the first match, waiting for it to become actionable first. */
  click(selector: string): Promise<void> {
    return this.view.click(selector);
  }

  /**
   * Replace the value of the first match — Playwright's `locator.fill()`.
   *
   * React tracks the previous value on the DOM node and swallows an `input`
   * event whose value it thinks it already set, so assigning `.value` directly
   * is not enough: the native setter has to be invoked on the prototype to
   * bypass React's own property descriptor before dispatching.
   */
  async fill(selector: string, value: string): Promise<void> {
    await this.waitForVisible(selector);
    const ok = await this.evaluate<boolean>(
      `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        const proto = el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`
    );
    if (!ok) throw new Error(`fill: no element matched "${selector}"`);
  }

  /** Choose an option in a native <select> — Playwright's selectOption(). */
  async selectOption(selector: string, value: string): Promise<void> {
    await this.waitForVisible(selector);
    const ok = await this.evaluate<boolean>(
      `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')
          .set.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`
    );
    if (!ok) throw new Error(`select: no element matched "${selector}"`);
  }

  /** Append a <style> to the document — Playwright's addStyleTag(). */
  async addStyleTag(css: string): Promise<void> {
    await this.evaluate(
      `(() => { const s = document.createElement('style');
        s.textContent = ${JSON.stringify(css)};
        document.head.appendChild(s); return true })()`
    );
  }

  /** Block until web fonts have loaded, so no shot catches a fallback face. */
  async waitForFonts(): Promise<void> {
    await this.evaluate('document.fonts.ready.then(() => true)');
  }

  evaluate<T = unknown>(script: string): Promise<T> {
    return this.view.evaluate<T>(script);
  }

  /**
   * Capture the viewport (never full-page) and write it as WebP.
   *
   * Chrome can encode WebP itself, but it is asked for PNG and re-encoded
   * through `Bun.Image` so the quality setting matches what sharp produced and
   * stays identical across backends.
   */
  async screenshotWebp(outPath: string, quality: number): Promise<void> {
    const png = await this.view.screenshot({ encoding: 'buffer' });
    await new Bun.Image(png).webp({ quality }).write(outPath);
  }

  close(): void {
    this.view.close();
  }
}
