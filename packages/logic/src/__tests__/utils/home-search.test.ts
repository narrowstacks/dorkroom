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
