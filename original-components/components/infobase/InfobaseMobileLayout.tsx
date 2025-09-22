import React from "react";
import { Platform, StyleSheet, FlatList } from "react-native";
import {
  Box,
  Text,
  HStack,
  Button,
  ButtonText,
  Spinner,
} from "@gluestack-ui/themed";
import { RefreshCw } from "lucide-react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";
import { FilmCard } from "./FilmCard";
import { DeveloperCard } from "./DeveloperCard";
import { FilmDetailModal } from "./FilmDetailModal";
import { DeveloperDetailModal } from "./DeveloperDetailModal";

import type {
  Film as FilmType,
  Developer as DeveloperType,
} from "@/api/dorkroom/types";

type TabType = "films" | "developers";

interface InfobaseMobileLayoutProps {
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

export function InfobaseMobileLayout({
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
}: InfobaseMobileLayoutProps) {
  const { width } = useWindowDimensions();
  const backgroundColor = useThemeColor({}, "background");
  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const infobaseTint = useThemeColor({}, "infobaseTint");

  // Get grid columns based on screen size (always use grid mode)
  const getNumColumns = () => {
    if (width > 480) return 2;
    return 1;
  };

  const numColumns = getNumColumns();

  const handleItemPress = (item: FilmType | DeveloperType) => {
    if (activeTab === "films") {
      onFilmSelect(item as FilmType);
    } else {
      onDeveloperSelect(item as DeveloperType);
    }
  };

  const handleModalClose = () => {
    if (activeTab === "films") {
      onFilmSelect(null);
    } else {
      onDeveloperSelect(null);
    }
  };

  const renderFilmItem = ({ item }: { item: FilmType }) => (
    <Box style={[styles.cardContainer, { width: `${100 / numColumns}%` }]}>
      <FilmCard
        film={item}
        variant="compact"
        onPress={() => handleItemPress(item)}
      />
    </Box>
  );

  const renderDeveloperItem = ({ item }: { item: DeveloperType }) => (
    <Box style={[styles.cardContainer, { width: `${100 / numColumns}%` }]}>
      <DeveloperCard
        developer={item}
        variant="compact"
        onPress={() => handleItemPress(item)}
      />
    </Box>
  );

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
      <FlatList<FilmType | DeveloperType>
        data={displayData}
        renderItem={({ item }) => {
          if (activeTab === "films") {
            return renderFilmItem({ item: item as FilmType });
          } else {
            return renderDeveloperItem({ item: item as DeveloperType });
          }
        }}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={`${activeTab}-${numColumns}`} // Force re-render when columns change
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
      />
    );
  };

  return (
    <Box style={[styles.container, { backgroundColor }]}>
      {/* Results Header */}
      <Box style={[styles.resultsHeader, { backgroundColor: cardBackground }]}>
        <HStack space="md" alignItems="center" style={styles.resultsRow}>
          <Text style={[styles.resultsText, { color: textColor }]}>
            {displayCount} of {totalCount} {activeTab}
          </Text>

          <Box style={styles.spacer} />

          {/* Refresh Button */}
          <Button
            size="sm"
            variant="outline"
            action="secondary"
            onPress={onRefresh}
            disabled={isLoading}
            style={styles.refreshButton}
          >
            <RefreshCw size={16} />
          </Button>
        </HStack>
      </Box>

      {/* Content */}
      <Box style={styles.contentContainer}>{renderContent()}</Box>

      {/* Detail Modals */}
      <FilmDetailModal
        film={selectedFilm}
        isOpen={selectedFilm !== null}
        onClose={handleModalClose}
      />

      <DeveloperDetailModal
        developer={selectedDeveloper}
        isOpen={selectedDeveloper !== null}
        onClose={handleModalClose}
      />
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    marginBottom: 8,
  },
  resultsRow: {
    flex: 1,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "500",
  },
  spacer: {
    flex: 1,
  },
  refreshButton: {
    borderRadius: 8,
    minWidth: 40,
    paddingHorizontal: 12,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  flatListContent: {
    paddingVertical: 8,
  },
  cardContainer: {
    paddingHorizontal: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    borderRadius: 12,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  noResultsSubtext: {
    fontSize: 14,
    textAlign: "center",
  },
});
