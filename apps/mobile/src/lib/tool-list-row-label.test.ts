import { describe, expect, it } from 'vitest';
import { toolListRowLabel } from './tool-list-row-label';

describe('toolListRowLabel', () => {
  it('says an external link opens in the browser, without the chevron', () => {
    expect(toolListRowLabel('GitHub', '\u203a', true)).toBe(
      'GitHub, opens in the browser'
    );
  });

  it('keeps the label and value for an ordinary row', () => {
    expect(toolListRowLabel('Units', 'Metric', undefined)).toBe(
      'Units: Metric'
    );
    expect(toolListRowLabel('Units', undefined, false)).toBe('Units');
  });
});
