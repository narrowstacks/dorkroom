import type { ComponentType } from 'react';
import type { ScreenToolId } from '@/lib/tools';
import { BorderScreen } from '@/screens/border-screen';
import { CameraExposureScreen } from '@/screens/camera-exposure-screen';
import { ExposureScreen } from '@/screens/exposure-screen';
import { LensScreen } from '@/screens/lens-screen';
import { MatScreen } from '@/screens/mat-screen';
import { MeterScreen } from '@/screens/meter-screen';
import { ReciprocityScreen } from '@/screens/reciprocity-screen';
import { ResizeScreen } from '@/screens/resize-screen';
import { SettingsScreen } from '@/screens/settings-screen';

export interface ToolScreen {
  /** Rendered by the pinned tab's route file and by `/more/<id>`. */
  screen: ComponentType;
  /** Tab bar icon asset (from `scripts/generate-tab-icons.mjs`). */
  tabIcon: number;
}

// The native half of the tool manifest in `tools.ts`. It lives apart because
// screens and image assets can't load under vitest, and `tools.ts` stays pure
// so the deep-link resolver and its tests can import it. `satisfies` makes a
// missing or extra id a compile error, so the tab bar and the More detail
// route can't drift from `TOOLS`. Metro resolves assets only from literal
// `require()` calls, so keep one per entry; `tool-manifest.test.ts` checks
// each points at `tab-icons/<id>.png`.
export const TOOL_SCREENS = {
  border: {
    screen: BorderScreen,
    tabIcon: require('../../assets/tab-icons/border.png'),
  },
  resize: {
    screen: ResizeScreen,
    tabIcon: require('../../assets/tab-icons/resize.png'),
  },
  exposure: {
    screen: ExposureScreen,
    tabIcon: require('../../assets/tab-icons/exposure.png'),
  },
  mat: {
    screen: MatScreen,
    tabIcon: require('../../assets/tab-icons/mat.png'),
  },
  reciprocity: {
    screen: ReciprocityScreen,
    tabIcon: require('../../assets/tab-icons/reciprocity.png'),
  },
  lens: {
    screen: LensScreen,
    tabIcon: require('../../assets/tab-icons/lens.png'),
  },
  'camera-exposure': {
    screen: CameraExposureScreen,
    tabIcon: require('../../assets/tab-icons/camera-exposure.png'),
  },
  meter: {
    screen: MeterScreen,
    tabIcon: require('../../assets/tab-icons/meter.png'),
  },
  settings: {
    screen: SettingsScreen,
    tabIcon: require('../../assets/tab-icons/settings.png'),
  },
} satisfies Record<ScreenToolId, ToolScreen>;

const TOOL_SCREEN_BY_ID = new Map<string, ToolScreen>(
  Object.entries(TOOL_SCREENS)
);

export function getToolScreen(id: string): ToolScreen | undefined {
  return TOOL_SCREEN_BY_ID.get(id);
}
