import {
  borderCalculatorLink,
  cameraExposureLink,
  exposureCalculatorLink,
  lensCalculatorLink,
  reciprocityCalculatorLink,
  resizeCalculatorLink,
  searchHome,
} from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import { linkSearchFromParams } from '@/lib/link-prefill';
import {
  homeDestination,
  homeRouteDestination,
  TOOL_ID_BY_HOME_ROUTE,
  toolHref,
} from './destination';

/** Reads a destination's query the way a screen does (`useLocalSearchParams`). */
function paramsOf(path: string): Record<string, string> {
  const query = path.split('?')[1] ?? '';
  return Object.fromEntries(
    query
      .split('&')
      .filter(Boolean)
      .map((pair) => {
        const [key, value] = pair.split('=');
        return [decodeURIComponent(key), decodeURIComponent(value)];
      })
  );
}

describe('TOOL_ID_BY_HOME_ROUTE', () => {
  it('names the iOS tool for each web route (#266: the names differ by platform)', () => {
    expect(TOOL_ID_BY_HOME_ROUTE['/stops']).toBe('exposure');
    expect(TOOL_ID_BY_HOME_ROUTE['/exposure']).toBe('camera-exposure');
    expect(TOOL_ID_BY_HOME_ROUTE['/lenses']).toBe('lens');
  });
});

describe('homeDestination: answers carry their prefill', () => {
  it('opens the lens tool pre-filled on its phase route', () => {
    const answer = searchHome('80mm on 6x6').answer;
    expect(answer?.kind).toBe('lens');
    if (!answer) return;
    const path = homeDestination(answer.link.target);
    expect(path.startsWith('/shoot/lens?')).toBe(true);
    // The screen reads exactly what the answer built.
    expect(
      lensCalculatorLink.read(linkSearchFromParams(paramsOf(path)))
    ).toEqual(lensCalculatorLink.read(answer.link.target.search));
  });

  it('reciprocity links round-trip through the route to the same values', () => {
    // "tri-x 2m" needs the film catalog to be read as a film; the link it
    // builds does not, so build it the way the answer does.
    const search = reciprocityCalculatorLink.build({
      filmType: 'tri-x',
      meteredTime: '2m',
    });
    const path = homeDestination({ to: '/reciprocity', search });
    expect(path.startsWith('/shoot/reciprocity?')).toBe(true);
    expect(
      reciprocityCalculatorLink.read(linkSearchFromParams(paramsOf(path)))
    ).toEqual({ filmType: 'tri-x', meteredTime: '2m' });
  });

  it('border "11x14 6x7 1.5" opens the border tool with its values', () => {
    const answer = searchHome('11x14 6x7 1.5').answer;
    expect(answer?.kind).toBe('border');
    if (!answer || answer.link.target.to !== '/border') return;
    const path = homeDestination(answer.link.target);
    expect(path.startsWith('/print/border?')).toBe(true);
    const values = borderCalculatorLink.read(
      linkSearchFromParams(paramsOf(path))
    );
    expect(values).toEqual(
      borderCalculatorLink.read(answer.link.target.search)
    );
    expect(values.paperSize).toBe('11x14');
  });

  it('stops "12s +1/3" opens the Exposure tool, not Camera Exposure', () => {
    const answer = searchHome('12s +1/3').answer;
    expect(answer?.kind).toBe('stops');
    if (!answer) return;
    const path = homeDestination(answer.link.target);
    expect(path.startsWith('/print/exposure?')).toBe(true);
    expect(
      exposureCalculatorLink.read(linkSearchFromParams(paramsOf(path)))
    ).toEqual(exposureCalculatorLink.read(answer.link.target.search));
  });

  it('resize reaches the Resize tool', () => {
    const answer = searchHome('8x10 to 11x14 12s').answer;
    expect(answer?.kind).toBe('resize');
    if (!answer) return;
    const path = homeDestination(answer.link.target);
    expect(path.startsWith('/print/resize?')).toBe(true);
    expect(
      resizeCalculatorLink.read(linkSearchFromParams(paramsOf(path)))
    ).toEqual(resizeCalculatorLink.read(answer.link.target.search));
  });

  it('camera exposure opens Camera Exposure with nothing to prefill', () => {
    const answer = searchHome('f/8 at 1/125').answer;
    expect(answer?.kind).toBe('camera_exposure');
    if (!answer) return;
    expect(homeDestination(answer.link.target)).toBe('/shoot/camera-exposure');
    expect(cameraExposureLink.read({})).toEqual({});
  });

  it('adds an opening marker only to prefilled links, so a repeat re-applies', () => {
    const answer = searchHome('80mm on 6x6').answer;
    if (!answer) throw new Error('expected a lens answer');
    expect(homeDestination(answer.link.target, 7)).toContain('&at=7');
    const bare = searchHome('f/8 at 1/125').answer;
    if (!bare) throw new Error('expected a camera answer');
    expect(homeDestination(bare.link.target, 7)).not.toContain('at=');
  });
});

describe('homeDestination: recipes, films and developers', () => {
  it('opens a recipe on its detail route', () => {
    expect(
      homeDestination({ to: '/development', search: { recipe: 'abc-123' } })
    ).toBe('/develop/recipes/recipe/abc-123');
  });

  it('opens the recipe browser filtered to a film or developer', () => {
    expect(
      homeDestination({ to: '/development', search: { film: 'hp5-plus' } })
    ).toBe('/develop/recipes?film=hp5-plus');
    expect(
      homeDestination({ to: '/films', search: { film: 'tri-x-400' } })
    ).toBe('/develop/recipes?film=tri-x-400');
    expect(
      homeDestination({ to: '/development', search: { developer: 'rodinal' } })
    ).toBe('/develop/recipes?developer=rodinal');
  });

  it('marks a filtered browser opening so the same one re-applies', () => {
    const target = {
      to: '/development',
      search: { film: 'hp5-plus' },
    } as const;
    expect(homeDestination(target, 9)).toBe(
      '/develop/recipes?film=hp5-plus&at=9'
    );
    expect(homeDestination({ to: '/development', search: {} }, 9)).toBe(
      '/develop/recipes'
    );
  });

  it('opens the bare browser when there is nothing to filter by', () => {
    expect(homeDestination({ to: '/development', search: {} })).toBe(
      '/develop/recipes'
    );
  });
});

describe('homeRouteDestination and toolHref', () => {
  it('opens a tool result without a prefill', () => {
    expect(homeRouteDestination('/mat')).toBe('/print/mat');
    expect(homeRouteDestination('/development')).toBe('/develop/recipes');
  });

  it('opens a tool by its canonical route', () => {
    expect(toolHref('border')).toBe('/print/border');
    expect(toolHref('lens')).toBe('/shoot/lens');
  });

  it('opens the sections on their phase', () => {
    expect(toolHref('film-log')).toBe('/shoot/film-log');
    expect(toolHref('recipes')).toBe('/develop/recipes');
    expect(toolHref('timer')).toBe('/develop/recipes/timer');
  });

  it('sends an unknown tool to Home', () => {
    expect(toolHref('nope')).toBe('/');
  });
});
