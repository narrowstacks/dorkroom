// Test harness for the Home Screen widget layouts (`src/lib/widgets/*-widget.tsx`),
// after `src/lib/timer/live-activity-widget.test.ts`. A widget function runs as
// a STRING in an isolated JavaScriptCore runtime, so a reference to anything
// outside it only fails on a device. This compiles the real file with the
// app's Babel pipeline (the `'widget'` directive becomes a string), evaluates
// that string with ONLY the runtime's own globals reachable, and renders it,
// so a module-scope reference throws here instead.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type TransformCaller, transformFileSync } from '@babel/core';
import type { WidgetEnvironment, WidgetFamily } from 'expo-widgets';

export const MOBILE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

const JS_BUILTINS = [
  ['Math', Math],
  ['Date', Date],
  ['Number', Number],
  ['String', String],
  ['Array', Array],
  ['Object', Object],
] as const;

export interface ModifierStub {
  modifier: string;
  args: Arg[];
}
export interface ElementProps {
  modifiers?: ModifierStub[];
  alignment?: string;
  children?: Node;
  systemName?: string;
  color?: string;
  timerInterval?: { lower: Date; upper: Date };
  date?: Date;
  dateStyle?: string;
  countsDown?: boolean;
}
export interface El {
  type: string;
  props: ElementProps;
}
export type Node = El | string | null | Node[];

type Arg = object | string | number | boolean | null;
type RuntimeGlobal = string | object | ((...args: Arg[]) => object);

// babel-preset-expo reads `platform` and `bundler` off the caller, like Metro sets.
const METRO_CALLER: TransformCaller & { platform: string; bundler: string } = {
  name: 'metro',
  platform: 'ios',
  bundler: 'metro',
};

/** The named export of `file`, compiled to the string the extension stores. */
export function compileWidgetExport(file: string, exportName: string): string {
  const result = transformFileSync(file, {
    cwd: MOBILE_ROOT,
    filename: file,
    caller: METRO_CALLER,
  });
  const code = result?.code;
  if (!code) throw new Error('widget did not compile');
  // The compiled module assigns its exports here; a widget export is a string.
  const exported: { [name: string]: string | undefined } = {};
  new Function('exports', 'require', code)(exported, () => ({}));
  const source = exported[exportName];
  if (!source?.startsWith('function')) {
    throw new Error('the widget directive did not produce a function string');
  }
  return source;
}

/** Evaluates a compiled layout with only the allowed runtime globals in scope. */
export function evaluateWidget<P>(
  source: string,
  components: readonly string[],
  modifiers: readonly string[]
): (props: P, env: WidgetEnvironment) => Node {
  const jsx = (type: string, props: ElementProps): El => ({ type, props });
  const allowed = new Map<string, RuntimeGlobal>([
    ['_jsx', jsx],
    ['_jsxs', jsx],
    ['_jsxDEV', jsx],
    ...components.map((name): [string, RuntimeGlobal] => [name, name]),
    ...modifiers.map((name): [string, RuntimeGlobal] => [
      name,
      (...args: Arg[]) => ({ modifier: name, args }),
    ]),
    ...JS_BUILTINS.map(([name, value]): [string, RuntimeGlobal] => [
      name,
      value,
    ]),
  ]);
  const scope = new Proxy(
    {},
    {
      has: () => true,
      get(_target, key) {
        const found = allowed.get(String(key));
        if (found !== undefined) return found;
        if (key === Symbol.unscopables) return undefined;
        throw new ReferenceError(
          `${String(key)} is not available in the widget runtime`
        );
      },
    }
  );
  const make = new Function('scope', `with (scope) { return (${source}); }`);
  return make(scope);
}

