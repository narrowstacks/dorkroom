import type { useDevelopmentRecipes } from '@dorkroom/logic';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { OptionRow } from '@/components/option-row';
import { SectionLabel } from '@/components/section-label';
import { SegmentedControl } from '@/components/segmented-control';
import { developerTypeOptions } from './recipe-views';

type RecipesController = ReturnType<typeof useDevelopmentRecipes>;

interface FiltersSheetProps {
  recipes: RecipesController;
  tagFilter: string;
  onTagFilterChange: (tag: string) => void;
  /** Count of recipes currently matching the active filters, for the live footer. */
  matchCount: number;
  visible: boolean;
  onClose: () => void;
}

const SORT_OPTIONS = [
  { label: 'Film', value: 'filmName' },
  { label: 'Developer', value: 'developerName' },
  { label: 'Time', value: 'timeMinutes' },
  { label: 'Temp', value: 'temperatureF' },
  { label: 'ISO', value: 'shootingIso' },
];

const DIRECTION_OPTIONS = [
  { label: 'Asc', value: 'asc' as const },
  { label: 'Desc', value: 'desc' as const },
];

/**
 * The filter + sort controls for the recipe browser, presented in a BottomSheet.
 * Drives useDevelopmentRecipes actions directly; the tag filter is owned by the
 * screen (the hook doesn't apply it), so it's passed in separately.
 */
export function FiltersSheet({
  recipes,
  tagFilter,
  onTagFilterChange,
  matchCount,
  visible,
  onClose,
}: FiltersSheetProps) {
  const sheetMaxHeight = useWindowDimensions().height * 0.62;

  const resetSortAndFilters = () => {
    recipes.clearFilters();
    onTagFilterChange('');
    recipes.setSortBy('filmName');
    recipes.setSortDirection('asc');
  };

  return (
    <BottomSheet visible={visible} title="Sort & filter" onClose={onClose}>
      <ScrollView
        style={{ maxHeight: sheetMaxHeight }}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4"
      >
        <View className="gap-2">
          <SectionLabel>Sort by</SectionLabel>
          <OptionRow
            accent="green"
            options={SORT_OPTIONS}
            value={recipes.sortBy}
            onChange={recipes.handleSort}
          />
          <SegmentedControl
            accent="green"
            options={DIRECTION_OPTIONS}
            value={recipes.sortDirection}
            onChange={recipes.setSortDirection}
          />
        </View>

        {recipes.selectedDeveloper ? (
          <OptionRow
            label="Dilution"
            accent="green"
            options={recipes.getAvailableDilutions()}
            value={recipes.dilutionFilter}
            onChange={recipes.setDilutionFilter}
          />
        ) : null}

        {recipes.selectedFilm ? (
          <OptionRow
            label="ISO / push-pull"
            accent="green"
            options={recipes.getAvailableISOs()}
            value={recipes.isoFilter}
            onChange={recipes.setIsoFilter}
          />
        ) : null}

        <OptionRow
          label="Developer type"
          accent="green"
          options={developerTypeOptions(recipes.allDevelopers)}
          value={recipes.developerTypeFilter}
          onChange={recipes.setDeveloperTypeFilter}
        />

        <OptionRow
          label="Tag"
          accent="green"
          options={recipes.getAvailableTags()}
          value={tagFilter}
          onChange={onTagFilterChange}
        />

        <Pressable
          onPress={resetSortAndFilters}
          accessibilityRole="button"
          className="mt-1 items-center rounded-xl bg-white/10 px-4 py-3"
        >
          <Text className="text-base font-semibold text-white">
            Reset sort &amp; filters
          </Text>
        </Pressable>

        <Text className="text-center text-sm text-white/40">
          {matchCount} {matchCount === 1 ? 'recipe matches' : 'recipes match'}
        </Text>
      </ScrollView>
    </BottomSheet>
  );
}
