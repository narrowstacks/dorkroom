import { describe, expect, it } from 'vitest';
import { FLING_VELOCITY } from '@/components/stage/stage-layout';
import {
  beganAtLargeWithKeyboard,
  bottomPaddingFor,
  CONTENT_BOTTOM_PAD,
  DISMISS_DRAG,
  draggedHeight,
  dragStartHeight,
  EXPANDED_GAP,
  GRAB_STRIP_HEIGHT,
  HEADER_HEIGHT,
  keyboardCeiling,
  panelPlacement,
  releaseOutcome,
  SCRIM_LARGE,
  SCRIM_MEDIUM,
  scrimAlpha,
  scrollViewportHeight,
  sheetHeights,
  shouldExpandOnSignal,
  TOP_GAP,
  unmovedAction,
} from './detent-sheet-layout';

const base = {
  windowHeight: 800,
  topInset: 60,
  stripHeight: GRAB_STRIP_HEIGHT,
  childrenHeight: 200,
  expandedHeight: 300,
  hasExpanded: true,
  footerHeight: 60,
  insetBottom: 34,
};

describe('sheetHeights', () => {
  it('adds the chrome and the medium block for medium', () => {
    const chrome = GRAB_STRIP_HEIGHT + HEADER_HEIGHT + 60 + 34 + 16;
    const { medium, chrome: reported } = sheetHeights(base);
    expect(reported).toBe(chrome);
    expect(medium).toBe(chrome + 200 + CONTENT_BOTTOM_PAD);
  });

  it('adds the extra block for large', () => {
    const { medium, large } = sheetHeights(base);
    expect(large).toBe(medium + EXPANDED_GAP + 300);
  });

  it('caps medium at 55% of the window', () => {
    const { medium } = sheetHeights({ ...base, childrenHeight: 900 });
    expect(medium).toBe(440);
  });

  it('caps large under the top safe area', () => {
    const { large } = sheetHeights({ ...base, expandedHeight: 2000 });
    expect(large).toBe(800 - 60 - TOP_GAP);
  });

  it('has one detent without extra content', () => {
    const { medium, large } = sheetHeights({ ...base, hasExpanded: false });
    expect(large).toBe(medium);
  });

  it('never lets large fall under medium on a short window', () => {
    const { medium, large } = sheetHeights({
      ...base,
      windowHeight: 400,
      topInset: 300,
    });
    expect(large).toBeGreaterThanOrEqual(medium);
  });

  it('rounds up fractional measurements', () => {
    const { medium } = sheetHeights({ ...base, childrenHeight: 100.2 });
    expect(Number.isInteger(medium)).toBe(true);
  });
});

describe('releaseOutcome', () => {
  const detents = {
    mediumHeight: 400,
    largeHeight: 700,
  };

  it('dismisses when dragged far enough below medium', () => {
    expect(
      releaseOutcome({
        height: 400 - DISMISS_DRAG - 1,
        startHeight: 400,
        velocityY: 0,
        ...detents,
      })
    ).toBe('dismiss');
  });

  it('springs back to medium when pulled down only a little', () => {
    expect(
      releaseOutcome({
        height: 400 - DISMISS_DRAG + 10,
        startHeight: 400,
        velocityY: 0,
        ...detents,
      })
    ).toBe('medium');
  });

  it('dismisses on a downward fling from medium', () => {
    expect(
      releaseOutcome({
        height: 395,
        startHeight: 400,
        velocityY: FLING_VELOCITY,
        ...detents,
      })
    ).toBe('dismiss');
  });

  it('goes to medium, not away, on a downward fling from large', () => {
    expect(
      releaseOutcome({
        height: 650,
        startHeight: 700,
        velocityY: FLING_VELOCITY + 400,
        ...detents,
      })
    ).toBe('medium');
  });

  it('goes to large on an upward fling', () => {
    expect(
      releaseOutcome({
        height: 420,
        startHeight: 400,
        velocityY: -FLING_VELOCITY,
        ...detents,
      })
    ).toBe('large');
  });

  it('takes the nearer detent on a slow release', () => {
    const slow = { startHeight: 400, velocityY: 0, ...detents };
    expect(releaseOutcome({ height: 520, ...slow })).toBe('medium');
    expect(releaseOutcome({ height: 560, ...slow })).toBe('large');
  });

  it('dismisses when one drag from large passes below medium minus the dismiss distance', () => {
    expect(
      releaseOutcome({
        height: 400 - DISMISS_DRAG - 1,
        startHeight: 700,
        velocityY: 0,
        ...detents,
      })
    ).toBe('dismiss');
    // A drag from large that stops short of that settles at medium instead.
    expect(
      releaseOutcome({
        height: 400 - DISMISS_DRAG + 1,
        startHeight: 700,
        velocityY: 0,
        ...detents,
      })
    ).toBe('medium');
  });

  it('stays at medium with one detent', () => {
    expect(
      releaseOutcome({
        height: 400,
        startHeight: 400,
        velocityY: -FLING_VELOCITY,
        mediumHeight: 400,
        largeHeight: 400,
      })
    ).toBe('medium');
  });
});

