import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { lazyPage, preloadPage } from '../lazy-page';

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

  it('swallows a failed preload and retries on the next call', async () => {
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
