/**
 * ES5 syntax checks for the legacy (`nomodule`) build (issue #49), shared by
 * the build's `legacy-es5` plugin (apps/dorkroom/vite.config.ts) and
 * `verify-legacy-build.ts`.
 */
import { parse } from 'acorn';

/** Why `code` does not parse as an ES5 script, as an ES5-only browser would
 *  parse it, or `undefined` when it does. */
export function es5SyntaxProblem(code: string): string | undefined {
  try {
    parse(code, { ecmaVersion: 5, sourceType: 'script' });
    return undefined;
  } catch (cause) {
    return cause instanceof Error ? cause.message : String(cause);
  }
}

/** Bodies of the non-empty inline `<script>` tags in `html` that are not
 *  `type="module"`: the ones an ES5-only browser parses. Tag names match in
 *  any case, and end tags may carry whitespace or junk (`</script >`), as
 *  browsers accept them. */
export function classicInlineScripts(html: string): string[] {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)]
    .filter(([, attrs]) => !/\btype\s*=\s*["']?module\b/i.test(attrs))
    .map(([, , body]) => body)
    .filter((body) => body.trim() !== '');
}
