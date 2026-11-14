import { describe, expect, it } from 'vitest';
import {
  cleanGearName,
  heldBrandToStore,
  heldMountToStore,
  knownBrand,
  knownMount,
} from './custom-gear';

describe('cleanGearName', () => {
  it('trims, collapses spaces and applies the 80 character cap', () => {
    expect(cleanGearName('  Graflex \n  XL  ')).toBe('Graflex XL');
    expect(cleanGearName('   ')).toBe('');
    // The app's text cap: 80 characters, then "...".
    expect(cleanGearName('a'.repeat(120))).toBe(`${'a'.repeat(80)}...`);
    expect(cleanGearName('<b>Kowa</b>')).toBe('Kowa');
    // A stripped tag between words leaves one space, not two.
    expect(cleanGearName('Shen <i>x</i> Hao')).toBe('Shen x Hao');
    expect(cleanGearName('Shen <br> Hao')).toBe('Shen Hao');
  });
});

describe('knownBrand', () => {
  it('finds a built-in or custom brand ignoring case, accents and spacing', () => {
    expect(knownBrand('voigtlander', [])).toBe('Voigtländer');
    expect(knownBrand('Shen  hao', [{ name: 'Shen Hao' }])).toBe('Shen Hao');
    expect(knownBrand('Nikkor', [])).toBeUndefined();
    expect(knownBrand('Unknown Maker', [])).toBeUndefined();
  });
});

describe('knownMount', () => {
  it('finds a built-in name or alias, or a custom mount', () => {
    expect(knownMount('LTM', [])).toBe('leica-ltm');
    expect(knownMount('nikon f', [])).toBe('nikon-f');
    expect(
      knownMount('graflex  XL', [{ id: 'custom-mount-1', name: 'Graflex XL' }])
    ).toBe('custom-mount-1');
    expect(knownMount('Something else', [])).toBeUndefined();
  });
});

describe('storing a held entry on save (usePendingGear)', () => {
  const held = { id: 'custom-mount-held', name: 'Graflex XL' };

  it('stores nothing when a built-in was picked after adding', () => {
    expect(heldBrandToStore('Nikon', 'Shen Hao')).toBeUndefined();
    expect(heldBrandToStore(undefined, 'Shen Hao')).toBeUndefined();
    expect(heldMountToStore('nikon-f', held)).toBeUndefined();
    expect(heldMountToStore(undefined, held)).toBeUndefined();
  });

  it('stores the held entry while the form still uses it', () => {
    expect(heldBrandToStore('Shen Hao', 'Shen Hao')).toBe('Shen Hao');
    expect(heldBrandToStore('shen hao', 'Shen Hao')).toBe('Shen Hao');
    expect(heldMountToStore('custom-mount-held', held)).toBe(held);
  });

  it('has nothing to store when nothing was added', () => {
    expect(heldBrandToStore('Nikon', undefined)).toBeUndefined();
    expect(heldMountToStore('nikon-f', undefined)).toBeUndefined();
  });
});
