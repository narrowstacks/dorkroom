interface StackRoute {
  key: string;
  name: string;
}

/**
 * `headerBackTitle` for a screen that can be opened from a screen with a long,
 * dynamic title (a recipe's film name, a roll's name). iOS shows a bare chevron
 * when that title doesn't fit, so when the screen below this one is
 * `previousName`, give the back button `title` instead; otherwise leave the
 * default (the previous screen's own title).
 */
export function backTitleAfter(
  stack: { routes: readonly StackRoute[] },
  routeKey: string,
  previousName: string,
  title: string
): string | undefined {
  const index = stack.routes.findIndex((route) => route.key === routeKey);
  return index > 0 && stack.routes[index - 1]?.name === previousName
    ? title
    : undefined;
}
