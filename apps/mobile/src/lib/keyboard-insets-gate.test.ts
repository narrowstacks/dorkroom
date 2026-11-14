import { describe, expect, it } from 'vitest';
import {
  createKeyboardTracker,
  initialKeyboardGate,
  isKeyboardGateOpen,
  isWaitingForHide,
  keyboardGateOnFocusChange,
  keyboardGateOnHide,
} from './keyboard-insets-gate';

describe('keyboard insets gate', () => {
  it('is open for a focused screen with no keyboard and closed when unfocused', () => {
    expect(isKeyboardGateOpen(initialKeyboardGate(true, false))).toBe(true);
    expect(isKeyboardGateOpen(initialKeyboardGate(false, false))).toBe(false);
  });

  it('stays closed for a keyboard that was up when the screen mounted (a push while typing)', () => {
    const pushed = initialKeyboardGate(true, true);
    expect(isKeyboardGateOpen(pushed)).toBe(false);
    expect(isKeyboardGateOpen(keyboardGateOnHide(pushed))).toBe(true);
  });

  it('stays closed for a keyboard that was up when the screen gained focus (Back or a tab switch)', () => {
    const hub = initialKeyboardGate(false, false);
    const focused = keyboardGateOnFocusChange(hub, true, true);
    expect(focused).toEqual({ focused: true, inherited: true, held: false });
    expect(isKeyboardGateOpen(focused)).toBe(false);
    expect(isKeyboardGateOpen(keyboardGateOnHide(focused))).toBe(true);
  });

  it('stays open after losing focus with its own keyboard up, until that keyboard hides', () => {
    const typing = initialKeyboardGate(true, false);
    const left = keyboardGateOnFocusChange(typing, false, true);
    expect(left).toEqual({ focused: false, inherited: false, held: true });
    expect(isKeyboardGateOpen(left)).toBe(true);
    expect(isKeyboardGateOpen(keyboardGateOnHide(left))).toBe(false);
  });

  it('treats its own keyboard as its own on a quick return before it hid', () => {
    const left = keyboardGateOnFocusChange(
      initialKeyboardGate(true, false),
      false,
      true
    );
    const back = keyboardGateOnFocusChange(left, true, true);
    expect(back).toEqual({ focused: true, inherited: false, held: false });
    expect(isKeyboardGateOpen(back)).toBe(true);
  });

  it('does not hold a keyboard it inherited', () => {
    const inherited = initialKeyboardGate(true, true);
    const left = keyboardGateOnFocusChange(inherited, false, true);
    expect(isKeyboardGateOpen(left)).toBe(false);
  });

  it('closes on losing focus with no keyboard up', () => {
    const left = keyboardGateOnFocusChange(
      initialKeyboardGate(true, false),
      false,
      false
    );
    expect(isKeyboardGateOpen(left)).toBe(false);
  });

  it('ignores a keyboard up when an unfocused screen mounts, until it gains focus', () => {
    const behind = initialKeyboardGate(false, true);
    expect(behind).toEqual({ focused: false, inherited: false, held: false });
    expect(isKeyboardGateOpen(behind)).toBe(false);
    expect(isWaitingForHide(behind)).toBe(false);
    expect(
      isKeyboardGateOpen(keyboardGateOnFocusChange(behind, true, true))
    ).toBe(false);
  });

  it('waits for a hide only while it inherits or holds a keyboard', () => {
    expect(isWaitingForHide(initialKeyboardGate(true, false))).toBe(false);
    expect(isWaitingForHide(initialKeyboardGate(true, true))).toBe(true);
    const held = keyboardGateOnFocusChange(
      initialKeyboardGate(true, false),
      false,
      true
    );
    expect(isWaitingForHide(held)).toBe(true);
    expect(isWaitingForHide(keyboardGateOnHide(held))).toBe(false);
  });
});

describe('keyboard tracker', () => {
  it('starts from the visibility it is given', () => {
    expect(createKeyboardTracker(true).isUp()).toBe(true);
    expect(createKeyboardTracker(false).isUp()).toBe(false);
  });

  it('is up from keyboardWillShow, before keyboardDidShow', () => {
    const tracker = createKeyboardTracker(false);
    tracker.onEvent('keyboardWillShow');
    expect(tracker.isUp()).toBe(true);
    // A screen that loses focus now is held, as React Native already set its inset.
    const left = keyboardGateOnFocusChange(
      initialKeyboardGate(true, false),
      false,
      tracker.isUp()
    );
    expect(left.held).toBe(true);
    tracker.onEvent('keyboardDidShow');
    expect(tracker.isUp()).toBe(true);
  });

  it('is down from keyboardWillHide, before keyboardDidHide', () => {
    const tracker = createKeyboardTracker(true);
    tracker.onEvent('keyboardWillHide');
    expect(tracker.isUp()).toBe(false);
    tracker.onEvent('keyboardDidHide');
    expect(tracker.isUp()).toBe(false);
  });

  it('falls back on the did-events when a will-event is missing', () => {
    const tracker = createKeyboardTracker(false);
    tracker.onEvent('keyboardDidShow');
    expect(tracker.isUp()).toBe(true);
    tracker.onEvent('keyboardDidHide');
    expect(tracker.isUp()).toBe(false);
  });
});
