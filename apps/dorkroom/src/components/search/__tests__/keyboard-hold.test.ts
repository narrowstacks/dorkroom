import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearHeldText,
  heldText,
  holdKeyboard,
  KEYBOARD_HOLD_ATTRIBUTE,
  KEYBOARD_HOLD_MS,
} from '../keyboard-hold';

const standIns = () =>
  document.querySelectorAll(`[${KEYBOARD_HOLD_ATTRIBUTE}]`);

afterEach(() => {
  vi.useRealTimers();
  for (const field of standIns()) field.remove();
});

describe('holdKeyboard', () => {
  it('focuses a text field kept out of the Tab order and away from screen readers', () => {
    holdKeyboard();
    const field = document.activeElement;
    expect(field).toBeInstanceOf(HTMLInputElement);
    expect(field).toHaveAttribute(KEYBOARD_HOLD_ATTRIBUTE);
    expect(field).toHaveAttribute('aria-hidden', 'true');
    expect(field).toHaveAttribute('tabindex', '-1');
    // Focusable (not display: none), and big enough text that iOS won't zoom.
    expect(field).toHaveStyle({ opacity: '0', fontSize: '16px' });
  });

  it('gives up its text, and removes itself once focus moves on', () => {
    holdKeyboard();
    const field = document.activeElement;
    if (!(field instanceof HTMLInputElement)) throw new Error('no stand-in');
    field.value = 'tri-x';
    expect(heldText()).toBe('tri-x');

    const box = document.createElement('input');
    document.body.append(box);
    box.focus();
    expect(field.isConnected).toBe(false);
    expect(heldText()).toBe('');
    box.remove();
  });

  it('lets go of focus and the keyboard if the dialog never comes', () => {
    vi.useFakeTimers();
    holdKeyboard();
    vi.advanceTimersByTime(KEYBOARD_HOLD_MS - 1);
    expect(standIns()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(standIns()).toHaveLength(0);
    expect(document.activeElement).toBe(document.body);
  });

  it('keeps a timed-out stand-in’s text for a dialog that arrives late', () => {
    vi.useFakeTimers();
    holdKeyboard();
    const field = document.activeElement;
    if (!(field instanceof HTMLInputElement)) throw new Error('no stand-in');
    field.value = 'dd-x';
    vi.advanceTimersByTime(KEYBOARD_HOLD_MS);
    expect(heldText()).toBe('dd-x');

    clearHeldText();
    expect(heldText()).toBe('');
  });

  it('keeps one stand-in at a time', () => {
    holdKeyboard();
    holdKeyboard();
    expect(standIns()).toHaveLength(1);
  });
});
