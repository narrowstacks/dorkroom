import type { z } from 'zod';

/**
 * Wraps a Zod schema so it can be consumed by TanStack Form's `validators` API.
 * Returns TanStack's expected "global form error" shape so the form can map
 * issues back to individual fields.
 */
export const createZodFormValidator = <TSchema extends z.ZodTypeAny>(
  schema: TSchema
) => {
  return ({
    value,
  }: {
    value: z.input<TSchema>;
  }):
    | {
        form?: string;
        fields: Record<string, string[]>;
      }
    | undefined => {
    const parsed = schema.safeParse(value);

    if (parsed.success) {
      return undefined;
    }

    const fieldErrors: Record<string, string[]> = {};
    const formMessages: string[] = [];

    for (const issue of parsed.error.issues) {
      const path = issue.path?.join?.('.') ?? '';
      if (!path) {
        if (issue.message) {
          formMessages.push(issue.message);
        }
        continue;
      }

      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }

      if (issue.message) {
        fieldErrors[path].push(issue.message);
      }
    }

    return {
      form: formMessages.length ? formMessages.join('\n') : undefined,
      fields: fieldErrors,
    };
  };
};
