import { describe, expect, it } from 'vitest';
import * as borderCalculator from '../../../border-calculator';

// The desktop and mobile presets components were both named PresetsSection,
// so the barrel's explicit export silently shadowed the star re-export and
// the mobile one was unreachable. See issue #243.
describe('@dorkroom/ui/border-calculator exports', () => {
  it('exports the desktop presets section as PresetsSection', () => {
    expect(borderCalculator.PresetsSection).toBeTypeOf('function');
    expect(borderCalculator.PresetsSection.name).toBe('PresetsSection');
  });

  it('exports the mobile presets section under a distinct name', () => {
    expect(borderCalculator.MobilePresetsSection).toBeTypeOf('function');
    expect(borderCalculator.MobilePresetsSection.name).toBe(
      'MobilePresetsSection'
    );
  });

  it('does not export the two presets components under one name', () => {
    expect(borderCalculator.MobilePresetsSection).not.toBe(
      borderCalculator.PresetsSection
    );
  });
});
