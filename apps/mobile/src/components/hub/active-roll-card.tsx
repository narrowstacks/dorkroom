import { router } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/components/button';
import { confirmMarkShot } from '@/components/film-log/confirm-roll-status';
import { HubRollRow } from '@/components/hub/hub-roll-row';
import { InsetGroup } from '@/components/inset-group';
import { useMeterRoll } from '@/hooks/use-meter-roll';
import {
  rollLabel,
  rollStatusLabel,
  rollSubtitle,
  spokenText,
} from '@/lib/film-log-options';
import { toHref } from '@/lib/href';

/**
 * The roll in the camera, at the top of Shoot: the one the Meter logs to
 * (`useMeterRoll`), so both agree. One flat group of two rows: the roll (opens
 * it, with the In camera pill) and "Mark as shot". They are sibling buttons,
 * never nested, so each has its own target and spoken label. Renders nothing
 * without a roll; the hub's empty state offers New roll then.
 */
export function ActiveRollCard() {
  const { roll } = useMeterRoll();
  if (!roll) return null;
  const title = rollLabel(roll);
  const subtitle = rollSubtitle(roll);
  return (
    <InsetGroup>
      <HubRollRow
        key="roll"
        title={title}
        detail={subtitle}
        status={{ label: rollStatusLabel('active'), tinted: true }}
        onPress={() => router.push(toHref(`/shoot/film-log/roll/${roll.id}`))}
        accessibilityLabel={`In camera, ${title}, ${spokenText(subtitle)}. Open roll`}
      />
      <View key="mark" className="items-start">
        <Button
          variant="plain"
          className="self-start"
          label="Mark as shot"
          onPress={() => confirmMarkShot(roll)}
          accessibilityLabel={`Mark ${title} as shot`}
          accessibilityHint="Moves the roll to To develop. Asks first."
        />
      </View>
    </InsetGroup>
  );
}
