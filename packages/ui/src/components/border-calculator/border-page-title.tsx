import {
  getRouteAccent,
  getRouteIcon,
  ROUTE_DESCRIPTIONS,
} from '../../lib/navigation';
import { PageTitleBar } from '../calculator/page-title-bar';

// Border calculator carries the Printing category's indigo accent (plan 007).
const BorderIcon = getRouteIcon('/border');

interface BorderPageTitleProps {
  className?: string;
}

/**
 * The Border Calculator's `h1`, fused into the preview card of whichever
 * layout is showing (desktop and mobile alike). Reset and Share keep their
 * existing homes in each layout, so the bar carries no actions.
 */
export function BorderPageTitle({ className }: BorderPageTitleProps) {
  return (
    <PageTitleBar
      title="Border Calculator"
      icon={BorderIcon}
      accentTone={getRouteAccent('/border')}
      description={ROUTE_DESCRIPTIONS['/border']}
      className={className}
    />
  );
}
