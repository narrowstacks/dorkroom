import { describe, expect, it } from 'vitest';
import {
  clampPanelHeight,
  collapsedPanelHeight,
  drawingKeep,
  expandedPanelHeight,
  FIELD_MARGIN,
  fieldScrollTarget,
  FLING_VELOCITY,
  KEYBOARD_GAP,
  MIN_ROOM,
  MIN_STAGE_HEIGHT,
  PANEL_MAX_WIDTH,
  panelAvailable,
  panelBottom,
  panelCeiling,
  panelFrame,
  panelRoom,
  snapsToExpanded,
  STAGE_GUTTER,
  STAGE_PANEL_GAP,
  stageRect,
  STRIP_HEIGHT,
} from './stage-layout';

describe('stageRect', () => {
  const base = {
    width: 402,
    height: 874,
    top: 120,
    bottomOffset: 90,
    collapsedHeight: 260,
  };

  it('fills from the header to just above the collapsed panel', () => {
    expect(stageRect(base)).toEqual({
      x: STAGE_GUTTER,
      y: 120,
      width: 402 - 2 * STAGE_GUTTER,
      height: 874 - 90 - 260 - STAGE_PANEL_GAP - 120,
    });
  });

  it('does not depend on anything but the collapsed height', () => {
    // There is no expanded height or keyboard input at all: the stage cannot
    // move when the panel changes detent or the keyboard opens.
    expect(stageRect({ ...base })).toEqual(stageRect({ ...base }));
    expect(stageRect({ ...base, collapsedHeight: 300 }).height).toBe(
      stageRect(base).height - 40
    );
  });

  it('never returns a negative size, and keeps a least height', () => {
    const r = stageRect({ ...base, height: 200 });
    expect(r.height).toBe(MIN_STAGE_HEIGHT);
    expect(stageRect({ ...base, width: 40 }).width).toBe(0);
  });
});

describe('panelAvailable', () => {
  it('is the room between the header and the panel rest', () => {
    expect(panelAvailable(874, 124, 91)).toBe(659);
    // Never less than the least room layout works with.
    expect(panelAvailable(100, 124, 91)).toBe(MIN_ROOM);
  });
});

describe('collapsedPanelHeight', () => {
  it('is the block when it is short enough', () => {
    expect(collapsedPanelHeight({ blockHeight: 248.4, available: 659 })).toBe(
      249
    );
  });

  it('is capped at 45% of the room, and the block scrolls inside', () => {
    expect(collapsedPanelHeight({ blockHeight: 560, available: 538 })).toBe(
      242
    );
  });
});

describe('expandedPanelHeight', () => {
  it('wraps short content', () => {
    expect(
      expandedPanelHeight({
        contentHeight: 300.2,
        collapsedHeight: 260,
        available: 659,
      })
    ).toBe(301);
  });

  it('leaves the drawing 45% of the room (240pt at least) when content is tall', () => {
    // 659 - max(240, 296.55) = 362.
    expect(
      expandedPanelHeight({
        contentHeight: 2000,
        collapsedHeight: 260,
        available: 659,
      })
    ).toBe(362);
    // 538 - max(240, 242.1) = 295.9, floored.
    expect(
      expandedPanelHeight({
        contentHeight: 2000,
        collapsedHeight: 200,
        available: 538,
      })
    ).toBe(295);
    expect(
      expandedPanelHeight({
        contentHeight: 2000,
        collapsedHeight: 100,
        available: 400,
      })
    ).toBe(160);
  });

  it('is never below the collapsed height', () => {
    expect(
      expandedPanelHeight({
        contentHeight: 100,
        collapsedHeight: 260,
        available: 659,
      })
    ).toBe(260);
    expect(
      expandedPanelHeight({
        contentHeight: 900,
        collapsedHeight: 400,
        available: 659,
      })
    ).toBe(400);
  });
});

