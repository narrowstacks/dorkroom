import { matCalculatorLink, useMatCalculator } from '@dorkroom/logic';
import { buildMatWarnings } from '@/components/mat/format';
import {
  MatCollapsedControls,
  MatExpandedControls,
} from '@/components/mat/mat-controls';
import { MatDrawing } from '@/components/mat/mat-drawing';
import { StageScreen } from '@/components/stage/stage-screen';
import { useLinkOverrides } from '@/hooks/use-link-overrides';

interface MatScreenBodyProps {
  /** Values the screen was opened with (a Home answer or a deep link). */
  overrides?: ReturnType<typeof matCalculatorLink.read>;
}

function MatScreenBody({ overrides }: MatScreenBodyProps) {
  const calc = useMatCalculator({ overrides });
  const warnings = buildMatWarnings(calc);

  return (
    <StageScreen
      collapsed={<MatCollapsedControls calc={calc} />}
      expanded={<MatExpandedControls calc={calc} warnings={warnings} />}
    >
      {(stage) => (
        <MatDrawing
          stage={stage}
          warning={warnings[0]}
          valid={calc.valid}
          revealMode={calc.revealMode}
          ow={calc.ow}
          oh={calc.oh}
          bt={calc.bt}
          bb={calc.bb}
          bl={calc.bl}
          br={calc.br}
          aw={calc.aw}
          ah={calc.ah}
          windowW={calc.windowW}
          windowH={calc.windowH}
          fmt={calc.fmt}
          set={calc.set}
        />
      )}
    </StageScreen>
  );
}

export function MatScreen() {
  const { overrides, prefillId } = useLinkOverrides(matCalculatorLink);
  // Re-mounts on a new link: the shared hooks apply overrides on mount only.
  return <MatScreenBody key={prefillId} overrides={overrides} />;
}
