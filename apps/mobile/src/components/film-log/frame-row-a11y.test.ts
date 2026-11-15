import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// `FrameRow` renders native views that cannot load under vitest, so the
// wiring that keeps a frame row reachable by VoiceOver is checked in the
// source: `Link.Menu` mounts its trigger in a `display: contents` native view
// whose subtree the accessibility tree skips.
const source = readFileSync(
  join(fileURLToPath(new URL('.', import.meta.url)), 'frame-row.tsx'),
  'utf8'
);

describe('FrameRow accessibility', () => {
  it('puts the VoiceOver button on a view outside the Link', () => {
    expect(source).toMatch(
      /<View\s+accessible\s+accessibilityRole="button"[\s\S]*?onAccessibilityTap=[\s\S]*?>\s*<Link /
    );
  });

  it('leaves no accessibility label on the Pressable inside the Link', () => {
    const trigger = source.slice(source.indexOf('<Link.Trigger>'));
    expect(trigger).not.toMatch(/accessibilityLabel/);
  });

  it('handles both custom actions by the names it declares', () => {
    const handler = source.slice(source.indexOf('onAccessibilityAction='));
    expect(handler).toMatch(/name === 'viewPhoto'\)\s*onViewPhoto\(\)/);
    expect(handler).toMatch(/name === 'showOnMap'\)\s*onShowOnMap\(\)/);
    expect(source).toMatch(/name: 'viewPhoto', label: 'View photo'/);
    expect(source).toMatch(/name: 'showOnMap', label: 'Show roll map'/);
  });

  it('passes the custom actions to the VoiceOver element', () => {
    expect(source).toMatch(/accessibilityActions=\{actions\}/);
  });

  it("opens the frame's href on an accessibility tap", () => {
    expect(source).toMatch(
      /onAccessibilityTap=\{\(\) => router\.push\(href\)\}/
    );
  });
});
