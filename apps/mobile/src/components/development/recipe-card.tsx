import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { calculatePushPull } from '@dorkroom/logic';
import { ArrowDown, ArrowUp, Flame, Snowflake } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { ACCENT } from '@/theme/accents';
import { Badge } from './badge';
import { OfficialTagPill } from './official-tag-pill';
import {
  formatRecipeTemp,
  formatRecipeTime,
  pushPullDisplay,
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

  // ISO segment: push/pull carries the color, matching the web table's
  // IsoCellRenderer (the ISO value itself is the indicator).
  const stops =
    combination.pushPull ??
    (film ? calculatePushPull(combination.shootingIso, film.isoSpeed) : 0);
  const pp = pushPullDisplay(stops);
  const isoColor = pp
    ? pp.direction === 'push'
      ? ACCENT.amber
      : ACCENT.blue
    : undefined;

  // Temp segment: Flame (hotter) / Snowflake (colder) when non-standard
  // (|68°F delta| > 0.1), matching the web table's TemperatureCellRenderer.
  const nonStandardTemp =
    Number.isFinite(combination.temperatureF) &&
    Math.abs(combination.temperatureF - 68) > 0.1;
  const tempHigher = combination.temperatureF > 68;
  const tempColor = nonStandardTemp
    ? tempHigher
      ? ACCENT.amber
      : ACCENT.blue
    : undefined;

  const isoTempAccessibilityExtra = [
    pp
      ? `, ${pp.direction === 'push' ? 'pushed' : 'pulled'} ${pp.label.replace(/^[+-]/, '')} stops`
      : '',
    nonStandardTemp
      ? tempHigher
        ? ', above standard temperature'
        : ', below standard temperature'
      : '',
  ].join('');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${filmName} in ${developerName}, ${formatRecipeTime(combination.timeMinutes)}${isoTempAccessibilityExtra}`}
      className="active:opacity-70"
    >
      <GlassCard className="flex-row items-center gap-4">
        {/* Context column */}
        <View className="flex-1 gap-1.5">
          <Text
            className="text-base font-semibold text-white"
            numberOfLines={1}
          >
            {filmName}
          </Text>

          <Text className="text-sm text-white/60" numberOfLines={1}>
            {developerName} · {dilution}
          </Text>

          <View className="flex-row items-center gap-1">
            {pp ? (
              <>
                <Text
                  className="text-sm font-medium"
                  style={{ color: isoColor }}
                >
                  ISO {combination.shootingIso}
                </Text>
                {pp.direction === 'push' ? (
                  <ArrowUp size={12} color={isoColor} />
                ) : (
                  <ArrowDown size={12} color={isoColor} />
                )}
                <Text className="text-xs" style={{ color: isoColor }}>
                  {pp.label}
                </Text>
              </>
            ) : (
              <Text className="text-sm text-white/40">
                ISO {combination.shootingIso}
              </Text>
            )}
            <Text className="text-sm text-white/40"> · </Text>
            {nonStandardTemp ? (
              <>
                {tempHigher ? (
                  <Flame size={12} color={tempColor} />
                ) : (
                  <Snowflake size={12} color={tempColor} />
                )}
                <Text
                  className="text-sm font-medium"
                  style={{ color: tempColor }}
                >
                  {formatRecipeTemp(
                    combination.temperatureC,
                    combination.temperatureF,
                    tempUnit
                  )}
                </Text>
              </>
            ) : (
              <Text className="text-sm text-white/40">
                {formatRecipeTemp(
                  combination.temperatureC,
                  combination.temperatureF,
                  tempUnit
                )}
              </Text>
            )}
          </View>

          {shownTags.length > 0 || recipe.source === 'custom' ? (
            <View className="flex-row flex-wrap items-center gap-1.5">
              {recipe.source === 'custom' ? (
                <Badge label="CUSTOM" tone="accent" />
              ) : null}
              {shownTags.map((tag) =>
                /^official-/i.test(tag) ? (
                  <OfficialTagPill key={tag} tag={tag} />
                ) : (
                  <Badge key={tag} label={tag} />
                )
              )}
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
