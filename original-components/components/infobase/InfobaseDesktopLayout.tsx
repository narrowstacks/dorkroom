import React from 'react';
import { Platform, StyleSheet, FlatList } from 'react-native';
import {
  Box,
  Text,
  HStack,
  Button,
  ButtonText,
  Spinner,
} from '@gluestack-ui/themed';
import { RefreshCw } from 'lucide-react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import { FilmListItem } from './FilmListItem';
import { DeveloperListItem } from './DeveloperListItem';
import { FilmDetailPanel } from './FilmDetailPanel';
import { DeveloperDetailPanel } from './DeveloperDetailPanel';

import type {
  Film as FilmType,
  Developer as DeveloperType,
} from '@/api/dorkroom/types';

type TabType = 'films' | 'developers';

interface InfobaseDesktopLayoutProps {
  activeTab: TabType;
  displayData: (FilmType | DeveloperType)[];
  displayCount: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  selectedFilm: FilmType | null;
  selectedDeveloper: DeveloperType | null;
  onFilmSelect: (film: FilmType | null) => void;
  onDeveloperSelect: (developer: DeveloperType | null) => void;
  onRefresh: () => void;
}

export function InfobaseDesktopLayout({
  activeTab,
  displayData,
  displayCount,
  totalCount,
  isLoading,
  error,
  selectedFilm,
  selectedDeveloper,
  onFilmSelect,
  onDeveloperSelect,
  onRefresh,
}: InfobaseDesktopLayoutProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'borderColor');
  const infobaseTint = useThemeColor({}, 'infobaseTint');

  const handleItemPress = (item: FilmType | DeveloperType) => {
    if (activeTab === 'films') {
      const film = item as FilmType;
      onFilmSelect(selectedFilm?.id === film.id ? null : film);
    } else {
      const developer = item as DeveloperType;
      onDeveloperSelect(
        selectedDeveloper?.id === developer.id ? null : developer
      );
    }
  };

  const renderFilmItem = ({ item }: { item: FilmType }) => {
    const isSelected = selectedFilm?.id === item.id;
    return (
      <FilmListItem
        film={item}
        isSelected={isSelected}
        onPress={() => handleItemPress(item)}
      />
    );
  };

  const renderDeveloperItem = ({ item }: { item: DeveloperType }) => {
    const isSelected = selectedDeveloper?.id === item.id;
    return (
      <DeveloperListItem
        developer={item}
        isSelected={isSelected}
        onPress={() => handleItemPress(item)}
      />
    );
  };

  const renderItem = ({ item }: { item: FilmType | DeveloperType }) => {
    if (activeTab === 'films') {
      return renderFilmItem({ item: item as FilmType });
    } else {
      return renderDeveloperItem({ item: item as DeveloperType });
    }
  };

  const renderContent = () => {
    if (error) {
      return (
        <Box style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: textColor }]}>
            Error loading {activeTab}: {error}
          </Text>
          <Button onPress={onRefresh} style={styles.retryButton}>
            <RefreshCw size={16} color="#fff" />
            <ButtonText style={styles.retryButtonText}>Retry</ButtonText>
          </Button>
        </Box>
      );
    }

    if (isLoading && displayData.length === 0) {
      return (
        <Box style={styles.centerContainer}>
          <Spinner
            size="large"
            color={infobaseTint}
            style={{ marginBottom: 16 }}
          />
          <Text style={[styles.loadingText, { color: textColor }]}>
            Loading {activeTab}...
          </Text>
        </Box>
      );
    }

    if (displayData.length === 0) {
      return (
        <Box style={styles.centerContainer}>
          <Text style={[styles.noResultsText, { color: textColor }]}>
            No {activeTab} found.
          </Text>
          <Text style={[styles.noResultsSubtext, { color: textSecondary }]}>
            Try adjusting your search terms or filters.
          </Text>
        </Box>
      );
    }

    return (
      <FlatList
        data={displayData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    );
  };

  return (
    <HStack style={[styles.container, { backgroundColor }]}>
      {/* Left Panel - List */}
      <Box
        style={[
          styles.listPanel,
          { backgroundColor: cardBackground, borderRightColor: borderColor },
        ]}
      >
        {/* Results Header */}
        <Box style={[styles.resultsHeader, { borderBottomColor: borderColor }]}>
          <HStack space="md" alignItems="center" justifyContent="space-between">
            <Text style={[styles.resultsText, { color: textColor }]}>
              {displayCount} of {totalCount} {activeTab}
            </Text>

            {/* Refresh Button */}
            <Button
              size="sm"
              variant="outline"
              action="secondary"
              onPress={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw size={16} />
            </Button>
          </HStack>
        </Box>

        {/* Content */}
        <Box style={styles.listContent}>{renderContent()}</Box>
      </Box>

      {/* Right Panel - Detail */}
      <Box style={styles.detailPanel}>
        {activeTab === 'films' ? (
          <FilmDetailPanel
            film={selectedFilm}
            onClose={() => onFilmSelect(null)}
          />
        ) : (
          <DeveloperDetailPanel
            developer={selectedDeveloper}
            onClose={() => onDeveloperSelect(null)}
          />
        )}
      </Box>
    </HStack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listPanel: {
    flex: 2,
    borderRightWidth: 1,
  },
  detailPanel: {
    flex: 3,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    flex: 1,
  },
  flatListContent: {
    paddingVertical: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
