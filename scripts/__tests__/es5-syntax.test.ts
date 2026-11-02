import { describe, expect, it } from 'vitest';
import {
  classicInlineScripts,
  es5SyntaxProblem,
} from '../../apps/dorkroom/es5-syntax';

describe('es5SyntaxProblem', () => {
  it('accepts ES5', () => {
    expect(es5SyntaxProblem('var a = function () { return "x"; };')).toBe(
      undefined
    );
  });

  it.each(['var a = () => 1;', 'var a = `x`;', 'let a = 1;'])(
    'rejects %s',
    (code) => {
      expect(es5SyntaxProblem(code)).toBeTypeOf('string');
    }
  );
});

describe('classicInlineScripts', () => {
  it('returns classic inline scripts and skips module, external and empty ones', () => {
    const html = [
      '<script type="module">import "a";</script>',
      '<script type=module>import "b";</script>',
      '<script nomodule>var a = 1;</script>',
      '<script nomodule src="/x.js"></script>',
      '<script>var b = 2;</script>',
    ].join('\n');
    expect(classicInlineScripts(html)).toEqual(['var a = 1;', 'var b = 2;']);
  });

  it('ends a script at end tags with whitespace or in upper case', () => {
    const html =
      '<script>var a = 1;</script >' +
      '<SCRIPT>var b = 2;</SCRIPT>' +
      '<script>var c = 3;</script\n>' +
      '<p>var d = () => 4;</p>';
    expect(classicInlineScripts(html)).toEqual([
      'var a = 1;',
      'var b = 2;',
      'var c = 3;',
    ]);
  });
});
