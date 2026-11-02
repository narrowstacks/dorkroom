import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isSpeculativeImportInFlight,
  lazyPage,
  preloadPage,
  SPECULATIVE_IMPORT_CAP_MS,
  speculativeImport,
} from '../lazy-page';

const Page = ({ label }: { label: string }) => <p>{label}</p>;

describe('lazyPage', () => {
  it('starts the import on preload, once, and the render reuses it', async () => {
    const load = vi.fn(() => Promise.resolve({ default: Page }));
    const LazyPage = lazyPage(load);

    expect(load).not.toHaveBeenCalled();
    expect(LazyPage.preload()).toBeUndefined();
    LazyPage.preload();
    expect(load).toHaveBeenCalledTimes(1);

    render(
      <Suspense fallback={<p>loading</p>}>
        <LazyPage label="page" />
      </Suspense>
    );
    expect(await screen.findByText('page')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('drops a failed import and retries on the next call', async () => {
    const load = vi
      .fn<() => Promise<{ default: typeof Page }>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ default: Page });
    const LazyPage = lazyPage(load);

    LazyPage.preload();
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    // Let the rejection settle so the cached promise is dropped.
    await new Promise((resolve) => setTimeout(resolve, 0));

    LazyPage.preload();
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('preloadPage', () => {
  it('preloads a lazyPage and ignores any other component', () => {
    const load = vi.fn(() => Promise.resolve({ default: Page }));
    const LazyPage = lazyPage(load);

    preloadPage(Page);
    expect(load).not.toHaveBeenCalled();

    preloadPage(LazyPage);
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe('speculativeImport', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shares one import between a hover and the navigation after it', async () => {
    const load = vi.fn(() => Promise.resolve('module'));
    const loadModule = speculativeImport(load);

    const hover = loadModule(true);
    expect(isSpeculativeImportInFlight()).toBe(true);
    const navigation = loadModule(false);
    expect(isSpeculativeImportInFlight()).toBe(false);

    expect(await navigation).toBe('module');
    expect(await hover).toBe('module');
    expect(load).toHaveBeenCalledOnce();
  });

  it('stops counting a hung hover import after the cap', () => {
    vi.useFakeTimers();
    const loadModule = speculativeImport(() => new Promise<never>(() => {}));

    loadModule(true).catch(() => undefined);
    vi.advanceTimersByTime(SPECULATIVE_IMPORT_CAP_MS - 1);
    expect(isSpeculativeImportInFlight()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(isSpeculativeImportInFlight()).toBe(false);
  });

  it('clears the cap when the import settles, so it cannot uncount another', async () => {
    vi.useFakeTimers();
    await speculativeImport(() => Promise.resolve('done'))(true);
    expect(isSpeculativeImportInFlight()).toBe(false);

    vi.advanceTimersByTime(SPECULATIVE_IMPORT_CAP_MS / 2);
    const hung = speculativeImport(() => new Promise<never>(() => {}));
    hung(true).catch(() => undefined);

    // The settled import's cap would have fired here had it been left set.
    vi.advanceTimersByTime(SPECULATIVE_IMPORT_CAP_MS / 2);
    expect(isSpeculativeImportInFlight()).toBe(true);
    vi.advanceTimersByTime(SPECULATIVE_IMPORT_CAP_MS / 2);
    expect(isSpeculativeImportInFlight()).toBe(false);
  });
});
