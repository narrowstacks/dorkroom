import { describe, expect, it } from 'vitest';
import { foldForSearch, sameName, searchByTerms } from './catalog-search';
import { LENS_MOUNTS } from './gear-catalog';

const items = [
  {
    name: 'Leica thread mount (L39)',
    aliases: ['LTM', 'L39', 'Leica screw mount'],
  },
  { name: 'Leica M', aliases: ['M mount'] },
  { name: 'Voigtländer', aliases: [] },
  { name: 'Contax/Yashica (C/Y)', aliases: ['C/Y'] },
  { name: 'Mamiya 645', aliases: ['M645'] },
];
const terms = (item: (typeof items)[number]) => [item.name, ...item.aliases];
const names = (query: string) =>
  searchByTerms(items, query, terms).map((item) => item.name);

describe('foldForSearch', () => {
  it('drops case, diacritics and punctuation', () => {
    expect(foldForSearch('Voigtländer')).toBe('voigtlander');
    expect(foldForSearch('  Contax/Yashica (C/Y) ')).toBe('contax yashica c y');
    expect(foldForSearch('Meyer-Optik Görlitz')).toBe('meyer optik gorlitz');
    expect(foldForSearch('Angénieux')).toBe('angenieux');
  });
});

describe('searchByTerms', () => {
  it('returns everything in order for an empty query', () => {
    expect(names('')).toEqual(items.map((item) => item.name));
    expect(names('   ')).toEqual(items.map((item) => item.name));
  });

  it('ignores case and diacritics', () => {
    expect(names('voigtlander')).toEqual(['Voigtländer']);
    expect(names('VOIGTLÄNDER')).toEqual(['Voigtländer']);
  });

  it('matches aliases', () => {
    expect(names('ltm')).toEqual(['Leica thread mount (L39)']);
    expect(names('c/y')).toEqual(['Contax/Yashica (C/Y)']);
    expect(names('screw')).toEqual(['Leica thread mount (L39)']);
  });

  it('ranks exact, then prefix, then word prefix, then substring', () => {
    // "m": "M mount" and "M645" start with it; "Leica M" has a word starting
    // with it; "Leica thread mount" has "mount"; "Mamiya" starts with it.
    expect(names('m')).toEqual([
      'Leica M',
      'Mamiya 645',
      'Leica thread mount (L39)',
    ]);
    expect(names('leica')).toEqual(['Leica thread mount (L39)', 'Leica M']);
    expect(names('leica m')).toEqual(['Leica M']);
    expect(names('645')).toEqual(['Mamiya 645']);
    expect(names('ica')).toEqual([
      'Leica thread mount (L39)',
      'Leica M',
      'Contax/Yashica (C/Y)',
    ]);
  });

  it('puts an exact alias first', () => {
    const list = [
      { name: 'Alpha', aliases: ['ABC Long'] },
      { name: 'Beta', aliases: ['ABC'] },
    ];
    expect(
      searchByTerms(list, 'abc', (item) => [item.name, ...item.aliases]).map(
        (item) => item.name
      )
    ).toEqual(['Beta', 'Alpha']);
  });

  it('finds the issue example in the real list by any alias', () => {
    for (const query of ['LTM', 'l39', 'leica screw mount']) {
      const hits = searchByTerms(LENS_MOUNTS, query, (mount) => [
        mount.name,
        ...mount.aliases,
      ]);
      expect(hits[0]?.id, query).toBe('leica-ltm');
    }
  });
});

describe('sameName', () => {
  it('compares folded names', () => {
    expect(sameName('Voigtlander', 'Voigtländer')).toBe(true);
    expect(sameName('Kiev-Arsenal', 'kiev arsenal')).toBe(true);
    expect(sameName('Nikon', 'Nikkor')).toBe(false);
  });
});
