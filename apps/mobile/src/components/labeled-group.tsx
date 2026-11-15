import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { InsetGroup } from '@/components/inset-group';
import { SectionLabel } from '@/components/section-label';

interface LabeledGroupProps {
  title: string;
  /** A note under the group. */
  footer?: string;
  children: ReactNode;
}

/** A grouped list with its section label above and an optional footer note
 * below: the layout of Settings and of the hubs' roll lists. */
export function LabeledGroup({ title, footer, children }: LabeledGroupProps) {
  return (
    <View className="gap-2">
      <SectionLabel>{title}</SectionLabel>
      <InsetGroup>{children}</InsetGroup>
      {footer ? (
        <Text className="px-1 text-xs text-ink-50">{footer}</Text>
      ) : null}
    </View>
  );
}
