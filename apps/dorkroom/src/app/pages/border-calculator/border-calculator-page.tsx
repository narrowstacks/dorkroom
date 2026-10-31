import { borderCalculatorLink } from '@dorkroom/logic';
import {
  BorderCalculatorProvider,
  getEaselBladeReadings,
  MobileBorderLayout,
  ResponsiveBorderLayout,
} from '@dorkroom/ui/border-calculator';
import { ResultAnnouncer, spokenLength } from '@dorkroom/ui/calculator';
import type { CalculatorLinkProps } from '../../../components/calculator-route';
import { useCalculatorAnalytics } from '../../lib/analytics/use-calculator-analytics';
import { useBorderCalculatorController } from './hooks/use-border-calculator-controller';

export default function BorderCalculatorPage({
  linkSearch,
}: CalculatorLinkProps<typeof borderCalculatorLink>) {
  const linkOverrides = borderCalculatorLink.read(linkSearch ?? {});
  const { isDesktop, ...contextValue } =
    useBorderCalculatorController(linkOverrides);

  // The offsets toggle is the calculator's mode: with it off every border is
  // the same width, with it on the print is deliberately shifted on the paper.
  // Reading it here rather than defaulting to `default` is the whole reason
  // `symmetric`/`asymmetric` exist in the mode union.
  useCalculatorAnalytics({
    tool: 'border',
    mode: contextValue.formValues.enableOffset ? 'asymmetric' : 'symmetric',
  });

  const { calculation, formatWithUnit } = contextValue;
  const blades = calculation ? getEaselBladeReadings(calculation) : null;
  const spokenBlade = (inches: number) => spokenLength(formatWithUnit(inches));

  return (
    <BorderCalculatorProvider value={contextValue}>
      {/* Mounted once, outside the layout switch, so only one live region
          exists whichever layout is showing. Readings are in easel terms, as
          the desktop "Blade Readings" card labels them; the preview overlay
          (both layouts) places unlabelled numbers by image side instead. */}
      <ResultAnnouncer
        message={
          blades
            ? `Blade readings left ${spokenBlade(blades.left)}, right ${spokenBlade(blades.right)}, top ${spokenBlade(blades.top)}, bottom ${spokenBlade(blades.bottom)}`
            : ''
        }
      />
      {isDesktop ? <ResponsiveBorderLayout /> : <MobileBorderLayout />}
    </BorderCalculatorProvider>
  );
}
