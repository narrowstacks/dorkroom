import { describe, expect, it } from 'vitest';
import { getKnownCombinationDilution } from '../../utils/combination-dilution';

describe('getKnownCombinationDilution', () => {
  const developer = { dilutions: [{ id: '2', name: 'B', dilution: '1+4' }] };

  it('reads a dilution through its developer', () => {
    expect(
      getKnownCombinationDilution(
        { customDilution: null, dilutionId: '2' },
        developer
      )
    ).toBe('1+4');
  });

  it('does not call a dilution Stock when its developer is gone', () => {
    expect(
      getKnownCombinationDilution(
        { customDilution: null, dilutionId: '2' },
        undefined
      )
    ).toBeNull();
  });

  it('keeps a typed dilution without a developer', () => {
    expect(
      getKnownCombinationDilution(
        { customDilution: ' 1+9 ', dilutionId: '2' },
        undefined
      )
    ).toBe('1+9');
  });

  it('keeps a recipe with no dilution at all as Stock', () => {
    expect(
      getKnownCombinationDilution(
        { customDilution: null, dilutionId: null },
        undefined
      )
    ).toBe('Stock');
  });
});
