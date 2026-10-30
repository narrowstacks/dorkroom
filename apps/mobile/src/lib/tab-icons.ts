import type { ScreenToolId } from '@/lib/tools';

// Tab bar icon assets for each single-screen tool (from
// `scripts/generate-tab-icons.mjs`), keyed like `TOOLS`. `satisfies` makes a
// missing or extra id a compile error. Metro resolves assets only from literal
// `require()` calls, so keep one per entry; `tool-manifest.test.ts` checks each
// points at `tab-icons/<id>.png`.
export const TAB_ICONS = {
  border: require('../../assets/tab-icons/border.png'),
  resize: require('../../assets/tab-icons/resize.png'),
  exposure: require('../../assets/tab-icons/exposure.png'),
  mat: require('../../assets/tab-icons/mat.png'),
  reciprocity: require('../../assets/tab-icons/reciprocity.png'),
  lens: require('../../assets/tab-icons/lens.png'),
  'camera-exposure': require('../../assets/tab-icons/camera-exposure.png'),
  meter: require('../../assets/tab-icons/meter.png'),
  settings: require('../../assets/tab-icons/settings.png'),
} satisfies Record<ScreenToolId, number>;

const TAB_ICON_BY_ID = new Map<string, number>(Object.entries(TAB_ICONS));

export function getTabIcon(id: string): number | undefined {
  return TAB_ICON_BY_ID.get(id);
}
