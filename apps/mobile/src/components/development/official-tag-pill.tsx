import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { officialTagColor, officialTagLabel } from './recipe-format';

interface OfficialTagPillProps {
  tag: string;
}

/** Web-parity official-source pill: brand-tinted circled check + always-visible
 * "Official <Brand> Recipe" text (the web collapses the text into a tooltip;
 * mobile keeps it inline). Colors are inline styles — Tailwind palette classes
 * don't resolve on the Liquid Glass build. */
export function OfficialTagPill({ tag }: OfficialTagPillProps) {
  const hex = officialTagColor(tag);
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full border px-2.5 py-1"
      style={{ backgroundColor: `${hex}33`, borderColor: `${hex}4D` }}
    >
      <View
        className="h-4 w-4 items-center justify-center rounded-full border"
        style={{ borderColor: `${hex}66`, backgroundColor: `${hex}26` }}
      >
        <Check size={10} strokeWidth={3} color={hex} />
      </View>
      <Text className="text-xs font-medium" style={{ color: hex }}>
        {officialTagLabel(tag)}
      </Text>
    </View>
  );
}