describe('the expanded cap for real inputs', () => {
  // iPhone 18 Pro (874pt tall) with the tab bar's 93pt under the panel.
  const cases = [
    // Border and Mat Cut: a header with no pinned readout.
    { name: 'topLimit 124', topLimit: 124, ceiling: 361, kept: 296 },
    // Resize: a pinned readout pushes the limit down.
    { name: 'topLimit 262', topLimit: 262, ceiling: 279, kept: 240 },
  ];
  for (const { name, topLimit, ceiling, kept } of cases) {
    it(`${name} caps the panel at ${ceiling} and keeps ~${kept} of drawing`, () => {
      const available = panelAvailable(874, topLimit, 93);
      expect(
        expandedPanelHeight({
          contentHeight: 2000,
          collapsedHeight: 200,
          available,
        })
      ).toBe(ceiling);
      expect(Math.round(drawingKeep(available))).toBe(kept);
      // With no keyboard the animated room is the same ceiling.
      expect(
        Math.floor(panelRoom(874, topLimit, 93, drawingKeep(available)))
      ).toBe(ceiling);
    });
  }
});

describe('a screen with its own drawing floor (Resize)', () => {
  const available = panelAvailable(874, 262, 93);

  it('keeps the floor it asks for instead of max(240, 45%)', () => {
    expect(drawingKeep(available, 120)).toBe(120);
    expect(drawingKeep(available)).toBe(240);
    expect(
      expandedPanelHeight({
        contentHeight: 2000,
        collapsedHeight: 290,
        available,
        minDrawing: 120,
      })
    ).toBe(399);
    // The same panel with the default floor stops far lower.
    expect(
      expandedPanelHeight({
        contentHeight: 2000,
        collapsedHeight: 290,
        available,
      })
    ).toBe(290);
  });

  it('the animated room matches the ceiling with no keyboard', () => {
    expect(
      Math.floor(panelRoom(874, 262, 93, drawingKeep(available, 120)))
    ).toBe(399);
  });

  it('raises the collapsed cap so whole rows fit, and still caps a taller block', () => {
    expect(collapsedPanelHeight({ blockHeight: 290, available })).toBe(233);
    expect(
      collapsedPanelHeight({ blockHeight: 290, available, maxShare: 0.6 })
    ).toBe(290);
    expect(
      collapsedPanelHeight({ blockHeight: 400, available, maxShare: 0.6 })
    ).toBe(311);
  });
});

describe('panelCeiling', () => {
  it('stops the panel at the pinned readout when the keyboard is up', () => {
    // 874 tall, readout ends at 262, keyboard lifts the bottom to 344: 268 left,
    // less than Resize's 282 collapsed block.
    expect(panelCeiling(874, 262, 344)).toBe(268);
    expect(panelCeiling(874, 262, 93)).toBe(519);
    expect(panelCeiling(100, 262, 93)).toBe(STRIP_HEIGHT);
    // A 667pt window, readout to 262, keyboard up (bottom 268): 137 left, not 200.
    expect(panelCeiling(667, 262, 268)).toBe(137);
  });
});

