import { describe, expect, it } from 'vitest';
import {
  type HomeAnswer,
  type HomeAnswerKind,
  searchHome,
  suggestHome,
} from '../../utils/home-search';
import {
  developer,
  film,
  FIXTURE_DATA,
  FIXTURE_DEVELOPERS,
  FIXTURE_FILMS,
} from './home-search.fixture';

const answer = (query: string, data = FIXTURE_DATA): HomeAnswer => {
  const result = searchHome(query, data).answer;
  if (!result) throw new Error(`No answer for "${query}"`);
  return result;
};

const kind = (query: string, data = FIXTURE_DATA): HomeAnswerKind | null =>
  searchHome(query, data).answer?.kind ?? null;

const factOf = (a: HomeAnswer, label: string) =>
  a.facts.find((f) => f.label === label);

const readAs = (a: HomeAnswer) => a.readAs.map((r) => r.text);

describe('searchHome', () => {
  it('returns nothing for an empty query', () => {
    expect(searchHome('   ')).toEqual({
      answer: null,
      groups: [],
      pending: false,
      count: 0,
    });
  });

  describe('recipes', () => {
    it('answers film at EI in developer with the published time', () => {
      const a = answer('hp5 at 800 in dd-x');
      expect(a.kind).toBe('recipe');
      expect(a.title).toBe('Ilford HP5 Plus in Ilford DD-X');
      expect(a.badge).toBe('Official Ilford');
      expect(a.figure).toEqual({
        value: '10:00',
        unit: 'min',
        caption: 'at 20°C (68°F)',
      });
      expect(factOf(a, 'Dilution')?.value).toBe('1+4');
      expect(factOf(a, 'Rated at')).toMatchObject({
        value: 'EI 800',
        detail: 'push +1',
      });
      expect(factOf(a, 'Source')?.value).toBe('ilfordphoto.com');
      expect(a.footnote).toBe(
        '3 other recipes for this pair, EI 400, 800, 1600, 3200'
      );
      expect(a.link.target).toEqual({
        to: '/development',
        search: {
          film: 'ilford-hp5-plus',
          developer: 'ilford-dd-x',
          iso: '800',
          dilution: '1+4',
          recipe: 'e6d54f8d-c766-4cb2-a0b7-ae9ea02332fc',
        },
      });
    });

    it('never invents agitation: a missing one reads "Not in source"', () => {
      expect(factOf(answer('hp5 at 800 in dd-x'), 'Agitation')).toEqual({
        label: 'Agitation',
        value: 'Not in source',
        detail: null,
        missing: true,
      });
    });

    it('reads a dilution', () => {
      const a = answer('tri-x in d-76 1+1');
      expect(a.title).toBe('Kodak Tri-X 400 in Kodak D-76');
      expect(factOf(a, 'Dilution')?.value).toBe('1+1');
      expect(a.figure?.value).toBe('9:45');
    });

    it('defaults to box speed and stock first', () => {
      const a = answer('fp4 in id-11');
      expect(factOf(a, 'Rated at')).toMatchObject({
        value: 'EI 125',
        detail: 'box speed',
      });
      expect(factOf(a, 'Dilution')?.value).toBe('Stock');
      expect(a.figure?.value).toBe('8:30');
    });

    it("reads HC-110's letter dilutions as the stored ratio", () => {
      const a = answer('hc-110 dilution b tri-x');
      expect(a.title).toBe('Kodak Tri-X 400 in Kodak HC-110');
      expect(factOf(a, 'Dilution')?.value).toBe('1:31');
      expect(a.figure?.value).toBe('3:45');
    });

    it('notes a speed the pair has no recipe for', () => {
      const a = answer('hp5 at 6400 in dd-x');
      expect(a.notes).toContain(
        'No recipe at EI 6400 for this pair. Listed speeds: 400, 800, 1600, 3200.'
      );
    });

    it('notes a temperature it could not match', () => {
      const a = answer('hp5 in dd-x 24c');
      expect(a.notes.some((n) => n.startsWith('No recipe at 24°C.'))).toBe(
        true
      );
    });

    it("leads with the viewer's temperature unit", () => {
      const a = searchHome('hp5 at 800 in dd-x', FIXTURE_DATA, {
        temperatureUnit: 'fahrenheit',
      }).answer;
      expect(a?.figure?.caption).toBe('at 68°F (20°C)');
    });

    it('reads a Fahrenheit temperature and notes it in that unit', () => {
      const a = searchHome('hp5 in dd-x 75f', FIXTURE_DATA, {
        temperatureUnit: 'fahrenheit',
      }).answer;
      expect(a?.notes.some((n) => n.startsWith('No recipe at 75°F.'))).toBe(
        true
      );
    });

    it('says when a pair has no recipe instead of making one up', () => {
      const a = answer('portra 400 in d-76');
      expect(a.kind).toBe('no_recipe');
      expect(a.figure).toBeNull();
      expect(a.link.target).toEqual({
        to: '/development',
        search: { film: 'kodak-ektacolor-400' },
      });
    });
  });

  describe('reciprocity', () => {
    it('reads a comma decimal time as the Reciprocity calculator does', () => {
      expect(answer('tri-x 1,5m').figure).toEqual(answer('tri-x 90s').figure);
    });

    it('corrects a metered time with the film factor', () => {
      const a = answer('tri-x 30s');
      expect(a.kind).toBe('reciprocity');
      expect(a.figure?.value).toBe('3m 8.3s');
      expect(factOf(a, 'Factor')?.value).toBe('1.54');
      expect(a.link.target).toEqual({
        to: '/reciprocity',
        search: { film: 'tri-x', time: '30s' },
      });
    });

    it('reads "delta 3200 2m" as reciprocity, not a lens or easel', () => {
      const a = answer('delta 3200 2m');
      expect(a.kind).toBe('reciprocity');
      expect(a.title).toBe('Ilford Delta 3200 for 2m metered');
      expect(a.link.target.search).toEqual({
        film: 'delta3200',
        time: '120s',
      });
    });

    it('assumes 30s for a keyword, marked as assumed', () => {
      const a = answer('hp5 reciprocity');
      expect(a.readAs).toContainEqual({
        text: '30s metered (default)',
        assumed: true,
      });
      expect(a.notes[0]).toMatch(/^Assumed 30s metered/);
    });

    it('links a film with no calculator preset as a custom factor', () => {
      expect(answer('bwxx night').link.target.search).toEqual({
        film: 'custom',
        time: '30s',
        factor: '1.3',
      });
    });

    it('gives no reciprocity answer for a film without a factor', () => {
      expect(kind('portra 400 30s')).toBeNull();
    });
  });

  describe('easel borders', () => {
    it('reads paper, negative and border with no keyword', () => {
      const a = answer('11x14 6x7 1.45');
      expect(a.kind).toBe('border');
      expect(readAs(a)).toEqual([
        '11×14 paper',
        '6×7 negative',
        '1.45″ min border',
      ]);
      expect(a.figure).toMatchObject({ value: '8⅛×9 7⁄16', unit: 'in' });
      expect(a.link.target).toEqual({
        to: '/border',
        search: {
          paper: '11x14',
          ratio: '7:6',
          border: '1.45',
          landscape: 'true',
          flip: 'false',
        },
      });
    });

    it.each([
      ['8x10 35mm 3/4', '¾″ min border', '5 11⁄16×8½'],
      ['8x10 35mm 1 1/4', '1¼″ min border', '5×7½'],
      ['8x10 35mm ½', '½″ min border', '6×9'],
      ['8x10 35mm 1½', '1½″ min border', '4 11⁄16×7'],
      ['16x20 4x5 2in', '2″ min border', '12×15'],
      ['11x14 xpan 1', '1″ min border', '4 7⁄16×12'],
      ['8x10 645 borderless', 'no border', '7½×10'],
    ])('%s', (query, border, print) => {
      const a = answer(query);
      expect(readAs(a)).toContain(border);
      expect(a.figure?.value).toBe(print);
    });

    it('leads with millimetres when the border was in mm', () => {
      const a = answer('8×10 6x6 15mm');
      expect(a.kind).toBe('border');
      expect(a.figure).toMatchObject({ value: '173×173', unit: 'mm' });
      expect(readAs(a)).toContain('15 mm min border (9⁄16″)');
    });

    it('reads cm papers and leads with centimetres', () => {
      const a = answer('24x30cm 6x6 2cm');
      expect(readAs(a)).toEqual([
        '24×30 cm paper',
        '6×6 negative',
        '2 cm min border (13⁄16″)',
      ]);
      expect(a.figure).toMatchObject({ value: '20×20', unit: 'cm' });
      expect(a.link.target.search).toMatchObject({
        paper: 'custom',
        paperW: '9.4488',
        paperH: '11.811',
      });
    });

    it('knows metric papers without a unit', () => {
      expect(readAs(answer('18x24 6x6 1'))[0]).toBe('18×24 cm paper');
    });

    it('turns the paper for portrait', () => {
      const a = answer('9.5x12 6x9 1 portrait');
      expect(readAs(a)).toContain('portrait');
      expect(a.link.target.search).toMatchObject({
        paper: 'custom',
        landscape: 'false',
        flip: 'true',
      });
      if (a.kind !== 'border' || !a.diagram) throw new Error('no diagram');
      expect(a.diagram.paperH).toBeGreaterThan(a.diagram.paperW);
    });

    it('defaults the paper to 8x10, marked', () => {
      const a = answer('6x7 1.5');
      expect(a.readAs[0]).toEqual({
        text: '8×10 paper (default)',
        assumed: true,
      });
    });

    it('reads a lone 4x5 as a negative', () => {
      expect(readAs(answer('4x5 1')).slice(0, 2)).toEqual([
        '8×10 paper (default)',
        '4×5 negative',
      ]);
    });

    it('ignores a bare number too big for inches, with a note', () => {
      const a = answer('8x10 35mm 20');
      expect(a.readAs[2]).toEqual({
        text: '½″ min border (default)',
        assumed: true,
      });
      expect(a.notes).toContain(
        'Ignored “20”. For a border that size, add a unit, like “20mm”.'
      );
    });

    it.each([
      ['fp4 8x10 6x7 1.5', FIXTURE_DATA, '1½″ min border'],
      ['hp5 8x10 35mm 1', FIXTURE_DATA, '1″ min border'],
      ['fomapan 200 11x14 6x7 1', FIXTURE_DATA, '1″ min border'],
      ['fomapan 200 11x14 6x7', FIXTURE_DATA, '½″ min border (default)'],
    ])(
      'never reads a number in a name as the border: %s',
      (query, data, border) => {
        const a = answer(query, data);
        expect(a.kind).toBe('border');
        expect(readAs(a)).toContain(border);
        expect(a.notes).toEqual([]);
      }
    );

    it('says when the border leaves no room', () => {
      const a = answer('8x10 35mm 4.5in');
      expect(a.figure).toBeNull();
      expect(a.notes[0]).toMatch(/leaves no room on 8×10 paper/);
      if (a.kind === 'border') expect(a.diagram).toBeNull();
    });
  });

  describe('resize', () => {
    it('scales a time between print sizes', () => {
      const a = answer('8x10 to 11x14 12s');
      expect(a.kind).toBe('resize');
      expect(a.figure).toMatchObject({ value: '23.1', unit: 's' });
      expect(factOf(a, 'Change')?.value).toBe('+0.94 stops');
      expect(factOf(a, 'Shape')?.value).toBe('Different');
      expect(a.link.target).toEqual({
        to: '/resize',
        search: {
          height: 'false',
          fromW: '8',
          fromL: '10',
          toW: '11',
          toL: '14',
          time: '12',
        },
      });
    });

    it('reads "from" backwards', () => {
      expect(answer('11x14 from 8x10 20s').title).toBe('8×10 → 11×14');
    });

    it('handles cm papers', () => {
      expect(answer('24x30cm to 30x40cm 15s').figure?.value).toBe('25.0');
    });

    it('scales by enlarger height', () => {
      const a = answer('height 40cm to 60cm 10s');
      expect(a.figure?.value).toBe('22.5');
      expect(a.link.target.search).toMatchObject({
        height: 'true',
        fromH: '15.748',
        toH: '23.622',
      });
    });

    it('gives the factor alone without a time', () => {
      const a = answer('8x10 to 11x14');
      expect(a.figure).toMatchObject({
        value: '×1.93',
        caption: 'exposure factor',
      });
    });

    it('calls matching proportions the same shape', () => {
      expect(factOf(answer('4x5 to 8x10 10s'), 'Shape')?.value).toBe('Same');
    });
  });

  describe('lens', () => {
    it('defaults the target to full frame, marked', () => {
      const a = answer('80mm on 6x6');
      expect(a.kind).toBe('lens');
      expect(a.figure).toMatchObject({ value: '43.7', unit: 'mm' });
      expect(a.readAs[2]).toEqual({
        text: 'compared to Full Frame (default)',
        assumed: true,
      });
      expect(a.link.target).toEqual({
        to: '/lenses',
        search: { focal: '80', from: 'film-6x6', to: 'full-frame' },
      });
    });

    it.each([
      ['80mm 6x6 to 35mm', 'film-6x6', 'full-frame'],
      ['90mm on 645 to apsc', 'film-645', 'aps-c-nikon'],
      ['150mm 4x5', 'film-4x5', 'full-frame'],
      ['25mm mft equivalent', 'micro-four-thirds', 'full-frame'],
      ['35mm on 6x7', 'film-6x7', 'full-frame'],
      ['50mm lens', 'full-frame', 'film-6x6'],
    ])('%s', (query, from, to) => {
      expect(answer(query).link.target.search).toMatchObject({ from, to });
    });

    it('reads a mm too big to be a border as a lens', () => {
      expect(kind('300mm 8x10 6x7')).toBe('lens');
    });

    it('reads a mm that fits as a border when paper is named', () => {
      expect(kind('11x14 6x7 50mm')).toBe('border');
    });

    it('reads 35mm beside an oversized mm number as the format', () => {
      const a = answer('8x10 35mm 300mm');
      expect(a.kind).toBe('lens');
      expect(a.link.target.search).toMatchObject({
        focal: '300',
        from: 'film-8x10',
      });
      expect(kind('8x10 35mm 15mm')).toBe('border');
    });
  });

  describe('stops', () => {
    it.each([
      ['12s +1/3', '15.12s', '0.3333'],
      ['12s plus 2 stops', '48s', '2'],
      ['+1/3 stop 12s', '15.12s', '0.3333'],
      ['12s -0.5 stops', '8.49s', '-0.5'],
      ['15s down 1 stop', '7.5s', '-1'],
    ])('%s', (query, time, stops) => {
      const a = answer(query);
      if (a.kind !== 'stops') throw new Error(`${query} is ${a.kind}`);
      expect(a.figure?.value).toBe(time);
      expect(a.link.target.search.stops).toBe(stops);
    });

    it('does not read a dilution as a stop change', () => {
      expect(kind('tri-x in d-76 1+1')).toBe('recipe');
    });
  });

  describe('mat', () => {
    it('opens a window with best-fit borders and the default reveal', () => {
      const a = answer('16x20 mat 8x10 print');
      expect(a.kind).toBe('mat');
      expect(a.figure).toMatchObject({ value: '7½×9½', unit: 'in' });
      expect(a.facts.map((f) => f.value)).toEqual(['5¼″', '5¼″', '4¼″', '4¼″']);
      expect(a.readAs[2]).toEqual({
        text: '¼″ reveal (default)',
        assumed: true,
      });
      expect(a.link.target.search).toEqual({
        outerW: '16',
        outerH: '20',
        top: '5 1/4',
        bottom: '5 1/4',
        left: '4 1/4',
        right: '4 1/4',
        artW: '8',
        artH: '10',
        reveal: '1/4',
        bottomWeight: 'false',
      });
    });

    it('reads "for", a reveal and bottom weighting', () => {
      expect(answer('11x14 mat for 8x10').facts[0].value).toBe('2¼″');
      expect(answer('mat 16x20 11x14 reveal 1/8').figure?.value).toBe(
        '10¾×13¾'
      );
      const weighted = answer('16x20 mat 8x10 bottom weight');
      expect(factOf(weighted, 'Bottom')?.value).toBe('5⅝″');
      expect(factOf(weighted, 'Top')?.value).toBe('4⅞″');
    });

    it('needs the word mat', () => {
      expect(kind('16x20 8x10')).toBe('border');
    });
  });

  describe('camera exposure', () => {
    it.each([
      'f/8',
      'f8',
      'iso 400 f/8',
      '1/125',
      'sunny 16',
      'what shutter',
      'equivalent exposure',
      'EV 12',
    ])('%s links to the Camera Exposure calculator', (query) => {
      const a = answer(query);
      expect(a.kind).toBe('camera_exposure');
      expect(a.figure).toBeNull();
      expect(a.link.target).toEqual({ to: '/exposure', search: {} });
    });

    it('does not read a fractional border as a shutter speed', () => {
      expect(kind('8x10 35mm 1/16')).toBe('border');
    });
  });

  describe('lookups', () => {
    it('groups recipes, films, developers and tools with counts', () => {
      const { answer: a, groups } = searchHome('rodinal', FIXTURE_DATA);
      expect(a).toBeNull();
      expect(groups.map((g) => g.key)).toEqual(['recipes', 'developers']);
      expect(groups[1]).toMatchObject({ total: 1 });
    });

    it('finds a film by its former name', () => {
      const films = searchHome('portra 400', FIXTURE_DATA).groups.find(
        (g) => g.key === 'films'
      );
      expect(films?.key === 'films' && films.items[0].title).toBe(
        'Kodak Portra/Ektacolor 400'
      );
    });

    it('finds a brand', () => {
      const films = searchHome('foma', FIXTURE_DATA).groups[0];
      expect(films).toMatchObject({ key: 'films', total: 7 });
    });

    it('finds tools by keyword', () => {
      expect(searchHome('easel', FIXTURE_DATA).groups).toEqual([
        { key: 'tools', label: 'Tools', total: 1, tools: ['/border'] },
      ]);
    });

    it('lists related tools beside a calculator answer', () => {
      expect(searchHome('8x10 to 11x14 12s').groups).toEqual([
        {
          key: 'tools',
          label: 'Tools',
          total: 2,
          tools: ['/resize', '/stops'],
        },
      ]);
    });

    it('a bare number never names a film', () => {
      expect(searchHome('400', FIXTURE_DATA).groups).toEqual([]);
    });
  });

  describe('without data', () => {
    it('still answers calculator queries', () => {
      expect(kind('8x10 35mm 1/2', {})).toBe('border');
      expect(kind('80mm on 6x6', {})).toBe('lens');
    });

    it('reports catalog queries as pending', () => {
      expect(searchHome('hp5 at 800 in dd-x')).toEqual({
        answer: null,
        groups: [],
        pending: true,
        count: 0,
      });
    });

    it.each([
      'tmax 100 4x5',
      'ektar 100 6x7',
      'hp5 4x5 1',
      'delta 3200 8x10 6x7 50',
      'fp4 8x10 6x7 1.5',
      'd76 8x10',
      'id-11 8x10 1',
      'rodinal 1+50 8x10',
    ])(
      'waits for the catalog when a word could name a film or developer: %s',
      (query) => {
        expect(searchHome(query)).toMatchObject({
          answer: null,
          pending: true,
        });
      }
    );

    it.each([
      'd76 8x10',
      'xtol 8x10 1',
      'fp4 in d76 8x10',
      'hp5 in dd-x 8x10',
      'fp4 8x10 6x7 1.5',
      '9.5x12 6x9 1 portrait',
    ])(
      'never answers %s one way before the data and another after',
      (query) => {
        // Before the data, waiting (null) is fine; a different answer is not.
        expect([null, kind(query, FIXTURE_DATA)]).toContain(kind(query, {}));
      }
    );

    it('answers an easel query whose words it can explain', () => {
      expect(kind('9.5x12 6x9 1 portrait', {})).toBe('border');
      expect(kind('8x10 645 borderless', {})).toBe('border');
    });

    it.each(['8x10 35mm 1/2 centered', '8x10 6x7 1 in borders please'])(
      'answers %s once the names are known, without waiting for the recipes',
      (query) => {
        const { combinations: _, ...namesOnly } = FIXTURE_DATA;
        expect(kind(query, namesOnly)).toBe('border');
      }
    );

    it('waits for the recipes before saying a pair has none', () => {
      const { combinations: _, ...noRecipes } = FIXTURE_DATA;
      expect(searchHome('hp5 at 800 in dd-x', noRecipes)).toMatchObject({
        answer: null,
        pending: true,
      });
    });

    it('is not pending once the data is in', () => {
      expect(searchHome('nonsense words', FIXTURE_DATA).pending).toBe(false);
    });
  });

  it.each([
    ['fomapan 200 35mm', null],
    ['hp5 6x7', null],
    ['nonsense words', null],
    ['hp5', null],
  ])('%s gets no answer', (query, expected) => {
    expect(kind(query)).toBe(expected);
  });
});

