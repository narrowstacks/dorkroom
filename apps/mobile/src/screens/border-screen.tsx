import {
  borderCalculatorLink,
  useStandaloneBorderCalculator,
} from '@dorkroom/logic';
import {
  BorderCollapsedControls,
  BorderExpandedControls,
} from '@/components/border/border-controls';
import { layoutInputOf } from '@/components/border/border-drag';
import { BorderDrawing } from '@/components/border/border-drawing';
import { StageScreen } from '@/components/stage/stage-screen';
import { useLinkOverrides } from '@/hooks/use-link-overrides';
import { useMeasurementUnit } from '@/hooks/use-measurement-unit';

interface BorderScreenBodyProps {
  /** Values the screen was opened with (a Home answer or a deep link). */
  overrides?: ReturnType<typeof borderCalculatorLink.read>;
}

function BorderScreenBody({ overrides }: BorderScreenBodyProps) {
  const [unit] = useMeasurementUnit();
  const calc = useStandaloneBorderCalculator(unit, { overrides });
  const { calculation } = calc;

  // Paper is named by its trade size ("8×10"), matching the picker pills, in
  // either unit; only measured lengths are converted.
  const paperLabel = `${calculation.paperWidth}×${calculation.paperHeight}`;
  const warnings = [
    calc.bladeWarning,
    calc.minBorderWarning,
    calc.paperSizeWarning,
    calc.offsetWarning,
  ].filter((w): w is string => Boolean(w));

  return (
    <StageScreen
      collapsed={<BorderCollapsedControls calc={calc} unit={unit} />}
      expanded={
        <BorderExpandedControls calc={calc} unit={unit} warnings={warnings} />
      }
    >
      {(stage) => (
        <BorderDrawing
          stage={stage}
          calculation={calculation}
          paperLabel={paperLabel}
          unit={unit}
          showBlades={calc.showBlades}
          showBladeReadings={calc.showBladeReadings}
          layout={layoutInputOf(calc)}
          warning={warnings[0]}
          onMinBorder={calc.setMinBorderSlider}
          onOffsets={(h, v) => {
            calc.setHorizontalOffsetSlider(h);
            calc.setVerticalOffsetSlider(v);
          }}
        />
      )}
    </StageScreen>
  );
}

export function BorderScreen() {
  const { overrides, prefillId } = useLinkOverrides(borderCalculatorLink);
  // Re-mounts on a new link: the shared hooks apply overrides on mount only.
  return <BorderScreenBody key={prefillId} overrides={overrides} />;
}
