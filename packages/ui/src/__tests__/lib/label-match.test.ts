import { describe, expect, it } from 'vitest';
import { labelMatches } from '../../lib/label-match';

describe('labelMatches', () => {
  it('matches a plain substring without regard to case', () => {
    expect(labelMatches('Kodak T-MAX/Ektapan', 'ektapan')).toBe(true);
    expect(labelMatches('Kodak T-MAX/Ektapan', 'T-MAX')).toBe(true);
  });

  it('ignores punctuation and spaces on both sides', () => {
    expect(labelMatches('Kodak T-MAX/Ektapan', 'tmax')).toBe(true);
    expect(labelMatches('Kodak T-MAX/Ektapan', 'kodak tmax')).toBe(true);
    expect(labelMatches('Ilford HP5 Plus', 'hp 5plus')).toBe(true);
    expect(labelMatches('Kodak Tri-X 400', 'trix')).toBe(true);
  });

  it('does not match what is not there', () => {
    expect(labelMatches('Kodak T-MAX/Ektapan', 'tmaxx')).toBe(false);
  });

  it('keeps a punctuation-only query literal, never matching everything', () => {
    expect(labelMatches('Ilford HP5 Plus', '+')).toBe(false);
    expect(labelMatches('Ilford HP5+', '+')).toBe(true);
    expect(labelMatches('Anything', '')).toBe(true);
  });
});
