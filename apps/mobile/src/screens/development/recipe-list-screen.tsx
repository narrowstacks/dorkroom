import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { useDevelopmentRecipes } from '@dorkroom/logic';
import { router } from 'expo-router';
import { SlidersHorizontal, Timer } from 'lucide-react-native';
import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  Pressable,
  Text,
  View,
} from 'react-native';
import { FilmDeveloperBar } from '@/components/development/film-developer-bar';
import { OptionPickerSheet } from '@/components/development/option-picker-sheet';
import { RecipeCard } from '@/components/development/recipe-card';
import { SearchBar } from '@/components/development/search-bar';
import { GradientBackground } from '@/components/gradient-background';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { selectionTint } from '@/theme/accents';
import { FiltersSheet } from './filters-sheet';
import {
  buildRecipeViews,
  developerPickerOptions,
  filmPickerOptions,
  filterRecipeViews,
} from './recipe-views';

const filtersBadgeTint = selectionTint('green');

const RecipeRow = memo(function RecipeRow({
  recipe,
  onPress,
}: {
  recipe: DevelopmentCombinationView;
  onPress: (uuid: string) => void;
}) {
  const handlePress = useCallback(
    () => onPress(recipe.combination.uuid),
    [onPress, recipe.combination.uuid]
  );
  return <RecipeCard recipe={recipe} onPress={handlePress} />;
});

