import {
  Aperture,
  Circle,
  Crop,
  Focus,
  Frame,
  Gauge,
  type LucideIcon,
  Menu,
  Ruler,
  Settings,
  SunMedium,
  Timer,
} from 'lucide-react-native';

const ICONS: Record<string, LucideIcon> = {
  crop: Crop,
  ruler: Ruler,
  gauge: Gauge,
  frame: Frame,
  timer: Timer,
  focus: Focus,
  aperture: Aperture,
  'sun-medium': SunMedium,
  settings: Settings,
  menu: Menu,
};

export function ToolIcon({
  name,
  size = 20,
  color = '#ffffff',
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const Glyph = ICONS[name] ?? Circle;
  return <Glyph size={size} color={color} />;
}
