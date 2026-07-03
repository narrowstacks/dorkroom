import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { ACCENT } from '@/theme/accents';
import { Badge } from './badge';
import { PushPullBadge } from './push-pull-badge';
import {
  formatRecipeTemp,
  formatRecipeTime,
  resolveDilution,
  type TempUnit,
} from './recipe-format';

interface RecipeCardProps {
  recipe: DevelopmentCombinationView;
  /** Temperature unit to display (defaults to Celsius). */
  tempUnit?: TempUnit;
  onPress: () => void;
  /** Max tag badges to show before collapsing into "+N". Defaults to 3. */
  maxTags?: number;
}

/** A single recipe row for the browser list. Purely presentational. */
export function RecipeCard({
  recipe,
  tempUnit = 'C',
  onPress,
  maxTags = 3,
}: RecipeCardProps) {
  const { combination, film, developer } = recipe;

  const filmName = film ? `${film.brand} ${film.name}`.trim() : 'Unknown film';
  const developerName = developer
    ? `${developer.manufacturer} ${developer.name}`.trim()
    : 'Unknown developer';
  const dilution = resolveDilution(combination, developer);
  const tags = combination.tags ?? [];
  const shownTags = tags.slice(0, maxTags);
  const extraTags = tags.length - shownTags.length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${filmName} in ${developerName}, ${formatRecipeTime(combination.timeMinutes)}`}
      className="active:opacity-70"
    >
      <GlassCard className="flex-row items-center gap-4">
        {/* Context column */}
        <View className="flex-1 gap-1.5">
          <View className="flex-row items-center justify-between gap-2">
            <Text
              className="flex-1 text-base font-semibold text-white"
              numberOfLines={1}
            >
              {filmName}
            </Text>
            <PushPullBadge stops={combination.pushPull ?? 0} />
          </View>

          <Text className="text-sm text-white/60" numberOfLines={1}>
            {developerName} · {dilution}
          </Text>

          <Text className="text-sm text-white/40">
            ISO {combination.shootingIso} ·{' '}
            {formatRecipeTemp(
              combination.temperatureC,
              combination.temperatureF,
              tempUnit
            )}
          </Text>

          {shownTags.length > 0 || recipe.source === 'custom' ? (
            <View className="flex-row flex-wrap items-center gap-1.5">
              {recipe.source === 'custom' ? (
                <Badge label="CUSTOM" tone="accent" />
              ) : null}
              {shownTags.map((tag) => (
                <Badge key={tag} label={tag} />
              ))}
              {extraTags > 0 ? <Badge label={`+${extraTags}`} /> : null}
            </View>
          ) : null}
        </View>

        {/* Hero: development time — the field a darkroom user scans for first.
            Color comes from an inline style (ACCENT.green); the `text-green-*`
            NativeWind class doesn't resolve on the Liquid Glass build. */}
        <View className="items-end">
          <Text className="text-3xl font-bold" style={{ color: ACCENT.green }}>
            {formatRecipeTime(combination.timeMinutes)}
          </Text>
          <Text className="text-[11px] uppercase tracking-wide text-white/40">
            dev time
          </Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}
