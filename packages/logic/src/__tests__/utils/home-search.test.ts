import type { Combination, Film } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import { SHARED_LINK_MARKER } from '../../constants/calculator-link-params';
import { buildFilmRecipeIndex } from '../../utils/film-recipes';
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
  FIXTURE_RECIPES,
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
  // A search answer is the app's own navigation, not somebody's share, so
  // following one must never count as an opened share.
  it.each([
    'hp5 at 800 in dd-x',
    'tri-x 30s',
    '11x14 6x7 1.45',
    '8x10 to 11x14 12s',
    '80mm on 6x6',
    '12s +1/3',
    '16x20 mat 8x10 print',
    'f/8',
    'portra 400',
    'rodinal',
  ])('links "%s" without the shared-link marker', (query) => {
    const result = searchHome(query, FIXTURE_DATA);
    const targets = [
      ...(result.answer ? [result.answer.link.target] : []),
      // Tool results link to a bare route, so only item groups carry search.
      ...result.groups.flatMap((group) =>
        'items' in group ? group.items.map((item) => item.target) : []
      ),
    ];
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(target.search).not.toHaveProperty(SHARED_LINK_MARKER.param);
    }
  });

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
      // A fixed label, so a long URL never widens the card.
      expect(factOf(a, 'Source')).toMatchObject({
        value: 'View source',
        href: 'https://www.ilfordphoto.com/amfile/file/download/file/1903/product/691/',
      });
      // The EIs of the other recipes, not the one shown.
      expect(a.footnote).toBe(
        '3 other recipes for this pair, at EI 400, 1600, 3200'
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

    it('says up front when the EI asked for has no recipe', () => {
      const a = answer('hp5 at 6400 in dd-x');
      expect(a.notice).toBe(
        'No EI 6400 recipe for this pair. Showing EI 3200. Also at EI 400, 800, 1600.'
      );
      expect(factOf(a, 'Rated at')?.value).toBe('EI 3200');
    });

    it.each(['tri-x xtol 1600', 'tri-x at 1600 in xtol'])(
      'never passes another EI off as the one asked: %s',
      (query) => {
        const a = answer(query);
        // One EI in the data: no "Also at" to repeat the one shown.
        expect(a.notice).toBe(
          'No EI 1600 recipe for this pair. Showing EI 400.'
        );
      }
    );

    it('reads the push, not a box speed typed beside it', () => {
      expect(factOf(answer('hp5 400 xtol 1600'), 'Rated at')?.value).toBe(
        'EI 1600'
      );
      expect(answer('ilford hp5 400 in dd-x 6400').notice).toMatch(
        /^No EI 6400 recipe for this pair\./
      );
      const a = answer('hp5 400 dd-x 800');
      expect(a.notice).toBeUndefined();
      expect(factOf(a, 'Rated at')?.value).toBe('EI 800');
      expect(a.figure?.value).toBe('10:00');
    });

    it.each(['hp5 rodinal 50', 'hp5 id-11 20', 'hp5 dd-x 24', 'hp5 xtol 68'])(
      'reads no EI from a dilution or temperature: %s',
      (query) => {
        expect(answer(query).notice).toBeUndefined();
      }
    );

    it('reads a bare number beside a pair as the EI, unless a name has it', () => {
      expect(factOf(answer('hp5 dd-x 1600'), 'Rated at')?.value).toBe(
        'EI 1600'
      );
      const a = answer('tri-x 400 in xtol');
      expect(a.notice).toBeUndefined();
      expect(factOf(a, 'Rated at')?.value).toBe('EI 400');
    });

    it('needs no notice when the EI asked for has a recipe', () => {
      expect(answer('hp5 at 800 in dd-x').notice).toBeUndefined();
    });

    it('counts and lists only the other recipes in the footnote', () => {
      // Six recipes, two at the EI shown (400).
      const a = answer('hp5 id-11');
      expect(factOf(a, 'Rated at')?.value).toBe('EI 400');
      expect(a.footnote).toBe(
        '5 other recipes for this pair, at EI 400, 800, 1600'
      );
    });

    it('lists the other recipes the footnote counts, not the one shown', () => {
      const result = searchHome('hp5 at 800 in dd-x', FIXTURE_DATA);
      const recipes = result.groups.find((g) => g.key === 'recipes');
      if (!recipes || recipes.key === 'tools') throw new Error('no recipes');
      expect(recipes.label).toBe('Other recipes for this pair');
      expect(result.answer?.footnote).toMatch(
        new RegExp(`^${recipes.total} other recipes`)
      );
      const shown = result.answer?.link.target.search;
      for (const item of recipes.items)
        expect(item.target.search).not.toEqual(shown);
    });

    it.each([
      'hp5 in dd-x 24c',
      'hp5 dd-x at 24c',
      'hp5 dd-x 24°c',
      'hp5 dd-x 24 °C',
      'hp5 dd-x 24 c',
    ])('reads a Celsius temperature: %s', (query) => {
      // Said up front, in the unit typed; "at 24c" is never EI 24.
      expect(answer(query).notice).toBe(
        'No recipe at 24°C. This one is at 20°C.'
      );
    });

    it("adds the viewer's unit when the temperature was typed in the other", () => {
      const a = searchHome('hp5 in dd-x 24c', FIXTURE_DATA, {
        temperatureUnit: 'fahrenheit',
      }).answer;
      expect(a?.notice).toBe(
        'No recipe at 24°C (75.2°F). This one is at 20°C (68°F).'
      );
      expect(a?.notes).toEqual([]);
    });

    it('says both when neither the EI nor the temperature has a recipe', () => {
      expect(answer('hp5 at 6400 in dd-x 24c').notice).toBe(
        'No EI 6400 recipe for this pair. Showing EI 3200. Also at EI 400, 800, 1600. No recipe at 24°C. This one is at 20°C.'
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
      expect(a?.notice).toBe('No recipe at 75°F. This one is at 68°F.');
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
      expect(a.figure?.value).toBe('3m 8s');
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
      expect(a.figure).toMatchObject({ value: '8 × 9 5⁄16', unit: 'in' });
      expect(a.link.target).toEqual({
        to: '/border',
        search: {
          paper: '11x14',
          ratio: '7:6',
          border: '1.5',
          landscape: 'true',
          flip: 'false',
        },
      });
    });

    it('never shows a border under the minimum asked for', () => {
      // 1.45 is nearest 1 7/16 (1.4375): the print is worked out for 1 1/2,
      // so it keeps the 7:6 shape and both units describe one print.
      const a = answer('11x14 6x7 1.45');
      expect(factOf(a, 'Top / bottom')?.value).toBe('1 1⁄2″');
      expect(factOf(a, 'Left / right')?.value).toBe('2 5⁄16″');
      expect(a.figure?.value).toBe('8 × 9 5⁄16');
      expect(a.figure?.caption).toBe('print, 20.3×23.7 cm');
      if (a.kind !== 'border' || !a.diagram) throw new Error('no diagram');
      expect(a.diagram.printW / a.diagram.printH).toBeCloseTo(7 / 6, 6);
      expect(factOf(answer('8x10 35mm 1/2'), 'Left / right')?.value).toBe(
        '1⁄2″'
      );
    });

    it('writes every inch fraction the same way', () => {
      for (const query of [
        '11x14 6x7 1.45',
        '8x10 35mm 3/4',
        '16x20 mat 8x10',
      ]) {
        const a = answer(query);
        const text = [a.figure?.value, ...a.facts.map((f) => f.value)].join();
        expect(text, query).not.toMatch(/[½¼¾⅛⅜⅝⅞]/);
      }
    });

    it.each([
      ['8x10 35mm 3/4', '3⁄4″ min border', '5 11⁄16 × 8 1⁄2'],
      ['8x10 35mm 1 1/4', '1 1⁄4″ min border', '5 × 7 1⁄2'],
      ['8x10 35mm ½', '1⁄2″ min border', '6×9'],
      ['8x10 35mm 1½', '1 1⁄2″ min border', '4 11⁄16 × 7'],
      ['16x20 4x5 2in', '2″ min border', '12×15'],
      ['11x14 xpan 1', '1″ min border', '4 7⁄16 × 12'],
      ['8x10 645 borderless', 'no border', '7 1⁄2 × 10'],
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

    it('reads ISO paper names as their metric size', () => {
      const a = answer('a4 35mm');
      expect(readAs(a)[0]).toBe('21×29.7 cm paper');
      expect(a.figure).toMatchObject({ value: '18.1×27.1', unit: 'cm' });
      expect(a.link.target.search).toMatchObject({
        paper: 'custom',
        paperW: '8.2677',
        paperH: '11.6929',
      });
      expect(readAs(answer('a4 paper 6x6 1cm'))).toEqual([
        '21×29.7 cm paper',
        '6×6 negative',
        '1 cm min border (3⁄8″)',
        'portrait (as the paper stands)',
      ]);
      expect(readAs(answer('A3 6x7 2cm'))[0]).toBe('29.7×42 cm paper');
      expect(readAs(answer('a5 35mm'))[0]).toBe('14.8×21 cm paper');
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

    it('stands an ISO paper upright unless told otherwise', () => {
      const drawn = (query: string) => {
        const a = answer(query);
        if (a.kind !== 'border' || !a.diagram) throw new Error('no diagram');
        return a.diagram.paperH > a.diagram.paperW ? 'portrait' : 'landscape';
      };
      expect(drawn('a4 35mm')).toBe('portrait');
      expect(answer('a4 35mm').link.target.search).toMatchObject({
        landscape: 'false',
      });
      expect(drawn('a4 35mm landscape')).toBe('landscape');
      expect(readAs(answer('a4 35mm landscape'))).toContain('landscape');
      expect(drawn('8x10 35mm')).toBe('landscape');
      expect(drawn('8x10 35mm vertical')).toBe('portrait');
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
        text: '1⁄2″ min border (default)',
        assumed: true,
      });
      expect(a.notes).toContain(
        'Ignored “20”. For a border that size, add a unit, like “20mm”.'
      );
    });

    it.each([
      ['fp4 8x10 6x7 1.5', FIXTURE_DATA, '1 1⁄2″ min border'],
      ['hp5 8x10 35mm 1', FIXTURE_DATA, '1″ min border'],
      ['fomapan 200 11x14 6x7 1', FIXTURE_DATA, '1″ min border'],
      ['fomapan 200 11x14 6x7', FIXTURE_DATA, '1⁄2″ min border (default)'],
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
    it('keeps each enlarger height in its own unit', () => {
      const mixed = answer('height 40cm to 24in 10s');
      const same = answer('height 40cm to 60.96cm 10s');
      expect(mixed.figure?.value).toBe(same.figure?.value);
    });

    it("gives a height without a unit the other height's unit", () => {
      expect(answer('height 40 to 60cm 10s').figure?.value).toBe(
        answer('height 40cm to 60cm 10s').figure?.value
      );
    });

    it('scales a time between print sizes', () => {
      const a = answer('8x10 to 11x14 12s');
      expect(a.kind).toBe('resize');
      expect(a.figure).toMatchObject({
        value: '23.1s',
        unit: null,
        caption: 'new exposure, from 12s',
      });
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
      expect(answer('24x30cm to 30x40cm 15s').figure?.value).toBe('25.0s');
    });

    it('scales by enlarger height', () => {
      const a = answer('height 40cm to 60cm 10s');
      expect(a.figure?.value).toBe('22.5s');
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
      ['12s +1/3', '15.1s', '0.3333'],
      ['12s plus 2 stops', '48.0s', '2'],
      ['+1/3 stop 12s', '15.1s', '0.3333'],
      ['12s -0.5 stops', '8.5s', '-0.5'],
      ['15s down 1 stop', '7.5s', '-1'],
    ])('%s', (query, time, stops) => {
      const a = answer(query);
      if (a.kind !== 'stops') throw new Error(`${query} is ${a.kind}`);
      expect(a.figure?.value).toBe(time);
      expect(a.link.target.search.stops).toBe(stops);
    });

    it.each([
      ['12 seconds plus half a stop', '17.0s', '0.5'],
      ['12 sec minus a third of a stop', '9.5s', '-0.3333'],
      ['12s add two thirds of a stop', '19.0s', '0.6667'],
      ['12s up one stop', '24.0s', '1'],
      ['12s down two stops', '3.0s', '-2'],
      ['12s plus three stops', '1m 36s', '3'],
      ['12s plus 2/3 stop', '19.0s', '0.6667'],
      ['12 seconds a half stop', '17.0s', '0.5'],
      ['12s one and a half stops', '33.9s', '1.5'],
      ['12s plus 1 and a half stops', '33.9s', '1.5'],
      ['12s two and a half stops', '1m 8s', '2.5'],
      ['12s minus one and a third stops', '4.8s', '-1.3333'],
    ])('reads stops in words: %s', (query, time, stops) => {
      const a = answer(query);
      if (a.kind !== 'stops') throw new Error(`${query} is ${a.kind}`);
      expect(a.figure?.value).toBe(time);
      expect(a.link.target.search.stops).toBe(stops);
    });

    it('shows times to a tenth under a minute and whole seconds over', () => {
      const a = answer('12s +1/3');
      expect(a.title).toBe('12s +0.33 stops');
      expect(factOf(a, 'Base time')?.value).toBe('12s');
      expect(factOf(a, 'Added time')?.value).toBe('+3.1s');
      expect(factOf(answer('60s -1 stop'), 'Added time')?.value).toBe('−30.0s');
      expect(answer('12s plus three stops').figure?.value).toBe('1m 36s');
    });

    it('does not read a dilution as a stop change', () => {
      expect(kind('tri-x in d-76 1+1')).toBe('recipe');
    });
  });

  describe('mat', () => {
    it('opens a window with best-fit borders and the default reveal', () => {
      const a = answer('16x20 mat 8x10 print');
      expect(a.kind).toBe('mat');
      expect(a.figure).toMatchObject({ value: '7 1⁄2 × 9 1⁄2', unit: 'in' });
      expect(a.facts.map((f) => f.value)).toEqual([
        '5 1⁄4″',
        '5 1⁄4″',
        '4 1⁄4″',
        '4 1⁄4″',
      ]);
      expect(a.readAs[2]).toEqual({
        text: '1⁄4″ reveal (default)',
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
      expect(answer('11x14 mat for 8x10').facts[0].value).toBe('2 1⁄4″');
      expect(answer('mat 16x20 11x14 reveal 1/8').figure?.value).toBe(
        '10 3⁄4 × 13 3⁄4'
      );
      const weighted = answer('16x20 mat 8x10 bottom weight');
      expect(factOf(weighted, 'Bottom')?.value).toBe('5 5⁄8″');
      expect(factOf(weighted, 'Top')?.value).toBe('4 7⁄8″');
    });

    it.each([
      '16x20 mat 11x14 1/8 reveal',
      '16x20 mat 11x14 1/8" reveal',
      '16x20 mat 11x14 1/8 in reveal',
      '16x20 mat 11x14 reveal 1/8in',
    ])('reads the reveal on either side of the word: %s', (query) => {
      const a = answer(query);
      expect(a.figure?.value).toBe('10 3⁄4 × 13 3⁄4');
      expect(a.readAs[2]).toEqual({ text: '1⁄8″ reveal', assumed: false });
      expect(a.link.target.search).toMatchObject({ reveal: '1/8' });
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

    it('never hides another answer behind an f-number', () => {
      const a = answer('enlarge 8x10 to 16x20 20s f/8');
      expect(a.kind).toBe('resize');
      expect(a.figure?.value).toBe('1m 20s');
      expect(kind('8x10 35mm 1/2 f/8')).toBe('border');
      expect(kind('12s +1/3 f/8')).toBe('stops');
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

    it('a generic word never names a film on its own', () => {
      expect(searchHome('plus', FIXTURE_DATA).groups).toEqual([]);
      expect(kind('plus 30s')).toBeNull();
      expect(kind('12 seconds plus half a stop')).toBe('stops');
    });

    describe('spellings', () => {
      // Real catalog entries the slice above has no recipes for.
      const data = {
        ...FIXTURE_DATA,
        films: [
          ...FIXTURE_FILMS,
          film(
            'kodak-ektapan-100',
            'Kodak',
            'T-MAX/Ektapan 100',
            'bw',
            100,
            '1.15',
            false,
            [{ name: 'Kodak T-MAX 100', slug: 'kodak-t-max-100' }]
          ),
          film(
            'kodak-ektapan-400',
            'Kodak',
            'T-MAX/Ektapan 400',
            'bw',
            400,
            '1.24',
            false,
            [{ name: 'Kodak T-MAX 400', slug: 'kodak-t-max-400' }]
          ),
          film(
            'kodak-ektapan-p3200',
            'Kodak',
            'T-MAX/Ektapan P3200',
            'bw',
            3200,
            null,
            false,
            [{ name: 'Kodak T-MAX P3200', slug: 'kodak-t-max-p3200' }]
          ),
          film(
            'eastman-double-x-5222',
            'Eastman',
            'Double-X 5222',
            'bw',
            250,
            null
          ),
        ],
      };
      const topFilm = (query: string) => {
        const films = searchHome(query, data).groups.find(
          (g) => g.key === 'films'
        );
        return films?.key === 'films' ? films.items[0].title : null;
      };

      it.each([
        ['hp5+', 'Ilford HP5 Plus'],
        ['tmax400', 'Kodak T-MAX/Ektapan 400'],
        ['t max 400', 'Kodak T-MAX/Ektapan 400'],
        ['t-max 100', 'Kodak T-MAX/Ektapan 100'],
        ['tmy', 'Kodak T-MAX/Ektapan 400'],
        ['tmx', 'Kodak T-MAX/Ektapan 100'],
        ['tmz', 'Kodak T-MAX/Ektapan P3200'],
        ['kodak 5222', 'Eastman Double-X 5222'],
        ['delta3200', 'Ilford Delta 3200'],
      ])('%s finds %s', (query, title) => {
        expect(topFilm(query)).toBe(title);
      });

      it('finds a developer by a common misspelling', () => {
        const developers = searchHome('rodinol', data).groups.find(
          (g) => g.key === 'developers'
        );
        expect(
          developers?.key === 'developers' && developers.items[0].title
        ).toBe('Agfa Rodinal/Adonal');
      });

      it('answers with a spelling in a recipe query', () => {
        expect(answer('hp5+ dd-x').title).toBe(
          'Ilford HP5 Plus in Ilford DD-X'
        );
        expect(answer('tri x in d 76').title).toBe(
          'Kodak Tri-X 400 in Kodak D-76'
        );
      });
    });

    it.each([
      ['border', '/border'],
      ['resize', '/resize'],
      ['stops', '/stops'],
      ['mat', '/mat'],
      ['reciprocity', '/reciprocity'],
      ['development', '/development'],
      ['lenses', '/lenses'],
      ['exposure', '/exposure'],
      ['films', '/films'],
      ['negative inverter', '/negative-inverter'],
      ['invert', '/negative-inverter'],
      ['scan negatives', '/negative-inverter'],
    ])('finds the %s tool by its name', (query, route) => {
      const tools = searchHome(query, FIXTURE_DATA).groups.find(
        (g) => g.key === 'tools'
      );
      expect(tools?.key === 'tools' && tools.tools).toContain(route);
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
      {
        label: 'Ilford HP5 Plus 30s',
        query: 'HP5 Plus 30s',
        hint: 'reciprocity',
      },
    ]);
    // Named in full, as the answer and the matches name them; filled short.
    expect(suggestions[0].label).toMatch(/^Ilford HP5 Plus in /);
    expect(suggestions[0].query).toMatch(/^HP5 Plus in /);
    expect(suggestions[1].label).toMatch(/^Ilford HP5 Plus at \d+ in /);
  });

  it('pairs a name with its most widely used partner, not its longest datasheet', () => {
    const r = (uuid: string, filmSlug: string, developerSlug: string) => ({
      ...FIXTURE_RECIPES[0],
      uuid,
      filmSlug,
      developerSlug,
    });
    const data = {
      films: FIXTURE_FILMS,
      developers: FIXTURE_DEVELOPERS,
      combinations: [
        // Three HP5 recipes in DD-X, which no other film has...
        r('a', 'ilford-hp5-plus', 'ilford-dd-x'),
        r('b', 'ilford-hp5-plus', 'ilford-dd-x'),
        r('c', 'ilford-hp5-plus', 'ilford-dd-x'),
        // ...and one in D-76, which three films have.
        r('d', 'ilford-hp5-plus', 'kodak-d-76'),
        r('e', 'kodak-tri-x-400', 'kodak-d-76'),
        r('f', 'ilford-fp4-plus', 'kodak-d-76'),
        r('g', 'kodak-tri-x-400', 'ilford-id-11'),
        r('h', 'kodak-tri-x-400', 'kodak-xtol'),
      ],
    };
    expect(suggestHome('hp5', data)[0].query).toBe('HP5 Plus in D-76');
    // Tri-X has three developers, HP5 two and FP4 Plus one.
    expect(suggestHome('d-76', data)[0].query).toBe('Tri-X 400 in D-76');
  });

  it('names a film as the matches do', () => {
    const result = searchHome('fp4', FIXTURE_DATA);
    const films = result.groups.find((g) => g.key === 'films');
    if (!films || films.key === 'tools') throw new Error('no films');
    const suggested = suggestHome('fp', FIXTURE_DATA).find(
      (s) => s.hint === 'film'
    );
    expect(suggested?.label).toBe(films.items[0].title);
  });

  it('never offers the reciprocity a timed query already answers', () => {
    expect(
      suggestHome('tri-x 30s', FIXTURE_DATA).map((s) => s.hint)
    ).not.toContain('reciprocity');
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

  it('suggests nothing for camera talk, which the answer already links', () => {
    expect(suggestHome('f/8', FIXTURE_DATA)).toEqual([]);
  });

  it('completes the word being typed', () => {
    expect(suggestHome('fom', FIXTURE_DATA)[0]).toMatchObject({
      hint: 'film',
      label: 'Foma Fomapan 100 Classic',
    });
    expect(suggestHome('reci', {})).toContainEqual({
      label: 'Reciprocity',
      query: 'reciprocity',
      hint: 'tool',
      tool: '/reciprocity',
    });
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

  it('suggests no recipes for a pair, whose other recipes the matches list', () => {
    for (const query of [
      'hp5 in dd-x',
      'hp5 at 800 in dd-x',
      'tri-x at 1600 in xtol',
    ]) {
      const hints = suggestHome(query, FIXTURE_DATA).map((s) => s.hint);
      expect(hints, query).not.toContain('recipe');
    }
    const result = searchHome('hp5 at 800 in dd-x', FIXTURE_DATA);
    const others = result.groups.find((g) => g.key === 'recipes');
    expect(others?.label).toBe('Other recipes for this pair');
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

describe('rebrand families', () => {
  const rebrand = (
    slug: string,
    brand: string,
    name: string,
    isoSpeed: number,
    baseFilmSlug: string
  ): Film => ({
    ...film(slug, brand, name, 'bw', isoSpeed, null),
    baseFilmSlug,
  });

  // Real rows (dorkroom.art/api, 2026-11-05): published under Lady Grey and
  // Earl Grey, and shared with their bases and every other rebrand of those.
  const row = (
    uuid: string,
    filmSlug: string,
    developerSlug: string,
    shootingIso: number,
    dilutionId: string,
    timeMinutes: number
  ): Combination => ({
    ...FIXTURE_RECIPES[0],
    uuid,
    filmSlug,
    filmStockId: filmSlug,
    developerSlug,
    developerId: developerSlug,
    shootingIso,
    dilutionId,
    customDilution: null,
    temperatureC: 20,
    temperatureF: 68,
    timeMinutes,
  });
  const LADY_GREY = 'lomography-lady-grey-400';
  const EARL_GREY = 'lomography-earl-grey-100';
  const SHARED_RECIPES = [
    row('xtol-lady', LADY_GREY, 'kodak-xtol', 400, '1', 6.5),
    row('rodinal-lady-50', LADY_GREY, 'agfa-rodinal-adonal', 400, '2', 10),
    row('rodinal-lady-25', LADY_GREY, 'agfa-rodinal-adonal', 400, '1', 5),
    row('xtol-earl-stock', EARL_GREY, 'kodak-xtol', 100, '1', 5),
    row('xtol-earl-1-1', EARL_GREY, 'kodak-xtol', 100, '2', 9),
    row('rodinal-earl-50', EARL_GREY, 'agfa-rodinal-adonal', 100, '2', 8),
    row('rodinal-earl-25', EARL_GREY, 'agfa-rodinal-adonal', 100, '1', 4),
  ];
  // The Arista Premium films come first, as they do live, so a tie starts on
  // the film without recipes.
  const FAMILY_FILMS = [
    film('arista-premium-100', 'Arista', 'Premium 100', 'bw', 100, null),
    film('arista-premium-400', 'Arista', 'Premium 400', 'bw', 400, null),
    ...FIXTURE_FILMS,
    rebrand(
      LADY_GREY,
      'Lomography',
      'Lady Grey 400',
      400,
      'foma-fomapan-400-action'
    ),
    rebrand(
      EARL_GREY,
      'Lomography',
      'Earl Grey 100',
      100,
      'foma-fomapan-100-classic'
    ),
    rebrand(
      'foma-holga-400',
      'Foma',
      'Holga 400',
      400,
      'foma-fomapan-400-action'
    ),
    rebrand(
      'arista-edu-ultra-100',
      'Arista',
      'Edu Ultra 100',
      100,
      'foma-fomapan-100-classic'
    ),
    rebrand(
      'arista-edu-ultra-400',
      'Arista',
      'Edu Ultra 400',
      400,
      'foma-fomapan-400-action'
    ),
  ];
  const DATA = {
    films: FAMILY_FILMS,
    developers: FIXTURE_DEVELOPERS,
    combinations: [...FIXTURE_RECIPES, ...SHARED_RECIPES],
  };

  const recipeLink = (a: HomeAnswer) => {
    if (a.kind !== 'recipe' && a.kind !== 'no_recipe') {
      throw new Error(`No recipe link on ${a.kind}`);
    }
    return a.link.target.search;
  };
  const searchOf = ({
    search,
  }: {
    search: object;
  }): { film?: unknown; recipe?: unknown } => search;
  const group = (query: string, key: string) =>
    searchHome(query, DATA).groups.find((g) => g.key === key);

  it.each([
    ['holga xtol', 'Foma Holga 400', 'foma-holga-400'],
    [
      'arista edu ultra 400 xtol',
      'Arista Edu Ultra 400',
      'arista-edu-ultra-400',
    ],
    ['fomapan 400 xtol', 'Foma Fomapan 400 Action', 'foma-fomapan-400-action'],
  ])(
    'answers %s with the row shared across the family',
    (query, name, slug) => {
      const a = answer(query, DATA);
      expect(a.kind).toBe('recipe');
      expect(a.title).toBe(`${name} in Kodak XTOL`);
      expect(a.figure?.value).toBe('6:30');
      expect(factOf(a, 'Dilution')?.value).toBe('Stock');
      expect(factOf(a, 'Rated at')?.value).toBe('EI 400');
      expect(factOf(a, 'Rated at')?.detail).toBe('box speed');
      expect(recipeLink(a)).toMatchObject({
        film: slug,
        developer: 'kodak-xtol',
        recipe: 'xtol-lady',
      });
    }
  );

  it('reads ambiguous words as the film with a recipe for the pair', () => {
    const xtol = answer('arista 400 xtol', DATA);
    expect(xtol.title).toBe('Arista Edu Ultra 400 in Kodak XTOL');
    expect(xtol.figure?.value).toBe('6:30');
    expect(recipeLink(xtol).film).toBe('arista-edu-ultra-400');

    const rodinal = answer('arista 100 rodinal', DATA);
    expect(rodinal.title).toBe('Arista Edu Ultra 100 in Agfa Rodinal/Adonal');
    expect(rodinal.figure?.value).toBe('8:00');
    expect(recipeLink(rodinal).film).toBe('arista-edu-ultra-100');
  });

  it('stays on a film named whole, even with no recipe for the pair', () => {
    for (const query of [
      'arista premium 400 xtol',
      // "ultra" and "400" also fit Edu Ultra 400, which has the recipe.
      'premium 400 xtol ultra',
    ]) {
      const a = answer(query, DATA);
      expect(a.kind).toBe('no_recipe');
      expect(a.title).toBe('Arista Premium 400 in Kodak XTOL');
      expect(recipeLink(a).film).toBe('arista-premium-400');
    }
  });

  it('stays on the first film named whole when another also fits', () => {
    // "tmax" here is the developer's word, though it completes T-MAX 100 too.
    const data = {
      films: [
        film('ilford-delta-100', 'Ilford', 'Delta 100', 'bw', 100, null),
        film('kodak-t-max-100', 'Kodak', 'T-MAX 100', 'bw', 100, null),
      ],
      developers: [developer('kodak-t-max-rs', 'Kodak', 'T-MAX RS', [])],
      combinations: [
        row('delta', 'ilford-delta-100', 'kodak-xtol', 100, '1', 7),
        row('delta-2', 'ilford-delta-100', 'kodak-xtol', 100, '2', 9),
        row('tmax', 'kodak-t-max-100', 'kodak-t-max-rs', 100, '1', 7),
      ],
    };
    const a = answer('delta 100 tmax rs', data);
    expect(a.kind).toBe('no_recipe');
    expect(a.title).toBe('Ilford Delta 100 in Kodak T-MAX RS');
  });

  it('does not move past a film named whole to one that only fits', () => {
    const data = {
      films: [
        film('foma-retro-400', 'Foma', 'Fomapan Retro 400', 'bw', 400, null),
        film('rollei-retro-400', 'Rollei', 'Retro 400', 'bw', 400, null),
        film('other-retro-400', 'Other', 'Retro 400 Extra', 'bw', 400, null),
      ],
      developers: FIXTURE_DEVELOPERS,
      combinations: [
        row('foma', 'foma-retro-400', 'kodak-d-76', 400, '1', 7),
        row('other', 'other-retro-400', 'kodak-xtol', 400, '1', 7),
      ],
    };
    expect(answer('retro 400 xtol', data).kind).toBe('no_recipe');
  });

  describe('a film with no recipes giving way', () => {
    const ownerOf = (slug: string) =>
      film(slug, 'Owner', `Owner ${slug}`, 'bw', 400, null);

    it('marks the guess, on an answer and on no recipe', () => {
      expect(answer('arista 400 xtol', DATA).readAs).toEqual([
        { text: 'Arista Edu Ultra 400', assumed: true },
      ]);
      expect(answer('arista edu ultra 400 xtol', DATA).readAs).toEqual([]);
      expect(answer('holga xtol', DATA).readAs).toEqual([]);
    });

    it('falls back to a tied film with recipes when none has the pair', () => {
      const a = answer('arista 400 d-76', DATA);
      expect(a.kind).toBe('no_recipe');
      expect(a.title).toBe('Arista Edu Ultra 400 in Kodak D-76');
      expect(a.notes[0]).toBe(
        'No recipe for this pair yet. Edu Ultra 400 has 3 recipes in other developers.'
      );
      expect(recipeLink(a).film).toBe('arista-edu-ultra-400');
      expect(readAs(a)).toEqual(['Arista Edu Ultra 400']);
    });

    it('needs every word accounted for', () => {
      for (const query of ['arista 400 xtol 100', 'arista 400 xtol 800']) {
        const a = answer(query, DATA);
        expect(a.kind).toBe('no_recipe');
        expect(a.title).toMatch(/^Arista Premium \d+ in Kodak XTOL$/);
      }
      const typed = answer('arista 400 xtol at 800', DATA);
      expect(typed.title).toBe('Arista Edu Ultra 400 in Kodak XTOL');
      expect(typed.notice).toBe(
        'No EI 800 recipe for this pair. Showing EI 400.'
      );
    });

    it('stays on the top film for words it does not explain', () => {
      const data = {
        ...DATA,
        films: [
          film('foma-fomapan-t800', 'Foma', 'Fomapan T800', 'bw', 800, null),
          ...FAMILY_FILMS,
        ],
      };
      expect(answer('foma 320 xtol', data).title).toBe(
        'Foma Fomapan T800 in Kodak XTOL'
      );
      const guess = answer('foma xtol', data);
      expect(guess.title).toBe('Foma Fomapan 100 Classic in Kodak XTOL');
      expect(guess.readAs).toEqual([
        { text: 'Foma Fomapan 100 Classic', assumed: true },
      ]);
    });

    it('stays on a film with recipes of its own, whatever the pair lacks', () => {
      const data = {
        films: [
          film('kentmere-pan-100', 'Kentmere', 'Pan 100', 'bw', 100, null),
          film('ilford-pan-f', 'Ilford', 'Pan F Plus', 'bw', 50, null),
          film('ilford-ortho', 'Ilford', 'Ortho Plus', 'bw', 80, null),
          film('rollei-ortho-25', 'Rollei', 'Ortho 25', 'bw', 25, null),
        ],
        developers: FIXTURE_DEVELOPERS,
        combinations: [
          row('p1', 'kentmere-pan-100', 'kodak-d-76', 100, '1', 7),
          row('p2', 'kentmere-pan-100', 'kodak-d-76', 100, '2', 9),
          row('p3', 'ilford-pan-f', 'kodak-xtol', 50, '1', 6.75),
          row('o1', 'ilford-ortho', 'kodak-xtol', 80, '1', 7),
          row('o2', 'ilford-ortho', 'kodak-xtol', 80, '2', 9),
          row('o3', 'rollei-ortho-25', 'kodak-d-76', 25, '1', 8),
        ],
      };
      expect(answer('pan xtol', data).title).toBe(
        'Kentmere Pan 100 in Kodak XTOL'
      );
      expect(answer('pan xtol', data).kind).toBe('no_recipe');
      expect(answer('ortho d-76', data).title).toBe(
        'Ilford Ortho Plus in Kodak D-76'
      );
      expect(answer('ortho d-76', data).kind).toBe('no_recipe');
    });

    it('moves only within a tie', () => {
      expect(answer('fomapan 200 xtol', DATA).title).toBe(
        'Foma Fomapan 200 Creative in Kodak XTOL'
      );
      // The maker's word and the number fit Zed 400 too, for a lower score.
      const data = {
        films: [
          film('acme-alpha', 'Acme', 'Alpha Special 400', 'bw', 400, null),
          ownerOf('owner-zed'),
          rebrand('alpha-zed', 'Alpha', 'Zed 400', 400, 'owner-zed'),
        ],
        developers: FIXTURE_DEVELOPERS,
        combinations: [row('z', 'owner-zed', 'kodak-xtol', 400, '1', 6.5)],
      };
      const a = answer('alpha 400 xtol', data);
      expect(a.kind).toBe('no_recipe');
      expect(a.title).toBe('Acme Alpha Special 400 in Kodak XTOL');
    });

    it('moves only to a reading of the same developer', () => {
      const data = {
        films: [
          film('alpha-x1', 'Acme', 'Alpha X1', 'bw', 400, null),
          ownerOf('owner-bravo'),
          rebrand('bravo-x1', 'Acme', 'Bravo X1', 400, 'owner-bravo'),
        ],
        developers: [
          developer('alpha-dev', 'Acme', 'Alpha Dev', []),
          developer('bravo-dev', 'Acme', 'Bravo Dev', []),
        ],
        combinations: [row('b', 'owner-bravo', 'bravo-dev', 400, '1', 6.5)],
      };
      const a = answer('alpha bravo', data);
      expect(a.kind).toBe('no_recipe');
      expect(a.title).toBe('Acme Alpha X1 in Acme Bravo Dev');
    });

    it('counts an alias without its maker as naming a film whole', () => {
      const data = {
        films: [
          film(
            'kodak-ektapan-100',
            'Kodak',
            'Ektapan 100',
            'bw',
            100,
            null,
            false,
            [{ name: 'Kodak Zed 100', slug: 'kodak-zed-100' }]
          ),
          ownerOf('owner-extra'),
          rebrand('zed-extra', 'Other', 'Zed 100 Extra', 100, 'owner-extra'),
        ],
        developers: FIXTURE_DEVELOPERS,
        combinations: [row('e', 'owner-extra', 'kodak-xtol', 100, '1', 6.5)],
      };
      const a = answer('zed 100 xtol', data);
      expect(a.kind).toBe('no_recipe');
      expect(a.title).toBe('Kodak Ektapan 100 in Kodak XTOL');
    });

    it('settles a tie on rows published under a film or its aliases', () => {
      const data = {
        films: [
          film('first-zed', 'First', 'Zed 100 One', 'bw', 100, '1.3'),
          film('second-zed', 'Second', 'Zed 100 Two', 'bw', 100, '1.3', false, [
            { name: 'Old Zed', slug: 'old-zed' },
          ]),
        ],
        developers: FIXTURE_DEVELOPERS,
        combinations: [row('z', 'old-zed', 'kodak-xtol', 100, '1', 6.5)],
      };
      expect(answer('zed 100 30s', data).title).toMatch(/^Second Zed 100 Two/);
    });
  });

  it('reads the push from the box speed of the film asked about', () => {
    const data = {
      ...DATA,
      films: [
        ...FAMILY_FILMS,
        rebrand('slow-200', 'Slow', 'Slow 200', 200, LADY_GREY),
      ],
    };
    const a = answer('slow 200 xtol', data);
    expect(factOf(a, 'Rated at')?.value).toBe('EI 400');
    expect(factOf(a, 'Rated at')?.detail).toBe('push +1');
    expect(a.notes[0]).toBe(
      'No recipe at box speed (EI 200) for this pair. Recipes exist at EI 400.'
    );
  });

  it('says no recipe when no film the words fit has one', () => {
    const a = answer('holga d-76', DATA);
    expect(a.kind).toBe('no_recipe');
    expect(a.notes[0]).toBe(
      'No recipe for this pair yet. Holga 400 has 3 recipes in other developers.'
    );
  });

  it('counts a film as /films does', () => {
    const { counts } = buildFilmRecipeIndex(DATA.combinations, FAMILY_FILMS);
    expect(counts.get('foma-holga-400')).toBe(3);
    for (const [query, slug] of [
      ['holga', 'foma-holga-400'],
      ['edu ultra 100', 'arista-edu-ultra-100'],
      ['lady grey', LADY_GREY],
      ['fomapan 400 action', 'foma-fomapan-400-action'],
    ] as const) {
      const films = group(query, 'films');
      if (films?.key !== 'films') throw new Error(`No films for ${query}`);
      const item = films.items.find((i) => searchOf(i.target).film === slug);
      expect(item?.meta).toBe(`${counts.get(slug)} recipes`);
    }
  });

  it("names the film asked about on the pair's other recipes", () => {
    const others = group('holga rodinal', 'recipes');
    if (others?.key !== 'recipes') throw new Error('no recipes');
    expect(others.label).toBe('Other recipes for this pair');
    expect(others.items).toHaveLength(1);
    expect(others.items[0].title).toMatch(/^Foma Holga 400 in /);
    expect(searchOf(others.items[0].target).film).toBe('foma-holga-400');
  });

  it("names a row's own film when only a developer is asked about", () => {
    const { groups } = searchHome('xtol', {
      ...DATA,
      combinations: SHARED_RECIPES,
    });
    const rows = groups.find((g) => g.key === 'recipes');
    if (rows?.key !== 'recipes') throw new Error('no recipes');
    const shared = rows.items.find(
      (i) => searchOf(i.target).recipe === 'xtol-lady'
    );
    if (!shared) throw new Error('no shared row');
    expect(shared.title).toMatch(/^Lomography Lady Grey 400 in /);
    expect(searchOf(shared.target).film).toBe(LADY_GREY);
  });

  it('ranks completions by the developers a film shares', () => {
    expect(suggestHome('ar', DATA)[0].label).toBe('Arista Edu Ultra 100');
  });

  it('suggests templates from the family', () => {
    expect(suggestHome('holga', DATA).map((s) => s.label)).toContain(
      'Foma Holga 400 in Kodak XTOL'
    );
  });

  it('keeps home defaults on shared rows: Stock before any dilution', () => {
    const a = answer('arista edu ultra 100 xtol', DATA);
    expect(a.figure?.value).toBe('5:00');
    expect(factOf(a, 'Dilution')?.value).toBe('Stock');
  });

  it('honours a typed dilution on shared rows', () => {
    const a = answer('arista edu ultra 100 xtol 1+1', DATA);
    expect(a.figure?.value).toBe('9:00');
    expect(factOf(a, 'Dilution')?.value).toBe('1+1');
  });
});
