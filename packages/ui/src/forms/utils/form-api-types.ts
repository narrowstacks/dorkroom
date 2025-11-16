/**
 * Form API types for TanStack React Form integration
 * Provides practical type aliases that avoid exposing the full FormApi generic signature
 */

/**
 * Simplified FieldApi interface for form field components
 * Accepts any FieldApi instance from @tanstack/react-form via structural typing
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
 * Type alias for form instances passed to components
 * Uses 'any' pragmatically to avoid the 11+ required generic parameters
 */
export type FormInstance = any; // FormApi from @tanstack/react-form
