import { act, cleanup, render, screen } from '@testing-library/react';
import { createRef, type Ref, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useVirtualListFocus,
  type VirtualListFocusHandle,
} from '../use-virtual-list-focus';

const KEYS = ['a', 'b', 'c', 'd'];

interface GridProps {
  /** Items per row container; changing it remounts items that move rows. */
  columns: number;
  /** Items rendered (the virtual window). */
  rendered?: readonly string[];
  scrollToIndex?: (index: number) => void;
  handleRef?: Ref<VirtualListFocusHandle>;
}

/** A row-chunked grid, like the virtualized card lists. */
function Grid({
  columns,
  rendered = KEYS,
  scrollToIndex = () => undefined,
  handleRef,
}: GridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const focusProps = useVirtualListFocus({
    containerRef,
    keys: KEYS,
    scrollToIndex,
    handleRef,
  });
  const rows: string[][] = [];
  for (let i = 0; i < rendered.length; i += columns) {
    rows.push(rendered.slice(i, i + columns));
  }
  return (
    <div ref={containerRef} tabIndex={-1} data-testid="list" {...focusProps}>
      {rows.map((row) => (
        // Keyed by the first item, so an item that moves rows remounts.
        <div key={row[0]}>
          {row.map((key) => (
            <div key={key} data-list-item-key={key}>
              <button type="button">Select {key}</button>
              <button type="button">Delete {key}</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

describe('useVirtualListFocus', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('follows the focused control into its remounted item', () => {
    const { rerender } = render(<Grid columns={3} />);
    const before = screen.getByRole('button', { name: 'Delete c' });
    before.focus();

    rerender(<Grid columns={2} />);

    expect(before.isConnected).toBe(false);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Delete c' })
    );
  });

  it('scrolls an unrendered item into the window, then focuses it', () => {
    const handle = createRef<VirtualListFocusHandle>();
    const scrollToIndex = vi.fn();
    const { rerender } = render(
      <Grid
        columns={1}
        rendered={['a', 'b']}
        scrollToIndex={scrollToIndex}
        handleRef={handle}
      />
    );

    act(() => handle.current?.focusItem('d'));
    expect(scrollToIndex).toHaveBeenCalledWith(3);
    expect(document.activeElement).toBe(document.body);

    // The virtualizer re-renders with the scrolled-to item in the window.
    rerender(
      <Grid
        columns={1}
        rendered={['c', 'd']}
        scrollToIndex={scrollToIndex}
        handleRef={handle}
      />
    );

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Select d' })
    );
  });

  it('drops the wait when focus moves somewhere else meanwhile', () => {
    const handle = createRef<VirtualListFocusHandle>();
    const { rerender } = render(
      <>
        <input aria-label="Search" />
        <Grid columns={1} rendered={['a']} handleRef={handle} />
      </>
    );

    act(() => handle.current?.focusItem('d'));
    const search = screen.getByRole('textbox', { name: 'Search' });
    search.focus();
    rerender(
      <>
        <input aria-label="Search" />
        <Grid columns={1} rendered={['d']} handleRef={handle} />
      </>
    );

    expect(document.activeElement).toBe(search);
  });

  it('focuses the list when the key is gone', () => {
    const handle = createRef<VirtualListFocusHandle>();
    render(<Grid columns={2} handleRef={handle} />);

    act(() => handle.current?.focusItem('zz'));

    expect(document.activeElement).toBe(screen.getByTestId('list'));
  });
});
