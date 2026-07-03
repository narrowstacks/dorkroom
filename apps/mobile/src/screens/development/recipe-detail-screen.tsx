import { calculatePushPull, useDevelopmentRecipes } from '@dorkroom/logic';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CollapsibleSection } from '@/components/development/collapsible-section';
import { LinkRow } from '@/components/development/link-row';
import { PushPullBadge } from '@/components/development/push-pull-badge';
import {
  formatAgitationMethod,
  formatRecipeTemp,
  formatRecipeTime,
  formatSourceTag,
  pushPullDisplay,
  resolveDilution,
} from '@/components/development/recipe-format';
import { VolumeMixer } from '@/components/development/volume-mixer';
import { GlassCard } from '@/components/glass-card';
import { ResultRow } from '@/components/result-row';
import { Screen } from '@/components/screen';
import { setTimerPrefill } from '@/lib/timer/prefill';
import { ACCENT } from '@/theme/accents';

export function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipes = useDevelopmentRecipes();

  const combination = recipes.allCombinations.find(
    (c) => c.uuid === id || String(c.id) === id
  );

  if (!recipes.isLoaded && !combination) {
    return (
      <Screen>
        <View className="items-center py-16">
          <ActivityIndicator color="#ffffff" />
        </View>
      </Screen>
    );
  }

  if (!combination) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Recipe' }} />
        <Text className="py-16 text-center text-base text-white/60">
          Recipe not found.
        </Text>
      </Screen>
    );
  }

  const film = recipes.getFilmById(
    combination.filmSlug || combination.filmStockId
  );
  const developer = recipes.getDeveloperById(
    combination.developerId || combination.developerSlug
  );
  const filmName = film ? `${film.brand} ${film.name}`.trim() : 'Recipe';
  const developerName = developer
    ? `${developer.manufacturer} ${developer.name}`.trim()
    : 'Unknown developer';
  const dilution = resolveDilution(combination, developer);
  const stops =
    combination.pushPull ??
    (film ? calculatePushPull(combination.shootingIso, film.isoSpeed) : 0);
  const pp = pushPullDisplay(stops);
  const tags = combination.tags ?? [];

  return (
    <Screen>
      <Stack.Screen options={{ title: filmName }} />

      {/* Context: developer name (the nav title already shows the film) and
          push/pull. */}
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-sm text-white/60" numberOfLines={1}>
          {developerName}
        </Text>
        <PushPullBadge stops={stops} />
      </View>

      {/* Primary stats: dev time (the hero, in green), temperature, dilution.
          `flex: 1` on each card's OUTER element (via GlassCard's style prop)
          gives equal width; the row's default alignItems:'stretch' then makes
          all three the same height — the tallest (Temp, which has the °F line)
          sets it, and the shorter cards keep their content top-aligned. The
          dev-time card carries the green accent border + green value (the
          `text-green-*` class doesn't resolve on the Liquid Glass build). */}
      <View className="flex-row gap-3">
        <GlassCard
          className="gap-0.5"
          style={{ flex: 1, borderWidth: 1, borderColor: `${ACCENT.green}40` }}
        >
          <Text className="text-xs uppercase tracking-wide text-white/50">
            Dev time
          </Text>
          <Text
            className="text-xl font-bold"
            style={{ color: ACCENT.green }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatRecipeTime(combination.timeMinutes)}
          </Text>
        </GlassCard>
        <GlassCard className="gap-0.5" style={{ flex: 1 }}>
          <Text className="text-xs uppercase tracking-wide text-white/50">
            Temp
          </Text>
          <Text
            className="text-xl font-bold text-white"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatRecipeTemp(
              combination.temperatureC,
              combination.temperatureF,
              'C'
            )}
          </Text>
          <Text className="text-xs text-white/50">
            {formatRecipeTemp(
              combination.temperatureC,
              combination.temperatureF,
              'F'
            )}
          </Text>
        </GlassCard>
        <GlassCard className="gap-0.5" style={{ flex: 1 }}>
          <Text className="text-xs uppercase tracking-wide text-white/50">
            Dilution
          </Text>
          <Text
            className="text-xl font-bold text-white"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {dilution}
          </Text>
        </GlassCard>
      </View>

      {/* Supporting details. */}
      <GlassCard>
        <ResultRow
          label="Agitation"
          value={formatAgitationMethod(combination.agitationMethod)}
        />
        <ResultRow
          label="Shooting ISO"
          value={String(combination.shootingIso)}
        />
        <ResultRow
          label="Push / Pull"
          value={pp ? `${pp.label} stops` : 'Box speed'}
        />
        {tags.length > 0 ? (
          <ResultRow
            label="Source"
            value={tags.map(formatSourceTag).join(', ')}
          />
        ) : null}
      </GlassCard>

      <Pressable
        onPress={() => {
          // Hand the recipe to the timer screen (it consumes this on mount and
          // prefills the dev stage from the recipe's time/temp/agitation).
          setTimerPrefill(combination);
          router.push('/development/timer');
        }}
        accessibilityRole="button"
        accessibilityLabel="Start process timer for this recipe"
        className="items-center rounded-xl bg-rose-600 px-4 py-3 active:opacity-80"
      >
        <Text className="text-base font-semibold text-white">
          Start Process Timer
        </Text>
      </Pressable>

      {combination.notes?.trim() ? (
        <GlassCard className="gap-1">
          <Text className="text-sm font-semibold text-white">Notes</Text>
          <Text className="text-sm text-white/70">{combination.notes}</Text>
        </GlassCard>
      ) : null}

      <VolumeMixer dilutionString={dilution} />

      {film?.description?.trim() ? (
        <CollapsibleSection title="Film" subtitle={filmName}>
          <Text className="text-sm text-white/70">{film.description}</Text>
        </CollapsibleSection>
      ) : null}

      {developer?.description?.trim() ||
      developer?.mixingInstructions?.trim() ? (
        <CollapsibleSection title="Developer" subtitle={developerName}>
          <View className="gap-2">
            {developer.description?.trim() ? (
              <Text className="text-sm text-white/70">
                {developer.description}
              </Text>
            ) : null}
            {developer.mixingInstructions?.trim() ? (
              <Text className="text-sm text-white/50">
                {developer.mixingInstructions}
              </Text>
            ) : null}
          </View>
        </CollapsibleSection>
      ) : null}

      {combination.infoSource?.trim() ? (
        <GlassCard>
          <LinkRow
            label="View source"
            sublabel={combination.infoSource}
            url={combination.infoSource}
          />
        </GlassCard>
      ) : null}
    </Screen>
  );
}
