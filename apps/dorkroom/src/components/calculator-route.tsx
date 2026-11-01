import type {
  CalculatorLinkParamMap,
  CalculatorLinkSearch,
} from '@dorkroom/logic';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { type ComponentType, Suspense, useEffect, useState } from 'react';
import { z } from 'zod';
import { LoadingSpinner } from './loading-spinner';

/**
 * Props of a calculator page that opens pre-filled from a link, typed by that
 * link (`CalculatorLinkProps<typeof lensCalculatorLink>`), so a route that
 * hands the page another calculator's params fails to compile. The page reads
 * the values with `link.read(linkSearch ?? {})` and passes them as
 * `overrides` to its persistence.
 */
export interface CalculatorLinkProps<
  L extends { build: (values: never) => object },
> {
  /**
   * The route's link params as the URL carried them when the page mounted
   * (raw strings). A later link to the open route remounts the page with its
   * own.
   */
  linkSearch?: CalculatorLinkSearch<keyof ReturnType<L['build']> & string>;
}

type CalculatorPage<P extends string> = ComponentType<{
  linkSearch?: CalculatorLinkSearch<P>;
}>;

const optionalString = z.string().optional().catch(undefined);

/** The calculator's own params among the URL's search values. */
function pickLinkParams<P extends string>(
  search: CalculatorLinkSearch,
  params: CalculatorLinkParamMap
): CalculatorLinkSearch<P> {
  // SAFETY: only names that are keys of `params` (a P) pass the filter.
  return Object.fromEntries(
    Object.entries(search).filter(([name]) => Object.hasOwn(params, name))
  ) as CalculatorLinkSearch<P>;
}

/**
 * Captures the calculator's link params, strips them from the URL with a
 * replace navigation (keeping any other param, such as border's `?preset=`),
 * and renders the lazy page with them. The page saves them like any edit, so
 * a reload starts from them without re-applying the link.
 *
 * A capture happens on mount and again whenever link params reappear in the
 * URL while the route is mounted (a link to the calculator already open, such
 * as a search answer on its own page): the page remounts, keyed by the
 * capture count, and applies them. The strip only removes params, so it never
 * starts a capture of its own. The router hooks live here, so pages render
 * without a router.
 */
function CalculatorRoute<P extends string>({
  params,
  page: Page,
}: {
  params: CalculatorLinkParamMap;
  page: CalculatorPage<P>;
}) {
  // Search values are flat strings: see parseSearch in routes/search-params.
  const search: CalculatorLinkSearch = useSearch({ strict: false });
  const picked = pickLinkParams<P>(search, params);
  const linked = Object.keys(picked).length > 0;
  const [capture, setCapture] = useState(() => ({
    count: 0,
    linkSearch: picked,
    linked,
  }));
  // Adjusted during render on each change of "the URL carries link params":
  // their arrival is a new capture, their removal (the strip) only noted.
  if (linked !== capture.linked) {
    setCapture(
      linked
        ? { count: capture.count + 1, linkSearch: picked, linked }
        : { ...capture, linked }
    );
  }
  const { linkSearch } = capture;
  const navigate = useNavigate();

  // Once per capture: `linkSearch` changes only with one, `params` is a
  // module constant, `navigate` stable.
  useEffect(() => {
    if (Object.keys(linkSearch).length === 0) return;
    void navigate({
      to: '.',
      replace: true,
      resetScroll: false,
      search: (prev: CalculatorLinkSearch) =>
        Object.fromEntries(
          Object.entries(prev).filter(([name]) => !Object.hasOwn(params, name))
        ),
    });
  }, [linkSearch, params, navigate]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Page key={capture.count} linkSearch={linkSearch} />
    </Suspense>
  );
}

/**
 * The options that make a file route a calculator route, from the
 * calculator's link param map (`*_LINK_PARAMS` in @dorkroom/logic, which has
 * no runtime imports, so the route stays light). `validateSearch` keeps every
 * param an optional string: a catch-all rather than `z.looseObject`, so other
 * params (border's `?preset=`) survive with a string type, not `unknown`.
 *
 * @example
 * ```tsx
 * export const Route = createFileRoute('/lenses')({
 *   ...calculatorRoute(LENS_CALCULATOR_LINK_PARAMS, LensCalculatorPage),
 *   head: () => ({ ... }),
 * });
 * ```
 */
export function calculatorRoute<const M extends CalculatorLinkParamMap>(
  params: M,
  page: CalculatorPage<NoInfer<keyof M & string>>
) {
  // SAFETY: built from the keys of `params`, one optional string per param
  // name; Object.fromEntries widens the keys to string.
  const linkParamFields = Object.fromEntries(
    Object.keys(params).map((name) => [name, optionalString])
  ) as Record<keyof M & string, typeof optionalString>;
  return {
    validateSearch: z.object(linkParamFields).catchall(optionalString),
    component: () => <CalculatorRoute params={params} page={page} />,
  };
}