describe('suggestHome', () => {
  const labels = (query: string, data = FIXTURE_DATA) =>
    suggestHome(query, data).map((s) => s.label);

  it('teaches recipe and reciprocity queries for a film', () => {
    const suggestions = suggestHome('hp5', FIXTURE_DATA);
    expect(suggestions.slice(0, 3)).toEqual([
      expect.objectContaining({ hint: 'recipe' }),
      expect.objectContaining({ hint: 'recipe' }),
      { label: 'HP5 Plus 30s', query: 'HP5 Plus 30s', hint: 'reciprocity' },
    ]);
    expect(suggestions[0].label).toMatch(/^HP5 Plus in /);
    expect(suggestions[1].label).toMatch(/^HP5 Plus at \d+ in /);
  });

  it('every suggested template answers', () => {
    for (const s of suggestHome('hp5', FIXTURE_DATA).filter(
      (x) => x.hint !== 'film'
    )) {
      expect(searchHome(s.query, FIXTURE_DATA).answer, s.query).not.toBeNull();
    }
  });

  it('teaches border, resize and mat for a paper size', () => {
    expect(labels('8x10', {})).toEqual([
      '8x10 35mm 1/2',
      '8x10 to 11x14 12s',
      '11x14 mat 8x10',
    ]);
    for (const query of labels('8x10', {})) {
      expect(searchHome(query).answer?.kind).toBeDefined();
    }
  });

  it('teaches a lens for a focal length', () => {
    expect(labels('80mm', {})[0]).toBe('80mm on 6x6');
  });

  it('teaches stops for a time', () => {
    expect(labels('12s', {})[0]).toBe('12s +1/3 stop');
  });

  it('offers the Camera Exposure calculator for camera talk', () => {
    expect(suggestHome('f/8', FIXTURE_DATA)).toEqual([
      {
        label: 'Camera Exposure calculator',
        query: 'f/8',
        hint: 'camera_exposure',
      },
    ]);
  });

  it('completes the word being typed', () => {
    expect(suggestHome('fom', FIXTURE_DATA)[0]).toMatchObject({
      hint: 'film',
      label: 'Foma Fomapan 100 Classic',
    });
    expect(labels('reci', {})).toContain('Reciprocity');
  });

  it('completes a number being typed after a film name', () => {
    expect(labels('fomapan 4')).toContain('Foma Fomapan 400 Action');
    expect(labels('fomapan 2')).toEqual(
      expect.arrayContaining(['Foma Fomapan 200 Creative'])
    );
    for (const label of labels('fomapan 2')) {
      expect(label).not.toMatch(/Fomapan (?:Retro )?[14]00/);
    }
    expect(labels('fomapan 200')).not.toContain('Foma Fomapan 200 Creative');
  });

  it('offers other speeds for a pair', () => {
    expect(labels('hp5 in dd-x')).toEqual([
      'HP5 Plus at 800 in DD-X',
      'HP5 Plus at 1600 in DD-X',
      'HP5 Plus at 3200 in DD-X',
    ]);
  });

  it('keeps a connective typed after a name', () => {
    // Names that start with "in" and "at", so a naive completion would
    // replace the connective with them.
    const data = {
      ...FIXTURE_DATA,
      films: [
        ...FIXTURE_FILMS,
        film('rollei-infrared-400', 'Rollei', 'Infrared 400', 'bw', 400, null),
        film('yodica-atlas-400', 'Yodica', 'Atlas 400', 'bw', 400, null),
      ],
      developers: [
        ...FIXTURE_DEVELOPERS,
        developer('acufine-acufine', 'Acufine', 'Acufine', [['1', 'Stock']]),
      ],
    };
    for (const query of ['hp5 in', 'hp5 at', 'hp5 at 800 in']) {
      const hints = suggestHome(query, data).map((s) => s.hint);
      expect(hints, query).not.toContain('film');
      expect(hints, query).not.toContain('developer');
    }
  });

  it('keeps the EI already typed in film templates', () => {
    const recipes = suggestHome('hp5 at 800 in', FIXTURE_DATA).filter(
      (s) => s.hint === 'recipe'
    );
    expect(recipes.length).toBeGreaterThan(0);
    for (const s of recipes) expect(s.query).toMatch(/^HP5 Plus at 800 in /);
    expect(searchHome(recipes[0].query, FIXTURE_DATA).answer?.kind).toBe(
      'recipe'
    );
  });

  it('teaches a resize with the sizes as typed', () => {
    expect(answer('24x30cm to 30x40cm').notes[0]).toContain(
      '“24x30cm to 30x40cm 12s”'
    );
    expect(answer('height 40cm to 60cm').notes[0]).toContain(
      '“height 40cm to 60cm 12s”'
    );
  });

  it('caps the list and suggests nothing for an empty box', () => {
    expect(suggestHome('', FIXTURE_DATA)).toEqual([]);
    expect(suggestHome('i', FIXTURE_DATA).length).toBeLessThanOrEqual(6);
  });
});
