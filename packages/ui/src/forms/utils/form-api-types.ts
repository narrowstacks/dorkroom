/**
 * Form API types for TanStack React Form integration
 * Uses TanStack's official type patterns to avoid complex generic signatures
 */

import type {
  AnyFormApi,
  FormApi,
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormApi,
} from '@tanstack/react-form';

/**
 * The React-augmented form API for a fully-specified set of generics.
 *
 * This mirrors TanStack's own `ReactFormExtendedApi` (`FormApi & ReactFormApi`)
 * but is declared locally so {@link FormInstance} can compose it conditionally.
 */
type ReactFormApiFor<
  TFormData,
  TOnMount extends undefined | FormValidateOrFn<TFormData>,
  TOnChange extends undefined | FormValidateOrFn<TFormData>,
  TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnBlur extends undefined | FormValidateOrFn<TFormData>,
  TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
  TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
  TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
  TSubmitMeta,
> = FormApi<
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
> &
  ReactFormApi<
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

/**
 * The fully-permissive React form API.
 *
 * @remarks
 * TanStack's exported {@link AnyFormApi} is `FormApi<any, ...>` - the `any`s live
 * in TanStack's declaration, not ours. We re-derive those loose validator generics
 * with `infer` and re-attach the React-only members (`Field`, `Subscribe`) so the
 * result accepts a form of *any* data shape while still exposing the React API.
 * This is what a bare `FormInstance` (no explicit `TFormData`) resolves to.
 */
type AnyReactFormApi =
  AnyFormApi extends FormApi<
    infer TFormData,
    infer TOnMount,
    infer TOnChange,
    infer TOnChangeAsync,
    infer TOnBlur,
    infer TOnBlurAsync,
    infer TOnSubmit,
    infer TOnSubmitAsync,
    infer TOnDynamic,
    infer TOnDynamicAsync,
    infer TOnServer,
    infer TSubmitMeta
  >
    ? ReactFormApiFor<
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
      >
    : never;

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
 * This is a fully generic type alias for TanStack's React form API
 * (`FormApi & ReactFormApi`) that accepts a `TFormData` shape as the primary type
 * parameter. The remaining 11 validator/event-handler generics default to the
 * permissive `undefined | FormValidateOrFn<TFormData>` (or async) constraint union,
 * so callers never need to specify them.
 *
 * This mirrors the intent of TanStack Form's own `AnyFieldApi`/`AnyFormApi` helpers
 * (which default their generics to `any`) without using `any` ourselves: a bare
 * `FormInstance` resolves to {@link AnyReactFormApi}, and a typed
 * `FormInstance<TFormData>` keeps the data shape precise while leaving the validator
 * generics bivariant so any concrete form is assignable.
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
 * @template TFormData - The shape of the form's data (defaults to `unknown` → any form)
 * @template TOnMount - Mount validator (defaults to the permissive constraint union)
 * @template TOnChange - Change validator (defaults to the permissive constraint union)
 * @template TOnChangeAsync - Async change validator (defaults to the permissive constraint union)
 * @template TOnBlur - Blur validator (defaults to the permissive constraint union)
 * @template TOnBlurAsync - Async blur validator (defaults to the permissive constraint union)
 * @template TOnSubmit - Submit validator (defaults to the permissive constraint union)
 * @template TOnSubmitAsync - Async submit validator (defaults to the permissive constraint union)
 * @template TOnDynamic - Dynamic validator (defaults to the permissive constraint union)
 * @template TOnDynamicAsync - Async dynamic validator (defaults to the permissive constraint union)
 * @template TOnServer - Server validator (defaults to the permissive constraint union)
 * @template TSubmitMeta - Submit metadata type (defaults to `unknown`)
 */
export type FormInstance<
  TFormData = unknown,
  TOnMount extends undefined | FormValidateOrFn<TFormData> =
    | undefined
    | FormValidateOrFn<TFormData>,
  TOnChange extends undefined | FormValidateOrFn<TFormData> =
    | undefined
    | FormValidateOrFn<TFormData>,
  TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData> =
    | undefined
    | FormAsyncValidateOrFn<TFormData>,
  TOnBlur extends undefined | FormValidateOrFn<TFormData> =
    | undefined
    | FormValidateOrFn<TFormData>,
  TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData> =
    | undefined
    | FormAsyncValidateOrFn<TFormData>,
  TOnSubmit extends undefined | FormValidateOrFn<TFormData> =
    | undefined
    | FormValidateOrFn<TFormData>,
  TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData> =
    | undefined
    | FormAsyncValidateOrFn<TFormData>,
  TOnDynamic extends undefined | FormValidateOrFn<TFormData> =
    | undefined
    | FormValidateOrFn<TFormData>,
  TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData> =
    | undefined
    | FormAsyncValidateOrFn<TFormData>,
  TOnServer extends undefined | FormAsyncValidateOrFn<TFormData> =
    | undefined
    | FormAsyncValidateOrFn<TFormData>,
  TSubmitMeta = unknown,
> = unknown extends TFormData
  ? // Bare usage (`FormInstance` with no explicit data shape): accept any form,
    // mirroring TanStack's own `AnyFormApi` but with the React API attached.
    AnyReactFormApi
  : // Typed usage (`FormInstance<MyData>`): keep `TFormData`/`TSubmitMeta` precise
    // while leaving the validator generics bivariant (intersecting the caller's
    // generic with the loose validator type that TanStack's `AnyFormApi` carries),
    // so a concrete form is assignable regardless of which validators it declared.
    AnyFormApi extends FormApi<
        infer _TFormData,
        infer TLooseOnMount,
        infer TLooseOnChange,
        infer TLooseOnChangeAsync,
        infer TLooseOnBlur,
        infer TLooseOnBlurAsync,
        infer TLooseOnSubmit,
        infer TLooseOnSubmitAsync,
        infer TLooseOnDynamic,
        infer TLooseOnDynamicAsync,
        infer TLooseOnServer,
        infer _TSubmitMeta
      >
    ? ReactFormApiFor<
        TFormData,
        TOnMount & TLooseOnMount,
        TOnChange & TLooseOnChange,
        TOnChangeAsync & TLooseOnChangeAsync,
        TOnBlur & TLooseOnBlur,
        TOnBlurAsync & TLooseOnBlurAsync,
        TOnSubmit & TLooseOnSubmit,
        TOnSubmitAsync & TLooseOnSubmitAsync,
        TOnDynamic & TLooseOnDynamic,
        TOnDynamicAsync & TLooseOnDynamicAsync,
        TOnServer & TLooseOnServer,
        TSubmitMeta
      >
    : never;
