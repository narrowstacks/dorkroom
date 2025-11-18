import { useBorderCalculatorController } from './hooks/use-border-calculator-controller';
import {
  MobileBorderLayout,
  DesktopBorderLayout,
} from '../../components/border-calculator';

export default function BorderCalculatorPage() {
  const controller = useBorderCalculatorController();

  if (!controller.isDesktop) {
    return <MobileBorderLayout {...controller} />;
  }

  return <DesktopBorderLayout {...controller} />;
}
