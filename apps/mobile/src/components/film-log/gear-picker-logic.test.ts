import { describe, expect, it } from 'vitest';
import { brandOptions, mountOptions, pickerRows } from './gear-picker-logic';

const at = '2026-01-01T00:00:00.000Z';

describe('brandOptions', () => {
  it('lists built-ins for the kind, then custom, then brands in use, once each', () => {
    const options = brandOptions(
      'camera',
      [
        { id: 'custom-brand-1', name: 'Kiev-Arsenal', createdAt: at },
        { id: 'custom-brand-2', name: 'nikon', createdAt: at },
      ],
      ['Shen Hao', 'Kiev-Arsenal', undefined, 'voigtlander']
    );
    const labels = options.map((option) => option.label);
    expect(labels).toContain('Nikon');
    expect(labels).not.toContain('nikon');
    expect(labels).not.toContain('Tamron');
    expect(labels.slice(-2)).toEqual(['Kiev-Arsenal', 'Shen Hao']);
    expect(labels.filter((label) => label === 'Kiev-Arsenal')).toHaveLength(1);
    expect(labels).not.toContain('voigtlander');
    // A brand stores its name.
    expect(options.find((o) => o.label === 'Voigtländer')?.value).toBe(
      'Voigtländer'
    );
  });
});

describe('mountOptions', () => {
  it('stores ids and shows aliases', () => {
    const options = mountOptions([
      { id: 'custom-mount-1', name: 'Graflex XL' },
    ]);
    expect(options[0]).toMatchObject({
      value: 'leica-ltm',
      label: 'Leica thread mount (L39)',
    });
    expect(options[0]?.detail).toContain('LTM');
    expect(options.at(-1)).toMatchObject({
      value: 'custom-mount-1',
      label: 'Graflex XL',
    });
  });
});

describe('pickerRows', () => {
  const mounts = mountOptions([]);

  it('offers to add what was typed only when no name or alias is that text', () => {
    expect(pickerRows(mounts, '').addName).toBeNull();
    expect(pickerRows(mounts, '  ').addName).toBeNull();
    expect(pickerRows(mounts, '/').addName).toBeNull();
    expect(pickerRows(mounts, 'l39').addName).toBeNull();
    expect(pickerRows(mounts, 'leica m').addName).toBeNull();
    expect(pickerRows(mounts, '  Graflex   XL ').addName).toBe('Graflex XL');
    expect(pickerRows(mounts, 'Leica').addName).toBe('Leica');
  });

  it('ranks the search with the shared matcher', () => {
    expect(pickerRows(mounts, 'ltm').rows[0]?.value).toBe('leica-ltm');
    expect(pickerRows(mounts, 'nikon').rows.map((r) => r.value)).toEqual([
      'nikon-s',
      'nikon-f',
    ]);
    expect(pickerRows(mounts, 'zzz').rows).toEqual([]);
  });
});
