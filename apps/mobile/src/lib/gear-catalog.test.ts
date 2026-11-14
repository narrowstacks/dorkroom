import { describe, expect, it } from 'vitest';
import {
  mountOptions,
  pickerRows,
} from '@/components/film-log/gear-picker-logic';
import { foldForSearch } from './catalog-search';
import {
  brandsFor,
  builtInMount,
  type CatalogEntry,
  CUSTOM_MOUNT_PREFIX,
  GEAR_BRANDS,
  LENS_MOUNTS,
} from './gear-catalog';

const EM_DASH = String.fromCharCode(0x2014);

function checkList(name: string, list: readonly CatalogEntry[]) {
  describe(name, () => {
    it('has unique, stable-looking ids', () => {
      const ids = list.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(id.startsWith(CUSTOM_MOUNT_PREFIX)).toBe(false);
        expect(id.startsWith('custom-')).toBe(false);
      }
    });

    it('has no name or alias that collides with another entry', () => {
      const owner = new Map<string, string>();
      for (const entry of list) {
        const terms = new Set(
          [entry.name, ...entry.aliases].map(foldForSearch)
        );
        for (const term of terms) {
          expect(term, `${entry.id} has an empty term`).not.toBe('');
          const other = owner.get(term);
          expect(
            other,
            `"${term}" is on both ${other ?? ''} and ${entry.id}`
          ).toBeUndefined();
          owner.set(term, entry.id);
        }
      }
    });

    it('has no duplicate alias within an entry and no stray spaces', () => {
      for (const entry of list) {
        const folded = entry.aliases.map(foldForSearch);
        expect(new Set(folded).size).toBe(folded.length);
        for (const text of [entry.name, ...entry.aliases]) {
          expect(text).toBe(text.trim());
          expect(text).not.toContain(EM_DASH);
        }
      }
    });
  });
}

checkList('LENS_MOUNTS', LENS_MOUNTS);
checkList('GEAR_BRANDS', GEAR_BRANDS);

describe('catalog contents', () => {
  it('covers the issue example: Voigtländer Bessa R on L39', () => {
    const ltm = builtInMount('leica-ltm');
    expect(ltm?.aliases).toEqual(
      expect.arrayContaining([
        'LTM',
        'L39',
        'M39 rangefinder',
        'Leica screw mount',
      ])
    );
    expect(GEAR_BRANDS.find((b) => b.id === 'voigtlander')?.name).toBe(
      'Voigtländer'
    );
  });

  it('looks up built-in mounts only', () => {
    expect(builtInMount('nikon-f')?.name).toBe('Nikon F');
    expect(builtInMount('custom-mount-1')).toBeUndefined();
  });

  it('offers each brand to cameras, lenses or both', () => {
    for (const brand of GEAR_BRANDS) {
      expect(brand.camera || brand.lens).toBe(true);
    }
    const cameraBrands = brandsFor('camera').map((b) => b.name);
    const lensBrands = brandsFor('lens').map((b) => b.name);
    expect(cameraBrands).toContain('Fujifilm');
    expect(cameraBrands).not.toContain('Tamron');
    expect(lensBrands).toContain('Tamron');
    expect(lensBrands).not.toContain('Holga');
  });
});

describe('catalog corrections (#733 review)', () => {
  const mountTerms = (id: string) => {
    const mount = builtInMount(id);
    return mount ? [mount.name, ...mount.aliases].map(foldForSearch) : [];
  };
  const allMountTerms = LENS_MOUNTS.flatMap((m) => mountTerms(m.id));

  it('keeps the Leica and Zenit M39 threads apart (different flange distance)', () => {
    expect(mountTerms('leica-ltm')).not.toContain('m39');
    expect(mountTerms('leica-ltm')).not.toContain('39mm screw');
    expect(builtInMount('zenit-m39')?.name).toBe('Zenit M39 (SLR)');
    const hits = pickerRows(mountOptions([]), 'M39');
    expect(hits.rows.map((r) => r.value).sort()).toEqual([
      'leica-ltm',
      'zenit-m39',
    ]);
    // "M39" alone is no entry's name or alias, so Add stays offered.
    expect(hits.addName).toBe('M39');
  });

  it('has no lens-line alias that spans several mounts', () => {
    for (const line of ['nikkor', 'rokkor', 'zuiko', 'takumar', 'sekor']) {
      expect(allMountTerms, line).not.toContain(line);
    }
    expect(mountTerms('olympus-om')).toContain('om zuiko');
    expect(mountTerms('mamiya-645')).toContain('sekor c 645');
  });

  it('names Canon and Pentacon Six aliases precisely', () => {
    expect(mountTerms('canon-fd')).toContain('canonflex r');
    expect(mountTerms('canon-fd')).not.toContain('canon r');
    expect(mountTerms('pentacon-six')).toContain('arax cm');
    expect(mountTerms('pentacon-six')).not.toContain('arax');
  });

  it('lists the added brands, Pentacon on its own', () => {
    const byId = new Map(GEAR_BRANDS.map((b) => [b.id, b]));
    expect(byId.get('pentacon')).toMatchObject({ camera: true, lens: true });
    expect(byId.get('praktica')?.aliases).not.toContain('Pentacon');
    expect(byId.get('exakta')?.aliases).toContain('Ihagee');
    for (const id of ['zorki', 'kowa', 'petri', 'chinon']) {
      expect(byId.has(id), id).toBe(true);
    }
  });
});
