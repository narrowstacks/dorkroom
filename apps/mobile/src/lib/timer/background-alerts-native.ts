// The app's one `BackgroundAlerts`: the pure owner of the background alert
// schedule wired to expo-notifications and the real app state.
import { AppState } from 'react-native';
import { createBackgroundAlerts } from './background-alerts';
import { cancelCueAlerts, scheduleCueAlerts } from './timer-alerts';

export const backgroundAlerts = createBackgroundAlerts({
  schedule: scheduleCueAlerts,
  cancel: cancelCueAlerts,
  isActive: () => AppState.currentState === 'active',
});
