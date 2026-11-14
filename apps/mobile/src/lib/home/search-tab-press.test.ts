import { describe, expect, it } from 'vitest';
import { isAtTop, searchTabPressAction } from './search-tab-press';

describe('searchTabPressAction', () => {
  const reTapAtTop = {
    tabWasSelected: true,
    homeShowing: true,
    atTop: true,
    fieldFocused: false,
  };

  it('focuses the field on a re-tap while Home shows at its top', () => {
    expect(searchTabPressAction(reTapAtTop)).toBe('focus-field');
  });

  it('only switches when Search is tapped from another tab', () => {
    expect(
      searchTabPressAction({
        ...reTapAtTop,
        tabWasSelected: false,
        homeShowing: false,
      })
    ).toBe('none');
    // Defensive: a tab that was not selected has no focused screen, so Home
    // cannot be showing; it cannot occur in practice.
    expect(searchTabPressAction({ ...reTapAtTop, tabWasSelected: false })).toBe(
      'none'
    );
  });

  it('only pops back to Home when a screen is pushed over it', () => {
    expect(searchTabPressAction({ ...reTapAtTop, homeShowing: false })).toBe(
      'none'
    );
  });

  it('only scrolls to the top when Home is scrolled', () => {
    expect(searchTabPressAction({ ...reTapAtTop, atTop: false })).toBe('none');
  });

  it('leaves a focused field focused', () => {
    expect(searchTabPressAction({ ...reTapAtTop, fieldFocused: true })).toBe(
      'none'
    );
  });
});

describe('isAtTop', () => {
  const inset = 62;

  it('counts the resting offset, minus the inset, as the top', () => {
    expect(isAtTop(-62, inset)).toBe(true);
    // A pull past the top.
    expect(isAtTop(-90, inset)).toBe(true);
  });

  it('allows a few points of slack', () => {
    expect(isAtTop(-59, inset)).toBe(true);
    expect(isAtTop(-57, inset)).toBe(false);
  });

  it('does not count an offset of 0 as the top', () => {
    // The first rows are under the status bar there.
    expect(isAtTop(0, inset)).toBe(false);
    expect(isAtTop(300, inset)).toBe(false);
  });

  it('measures from 0 without an inset', () => {
    expect(isAtTop(0, 0)).toBe(true);
    expect(isAtTop(5, 0)).toBe(false);
  });
});
