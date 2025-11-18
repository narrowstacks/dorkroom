import { useBorderCalculatorController } from './hooks/use-border-calculator-controller';
import { MobileBorderLayout, DesktopBorderLayout } from '@dorkroom/ui';

export default function BorderCalculatorPage() {
  const controller = useBorderCalculatorController();

  if (!controller.isDesktop) {
    return <MobileBorderLayout {...controller} />;
  }

  return <DesktopBorderLayout {...controller} />;
}
