import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { router } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
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
import { NeutralButton } from '@/components/neutral-button';
import { TabBarScrollView } from '@/components/tab-bar-scroll-view';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { queryOf } from '@/lib/home/destination';
import { toHref } from '@/lib/href';
import { useSelectionTint } from '@/theme/use-phase-accent';
import { FiltersSheet } from './filters-sheet';
import {
  buildRecipeViews,
  developerPickerOptions,
  filmPickerOptions,
  filterRecipeViews,
  rollForRecipeOpen,
} from './recipe-views';
import { useRecipeBrowser } from './use-recipe-browser';

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
  // The browser's state, with a link's filters applied (see the hook).
  const {
    recipes,
    query,
    setQuery,
    tagFilter,
    setTagFilter,
    unavailable,
    setUnavailable,
    rollOpening,
    forgetOpening,
    clearEverything,
  } = useRecipeBrowser();
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
      setUnavailable(null);
      forgetOpening();
      recipes.setSelectedFilm(
        slug ? (recipes.allFilms.find((f) => f.slug === slug) ?? null) : null
      );
      setPicker(null);
    },
    [recipes, setUnavailable, forgetOpening]
  );
  const onPickDeveloper = useCallback(
    (slug: string) => {
      setUnavailable(null);
      recipes.setSelectedDeveloper(
        slug
          ? (recipes.allDevelopers.find((d) => d.slug === slug) ?? null)
          : null
      );
      recipes.setDilutionFilter('');
      setPicker(null);
    },
    [recipes, setUnavailable]
  );

  const onClearFilm = useCallback(() => {
    forgetOpening();
    recipes.setSelectedFilm(null);
  }, [recipes, forgetOpening]);
  const onClearDeveloper = useCallback(() => {
    recipes.setSelectedDeveloper(null);
    recipes.setDilutionFilter('');
  }, [recipes]);

  const updateQuery = useCallback(
    (text: string) => {
      setUnavailable(null);
      setQuery(text);
    },
    [setUnavailable, setQuery]
  );

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
    () =>
      unavailable === null
        ? filterRecipeViews(views, debouncedQuery, tagFilter)
        : [],
    [unavailable, views, debouncedQuery, tagFilter]
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

  const currentFilmSlug = recipes.selectedFilm?.slug;
  const onPressRecipe = useCallback(
    (uuid: string) => {
      const roll = rollForRecipeOpen({
        openingRoll: rollOpening.current?.roll,
        openingFilm: rollOpening.current?.film,
        currentFilm: currentFilmSlug,
      });
      router.push(
        toHref(
          `/develop/recipes/recipe/${encodeURIComponent(uuid)}${queryOf({ roll })}`
        )
      );
    },
    [currentFilmSlug, rollOpening]
  );

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
    <RecipeListHeader
      query={query}
      onQueryChange={updateQuery}
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
      count={visible.length}
      activeFilterCount={activeFilterCount}
      onOpenFilters={() => setFiltersOpen(true)}
    />
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
          <Text className="text-center text-base text-ink-70">
            Couldn’t load recipes. Check your connection and try again.
          </Text>
          <NeutralButton
            onPress={() => {
              void recipes.forceRefresh();
            }}
            label="Retry"
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <GradientBackground />
      <TabBarScrollView>
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, gap: 12 }}
          data={deferredVisible}
          keyExtractor={keyExtractor}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState
              unavailable={unavailable}
              showClearAll={
                unavailable !== null || activeFilterCount > 0 || query !== ''
              }
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
      </TabBarScrollView>
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

function RecipeListHeader({
  query,
  onQueryChange,
  filmLabel,
  developerLabel,
  onPressFilm,
  onPressDeveloper,
  onClearFilm,
  onClearDeveloper,
  count,
  activeFilterCount,
  onOpenFilters,
}: {
  query: string;
  onQueryChange: (text: string) => void;
  filmLabel: string | null;
  developerLabel: string | null;
  onPressFilm: () => void;
  onPressDeveloper: () => void;
  onClearFilm: () => void;
  onClearDeveloper: () => void;
  count: number;
  activeFilterCount: number;
  onOpenFilters: () => void;
}) {
  const filtersBadgeTint = useSelectionTint('teal');
  return (
    <View className="gap-3 pb-2">
      <SearchBar value={query} onChangeText={onQueryChange} />
      <FilmDeveloperBar
        filmLabel={filmLabel}
        developerLabel={developerLabel}
        onPressFilm={onPressFilm}
        onPressDeveloper={onPressDeveloper}
        onClearFilm={onClearFilm}
        onClearDeveloper={onClearDeveloper}
      />
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-ink-50">
          {count} {count === 1 ? 'recipe' : 'recipes'}
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={onOpenFilters}
            accessibilityRole="button"
            accessibilityLabel="Filters and sort"
            className="flex-row items-center gap-2 rounded-full border-hw border-line bg-surface px-4 py-2"
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
}

function EmptyState({
  unavailable,
  showClearAll,
  onClearAll,
}: {
  unavailable: string | null;
  showClearAll: boolean;
  onClearAll: () => void;
}) {
  return (
    <View className="items-center gap-3 px-6 py-16">
      <Text className="text-center text-base text-ink-60">
        {unavailable === null
          ? 'No recipes match your search and filters.'
          : `No development recipes for ${unavailable} yet.`}
      </Text>
      {showClearAll ? (
        <Pressable
          onPress={onClearAll}
          accessibilityRole="button"
          className="rounded-full border-hw border-line bg-surface px-4 py-2"
        >
          <Text className="text-sm font-semibold text-white">
            {unavailable === null ? 'Clear all filters' : 'Browse all recipes'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
