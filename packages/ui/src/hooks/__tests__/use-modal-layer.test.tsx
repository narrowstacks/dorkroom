import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useModalLayer } from '../use-modal-layer';

/** A minimal modal: portalled to the body, like Modal and DetailPanel. */
function Layer({
  isOpen,
  label,
  children,
  focusSecond = false,
}: {
  isOpen: boolean;
  label: string;
  children?: ReactNode;
  focusSecond?: boolean;
}) {
  const secondRef = useRef<HTMLButtonElement>(null);
  const ref = useModalLayer<HTMLDialogElement>(isOpen, {
    initialFocus: focusSecond ? secondRef : undefined,
  });
  if (!isOpen) return null;
  return createPortal(
    <dialog ref={ref} open aria-modal="true" aria-label={label} tabIndex={-1}>
      <button type="button">{label} first</button>
      <button type="button" ref={secondRef}>
        {label} second
      </button>
      <button type="button">{label} last</button>
      {children}
    </dialog>,
    document.body
  );
}

/** The page behind the layer: a trigger in the app's own root. */
function Page({ children }: { children?: ReactNode }) {
  return (
    <main>
      <button type="button">Opener</button>
      {children}
    </main>
  );
}

/** Whether the element or an ancestor carries `inert`. */
function isInert(element: Element): boolean {
  return element.closest('[inert]') !== null;
}

afterEach(cleanup);

