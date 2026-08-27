import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEscapeKey } from '../../hooks/use-escape-key';

function Layer({
  isOpen,
  onEscape,
  label,
}: {
  isOpen: boolean;
  onEscape: () => void;
  label: string;
}) {
  useEscapeKey(isOpen, onEscape);
  return isOpen ? <div>{label}</div> : null;
}

function pressEscape() {
  fireEvent.keyDown(document, { key: 'Escape' });
}

describe('useEscapeKey', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the handler when Escape is pressed while enabled', () => {
    const onEscape = vi.fn();
    render(<Layer isOpen={true} onEscape={onEscape} label="one" />);

    pressEscape();

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('ignores keys other than Escape', () => {
    const onEscape = vi.fn();
    render(<Layer isOpen={true} onEscape={onEscape} label="one" />);

    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('does not call the handler while disabled', () => {
    const onEscape = vi.fn();
    render(<Layer isOpen={false} onEscape={onEscape} label="one" />);

    pressEscape();

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('dismisses only the topmost layer when two are open', () => {
    const onOuter = vi.fn();
    const onInner = vi.fn();
    render(
      <>
        <Layer isOpen={true} onEscape={onOuter} label="outer" />
        <Layer isOpen={true} onEscape={onInner} label="inner" />
      </>
    );

    pressEscape();

    expect(onInner).toHaveBeenCalledTimes(1);
    expect(onOuter).not.toHaveBeenCalled();
  });

  it('falls back to the outer layer once the inner one closes', () => {
    const onOuter = vi.fn();
    const onInner = vi.fn();
    const { rerender } = render(
      <>
        <Layer isOpen={true} onEscape={onOuter} label="outer" />
        <Layer isOpen={true} onEscape={onInner} label="inner" />
      </>
    );

    rerender(
      <>
        <Layer isOpen={true} onEscape={onOuter} label="outer" />
        <Layer isOpen={false} onEscape={onInner} label="inner" />
      </>
    );
    pressEscape();

    expect(onOuter).toHaveBeenCalledTimes(1);
    expect(onInner).not.toHaveBeenCalled();
  });

  it('keeps the outer layer below the inner one when the outer re-renders', () => {
    const onOuter = vi.fn();
    const onInner = vi.fn();
    function Pair({ caption }: { caption: string }) {
      return (
        <>
          <Layer isOpen={true} onEscape={onOuter} label={`outer ${caption}`} />
          <Layer isOpen={true} onEscape={onInner} label="inner" />
        </>
      );
    }
    const { rerender } = render(<Pair caption="a" />);

    rerender(<Pair caption="b" />);
    expect(screen.getByText('outer b')).toBeInTheDocument();
    pressEscape();

    expect(onInner).toHaveBeenCalledTimes(1);
    expect(onOuter).not.toHaveBeenCalled();
  });

  it('invokes the latest handler after a re-render', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <Layer isOpen={true} onEscape={first} label="one" />
    );

    rerender(<Layer isOpen={true} onEscape={second} label="one" />);
    pressEscape();

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('ignores an Escape a nested control already handled', () => {
    const onEscape = vi.fn();
    render(<Layer isOpen={true} onEscape={onEscape} label="one" />);

    // happy-dom ignores the `defaultPrevented` init key on a constructed
    // event, so preventDefault() is applied through a real capture-phase
    // listener instead.
    const cancel = (e: Event) => e.preventDefault();
    document.addEventListener('keydown', cancel, true);
    fireEvent.keyDown(document, { key: 'Escape', cancelable: true });
    document.removeEventListener('keydown', cancel, true);

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('removes the document listener once no layer is enabled', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(
      <Layer isOpen={true} onEscape={vi.fn()} label="one" />
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