export function RecipeListScreen() {
  const recipes = useDevelopmentRecipes();
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [picker, setPicker] = useState<'film' | 'developer' | null>(null);
  const debouncedQuery = useDebouncedValue(query);

  const filmOptions = useMemo(
    () => filmPickerOptions(recipes.allFilms),
    [recipes.allFilms]
  );
  const developerOptions = useMemo(
    () => developerPickerOptions(recipes.allDevelopers),
    [recipes.allDevelopers]
  );

  const onPickFilm = useCallback(
    (slug: string) => {
      recipes.setSelectedFilm(
        slug ? (recipes.allFilms.find((f) => f.slug === slug) ?? null) : null
      );
      recipes.setIsoFilter('');
      setPicker(null);
    },
    [recipes]
  );
  const onPickDeveloper = useCallback(
    (slug: string) => {
      recipes.setSelectedDeveloper(
        slug
          ? (recipes.allDevelopers.find((d) => d.slug === slug) ?? null)
          : null
      );
      recipes.setDilutionFilter('');
      setPicker(null);
    },
    [recipes]
  );

  const onClearFilm = useCallback(() => {
    recipes.setSelectedFilm(null);
    recipes.setIsoFilter('');
  }, [recipes]);
  const onClearDeveloper = useCallback(() => {
    recipes.setSelectedDeveloper(null);
    recipes.setDilutionFilter('');
  }, [recipes]);

  const clearEverything = useCallback(() => {
    recipes.clearFilters();
    recipes.setSelectedFilm(null);
    recipes.setSelectedDeveloper(null);
    setTagFilter('');
    setQuery('');
  }, [recipes]);

  const views = useMemo(
    () =>
      buildRecipeViews(
        recipes.filteredCombinations,
        recipes.getFilmById,
        recipes.getDeveloperById
      ),
    [
      recipes.filteredCombinations,
      recipes.getFilmById,
      recipes.getDeveloperById,
    ]
  );
  const visible = useMemo(
    () => filterRecipeViews(views, debouncedQuery, tagFilter),
    [views, debouncedQuery, tagFilter]
  );
  // Defer the list's data swap so filter/sort taps commit instantly (chip
  // highlight, match count) while the heavy card re-render happens in an
  // interruptible background render — same pattern as the web page's
  // deferredCombinedRows (development-recipes-page.tsx).
  const deferredVisible = useDeferredValue(visible);

  const activeFilterCount =
    (recipes.selectedFilm ? 1 : 0) +
    (recipes.selectedDeveloper ? 1 : 0) +
    (recipes.developerTypeFilter ? 1 : 0) +
    (recipes.dilutionFilter ? 1 : 0) +
    (recipes.isoFilter ? 1 : 0) +
    (tagFilter ? 1 : 0);

  const onPressRecipe = useCallback((uuid: string) => {
    router.push(`/development/recipe/${uuid}`);
  }, []);

  const keyExtractor = useCallback(
    (item: DevelopmentCombinationView) =>
      String(item.combination.uuid || item.combination.id),
    []
  );

  const renderItem = useCallback<ListRenderItem<DevelopmentCombinationView>>(
    ({ item }) => <RecipeRow recipe={item} onPress={onPressRecipe} />,
    [onPressRecipe]
  );

  const header = (
    <View className="gap-3 pb-2">
      <SearchBar value={query} onChangeText={setQuery} />
      <FilmDeveloperBar
        filmLabel={
          recipes.selectedFilm
            ? `${recipes.selectedFilm.brand} ${recipes.selectedFilm.name}`
            : null
        }
        developerLabel={
          recipes.selectedDeveloper
            ? `${recipes.selectedDeveloper.manufacturer} ${recipes.selectedDeveloper.name}`
            : null
        }
        onPressFilm={() => setPicker('film')}
        onPressDeveloper={() => setPicker('developer')}
        onClearFilm={onClearFilm}
        onClearDeveloper={onClearDeveloper}
      />
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-white/50">
          {visible.length} {visible.length === 1 ? 'recipe' : 'recipes'}
        </Text>
        <View className="flex-row items-center gap-2">
          {/* TODO(mob-timer-recipe-link): temporary entry to reach the standalone
              Process Timer for in-session testing. Remove once tools.ts registers
              the timer permanently and the recipe→timer link card lands. */}
          <Pressable
            onPress={() => router.push('/development/timer')}
            accessibilityRole="button"
            accessibilityLabel="Process timer"
            className="flex-row items-center gap-2 rounded-full bg-white/10 px-4 py-2"
          >
            <Timer size={16} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">Timer</Text>
          </Pressable>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Filters and sort"
            className="flex-row items-center gap-2 rounded-full bg-white/10 px-4 py-2"
          >
            <SlidersHorizontal size={16} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">Filters</Text>
            {activeFilterCount > 0 ? (
              <View
                className="rounded-full px-1.5"
                style={{
                  backgroundColor: filtersBadgeTint.backgroundColor,
                  borderWidth: 1,
                  borderColor: filtersBadgeTint.borderColor,
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: filtersBadgeTint.color }}
                >
                  {activeFilterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (recipes.isLoading && !recipes.isLoaded) {
    return (
      <View className="flex-1">
        <GradientBackground />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      </View>
    );
  }

  if (recipes.error && !recipes.isLoaded) {
    return (
      <View className="flex-1">
        <GradientBackground />
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Text className="text-center text-base text-white/70">
            Couldn’t load recipes. Check your connection and try again.
          </Text>
          <Pressable
            onPress={() => {
              void recipes.forceRefresh();
            }}
            accessibilityRole="button"
            className="rounded-xl bg-rose-600 px-5 py-3"
          >
            <Text className="text-base font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <GradientBackground />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        data={deferredVisible}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            showClearAll={activeFilterCount > 0 || query !== ''}
            onClearAll={clearEverything}
          />
        }
        renderItem={renderItem}
        windowSize={7}
        maxToRenderPerBatch={8}
        initialNumToRender={8}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
      />
      <FiltersSheet
        recipes={recipes}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        matchCount={visible.length}
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />
      <OptionPickerSheet
        visible={picker === 'film'}
        title="Film"
        searchable
        searchPlaceholder="Search films"
        options={filmOptions}
        value={recipes.selectedFilm?.slug ?? ''}
        onChange={onPickFilm}
        onClose={() => setPicker(null)}
      />
      <OptionPickerSheet
        visible={picker === 'developer'}
        title="Developer"
        searchable
        searchPlaceholder="Search developers"
        options={developerOptions}
        value={recipes.selectedDeveloper?.slug ?? ''}
        onChange={onPickDeveloper}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

function EmptyState({
  showClearAll,
  onClearAll,
}: {
  showClearAll: boolean;
  onClearAll: () => void;
}) {
  return (
    <View className="items-center gap-3 px-6 py-16">
      <Text className="text-center text-base text-white/60">
        No recipes match your search and filters.
      </Text>
      {showClearAll ? (
        <Pressable
          onPress={onClearAll}
          accessibilityRole="button"
          className="rounded-full bg-white/10 px-4 py-2"
        >
          <Text className="text-sm font-semibold text-white">
            Clear all filters
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
