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

// The screen half of the tool manifest in `tools.ts`: each single-screen tool
// id to the component its pinned tab route file and `/more/<id>` render. It
// lives apart because screens can't load under vitest, and `tools.ts` stays
// pure so the deep-link resolver and its tests can import it. `satisfies`
// makes a missing or extra id a compile error. Only `more/[tool].tsx` imports
// this; the tab layout takes its icons from `tab-icons.ts` so it doesn't load
// every screen (the meter pulls in vision-camera) up front.
export const TOOL_SCREENS = {
  border: BorderScreen,
  resize: ResizeScreen,
  exposure: ExposureScreen,
  mat: MatScreen,
  reciprocity: ReciprocityScreen,
  lens: LensScreen,
  'camera-exposure': CameraExposureScreen,
  meter: MeterScreen,
  settings: SettingsScreen,
} satisfies Record<ScreenToolId, ComponentType>;

const TOOL_SCREEN_BY_ID = new Map<string, ComponentType>(
  Object.entries(TOOL_SCREENS)
);

export function getToolScreen(id: string): ComponentType | undefined {
  return TOOL_SCREEN_BY_ID.get(id);
}