describe('releaseOutcome with the keyboard up at the start', () => {
  const keyboard = {
    mediumHeight: 400,
    largeHeight: 700,
    guardDismiss: true,
  };

  it('does not dismiss a drag that began at large, however far it went', () => {
    expect(
      releaseOutcome({
        height: 400 - DISMISS_DRAG - 50,
        startHeight: 520,
        velocityY: 0,
        ...keyboard,
      })
    ).toBe('medium');
    expect(
      releaseOutcome({
        height: 450,
        startHeight: 520,
        velocityY: FLING_VELOCITY + 400,
        ...keyboard,
      })
    ).toBe('medium');
  });

  it('can still settle back at large', () => {
    expect(
      releaseOutcome({
        height: 500,
        startHeight: 520,
        velocityY: -FLING_VELOCITY,
        ...keyboard,
      })
    ).toBe('large');
  });

  it('still dismisses a drag that began at medium', () => {
    expect(
      releaseOutcome({
        height: 400 - DISMISS_DRAG - 1,
        startHeight: 400,
        velocityY: 0,
        mediumHeight: 400,
        largeHeight: 700,
        guardDismiss: beganAtLargeWithKeyboard({
          keyboardHeight: 300,
          heldHeight: 400,
          mediumHeight: 400,
        }),
      })
    ).toBe('dismiss');
  });

  it('guards from the held height when the ceiling is at or under medium', () => {
    // Ceiling 300 < medium 400 < large 700: the drawn start clamps to medium.
    const start = dragStartHeight({
      height: 700,
      mediumHeight: 400,
      ceiling: 300,
    });
    expect(start).toBe(400);
    const guardDismiss = beganAtLargeWithKeyboard({
      keyboardHeight: 300,
      heldHeight: 700,
      mediumHeight: 400,
    });
    expect(guardDismiss).toBe(true);
    const detents = { mediumHeight: 400, largeHeight: 700, guardDismiss };
    expect(
      releaseOutcome({
        height: 400 - DISMISS_DRAG - 1,
        startHeight: start,
        velocityY: 0,
        ...detents,
      })
    ).toBe('medium');
    expect(
      releaseOutcome({
        height: 395,
        startHeight: start,
        velocityY: FLING_VELOCITY + 400,
        ...detents,
      })
    ).toBe('medium');
  });
});

describe('beganAtLargeWithKeyboard', () => {
  it('needs both the keyboard and a held height above medium', () => {
    const held = { keyboardHeight: 300, heldHeight: 700, mediumHeight: 400 };
    expect(beganAtLargeWithKeyboard(held)).toBe(true);
    expect(beganAtLargeWithKeyboard({ ...held, keyboardHeight: 0 })).toBe(
      false
    );
    expect(beganAtLargeWithKeyboard({ ...held, heldHeight: 400 })).toBe(false);
  });
});

describe('draggedHeight', () => {
  it('follows the finger up and down', () => {
    expect(draggedHeight(400, -100, 700)).toBe(500);
    expect(draggedHeight(400, 60, 700)).toBe(340);
  });

  it('stops at the large detent and at nothing', () => {
    expect(draggedHeight(400, -900, 700)).toBe(700);
    expect(draggedHeight(400, 900, 700)).toBe(0);
  });
});

describe('panelPlacement', () => {
  it('is the height at or above medium', () => {
    expect(
      panelPlacement({ height: 500, mediumHeight: 400, ceiling: 700 })
    ).toEqual({ height: 500, slide: 0 });
  });

  it('keeps the medium height and slides below it', () => {
    expect(
      panelPlacement({ height: 350, mediumHeight: 400, ceiling: 700 })
    ).toEqual({ height: 400, slide: 50 });
  });

  it('never passes the ceiling', () => {
    expect(
      panelPlacement({ height: 700, mediumHeight: 400, ceiling: 520 }).height
    ).toBe(520);
  });
});

