import {
  Aperture,
  Contrast,
  Crop,
  Film,
  FlaskConical,
  Focus,
  Frame,
  Gauge,
  Hourglass,
  type LucideIcon,
  Ruler,
  SunMedium,
  Timer,
} from 'lucide-react-native';

const ICONS = {
  crop: Crop,
  film: Film,
  'flask-conical': FlaskConical,
  ruler: Ruler,
  gauge: Gauge,
  hourglass: Hourglass,
  frame: Frame,
  timer: Timer,
  focus: Focus,
  aperture: Aperture,
  contrast: Contrast,
  'sun-medium': SunMedium,
} satisfies Record<string, LucideIcon>;

/** A Lucide icon name `ToolIcon` can render. */
export type ToolIconName = keyof typeof ICONS;

export function ToolIcon({
  name,
  size = 20,
  color = '#ffffff',
}: {
  name: ToolIconName;
  size?: number;
  color?: string;
}) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} />;
}
