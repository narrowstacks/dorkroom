/**
 * Simplified FieldApi interface for form components
 * This is a structural type that describes the minimal interface needed
 * to support our form field components. It accepts any FieldApi instance
 * from @tanstack/react-form regardless of its full generic signature.
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
