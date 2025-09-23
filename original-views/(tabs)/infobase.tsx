import React, { useState, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import {
  Box,
  Text,
  HStack,
  VStack,
  Button,
  ButtonText,
  ButtonIcon,
} from '@gluestack-ui/themed';
import { Film, FlaskConical } from 'lucide-react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import { useFilmsData } from '@/hooks/useFilmsData';
import { useDevelopersData } from '@/hooks/useDevelopersData';

import { InfobaseSearch } from '@/components/infobase/InfobaseSearch';
import { InfobaseFilters } from '@/components/infobase/InfobaseFilters';
import { InfobaseDesktopLayout } from '@/components/infobase/InfobaseDesktopLayout';
import { InfobaseMobileLayout } from '@/components/infobase/InfobaseMobileLayout';

import type {
  Film as FilmType,
  Developer as DeveloperType,
} from '@/api/dorkroom/types';

type TabType = 'films' | 'developers';

export default function InfobaseScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  const [activeTab, setActiveTab] = useState<TabType>('films');
  const [selectedFilm, setSelectedFilm] = useState<FilmType | null>(null);
  const [selectedDeveloper, setSelectedDeveloper] =
    useState<DeveloperType | null>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'borderColor');
  const infobaseTint = useThemeColor({}, 'infobaseTint');

  // Films data management
  const {
    filteredFilms,
    totalFilms,
    isLoading: filmsLoading,
    error: filmsError,
    searchQuery: filmSearchQuery,
    brandFilter,
    typeFilter,
    availableBrands,
    availableTypes,
    setSearchQuery: setFilmSearchQuery,
    setBrandFilter,
    setTypeFilter,
    clearFilters: clearFilmFilters,
    forceRefresh: refreshFilms,
  } = useFilmsData();

  // Developers data management
  const {
    filteredDevelopers,
    totalDevelopers,
    isLoading: developersLoading,
    error: developersError,
    searchQuery: developerSearchQuery,
    manufacturerFilter,
    typeFilter: developerTypeFilter,
    filmOrPaperFilter,
    availableManufacturers,
    availableTypes: availableDeveloperTypes,
    availableFilmOrPaper,
    setSearchQuery: setDeveloperSearchQuery,
    setManufacturerFilter,
    setTypeFilter: setDeveloperTypeFilter,
    setFilmOrPaperFilter,
    clearFilters: clearDeveloperFilters,
    forceRefresh: refreshDevelopers,
  } = useDevelopersData();

  // Computed values for active tab
  const isLoading = activeTab === 'films' ? filmsLoading : developersLoading;
  const error = activeTab === 'films' ? filmsError : developersError;
  const searchQuery =
    activeTab === 'films' ? filmSearchQuery : developerSearchQuery;
  const setSearchQuery =
    activeTab === 'films' ? setFilmSearchQuery : setDeveloperSearchQuery;
  const clearFilters =
    activeTab === 'films' ? clearFilmFilters : clearDeveloperFilters;
  const forceRefresh = activeTab === 'films' ? refreshFilms : refreshDevelopers;

  // Memoized data for performance
  const displayData = useMemo(() => {
    return activeTab === 'films' ? filteredFilms : filteredDevelopers;
  }, [activeTab, filteredFilms, filteredDevelopers]);

  const totalCount = activeTab === 'films' ? totalFilms : totalDevelopers;
  const displayCount = displayData.length;

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
    // Clear selections when switching tabs
    setSelectedFilm(null);
    setSelectedDeveloper(null);
  };

  const handleRefresh = async () => {
    await forceRefresh();
  };

  const tabButtonStyle = (isActive: boolean) => ({
    flex: 1,
    backgroundColor: isActive ? infobaseTint : 'transparent',
    borderColor: infobaseTint,
    borderWidth: 1,
    borderRadius: isDesktop ? 12 : 8,
    paddingVertical: isDesktop ? 12 : 8,
    paddingHorizontal: isDesktop ? 16 : 8,
    marginHorizontal: isDesktop ? 4 : 2,
    minHeight: isDesktop ? 48 : 44,
  });

  const tabTextStyle = (isActive: boolean) => ({
    color: isActive ? '#fff' : infobaseTint,
    fontSize: isDesktop ? 14 : 12,
    fontWeight: '600' as const,
    marginLeft: 6,
  });

  return (
    <VStack style={[styles.container, { backgroundColor }]} space="lg">
      {/* Header */}
      <Box style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.title, { color: textColor }]}>
          Film & Developer Infobase
        </Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          Browse comprehensive film and developer information
        </Text>
      </Box>
      <VStack style={styles.searchContainer} space="sm">
        {/* Tab Navigation */}
        <Box style={[styles.tabContainer]}>
          <HStack space="xs" style={styles.tabRow}>
            <Button
              style={tabButtonStyle(activeTab === 'films')}
              onPress={() => handleTabPress('films')}
            >
              <ButtonIcon as={Film} size="sm" />
              <ButtonText style={tabTextStyle(activeTab === 'films')}>
                Films ({totalFilms})
              </ButtonText>
            </Button>

            <Button
              style={tabButtonStyle(activeTab === 'developers')}
              onPress={() => handleTabPress('developers')}
            >
              <ButtonIcon as={FlaskConical} size="sm" />
              <ButtonText style={tabTextStyle(activeTab === 'developers')}>
                Developers ({totalDevelopers})
              </ButtonText>
            </Button>
          </HStack>
        </Box>

        {/* Search and Filters */}

        <InfobaseSearch
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search ${activeTab}...`}
          onClear={() => setSearchQuery('')}
        />

        <InfobaseFilters
          variant={activeTab}
          filmFilters={
            activeTab === 'films' ? { brandFilter, typeFilter } : undefined
          }
          availableBrands={availableBrands}
          availableTypes={availableTypes}
          onFilmFiltersChange={
            activeTab === 'films'
              ? ({ brandFilter: brand, typeFilter: type }) => {
                  if (brand !== undefined) setBrandFilter(brand);
                  if (type !== undefined) setTypeFilter(type);
                }
              : undefined
          }
          developerFilters={
            activeTab === 'developers'
              ? {
                  manufacturerFilter,
                  typeFilter: developerTypeFilter,
                  filmOrPaperFilter,
                }
              : undefined
          }
          availableManufacturers={availableManufacturers}
          availableDeveloperTypes={availableDeveloperTypes}
          availableFilmOrPaper={availableFilmOrPaper}
          onDeveloperFiltersChange={
            activeTab === 'developers'
              ? ({
                  manufacturerFilter: manufacturer,
                  typeFilter: type,
                  filmOrPaperFilter: filmOrPaper,
                }) => {
                  if (manufacturer !== undefined)
                    setManufacturerFilter(manufacturer);
                  if (type !== undefined) setDeveloperTypeFilter(type);
                  if (filmOrPaper !== undefined)
                    setFilmOrPaperFilter(filmOrPaper);
                }
              : undefined
          }
          onClearFilters={clearFilters}
        />
      </VStack>

      {/* Content */}
      <Box style={styles.contentContainer}>
        {isDesktop ? (
          <InfobaseDesktopLayout
            activeTab={activeTab}
            displayData={displayData}
            displayCount={displayCount}
            totalCount={totalCount}
            isLoading={isLoading}
            error={error}
            selectedFilm={selectedFilm}
            selectedDeveloper={selectedDeveloper}
            onFilmSelect={setSelectedFilm}
            onDeveloperSelect={setSelectedDeveloper}
            onRefresh={handleRefresh}
          />
        ) : (
          <InfobaseMobileLayout
            activeTab={activeTab}
            displayData={displayData}
            displayCount={displayCount}
            totalCount={totalCount}
            isLoading={isLoading}
            error={error}
            selectedFilm={selectedFilm}
            selectedDeveloper={selectedDeveloper}
            onFilmSelect={setSelectedFilm}
            onDeveloperSelect={setSelectedDeveloper}
            onRefresh={handleRefresh}
          />
        )}
      </Box>
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  tabContainer: {
    paddingVertical: Platform.OS === 'web' ? 6 : 8,
    marginBottom: Platform.OS === 'ios' || Platform.OS === 'android' ? 36 : 0,
  },
  tabRow: {
    flex: 1,
    alignItems: 'stretch',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  contentContainer: {
    flex: 1,
  },
});
