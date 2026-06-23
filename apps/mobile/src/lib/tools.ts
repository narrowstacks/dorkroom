export type ToolCategory =
  | 'printing'
  | 'film'
  | 'camera'
  | 'reference'
  | 'system';

export interface Tool {
  id: string;
  label: string;
  sfSymbol: string;
  route: string; // expo-router pathname for the More-stack detail route
  category: ToolCategory;
}

export const TOOLS: readonly Tool[] = [
  {
    id: 'border',
    label: 'Border',
    sfSymbol: 'square.dashed',
    route: '/more/border',
    category: 'printing',
  },
  {
    id: 'resize',
    label: 'Resize',
    sfSymbol: 'aspectratio',
    route: '/more/resize',
    category: 'printing',
  },
  {
    id: 'exposure',
    label: 'Exposure',
    sfSymbol: 'plusminus',
    route: '/more/exposure',
    category: 'printing',
  },
  {
    id: 'mat',
    label: 'Mat Cut',
    sfSymbol: 'rectangle.inset.filled',
    route: '/more/mat',
    category: 'printing',
  },
  {
    id: 'reciprocity',
    label: 'Reciprocity',
    sfSymbol: 'timer',
    route: '/more/reciprocity',
    category: 'film',
  },
  {
    id: 'lens',
    label: 'Lenses',
    sfSymbol: 'camera.metering.matrix',
    route: '/more/lens',
    category: 'camera',
  },
  {
    id: 'camera-exposure',
    label: 'Camera Exposure',
    sfSymbol: 'sun.max',
    route: '/more/camera-exposure',
    category: 'camera',
  },
  {
    id: 'meter',
    label: 'Meter',
    sfSymbol: 'camera.aperture',
    route: '/more/meter',
    category: 'camera',
  },
  {
    id: 'settings',
    label: 'Settings',
    sfSymbol: 'gearshape',
    route: '/more/settings',
    category: 'system',
  },
];

export const DEFAULT_PINNED_IDS: readonly string[] = [
  'meter',
  'border',
  'reciprocity',
  'exposure',
];

export const CATEGORY_ORDER: readonly ToolCategory[] = [
  'printing',
  'film',
  'camera',
  'reference',
  'system',
];

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  printing: 'Printing',
  film: 'Film',
  camera: 'Camera',
  reference: 'Reference',
  system: 'System',
};

const TOOL_BY_ID = new Map(TOOLS.map((t) => [t.id, t]));

export function getTool(id: string): Tool | undefined {
  return TOOL_BY_ID.get(id);
}
