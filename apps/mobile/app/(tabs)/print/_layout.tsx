import { PhaseStack } from '@/components/hub/phase-stack';

// A deep link builds the stack with the hub underneath the tool.
export const unstable_settings = { initialRouteName: 'index' };

export default function PrintLayout() {
  return <PhaseStack phase="print" />;
}
