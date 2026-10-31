import { z } from 'zod';

/**
 * Turns TanStack Form field errors into display text.
 *
 * Field errors are whatever the validator produced: plain strings from
 * custom validators, `Error` instances, or Standard Schema issue objects
 * (`{ message }`, e.g. from zod) and arrays of those. `String(issue)` on an
 * issue object renders "[object Object]", so read the message instead.
 */
const messagesSchema: z.ZodType<string[]> = z.lazy(() =>
  z.union([
    z.string().transform((message) => (message ? [message] : [])),
    z
      .object({ message: z.string() })
      .transform((issue) => (issue.message ? [issue.message] : [])),
    z.array(messagesSchema).transform((nested) => nested.flat()),
    z.unknown().transform((): string[] => []),
  ])
);

export function formatFieldErrors(errors: readonly unknown[]): string {
  return errors.flatMap((error) => messagesSchema.parse(error)).join(', ');
}
