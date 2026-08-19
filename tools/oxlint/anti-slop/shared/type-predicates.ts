import type { ESTree } from "@oxlint/plugins";

type RuntimeFunction = ESTree.ArrowFunctionExpression | ESTree.Function;

/** Any function-like node that can carry a `value is T` return annotation. */
interface PredicateOwner {
  returnType?: ESTree.TSTypeAnnotation | null | undefined;
}

function isRuntimeFunction(node: ESTree.Node): node is RuntimeFunction {
  return (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression"
  );
}

/**
 * True when this node's own return annotation is a `value is T` predicate. A
 * type guard is the parse step these rules ask for, so its input is legitimately
 * unshaped: narrowing is the whole contract, not a discarded one.
 */
export function returnsTypePredicate(node: PredicateOwner): boolean {
  return node.returnType?.typeAnnotation.type === "TSTypePredicate";
}

/** True when the nearest enclosing function is a type guard. */
export function isInsideTypeGuard(node: ESTree.Node): boolean {
  let current: ESTree.Node | null = node.parent;
  while (current !== null && current.type !== "Program") {
    if (isRuntimeFunction(current)) {
      return returnsTypePredicate(current);
    }
    current = current.parent;
  }
  return false;
}

/** Reads the shared `allowInTypeGuards` rule option without widening it. */
export function allowsTypeGuards(options: readonly unknown[] | undefined): boolean {
  const option = options?.[0];
  return (
    typeof option === "object" &&
    option !== null &&
    !Array.isArray(option) &&
    "allowInTypeGuards" in option &&
    option.allowInTypeGuards === true
  );
}
