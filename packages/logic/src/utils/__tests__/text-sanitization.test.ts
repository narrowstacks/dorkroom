import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeRecipeName,
  sanitizeRecipeNotes,
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
      const input = '<img src=x onerror=alert("xss")>';
      const result = sanitizeText(input);
      expect(result).not.toContain('onerror=');
      expect(result).not.toContain('onclick=');
    });

    it('removes data:text/html protocol', () => {
      const input = 'data:text/html,<script>alert("xss")</script>';
      const result = sanitizeText(input);
      expect(result).not.toContain('data:text/html');
    });

    it('escapes special characters', () => {
      const input = 'Test & <test> "quote" \'apostrophe\' /slash/';
      const result = sanitizeText(input);
      expect(result).toContain('&amp;');
      // After removing tags and escaping, we only escape remaining special chars
      expect(result).toContain('&quot;');
      expect(result).toContain('&#x27;');
      expect(result).toContain('&#x2F;');
    });

    it('decodes HTML entities before re-escaping', () => {
      const input = '&lt;p&gt;Test&lt;/p&gt;';
      const result = sanitizeText(input);
      // Should decode then re-escape
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
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
      const result = sanitizeText(input);
      expect(result).toContain('This is a normal sentence');
      // Note: punctuation will be escaped
      expect(result).toMatch(/sentence/);
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
      const input = '&#60;script&#62;alert(&#34;xss&#34;)&#60;/script&#62;';
      const result = sanitizeText(input);
      // After HTML entity decoding and sanitization, script tags are removed
      // but the text content is escaped
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
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
      const result = sanitizeRecipeName(input);
      expect(result).toContain('Recipe');
      expect(result).toContain('Test');
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

  describe('sanitizeRecipeNotes', () => {
    it('sanitizes recipe notes with general rules', () => {
      const input = 'These are notes <script>alert("xss")</script>';
      const result = sanitizeRecipeNotes(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('These are notes');
    });

    it('respects max length of 2000 characters', () => {
      const input = 'a'.repeat(3000);
      const result = sanitizeRecipeNotes(input);
      expect(result.length).toBeLessThanOrEqual(2003); // 2000 + '...'
      expect(result).toContain('...');
    });

    it('allows more characters than recipe name', () => {
      const input = 'Notes with @#$ special !@# characters %^&';
      const result = sanitizeRecipeNotes(input);
      // Should escape special chars but not remove them like recipe name does
      expect(result).toContain('Notes');
      expect(result).toContain('special');
      expect(result).toContain('characters');
    });

    it('handles multiline notes', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const result = sanitizeRecipeNotes(input);
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      expect(result).toContain('Line 3');
    });

    it('removes XSS attempts in notes', () => {
      const input =
        'Notes about development.\n<img src=x onerror=alert("xss")>\nMore notes.';
      const result = sanitizeRecipeNotes(input);
      expect(result).not.toContain('<img');
      expect(result).not.toContain('onerror=');
      expect(result).toContain('Notes about development');
      expect(result).toContain('More notes');
    });

    it('returns empty string for null', () => {
      const result = sanitizeRecipeNotes(null);
      expect(result).toBe('');
    });

    it('returns empty string for undefined', () => {
      const result = sanitizeRecipeNotes(undefined);
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
    it('handles very long strings efficiently', () => {
      const input = 'a'.repeat(10000);
      const start = Date.now();
      const result = sanitizeText(input, 10000);
      const end = Date.now();

      expect(result).toBeTruthy();
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
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
});
