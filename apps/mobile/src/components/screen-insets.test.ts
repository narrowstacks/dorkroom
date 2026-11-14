import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { bottomRoomProps } from './screen-insets';

describe('bottomRoomProps', () => {
  it('reserves the room as a bottom content inset and the same indicator inset', () => {
    expect(bottomRoomProps(54)).toEqual({
      contentInset: { bottom: 54 },
      scrollIndicatorInsets: { bottom: 54 },
    });
  });

  it('passes no inset props at all without room, so other screens are unchanged', () => {
    for (const room of [0, -3, Number.NaN]) {
      expect(bottomRoomProps(room), String(room)).toEqual({});
    }
  });
});

describe('Screen reserves room by inset, not by content', () => {
  const screen = readFileSync(
    join(fileURLToPath(new URL('.', import.meta.url)), 'screen.tsx'),
    'utf8'
  );

  it('spreads bottomRoomProps on the scroll view and keeps automatic insets', () => {
    expect(screen).toMatch(/\{\.\.\.bottomRoomProps\(contentBottomInset\)\}/);
    expect(screen).toMatch(/contentInsetAdjustmentBehavior="automatic"/);
  });

  it('adds no spacer view and sets no indicator inset of its own', () => {
    expect(screen).not.toMatch(/scrollIndicatorInsets=/);
    expect(screen).not.toMatch(/contentBottomInset - /);
  });
});