describe('useModalLayer', () => {
  describe('focus entering', () => {
    it('moves focus to the first tabbable element on open', () => {
      render(<Layer isOpen label="Dialog" />);
      expect(
        screen.getByRole('button', { name: 'Dialog first' })
      ).toHaveFocus();
    });

    it('moves focus to initialFocus when given', () => {
      render(<Layer isOpen label="Dialog" focusSecond />);
      expect(
        screen.getByRole('button', { name: 'Dialog second' })
      ).toHaveFocus();
    });

    it('falls back to the layer itself when nothing inside is tabbable', () => {
      function Empty() {
        const ref = useModalLayer<HTMLDialogElement>(true);
        return (
          <dialog ref={ref} open aria-label="Empty" tabIndex={-1}>
            Loading
          </dialog>
        );
      }
      render(<Empty />);
      expect(screen.getByRole('dialog', { name: 'Empty' })).toHaveFocus();
    });
  });

  describe('focus trapping', () => {
    it('wraps Tab from the last element to the first, and Shift+Tab back', () => {
      render(<Layer isOpen label="Dialog" />);
      const first = screen.getByRole('button', { name: 'Dialog first' });
      const last = screen.getByRole('button', { name: 'Dialog last' });

      last.focus();
      fireEvent.keyDown(last, { key: 'Tab' });
      expect(first).toHaveFocus();

      fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
      expect(last).toHaveFocus();
    });

    it('leaves Tab between the ends to the browser', () => {
      render(<Layer isOpen label="Dialog" />);
      const second = screen.getByRole('button', { name: 'Dialog second' });
      second.focus();
      const event = fireEvent.keyDown(second, { key: 'Tab' });
      // fireEvent returns false when the handler called preventDefault.
      expect(event).toBe(true);
      expect(second).toHaveFocus();
    });

    it('sends Tab from the layer itself to the first element', () => {
      render(<Layer isOpen label="Dialog" />);
      const dialog = screen.getByRole('dialog', { name: 'Dialog' });
      dialog.focus();
      fireEvent.keyDown(dialog, { key: 'Tab' });
      expect(
        screen.getByRole('button', { name: 'Dialog first' })
      ).toHaveFocus();
    });
  });

  describe('what counts as tabbable', () => {
    /** A layer whose last element is the one under test. */
    function Tail({ children }: { children: ReactNode }) {
      const ref = useModalLayer<HTMLDialogElement>(true);
      return (
        <dialog ref={ref} open aria-label="Tail" tabIndex={-1}>
          <button type="button">Head</button>
          <button type="button">Middle</button>
          {children}
        </dialog>
      );
    }

    it.each([
      [
        'display: none',
        <button key="x" type="button" style={{ display: 'none' }}>
          X
        </button>,
      ],
      [
        'visibility: hidden',
        <button key="x" type="button" style={{ visibility: 'hidden' }}>
          X
        </button>,
      ],
      [
        'a hidden ancestor',
        <div key="x" style={{ display: 'none' }}>
          <button type="button">X</button>
        </div>,
      ],
      [
        'a disabled fieldset',
        <fieldset key="x" disabled>
          <button type="button">X</button>
        </fieldset>,
      ],
    ])('skips a last element under %s when wrapping', (_label, tail) => {
      render(<Tail>{tail}</Tail>);
      const head = screen.getByRole('button', { name: 'Head' });
      const middle = screen.getByRole('button', { name: 'Middle' });

      middle.focus();
      fireEvent.keyDown(middle, { key: 'Tab' });
      expect(head).toHaveFocus();

      fireEvent.keyDown(head, { key: 'Tab', shiftKey: true });
      expect(middle).toHaveFocus();
    });

    it('gives a radio group one Tab stop, on its checked radio', () => {
      render(
        <Tail>
          <input type="radio" name="speed" aria-label="ISO 100" />
          <input
            type="radio"
            name="speed"
            aria-label="ISO 400"
            defaultChecked
          />
          <input type="radio" name="speed" aria-label="ISO 1600" />
        </Tail>
      );
      const head = screen.getByRole('button', { name: 'Head' });
      const checked = screen.getByRole('radio', { name: 'ISO 400' });

      fireEvent.keyDown(head, { key: 'Tab', shiftKey: true });
      expect(checked).toHaveFocus();
      fireEvent.keyDown(checked, { key: 'Tab' });
      expect(head).toHaveFocus();
    });
  });

  describe('background', () => {
    it('makes the rest of the page inert while open, and clears it on close', () => {
      const { rerender } = render(
        <Page>
          <Layer isOpen label="Dialog" />
        </Page>
      );
      const opener = screen.getByRole('button', { name: 'Opener' });
      const dialog = screen.getByRole('dialog', { name: 'Dialog' });
      expect(isInert(opener)).toBe(true);
      expect(isInert(dialog)).toBe(false);

      rerender(
        <Page>
          <Layer isOpen={false} label="Dialog" />
        </Page>
      );
      expect(document.querySelector('[inert]')).toBeNull();
    });

    it('never clears an inert attribute it did not set', () => {
      const authored = document.createElement('div');
      authored.setAttribute('inert', '');
      document.body.append(authored);

      const { unmount } = render(<Layer isOpen label="Dialog" />);
      unmount();
      expect(authored).toHaveAttribute('inert');
      authored.remove();
    });

    it('keeps live regions on the body announced', () => {
      const live = document.createElement('output');
      live.setAttribute('aria-live', 'polite');
      document.body.append(live);

      render(<Layer isOpen label="Dialog" />);
      expect(live).not.toHaveAttribute('inert');
      live.remove();
    });

    it('keeps keepInteractive elements clickable, wherever they sit', () => {
      function WithToggle() {
        const toggleRef = useRef<HTMLButtonElement>(null);
        const ref = useModalLayer<HTMLDialogElement>(true, {
          keepInteractive: [toggleRef],
        });
        return (
          <main>
            <header>
              <button type="button">Elsewhere</button>
              <button type="button" ref={toggleRef}>
                Toggle
              </button>
            </header>
            <dialog ref={ref} open aria-label="Nav" tabIndex={-1}>
              <button type="button">Inside</button>
            </dialog>
          </main>
        );
      }
      render(<WithToggle />);
      expect(isInert(screen.getByRole('button', { name: 'Toggle' }))).toBe(
        false
      );
      expect(isInert(screen.getByRole('button', { name: 'Inside' }))).toBe(
        false
      );
      expect(isInert(screen.getByRole('button', { name: 'Elsewhere' }))).toBe(
        true
      );
    });
  });

  describe('focus restoration', () => {
    it('returns focus to the opener on close and on unmount', () => {
      const { rerender, unmount } = render(
        <Page>
          <Layer isOpen={false} label="Dialog" />
        </Page>
      );
      const opener = screen.getByRole('button', { name: 'Opener' });
      opener.focus();

      rerender(
        <Page>
          <Layer isOpen label="Dialog" />
        </Page>
      );
      expect(opener).not.toHaveFocus();
      rerender(
        <Page>
          <Layer isOpen={false} label="Dialog" />
        </Page>
      );
      expect(opener).toHaveFocus();

      rerender(
        <Page>
          <Layer isOpen label="Dialog" />
        </Page>
      );
      unmount();
      expect(document.querySelector('[inert]')).toBeNull();
    });
  });

  describe('focus restoration fallbacks', () => {
    it('sends focus to returnFocus when given', () => {
      function WithReturn({ isOpen }: { isOpen: boolean }) {
        const targetRef = useRef<HTMLButtonElement>(null);
        const ref = useModalLayer<HTMLDialogElement>(isOpen, {
          returnFocus: targetRef,
        });
        return (
          <main>
            <button type="button">Opener</button>
            <button type="button" ref={targetRef}>
              Target
            </button>
            {isOpen && (
              <dialog ref={ref} open aria-label="D" tabIndex={-1}>
                <button type="button">Inside</button>
              </dialog>
            )}
          </main>
        );
      }
      const { rerender } = render(<WithReturn isOpen={false} />);
      screen.getByRole('button', { name: 'Opener' }).focus();
      rerender(<WithReturn isOpen />);
      rerender(<WithReturn isOpen={false} />);
      expect(screen.getByRole('button', { name: 'Target' })).toHaveFocus();
    });

    it('falls back to the layer below when the opener is gone', () => {
      // A confirm opened from a button inside the outer layer, where
      // confirming removes that button along with the confirm.
      function Confirming({
        confirmOpen,
        showDelete,
      }: {
        confirmOpen: boolean;
        showDelete: boolean;
      }) {
        return (
          <Page>
            <Layer isOpen label="Outer">
              {showDelete && <button type="button">Delete</button>}
            </Layer>
            <Layer isOpen={confirmOpen} label="Confirm" />
          </Page>
        );
      }
      const { rerender } = render(
        <Confirming confirmOpen={false} showDelete />
      );
      screen.getByRole('button', { name: 'Delete' }).focus();
      rerender(<Confirming confirmOpen showDelete />);
      rerender(<Confirming confirmOpen={false} showDelete={false} />);
      expect(screen.getByRole('dialog', { name: 'Outer' })).toHaveFocus();
    });
  });

  describe('out-of-order close', () => {
    it('keeps the top layer modal and focused when the lower layer closes first', () => {
      const { rerender } = render(
        <Page>
          <Layer isOpen={false} label="Outer" />
          <Layer isOpen={false} label="Inner" />
        </Page>
      );
      // The outer layer's opener, which it must not reclaim while the inner
      // layer is still open.
      screen.getByRole('button', { name: 'Opener' }).focus();
      rerender(
        <Page>
          <Layer isOpen label="Outer" />
          <Layer isOpen={false} label="Inner" />
        </Page>
      );
      rerender(
        <Page>
          <Layer isOpen label="Outer" />
          <Layer isOpen label="Inner" />
        </Page>
      );
      const innerFirst = screen.getByRole('button', { name: 'Inner first' });
      expect(innerFirst).toHaveFocus();

      rerender(
        <Page>
          <Layer isOpen={false} label="Outer" />
          <Layer isOpen label="Inner" />
        </Page>
      );
      expect(innerFirst).toHaveFocus();
      expect(isInert(innerFirst)).toBe(false);
      expect(isInert(screen.getByRole('button', { name: 'Opener' }))).toBe(
        true
      );

      rerender(
        <Page>
          <Layer isOpen={false} label="Outer" />
          <Layer isOpen={false} label="Inner" />
        </Page>
      );
      expect(document.querySelector('[inert]')).toBeNull();
    });
  });

  describe('nested layers', () => {
    it('makes the lower layer inert, then hands focus and interactivity back', () => {
      const { rerender } = render(
        <Page>
          <Layer isOpen label="Outer" />
          <Layer isOpen={false} label="Inner" />
        </Page>
      );
      const outerLast = screen.getByRole('button', { name: 'Outer last' });
      outerLast.focus();

      rerender(
        <Page>
          <Layer isOpen label="Outer" />
          <Layer isOpen label="Inner" />
        </Page>
      );
      expect(screen.getByRole('button', { name: 'Inner first' })).toHaveFocus();
      expect(isInert(outerLast)).toBe(true);

      rerender(
        <Page>
          <Layer isOpen label="Outer" />
          <Layer isOpen={false} label="Inner" />
        </Page>
      );
      expect(outerLast).toHaveFocus();
      expect(isInert(outerLast)).toBe(false);
      expect(isInert(screen.getByRole('button', { name: 'Opener' }))).toBe(
        true
      );
    });
  });
});
