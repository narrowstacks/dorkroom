import { router } from 'expo-router';
import { toHref } from '@/lib/href';
import { handOffWarmLink } from '@/lib/link-handoff';
import { createQuickActionRouter } from '@/lib/quick-action-route';

// Module scope: the hook re-subscribes whenever the callback changes.
export const routeQuickAction = createQuickActionRouter((path, options) => {
  // A phase that is not on screen opens its hub first and `useLinkHandoff`
  // opens the tool on top; otherwise navigate straight to the tool.
  router.navigate(toHref(handOffWarmLink(path) ?? path), options);
});
