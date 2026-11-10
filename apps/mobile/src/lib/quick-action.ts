import { router } from 'expo-router';
import { toHref } from '@/lib/href';
import { createQuickActionRouter } from '@/lib/quick-action-route';

// Module scope: the hook re-subscribes whenever the callback changes.
export const routeQuickAction = createQuickActionRouter((path, options) =>
  router.navigate(toHref(path), options)
);
