// The two lifecycle actions on a roll, each confirmed with a system alert (the
// film log's pattern for a change of state, as Delete does). Shared by the
// Shoot hub's card and the roll's own screen.
import { Alert } from 'react-native';
import { developedDateText } from '@/components/film-log/developed-date';
import { rollLabel } from '@/lib/film-log-options';
import { markRollDevelopedByHand, markRollShot } from '@/lib/film-log-storage';
import { markDevelopedCopy } from '@/lib/roll-lifecycle';
import type { FilmRoll } from '@/schemas/film-log.schema';

type RollRef = Pick<FilmRoll, 'id' | 'name' | 'filmStockName'>;

/** In camera to Shot. Asks first: it changes which roll the Meter logs to. */
export function confirmMarkShot(roll: RollRef): void {
  Alert.alert(
    'Mark as shot?',
    `${rollLabel(roll)} leaves the camera and waits in To develop. The Meter stops logging to it.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark as shot', onPress: () => markRollShot(roll.id) },
    ]
  );
}

/** Shot to Developed without the timer: records only the date, or keeps the
 * record the roll already has. */
export function confirmMarkDeveloped(
  roll: RollRef & Pick<FilmRoll, 'development'>
): void {
  Alert.alert(
    'Mark as developed?',
    markDevelopedCopy(roll, developedDateText).message,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark as developed',
        onPress: () => markRollDevelopedByHand(roll.id),
      },
    ]
  );
}
