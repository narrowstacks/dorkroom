import type { useDevelopmentRecipes } from '@dorkroom/logic';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { OptionPickerSheet } from '@/components/development/option-picker-sheet';
import { OptionRow } from '@/components/option-row';
import { SectionLabel } from '@/components/section-label';
import { SegmentedControl } from '@/components/segmented-control';
import { ToolListRow } from '@/components/tool-list-row';
import { developerTypeOptions } from './recipe-views';

type RecipesController = ReturnType<typeof useDevelopmentRecipes>;

interface FiltersSheetProps {
  recipes: RecipesController;
  tagFilter: string;
  onTagFilterChange: (tag: string) => void;
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
  visible,
  onClose,
}: FiltersSheetProps) {
  const [picker, setPicker] = useState<'film' | 'developer' | null>(null);
  const sheetMaxHeight = useWindowDimensions().height * 0.62;

  const filmOptions = [
    { label: 'All films', value: '' },
    ...recipes.allFilms.map((f) => ({
      label: `${f.brand} ${f.name}`.trim(),
      value: f.slug,
    })),
  ];
  const developerOptions = [
    { label: 'All developers', value: '' },
    ...recipes.allDevelopers.map((d) => ({
      label: `${d.manufacturer} ${d.name}`.trim(),
      value: d.slug,
    })),
  ];

  const onPickFilm = (slug: string) => {
    recipes.setSelectedFilm(
      slug ? (recipes.allFilms.find((f) => f.slug === slug) ?? null) : null
    );
    recipes.setIsoFilter('');
    setPicker(null);
  };
  const onPickDeveloper = (slug: string) => {
    recipes.setSelectedDeveloper(
      slug ? (recipes.allDevelopers.find((d) => d.slug === slug) ?? null) : null
    );
    recipes.setDilutionFilter('');
    setPicker(null);
  };

  const clearAll = () => {
    recipes.clearFilters();
    onTagFilterChange('');
  };

  return (
    <>
      <BottomSheet visible={visible} title="Filters & sort" onClose={onClose}>
        <ScrollView
          style={{ maxHeight: sheetMaxHeight }}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-4"
        >
          <View className="gap-2">
            <SectionLabel>Sort by</SectionLabel>
            <OptionRow
              label=""
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

          <View>
            <SectionLabel>Film &amp; developer</SectionLabel>
            <ToolListRow
              label="Film"
              accessory={
                recipes.selectedFilm
                  ? `${recipes.selectedFilm.brand} ${recipes.selectedFilm.name}`
                  : 'All'
              }
              onPress={() => setPicker('film')}
            />
            <ToolListRow
              label="Developer"
              accessory={
                recipes.selectedDeveloper
                  ? `${recipes.selectedDeveloper.manufacturer} ${recipes.selectedDeveloper.name}`
                  : 'All'
              }
              onPress={() => setPicker('developer')}
            />
          </View>

          {recipes.selectedDeveloper ? (
            <OptionRow
              label="Dilution"
              options={recipes.getAvailableDilutions()}
              value={recipes.dilutionFilter}
              onChange={recipes.setDilutionFilter}
            />
          ) : null}

          {recipes.selectedFilm ? (
            <OptionRow
              label="ISO / push-pull"
              options={recipes.getAvailableISOs()}
              value={recipes.isoFilter}
              onChange={recipes.setIsoFilter}
            />
          ) : null}

          <OptionRow
            label="Developer type"
            options={developerTypeOptions(recipes.allDevelopers)}
            value={recipes.developerTypeFilter}
            onChange={recipes.setDeveloperTypeFilter}
          />

          <OptionRow
            label="Tag"
            options={recipes.getAvailableTags()}
            value={tagFilter}
            onChange={onTagFilterChange}
          />

          <Pressable
            onPress={clearAll}
            accessibilityRole="button"
            className="mt-1 items-center rounded-xl bg-white/10 px-4 py-3"
          >
            <Text className="text-base font-semibold text-white">
              Clear filters
            </Text>
          </Pressable>
        </ScrollView>
      </BottomSheet>

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
    </>
  );
}
