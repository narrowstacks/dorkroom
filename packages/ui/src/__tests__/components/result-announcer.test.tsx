import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BASELINE_SETTLE_MS,
  RESULT_ANNOUNCEMENT_DELAY_MS,
  ResultAnnouncer,
} from '../../components/calculator/result-announcer';

const DELAY = RESULT_ANNOUNCEMENT_DELAY_MS;

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('ResultAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders one empty, atomic, polite status region from the first render', () => {
    render(<ResultAnnouncer message="New exposure time 20s" />);

    const region = screen.getByRole('status');
    expect(region.tagName).toBe('OUTPUT');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveClass('sr-only');
    expect(region).toHaveTextContent('');
  });

  it('does not announce the initial result, even after the delay', () => {
    render(<ResultAnnouncer message="New exposure time 20s" />);

    advance(DELAY * 3);

    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('treats a change landing before the first settle (hydration) as baseline', () => {
    const { rerender } = render(<ResultAnnouncer message="default" />);
    advance(10);
    rerender(<ResultAnnouncer message="hydrated" />);

    advance(DELAY * 2);

    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('announces a real edit made soon after load, once the baseline has settled', () => {
    const { rerender } = render(<ResultAnnouncer message="first" />);
    advance(BASELINE_SETTLE_MS);

    rerender(<ResultAnnouncer message="second" />);
    advance(DELAY);

    expect(screen.getByRole('status')).toHaveTextContent('second');
  });

  it('announces a changed result once it has settled for the delay', () => {
    const { rerender } = render(<ResultAnnouncer message="first" />);
    advance(DELAY);

    rerender(<ResultAnnouncer message="second" />);
    advance(DELAY - 1);
    expect(screen.getByRole('status')).toHaveTextContent('');

    advance(1);
    expect(screen.getByRole('status')).toHaveTextContent('second');
  });

  it('debounces rapid changes into a single announcement of the last value', () => {
    const { rerender } = render(<ResultAnnouncer message="1" />);
    advance(DELAY);

    for (const message of ['12', '125', '1250']) {
      rerender(<ResultAnnouncer message={message} />);
      advance(DELAY / 3);
      expect(screen.getByRole('status')).toHaveTextContent('');
    }

    advance(DELAY);
    expect(screen.getByRole('status')).toHaveTextContent('1250');
  });

  it('stays quiet when a burst of edits ends on the result it started from', () => {
    const { rerender } = render(<ResultAnnouncer message="20s" />);
    advance(DELAY);

    rerender(<ResultAnnouncer message="40s" />);
    advance(DELAY / 2);
    rerender(<ResultAnnouncer message="20s" />);
    advance(DELAY * 2);

    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('clears the region for an empty message and re-announces the next valid result', () => {
    const { rerender } = render(<ResultAnnouncer message="20s" />);
    advance(DELAY);

    rerender(<ResultAnnouncer message="40s" />);
    advance(DELAY);
    expect(screen.getByRole('status')).toHaveTextContent('40s');

    rerender(<ResultAnnouncer message="" />);
    advance(DELAY);
    expect(screen.getByRole('status')).toHaveTextContent('');

    rerender(<ResultAnnouncer message="40s" />);
    advance(DELAY);
    expect(screen.getByRole('status')).toHaveTextContent('40s');
  });
});