describe('tiny rooms', () => {
  it('lay out to positive, finite sizes', () => {
    for (const height of [0, 40, 150, 260, 320]) {
      const available = panelAvailable(height, 124, 93);
      const collapsed = collapsedPanelHeight({ blockHeight: 120, available });
      expect(collapsed).toBeGreaterThan(0);
      const stage = stageRect({
        width: 300,
        height,
        top: 124,
        bottomOffset: 93,
        collapsedHeight: collapsed,
      });
      for (const n of [available, collapsed, stage.width, stage.height]) {
        expect(Number.isFinite(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
      }
      expect(stage.height).toBeGreaterThanOrEqual(MIN_STAGE_HEIGHT);
      expect(
        expandedPanelHeight({
          contentHeight: 900,
          collapsedHeight: collapsed,
          available,
        })
      ).toBeGreaterThanOrEqual(collapsed);
    }
  });

  it('survives a non-finite window', () => {
    expect(Number.isFinite(panelAvailable(Number.NaN, 124, 93))).toBe(true);
  });
});

describe('panelFrame', () => {
  it('fills a phone, less the side margins', () => {
    expect(panelFrame(402)).toEqual({ width: 378, left: 12 });
  });

  it('caps the width on an iPad and centres the panel', () => {
    expect(panelFrame(1032)).toEqual({ width: PANEL_MAX_WIDTH, left: 236 });
  });
});

describe('clampPanelHeight', () => {
  it('holds a drag between the detents', () => {
    expect(clampPanelHeight(100, 260, 600)).toBe(260);
    expect(clampPanelHeight(400, 260, 600)).toBe(400);
    expect(clampPanelHeight(900, 260, 600)).toBe(600);
  });
});

describe('snapsToExpanded', () => {
  const detents = { collapsedHeight: 260, expandedHeight: 600 };

  it('settles on the nearer detent when released slowly', () => {
    expect(snapsToExpanded({ height: 420, velocityY: 0, ...detents })).toBe(
      false
    );
    expect(snapsToExpanded({ height: 440, velocityY: 0, ...detents })).toBe(
      true
    );
  });

  it('lets a fling pick the direction from anywhere', () => {
    expect(
      snapsToExpanded({
        height: 270,
        velocityY: -FLING_VELOCITY,
        ...detents,
      })
    ).toBe(true);
    expect(
      snapsToExpanded({ height: 590, velocityY: FLING_VELOCITY, ...detents })
    ).toBe(false);
  });

  it('ignores a slow drift against the finger', () => {
    expect(snapsToExpanded({ height: 590, velocityY: 100, ...detents })).toBe(
      true
    );
  });

  it('stays collapsed when there is nothing more to show', () => {
    expect(
      snapsToExpanded({
        height: 260,
        velocityY: -2000,
        collapsedHeight: 260,
        expandedHeight: 260,
      })
    ).toBe(false);
  });
});

describe('keyboard', () => {
  it('leaves the panel where it is without a keyboard', () => {
    expect(panelBottom(0, 90)).toBe(90);
  });

  it('lifts the panel above the keyboard, and never below its rest', () => {
    expect(panelBottom(336, 90)).toBe(336 + KEYBOARD_GAP);
    expect(panelBottom(50, 90)).toBe(90);
  });

  it('limits the height so the drawing keeps its share under the header', () => {
    expect(panelRoom(874, 124, 344, 297)).toBe(874 - 124 - 344 - 297);
    expect(panelRoom(874, 124, 91, 297)).toBe(362);
    expect(panelRoom(300, 120, 344, 240)).toBe(0);
  });

  it('keeps 240pt of drawing, or 45% of the room when that is more', () => {
    expect(drawingKeep(659)).toBeCloseTo(296.55, 6);
    expect(drawingKeep(400)).toBe(240);
  });
});

describe('fieldScrollTarget', () => {
  const view = { viewportHeight: 300, scrollY: 100 };

  it('leaves a visible field alone', () => {
    expect(
      fieldScrollTarget({ fieldY: 200, fieldHeight: 48, ...view })
    ).toBeNull();
  });

  it('scrolls up to a field above the view, with a margin', () => {
    expect(fieldScrollTarget({ fieldY: 60, fieldHeight: 48, ...view })).toBe(
      60 - FIELD_MARGIN
    );
  });

  it('scrolls down just enough for a field below the view', () => {
    expect(fieldScrollTarget({ fieldY: 380, fieldHeight: 48, ...view })).toBe(
      380 + 48 + FIELD_MARGIN - 300
    );
  });

  it('never scrolls above the content', () => {
    expect(
      fieldScrollTarget({
        fieldY: 4,
        fieldHeight: 48,
        scrollY: 50,
        viewportHeight: 300,
      })
    ).toBe(0);
  });

  it('does nothing before the view is measured', () => {
    expect(
      fieldScrollTarget({
        fieldY: 400,
        fieldHeight: 48,
        scrollY: 0,
        viewportHeight: 0,
      })
    ).toBeNull();
  });
});
