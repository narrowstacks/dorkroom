import { beforeEach, describe, expect, it } from 'vitest';
import { createWebStorageShim } from '@/polyfills/local-storage-shim';
import { calculatorStorage, sharedStorage } from './mmkv-storage';

describe('calculatorStorage', () => {
  beforeEach(() => sharedStorage.clearAll());

  it('uses the dorkroom-mobile instance the localStorage shim always used', () => {
    // Changing this id would orphan every user's saved calculator state.
    expect(sharedStorage.id).toBe('dorkroom-mobile');
  });

  it('round-trips, overwrites and removes strings', () => {
    expect(calculatorStorage.getItem('missing')).toBeNull();

    calculatorStorage.setItem('k', 'a');
    calculatorStorage.setItem('k', 'b');
    expect(calculatorStorage.getItem('k')).toBe('b');
    expect(sharedStorage.getString('k')).toBe('b');

    calculatorStorage.removeItem('k');
    expect(calculatorStorage.getItem('k')).toBeNull();
  });

  it('reads state the localStorage shim saved, and the shim reads its writes', () => {
    // Before the provider, calculators persisted through the shim. Both must
    // share one MMKV instance, or upgrading would drop that saved state.
    const shim = createWebStorageShim(sharedStorage);
    shim.setItem('matCalculatorState_v1', '{"outerW":"20"}');
    expect(calculatorStorage.getItem('matCalculatorState_v1')).toBe(
      '{"outerW":"20"}'
    );

    calculatorStorage.setItem('lensCalculatorState_v1', '{"focalLength":85}');
    expect(shim.getItem('lensCalculatorState_v1')).toBe('{"focalLength":85}');
  });
});
