/**
 * Form API types for TanStack React Form integration
 * Uses TanStack's official type patterns to avoid complex generic signatures
 */

import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormExtendedApi,
} from '@tanstack/react-form';

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
 * FormInstance type for components that accept a TanStack React Form instance
 *
 * @remarks
 * This is a fully generic type alias for ReactFormExtendedApi that accepts a TFormData shape
 * as the primary type parameter. The remaining 11 validator/event handler generics default to
 * permissive unions that accept any compatible type.
 *
 * This pattern is officially recommended by TanStack Form. Similar to their AnyFieldApi type
 * which defaults all 23 generics to `any`, we use permissive defaults here to allow components
 * to accept form instances without needing to specify all generic parameters.
 *
 * When a component accepts `form: FormInstance<{ name: string }>`, it can receive any form
 * instance with that shape, regardless of what validators were passed to useForm. This avoids
 * requiring knowledge of validator signatures at the component prop level.
 *
 * Reference: https://github.com/TanStack/form/blob/main/docs/reference/type-aliases/anyfieldapi.md
 *
 * Example usage:
 * ```tsx
 * interface MyFormProps {
 *   form: FormInstance<{ name: string; email: string }>;
 * }
 *
 * export function MyForm({ form }: MyFormProps) {
 *   // Works with any form instance with that data shape
 *   // regardless of validators
 * }
 * ```
 *
 * @template TFormData - The shape of the form's data
 * @template TOnMount - Mount validator (defaults to any compatible type)
 * @template TOnChange - Change validator (defaults to any compatible type)
 * @template TOnChangeAsync - Async change validator (defaults to any compatible type)
 * @template TOnBlur - Blur validator (defaults to any compatible type)
 * @template TOnBlurAsync - Async blur validator (defaults to any compatible type)
 * @template TOnSubmit - Submit validator (defaults to any compatible type)
 * @template TOnSubmitAsync - Async submit validator (defaults to any compatible type)
 * @template TOnDynamic - Dynamic validator (defaults to any compatible type)
 * @template TOnDynamicAsync - Async dynamic validator (defaults to any compatible type)
 * @template TOnServer - Server validator (defaults to any compatible type)
 * @template TSubmitMeta - Submit metadata type (defaults to any compatible type)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type FormInstance<
  TFormData = any,
  TOnMount extends undefined | FormValidateOrFn<TFormData> = any,
  TOnChange extends undefined | FormValidateOrFn<TFormData> = any,
  TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData> = any,
  TOnBlur extends undefined | FormValidateOrFn<TFormData> = any,
  TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData> = any,
  TOnSubmit extends undefined | FormValidateOrFn<TFormData> = any,
  TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData> = any,
  TOnDynamic extends undefined | FormValidateOrFn<TFormData> = any,
  TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData> = any,
  TOnServer extends undefined | FormAsyncValidateOrFn<TFormData> = any,
  TSubmitMeta = any,
> = ReactFormExtendedApi<
  TFormData,
  TOnMount,
  TOnChange,
  TOnChangeAsync,
  TOnBlur,
  TOnBlurAsync,
  TOnSubmit,
  TOnSubmitAsync,
  TOnDynamic,
  TOnDynamicAsync,
  TOnServer,
  TSubmitMeta
>;
/* eslint-enable @typescript-eslint/no-explicit-any */
