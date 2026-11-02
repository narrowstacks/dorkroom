/** Allow only alphanumeric characters and hyphens (safe for slugs). */
export const sanitizeSlug = (v: string) => v.replace(/[^a-zA-Z0-9-]/g, '');
