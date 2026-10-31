import { describe, expect, it } from 'vitest';
import type {
  CustomDeveloperData,
  CustomFilmData,
} from '../../types/custom-recipes';
import {
  sanitizeCustomDeveloper,
  sanitizeCustomFilm,
  sanitizeRecipeName,
  sanitizeTags,
  sanitizeText,
} from '../text-sanitization';

describe('text-sanitization', () => {
  describe('sanitizeText', () => {
    it('returns empty string for undefined input', () => {
      expect(sanitizeText(undefined)).toBe('');
    });

    it('returns empty string for null input', () => {
      expect(sanitizeText(null)).toBe('');
    });

    it('returns empty string for empty string input', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('removes HTML tags', () => {
      const input = '<p>This is a test</p>';
      const result = sanitizeText(input);
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('</p>');
      expect(result).toContain('This is a test');
    });

    it('removes script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeText(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      // Alert string is escaped, not removed
      expect(result).toContain('Hello');
    });

    it('keeps scheme-like and handler-like words in prose', () => {
      // Recipe text is never turned into a URL or markup, so these are plain
      // words. A URL-valued field must validate its own scheme.
      expect(sanitizeText('javascript:alert("xss")')).toBe(
        'javascript:alert("xss")'
      );
      expect(sanitizeText('foo onclick=bar')).toBe('foo onclick=bar');
      expect(sanitizeText('data:text/html,hi')).toBe('data:text/html,hi');
    });

    it('does not delete script/object/iframe/embed inside ordinary words', () => {
      const input =
        'Objective: embedded subscription, scripted iframe object. onclick= and Online=yes';
      expect(sanitizeText(input)).toBe(input);
    });

    it('keeps a bare < or > in prose', () => {
      expect(sanitizeText('Keep temp < 20C and time > 5 min')).toBe(
        'Keep temp < 20C and time > 5 min'
      );
      expect(sanitizeText('a<3 b>2')).toBe('a<3 b>2');
    });

    it('strips closing tags, comments and processing instructions', () => {
      expect(sanitizeText('x</b>y')).toBe('xy');
      expect(sanitizeText('x<!-- c -->y')).toBe('xy');
      expect(sanitizeText('x<?php echo 1 ?>y')).toBe('xy');
      expect(sanitizeText('<script>x</script>')).toBe('x');
      expect(sanitizeText('<img src=x onerror=y>')).toBe('');
    });

    it('keeps subdivision flag emoji (tag characters)', () => {
      const england =
        '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';
      expect(sanitizeText(england)).toBe(england);
    });

    it('removes lone surrogates but keeps pairs', () => {
      expect(sanitizeText('a\uD800b\uDC00c')).toBe('abc');
      expect(sanitizeText('\uDC00x')).toBe('x');
      expect(sanitizeText('a\u{1F600}b')).toBe('a\u{1F600}b');
    });

    it('still removes tags around those words', () => {
      expect(sanitizeText('<script>alert(1)</script>')).toBe('alert(1)');
      expect(sanitizeText('<iframe src="x"></iframe>ok')).toBe('ok');
      expect(sanitizeText('<object data=x><embed src=y>text')).toBe('text');
    });

    it('strips control characters but keeps tab, newline and CR', () => {
      expect(sanitizeText('a\u0000b\u0007c\u007Fd\u0085e')).toBe('abcde');
      expect(sanitizeText('line1\nline2\tx\r\ny')).toBe('line1\nline2\tx\r\ny');
    });

    it('strips bidi overrides and zero-width characters but keeps joiners', () => {
      expect(sanitizeText('a\u202Eb\u2066c\u200Bd\uFEFFe')).toBe('abcde');
      expect(sanitizeText('\u{1F468}\u200D\u{1F469}')).toBe(
        '\u{1F468}\u200D\u{1F469}'
      );
    });

    it('does not split a surrogate pair when truncating', () => {
      const result = sanitizeText('ab\u{1F600}cd', 3);
      expect(result).toBe('ab...');
    });

    it('preserves non-Latin prose', () => {
      const input = 'Révélateur doux, 現像 20°C, Проявитель';
      expect(sanitizeText(input)).toBe(input);
    });

    it('preserves special characters (React handles encoding)', () => {
      const input = 'Test & <test> "quote" \'apostrophe\' /slash/';
      const result = sanitizeText(input);
      // Tags are removed, but special chars are preserved
      // React will handle the HTML encoding when rendering
      expect(result).toContain('&');
      expect(result).toContain('"');
      expect(result).toContain("'");
      expect(result).toContain('/');
      expect(result).not.toContain('<test>');
    });

    it('preserves HTML entities as-is (prevents double-encoding)', () => {
      const input = '&lt;p&gt;Test&lt;/p&gt;';
      const result = sanitizeText(input);
      // Should preserve entities exactly as entered
      // React will render them correctly without double-encoding
      expect(result).toBe('&lt;p&gt;Test&lt;/p&gt;');
    });

    it('trims whitespace', () => {
      const input = '  Test  ';
      const result = sanitizeText(input);
      expect(result).toBe('Test');
    });

    it('respects default max length of 5000', () => {
      const input = 'a'.repeat(6000);
      const result = sanitizeText(input);
      expect(result.length).toBeLessThanOrEqual(5003); // 5000 + '...'
      expect(result).toContain('...');
    });

    it('respects custom max length', () => {
      const input = 'a'.repeat(200);
      const result = sanitizeText(input, 100);
      expect(result.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(result).toContain('...');
    });

    it('does not add ellipsis when under max length', () => {
      const input = 'Short text';
      const result = sanitizeText(input, 100);
      expect(result).toBe('Short text');
      expect(result).not.toContain('...');
    });

    it('handles multiple XSS vectors at once', () => {
      const input =
        '<script>alert("xss")</script><img src=x onerror=alert("xss")>';
      const result = sanitizeText(input);
      expect(result).toBe('alert("xss")');
    });

    it('preserves normal text with punctuation', () => {
      const input =
        'This is a normal sentence. It has punctuation! And questions? Yes.';
      expect(sanitizeText(input)).toBe(input);
    });

    it('handles nested HTML tags', () => {
      const input = '<div><p><span>Nested</span></p></div>';
      const result = sanitizeText(input);
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<span>');
      expect(result).toContain('Nested');
    });

    it('handles numeric character references', () => {
      // Entities are not decoded (React escapes on render).
      const input = '&#60;script&#62;alert(&#34;xss&#34;)&#60;/script&#62;';
      expect(sanitizeText(input)).toBe(input);
    });

    it('repeats tag removal until a spliced tag cannot reappear', () => {
      expect(sanitizeText('<scr<script>ipt>alert(1)')).toBe('ipt>alert(1)');
      expect(sanitizeText('<\u0000script>x')).toBe('x');
      // Too long to match until the inner `<b>` is removed: needs a second pass.
      expect(sanitizeText(`<${'a'.repeat(2000)}<b>>`)).toBe('');
    });
  });

  describe('sanitizeRecipeName', () => {
    it('sanitizes recipe name with restrictive rules', () => {
      const input = 'Test Recipe <script>alert("xss")</script>';
      const result = sanitizeRecipeName(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Test Recipe');
    });

    it('allows alphanumeric characters', () => {
      const input = 'Recipe123ABC';
      const result = sanitizeRecipeName(input);
      expect(result).toBe('Recipe123ABC');
    });

    it('allows spaces, hyphens, underscores, and periods', () => {
      const input = 'My Recipe-Name_2024.v1';
      const result = sanitizeRecipeName(input);
      expect(result).toBe('My Recipe-Name_2024.v1');
    });

    it('allows parentheses and ampersands', () => {
      const input = 'Recipe (Test) & Development';
      expect(sanitizeRecipeName(input)).toBe(input);
    });

    it('preserves accented, non-Latin and emoji names', () => {
      for (const input of [
        'Caf\u00e9 \u2013 \u201cR\u00e9ponse\u201d 20\u00b0C',
        'Kodak \u73fe\u50cf \u30ec\u30b7\u30d4',
        '\u041f\u0440\u043e\u044f\u0432\u0438\u0442\u0435\u043b\u044c 1+1',
        '\u0645\u062d\u0644\u0648\u0644 \u0627\u0644\u062a\u0637\u0648\u064a\u0631',
        'Push +2 \u{1F4F7} \u{1F468}\u200D\u{1F469} "quoted" @home #1 50% [a] {b}',
      ]) {
        expect(sanitizeRecipeName(input)).toBe(input);
      }
    });

    it('keeps prose words that look like markup keywords', () => {
      expect(sanitizeRecipeName('Objective embedded script')).toBe(
        'Objective embedded script'
      );
    });

    it('strips control and bidi/zero-width characters', () => {
      expect(sanitizeRecipeName('A\u0000B\u202EC\u200BD\uFEFFE')).toBe('ABCDE');
    });

    it('turns newlines and tabs into single spaces', () => {
      expect(sanitizeRecipeName('Line1\nLine2')).toBe('Line1 Line2');
      expect(sanitizeRecipeName('A\tB')).toBe('A B');
    });

    it('collapses whitespace including newlines', () => {
      expect(sanitizeRecipeName('  A \n\t B   C  ')).toBe('A B C');
    });

    it('respects max length of 200 characters', () => {
      const input = 'Recipe '.repeat(100);
      const result = sanitizeRecipeName(input);
      expect(result.length).toBeLessThanOrEqual(203);
      expect(result.endsWith('...')).toBe(true);
    });

    it('does not cut an emoji in half at the cap', () => {
      const result = sanitizeRecipeName(`${'a'.repeat(199)}\u{1F4F7}`);
      expect(result).toBe(`${'a'.repeat(199)}...`);
    });

    it('returns empty string for null', () => {
      const result = sanitizeRecipeName(null);
      expect(result).toBe('');
    });

    it('returns empty string for undefined', () => {
      const result = sanitizeRecipeName(undefined);
      expect(result).toBe('');
    });
  });

  describe('XSS attack vectors', () => {
    const xssVectors = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')">',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<marquee onstart=alert("XSS")>',
      'data:text/html,<script>alert("XSS")</script>',
      '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
    ];

    xssVectors.forEach((vector) => {
      it(`strips tags from XSS vector: ${vector.substring(0, 30)}...`, () => {
        const result = sanitizeText(vector);
        expect(result).not.toMatch(/<[^>]*>/);
      });
    });
  });

  describe('performance', () => {
    it('caps a tag match at 2000 inner characters (ReDoS guard)', () => {
      // The `{0,2000}` bound (rather than `*`) keeps the tag regex linear on
      // runs of "<" with no ">". Pin the bound itself: a tag body of up to
      // 2000 characters is stripped, a longer one is left alone.
      // The first letter after `<` is outside the bounded run.
      expect(sanitizeText(`<${'a'.repeat(2000)}>`)).toBe('');
      expect(sanitizeText(`<${'a'.repeat(2001)}>`)).toBe('');
      expect(sanitizeText(`<${'a'.repeat(2002)}>`)).toHaveLength(2004);
    });

    it('handles many HTML entities efficiently', () => {
      const input = '&lt;&gt;&amp;&quot;&#x27;&#x2F;'.repeat(100);
      const start = Date.now();
      const result = sanitizeText(input);
      const end = Date.now();

      expect(result).toBeTruthy();
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('sanitizeCustomFilm', () => {
    const film: CustomFilmData = {
      brand: 'Ilford<script>x</script>',
      name: 'HP5 <b>Plus</b>',
      isoSpeed: 400,
      colorType: 'bw',
      grainStructure: 'Fine onclick=alert(1)',
      description: 'd'.repeat(600),
    };

    it('sanitizes every text field and keeps the rest', () => {
      expect(sanitizeCustomFilm(film)).toEqual({
        brand: 'Ilfordx',
        name: 'HP5 Plus',
        isoSpeed: 400,
        colorType: 'bw',
        grainStructure: 'Fine onclick=alert(1)',
        description: `${'d'.repeat(500)}...`,
      });
    });

    it('falls back to "Unknown" when brand or name sanitize to nothing', () => {
      const result = sanitizeCustomFilm({
        ...film,
        brand: '<script></script>',
        name: '',
      });
      expect(result?.brand).toBe('Unknown');
      expect(result?.name).toBe('Unknown');
    });

    it('returns undefined for missing input', () => {
      expect(sanitizeCustomFilm(undefined)).toBeUndefined();
      expect(sanitizeCustomFilm(null)).toBeUndefined();
    });
  });

  describe('sanitizeCustomDeveloper', () => {
    const developer: CustomDeveloperData = {
      manufacturer: 'Kodak<script>x</script>',
      name: 'D-76',
      type: 'powder <img src=x>',
      filmOrPaper: 'film',
      workingLifeHours: 24,
      notes: 'Notes javascript:alert(1)',
      mixingInstructions: 'Mix at 50C',
      safetyNotes: 'Gloves',
      dilutions: [
        { name: '<b>Stock</b>', dilution: '1+0' },
        { name: '', dilution: '<script></script>' },
      ],
    };

    it('sanitizes text fields and every dilution', () => {
      expect(sanitizeCustomDeveloper(developer)).toEqual({
        manufacturer: 'Kodakx',
        name: 'D-76',
        type: 'powder',
        filmOrPaper: 'film',
        workingLifeHours: 24,
        notes: 'Notes javascript:alert(1)',
        mixingInstructions: 'Mix at 50C',
        safetyNotes: 'Gloves',
        dilutions: [
          { name: 'Stock', dilution: '1+0' },
          // Empty after sanitizing: dilution fields fall back
          { name: 'Unknown', dilution: '1:1' },
        ],
      });
    });

    it('falls back to "Unknown" for empty manufacturer, name, and type', () => {
      const result = sanitizeCustomDeveloper({
        ...developer,
        manufacturer: '',
        name: '<b></b>',
        type: '',
      });
      expect(result?.manufacturer).toBe('Unknown');
      expect(result?.name).toBe('Unknown');
      expect(result?.type).toBe('Unknown');
    });

    it('returns undefined for missing input', () => {
      expect(sanitizeCustomDeveloper(undefined)).toBeUndefined();
      expect(sanitizeCustomDeveloper(null)).toBeUndefined();
    });
  });

  describe('sanitizeTags', () => {
    it('sanitizes each tag and drops tags left empty', () => {
      expect(
        sanitizeTags([
          '<b>bold</b>',
          'normal',
          '',
          '<script></script>',
          ' pad ',
        ])
      ).toEqual(['bold', 'normal', 'pad']);
    });

    it('truncates tags to 50 characters', () => {
      expect(sanitizeTags(['t'.repeat(60)])).toEqual([`${'t'.repeat(50)}...`]);
    });

    it('returns undefined for missing input', () => {
      expect(sanitizeTags(undefined)).toBeUndefined();
      expect(sanitizeTags(null)).toBeUndefined();
    });
  });
});
