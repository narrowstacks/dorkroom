import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  favoriteActionLabel,
  favoriteMenuSubtitle,
  favoriteStarClearance,
  STAR_INSET,
  STAR_SIZE,
  toolTileHint,
  toolTileLabel,
} from './tool-tile-text';

// `ToolTile` renders native views that cannot load under vitest, so the wiring
// that keeps a tile reachable by VoiceOver with `Link.Menu` is checked in the
// source, as for `FrameRow` (frame-row-a11y.test.ts).
const source = readFileSync(
  join(fileURLToPath(new URL('.', import.meta.url)), 'tool-tile.tsx'),
  'utf8'
);

describe('ToolTile accessibility', () => {
  it('puts the VoiceOver button on a view outside the Link', () => {
    expect(source).toMatch(
      /<View\s+accessible\s+accessibilityRole="button"[\s\S]*?onAccessibilityTap=[\s\S]*?>\s*<Link /
    );
  });

  it('leaves no accessibility label on the Pressable inside the Link', () => {
    const trigger = source.slice(source.indexOf('<Link.Trigger>'));
    expect(trigger).not.toMatch(/accessibilityLabel/);
  });

  it('offers the favorite toggle as a custom action and handles it by name', () => {
    expect(source).toMatch(/accessibilityActions=\{actions\}/);
    expect(source).toMatch(/name: 'toggleFavorite'/);
    const handler = source.slice(source.indexOf('onAccessibilityAction='));
    expect(handler).toMatch(/actionName !== 'toggleFavorite'\) return;/);
    expect(handler).toMatch(/if \(canToggle\) onToggleFavorite\(\);/);
  });

  it('keeps the action when favorites are full and says why instead of dropping it', () => {
    // The action list is not conditional on room in the list.
    expect(source).not.toMatch(/canToggle\s*\?\s*\[/);
    expect(source).toMatch(/announceForAccessibility\(fullReason\)/);
    expect(source).toMatch(
      /accessibilityHint=\{toolTileHint\(favorite, favoritesFull\)\}/
    );
  });

  it('pads the text clear of the star', () => {
    expect(source).toMatch(/paddingRight: textClearance/);
  });

  it('opens the tool on an accessibility tap, and on a tap through the Link', () => {
    expect(source).toMatch(
      /onAccessibilityTap=\{\(\) => router\.push\(href\)\}/
    );
    expect(source).toMatch(/<Link href=\{href\} push asChild>/);
  });
});

describe('tile favorite wording', () => {
  it('names the toggle by the current state', () => {
    expect(favoriteActionLabel(false)).toBe('Add to favorites');
    expect(favoriteActionLabel(true)).toBe('Remove from favorites');
  });

  it('explains a disabled Add only when the list is full', () => {
    expect(favoriteMenuSubtitle(false, true)).toBe(
      'Favorites are full (8). Remove one first.'
    );
    expect(favoriteMenuSubtitle(false, false)).toBeUndefined();
    expect(favoriteMenuSubtitle(true, true)).toBeUndefined();
  });

  it('tells VoiceOver a tile is a favorite', () => {
    expect(toolTileLabel('Meter', 'Light meter', true)).toBe(
      'Meter, Light meter, favorite'
    );
    expect(toolTileLabel('Meter', 'Light meter', false)).toBe(
      'Meter, Light meter'
    );
  });
});

describe('tile hint and star room', () => {
  it('says why Add is unavailable while favorites are full', () => {
    expect(toolTileHint(false, true)).toBe(
      'Opens the tool. Favorites are full (8). Remove one first.'
    );
    expect(toolTileHint(false, false)).toBe('Opens the tool.');
    expect(toolTileHint(true, true)).toBe('Opens the tool.');
  });

  it('keeps the text at least 8pt clear of the star, only on a favorite', () => {
    // The text column ends at the tile padding (20) plus the clearance; the
    // star reaches STAR_INSET + STAR_SIZE in from the edge.
    expect(20 + favoriteStarClearance(true)).toBeGreaterThanOrEqual(
      STAR_INSET + STAR_SIZE + 8
    );
    expect(favoriteStarClearance(false)).toBe(0);
  });
});
