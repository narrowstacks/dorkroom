import { resolveIncomingLink } from '@/lib/deep-link';

// Rewrites incoming external URLs so they land on a route that exists now.
// expo-router passes the FULL URL here (`dorkroom://meter`), not a path, and
// only strips the scheme afterwards. App Intents open `dorkroom://meter` and
// old links use `/more/<tool>`, from before the Shoot / Develop / Print tabs.
// See `src/lib/deep-link.ts` for the pure resolver. Quick actions skip this hook; `src/lib/quick-action.ts`
// resolves them.
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    return resolveIncomingLink(path);
  } catch {
    // Never break inbound links on a resolver bug.
    return path;
  }
}
