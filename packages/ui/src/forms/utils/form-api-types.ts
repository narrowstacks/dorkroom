/**
 * Form API types for TanStack React Form integration
 * Uses TanStack's official type patterns to avoid complex generic signatures
 */

import type { ReactFormExtendedApi } from '@tanstack/react-form';

/**
 * FieldApi type for form field render props
 * Generic interface that accepts any FieldApi-like value
 *
 * @remarks
 * This interface matches the structure of TanStack Form's FieldApi while using
 * a single generic parameter for the field value type. This avoids the complexity
 * of specifying 23+ generic parameters while still providing type safety for the
 * field's value and methods.
 *
 * This is structural typing - any object that implements this interface will be
 * accepted, including actual FieldApi instances from TanStack Form.
 *
 * Example usage in component prop types:
 * ```tsx
 * interface MyFieldComponentProps {
 *   field: FieldApi<string>;  // Typed for string values
 * }
 * ```
 */
export interface FieldApi<TValue = unknown> {
  name: string;
  state: {
    value: TValue;
    meta: {
      errors: unknown[];
      isDirty?: boolean;
      isTouched?: boolean;
      isValidating?: boolean;
      errorMap?: Record<string, unknown>;
    };
  };
  handleChange: (value: TValue) => void;
  handleBlur: () => void;
}

/**
 * FormApi type for components that accept the entire form instance
 * This is ReactFormExtendedApi with form data generics inferred at call site
 *
 * @remarks
 * Components using FormInstance should work with any TanStack React Form instance.
 * Type inference from useForm<T> will provide specific behavior while this type
 * accepts any valid form instance.
 *
 * The generic parameters must be specified as `any` to avoid requiring knowledge
 * of all 12 validator/handler function signatures. This is the same pattern used
 * by TanStack Form's AnyFieldApi (which has 23 `any` parameters).
 * See: https://github.com/TanStack/form/blob/main/packages/form-core/src/index.ts
 */
export type FormInstance = ReactFormExtendedApi<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>;
