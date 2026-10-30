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

    it('removes javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeText(input);
      expect(result).not.toContain('javascript:');
    });

    it('removes event handlers', () => {
      // Tagless, so the tag regex can't strip them first: only the
      // event-handler regex removes these.
      expect(sanitizeText('foo onclick=bar')).toBe('foo bar');
      expect(sanitizeText('" onmouseover=alert(1) x="')).toBe('" alert(1) x="');
      expect(sanitizeText('x ONERROR = y')).toBe('x  y');
    });

    it('removes data:text/html protocol', () => {
      const input = 'data:text/html,<script>alert("xss")</script>';
      const result = sanitizeText(input);
      expect(result).not.toContain('data:text/html');
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
        '<script>alert("xss")</script><img src=x onerror=alert("xss")>javascript:alert("xss")';
      const result = sanitizeText(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<img');
      expect(result).not.toContain('onerror=');
      expect(result).not.toContain('javascript:');
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

    it('handles case-insensitive attack vectors', () => {
      const input = 'JaVaScRiPt:alert("xss")';
      const result = sanitizeText(input);
      expect(result.toLowerCase()).not.toContain('javascript:');
    });

    it('handles numeric character references', () => {
      // Entities are not decoded (React escapes on render); the bare word
      // "script" between them is still stripped.
      const input = '&#60;script&#62;alert(&#34;xss&#34;)&#60;/script&#62;';
      expect(sanitizeText(input)).toBe(
        '&#60;&#62;alert(&#34;xss&#34;)&#60;/&#62;'
      );
    });

    it('repeats removals until a spliced token cannot reappear', () => {
      // One pass turns "scr[script]ipt" into "script"; the fixpoint loop
      // removes that too.
      expect(sanitizeText('scrscriptipt')).toBe('');
      expect(sanitizeText('jajavascript:vascript:alert(1)')).toBe(
        'java:alert(1)'
      );
      expect(sanitizeText('<scr<script>ipt>alert(1)')).toBe('ipt>alert(1)');
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

    it('removes special characters not in whitelist', () => {
      const input = 'Recipe@#$%^*+=[]{}|;:<>?/\\';
      const result = sanitizeRecipeName(input);
      expect(result).not.toContain('@');
      expect(result).not.toContain('#');
      expect(result).not.toContain('$');
      expect(result).not.toContain('%');
      expect(result).not.toContain('^');
      expect(result).not.toContain('*');
      expect(result).not.toContain('+');
      expect(result).not.toContain('=');
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
    });

    it('respects max length of 200 characters', () => {
      const input = 'Recipe '.repeat(100); // Much longer than 200
      const result = sanitizeRecipeName(input);
      expect(result.length).toBeLessThanOrEqual(203); // 200 + '...'
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
      it(`sanitizes XSS vector: ${vector.substring(0, 30)}...`, () => {
        const result = sanitizeText(vector);
        // Check that dangerous tags and protocols are removed
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('<img');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
        expect(result).not.toContain('onfocus');
        expect(result).not.toContain('onstart');
        // javascript: protocol should be removed
        const hasJSProtocol = result.includes('javascript:');
        expect(hasJSProtocol).toBe(false);
      });
    });
  });

  describe('performance', () => {
    it('stays linear on unclosed "<" runs (ReDoS guard)', () => {
      // The `{0,2000}` bound in the tag regex exists for this input: an
      // unbounded `[^>]*` backtracks quadratically on a run of "<" with no
      // ">". Compare two sizes rather than a wall-clock budget, so the check
      // holds on slow machines: doubling the input should roughly double the
      // time (linear), not quadruple it (quadratic).
      const time = (length: number) => {
        const input = '<'.repeat(length);
        const start = performance.now();
        const result = sanitizeText(input, length);
        const elapsed = performance.now() - start;
        expect(result).toBe(input);
        return elapsed;
      };

      time(4000); // warm up the regex engine
      const small = time(20000);
      const large = time(40000);

      expect(large / small).toBeLessThan(3);
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
        grainStructure: 'Fine alert(1)',
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
        notes: 'Notes alert(1)',
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