/** Every component and modifier name is exported by the installed @expo/ui. */
export function missingFromExpoUi(
  components: readonly string[],
  modifiers: readonly string[]
): string[] {
  const build = join(
    MOBILE_ROOT,
    '..',
    '..',
    'node_modules/@expo/ui/build/swift-ui'
  );
  const modifiersDir = join(build, 'modifiers');
  const modifierTypes = readdirSync(modifiersDir)
    .filter((f) => f.endsWith('.d.ts'))
    .map((f) => readFileSync(join(modifiersDir, f), 'utf8'))
    .join('\n');
  // An exported declaration, not any mention: a short name such as `tint`
  // must be a modifier the package exports, not a word in a doc comment.
  const declared = (name: string, text: string) =>
    new RegExp(`^export declare (?:const|function) ${name}\\b`, 'm').test(text);
  const missing = modifiers.filter((name) => !declared(name, modifierTypes));
  for (const name of components) {
    const types = readFileSync(join(build, name, 'index.d.ts'), 'utf8');
    if (!declared(name, types)) missing.push(name);
  }
  return missing;
}

export function* walk(node: Node): Generator<El> {
  if (node instanceof Array) {
    for (const child of node) yield* walk(child);
  } else if (node instanceof Object) {
    yield node;
    yield* walk(node.props.children ?? null);
  }
}

export function strings(node: Node): string[] {
  if (node === null) return [];
  if (node instanceof Array) return node.flatMap(strings);
  if (node instanceof Object) return [];
  return [node];
}

export const textOf = (node: Node): string[] =>
  [...walk(node)]
    .filter((el) => el.type === 'Text')
    .flatMap((el) => strings(el.props.children ?? null));

export const modifierNames = (el: El): string[] =>
  (el.props.modifiers ?? []).map((m) => m.modifier);

/** The environment the extension passes, for one family. */
export const envFor = (widgetFamily: WidgetFamily): WidgetEnvironment => ({
  date: new Date(1_800_000_000_000),
  widgetFamily,
  colorScheme: 'dark',
  configuration: undefined,
});

/**
 * Checks shared by every layout: the root carries the container background
 * and exactly one widgetURL (more than one is undefined behaviour in
 * WidgetKit), and every text is one line with a tail ellipsis where it holds
 * words, except the few allowed to wrap.
 */
export function layoutProblems(
  node: Node,
  url: string,
  wrapsAllowed: readonly string[] = []
): string[] {
  const problems: string[] = [];
  const [root] = node instanceof Array ? [] : [...walk(node)];
  if (root === undefined) return ['no root view'];
  const rootMods = modifierNames(root);
  if (!rootMods.includes('containerBackground')) {
    problems.push('root has no containerBackground');
  }
  // An inline accessory is one line of text; every other root fills the
  // widget from its top leading corner rather than centring its content.
  const fill = (root.props.modifiers ?? []).find((m) => m.modifier === 'frame');
  if (
    root.type !== 'Text' &&
    JSON.stringify(fill?.args[0]).indexOf('topLeading') < 0
  ) {
    problems.push('root does not fill the widget from the top leading corner');
  }
  const urls = [...walk(node)].flatMap((el) =>
    (el.props.modifiers ?? []).filter((m) => m.modifier === 'widgetURL')
  );
  if (urls.length !== 1 || urls[0].args[0] !== url) {
    problems.push(`expected one widgetURL ${url}, got ${JSON.stringify(urls)}`);
  }
  for (const el of walk(node)) {
    if (el.type !== 'Text') continue;
    const text = strings(el.props.children ?? null).join('');
    const mods = el.props.modifiers ?? [];
    const limit = mods.find((m) => m.modifier === 'lineLimit')?.args[0];
    const label = text || 'timer';
    if (limit === undefined) problems.push(`no lineLimit: ${label}`);
    else if (limit !== 1 && !wrapsAllowed.includes(text)) {
      problems.push(`wraps: ${label}`);
    }
    if (
      /[A-Za-z]{4,}/.test(text) &&
      !modifierNames(el).includes('truncationMode')
    ) {
      problems.push(`no tail ellipsis: ${label}`);
    }
  }
  return problems;
}