describe('keyboardCeiling', () => {
  it('leaves the top gap under the safe area', () => {
    expect(keyboardCeiling(800, 60, 0)).toBe(800 - 60 - TOP_GAP);
  });

  it('shrinks by the keyboard and is never negative', () => {
    expect(keyboardCeiling(800, 60, 300)).toBe(800 - 60 - TOP_GAP - 300);
    expect(keyboardCeiling(800, 60, 2000)).toBe(0);
  });
});

describe('scrimAlpha', () => {
  it('runs from the medium alpha to the large alpha', () => {
    expect(scrimAlpha(400, 400, 700)).toBeCloseTo(SCRIM_MEDIUM);
    expect(scrimAlpha(700, 400, 700)).toBeCloseTo(SCRIM_LARGE);
    expect(scrimAlpha(550, 400, 700)).toBeCloseTo(
      (SCRIM_MEDIUM + SCRIM_LARGE) / 2
    );
  });

  it('clamps outside the detents and with one detent', () => {
    expect(scrimAlpha(100, 400, 700)).toBeCloseTo(SCRIM_MEDIUM);
    expect(scrimAlpha(900, 400, 700)).toBeCloseTo(SCRIM_LARGE);
    expect(scrimAlpha(400, 400, 400)).toBe(SCRIM_MEDIUM);
  });
});

describe('bottomPaddingFor', () => {
  it('clears the home indicator, or a plain 16 under the keyboard', () => {
    expect(bottomPaddingFor(34, 0)).toBe(50);
    expect(bottomPaddingFor(34, 300)).toBe(16);
  });
});

describe('scrollViewportHeight', () => {
  const input = {
    restHeight: 600,
    windowHeight: 800,
    topInset: 60,
    insetBottom: 34,
    fixedTop: 100,
  };

  it('is the rest height less the chrome with no keyboard', () => {
    expect(scrollViewportHeight({ ...input, keyboardHeight: 0 })).toBe(
      600 - 100 - 50
    );
  });

  it('counts the smaller padding the panel has under the keyboard', () => {
    // Rest fits under the ceiling: only the padding differs from no keyboard.
    expect(
      scrollViewportHeight({ ...input, restHeight: 300, keyboardHeight: 200 })
    ).toBe(300 - 100 - 16);
  });

  it('shrinks when the keyboard leaves less room than the rest height', () => {
    expect(scrollViewportHeight({ ...input, keyboardHeight: 400 })).toBe(
      800 - 60 - TOP_GAP - 400 - 100 - 16
    );
  });
});

describe('dragStartHeight', () => {
  it('is the held height when the panel is not capped', () => {
    expect(
      dragStartHeight({ height: 600, mediumHeight: 400, ceiling: 700 })
    ).toBe(600);
  });

  it('is the drawn height when the keyboard caps the panel below large', () => {
    expect(
      dragStartHeight({ height: 700, mediumHeight: 400, ceiling: 520 })
    ).toBe(520);
  });

  it('never starts below medium because of a tiny ceiling', () => {
    expect(
      dragStartHeight({ height: 700, mediumHeight: 400, ceiling: 300 })
    ).toBe(400);
  });

  it('keeps a dismiss drag under way where it is', () => {
    expect(
      dragStartHeight({ height: 350, mediumHeight: 400, ceiling: 520 })
    ).toBe(350);
  });
});

describe('shouldExpandOnSignal', () => {
  it('expands from medium when it can resize', () => {
    expect(shouldExpandOnSignal({ canResize: true, expanded: false })).toBe(
      true
    );
  });

  it('does nothing when already large', () => {
    expect(shouldExpandOnSignal({ canResize: true, expanded: true })).toBe(
      false
    );
  });

  it('does nothing with one detent (no expanded content, or no room)', () => {
    expect(shouldExpandOnSignal({ canResize: false, expanded: false })).toBe(
      false
    );
  });
});

describe('unmovedAction', () => {
  it('reports where a settled sheet rests', () => {
    expect(unmovedAction({ closing: false, moving: false })).toBe('report');
  });

  it('leaves a running spring to report its own arrival', () => {
    expect(unmovedAction({ closing: false, moving: true })).toBe('ignore');
  });

  it('does nothing once the sheet is closing', () => {
    expect(unmovedAction({ closing: true, moving: false })).toBe('ignore');
    expect(unmovedAction({ closing: true, moving: true })).toBe('ignore');
  });
});
