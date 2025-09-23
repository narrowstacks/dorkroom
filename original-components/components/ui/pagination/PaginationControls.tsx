import React from 'react';
import { StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Box, Text, HStack, VStack } from '@gluestack-ui/themed';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { StyledTextInput } from '@/components/ui/forms/StyledTextInput';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import type { PaginationState, PaginationActions } from '@/hooks/usePagination';

interface PaginationControlsProps extends PaginationState, PaginationActions {
  className?: string;
  style?: any;
}

export const PaginationControls = React.memo(function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  hasNext,
  hasPrevious,
  goToPage,
  goToNext,
  goToPrevious,
  className,
  style,
}: PaginationControlsProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const developmentTint = useThemeColor({}, 'developmentRecipesTint');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'borderColor');
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  const [pageInputValue, setPageInputValue] = React.useState(
    currentPage.toString()
  );

  // Update input value when current page changes externally
  React.useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  // Don't show pagination if there's only one page or no items
  if (totalPages <= 1) {
    return null;
  }

  const handlePageInputChange = (value: string) => {
    setPageInputValue(value);
  };

  const handlePageInputSubmit = () => {
    const pageNumber = parseInt(pageInputValue, 10);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      goToPage(pageNumber);
    } else {
      // Reset to current page if invalid
      setPageInputValue(currentPage.toString());
    }
  };

  const handlePageInputBlur = () => {
    handlePageInputSubmit();
  };

  const showingText = `Showing ${
    startIndex + 1
  }-${endIndex} of ${totalItems} recipes`;
  const pageText = `Page ${currentPage} of ${totalPages}`;

  if (isDesktop) {
    // Desktop layout: horizontal with all controls
    return (
      <Box
        style={[
          styles.container,
          styles.desktopContainer,
          { backgroundColor: cardBackground, borderColor },
          style,
        ]}
        className={className}
      >
        <HStack space="md" style={styles.desktopContent}>
          {/* Results info */}
          <Text style={[styles.infoText, { color: textSecondary }]}>
            {showingText}
          </Text>

          <Box style={styles.desktopSpacer} />

          {/* Navigation controls */}
          <HStack space="sm" style={styles.navigationControls}>
            {/* Previous button */}
            <TouchableOpacity
              onPress={goToPrevious}
              disabled={!hasPrevious}
              style={[
                styles.navButton,
                { borderColor: developmentTint },
                !hasPrevious && styles.navButtonDisabled,
              ]}
              accessibilityLabel="Previous page"
              accessibilityRole="button"
            >
              <ChevronLeft
                size={16}
                color={hasPrevious ? developmentTint : textSecondary}
              />
              <Text
                style={[
                  styles.navButtonText,
                  { color: hasPrevious ? developmentTint : textSecondary },
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            {/* Page input */}
            <HStack space="xs" style={styles.pageInputContainer}>
              <Text style={[styles.pageText, { color: textColor }]}>Page</Text>
              <StyledTextInput
                value={pageInputValue}
                onChangeText={handlePageInputChange}
                onBlur={handlePageInputBlur}
                onSubmitEditing={handlePageInputSubmit}
                style={[styles.pageInput, { borderColor, color: textColor }]}
                keyboardType="numeric"
                selectTextOnFocus
                accessibilityLabel={`Page number, current page ${currentPage}`}
              />
              <Text style={[styles.pageText, { color: textColor }]}>
                of {totalPages}
              </Text>
            </HStack>

            {/* Next button */}
            <TouchableOpacity
              onPress={goToNext}
              disabled={!hasNext}
              style={[
                styles.navButton,
                { borderColor: developmentTint },
                !hasNext && styles.navButtonDisabled,
              ]}
              accessibilityLabel="Next page"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.navButtonText,
                  { color: hasNext ? developmentTint : textSecondary },
                ]}
              >
                Next
              </Text>
              <ChevronRight
                size={16}
                color={hasNext ? developmentTint : textSecondary}
              />
            </TouchableOpacity>
          </HStack>
        </HStack>
      </Box>
    );
  } else {
    // Mobile layout: compact vertical with essential controls
    return (
      <Box
        style={[
          styles.container,
          styles.mobileContainer,
          { backgroundColor: cardBackground, borderColor },
          style,
        ]}
        className={className}
      >
        <VStack space="sm" style={styles.mobileContent}>
          {/* Results info */}
          <Text
            style={[
              styles.infoText,
              styles.mobileInfoText,
              { color: textSecondary },
            ]}
          >
            {showingText}
          </Text>

          {/* Navigation controls */}
          <HStack space="md" style={styles.mobileNavigation}>
            {/* Previous button */}
            <TouchableOpacity
              onPress={goToPrevious}
              disabled={!hasPrevious}
              style={[
                styles.mobileNavButton,
                { borderColor: developmentTint },
                !hasPrevious && styles.navButtonDisabled,
              ]}
              accessibilityLabel="Previous page"
              accessibilityRole="button"
            >
              <ChevronLeft
                size={18}
                color={hasPrevious ? developmentTint : textSecondary}
              />
            </TouchableOpacity>

            {/* Page info */}
            <VStack space="xs" style={styles.mobilePageInfo}>
              <Text
                style={[
                  styles.pageText,
                  styles.mobilePageText,
                  { color: textColor },
                ]}
              >
                {pageText}
              </Text>
            </VStack>

            {/* Next button */}
            <TouchableOpacity
              onPress={goToNext}
              disabled={!hasNext}
              style={[
                styles.mobileNavButton,
                { borderColor: developmentTint },
                !hasNext && styles.navButtonDisabled,
              ]}
              accessibilityLabel="Next page"
              accessibilityRole="button"
            >
              <ChevronRight
                size={18}
                color={hasNext ? developmentTint : textSecondary}
              />
            </TouchableOpacity>
          </HStack>
        </VStack>
      </Box>
    );
  }
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
  },
  desktopContainer: {
    minHeight: 48,
  },
  mobileContainer: {
    minHeight: 56,
  },
  desktopContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  mobileContent: {
    alignItems: 'center',
  },
  desktopSpacer: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mobileInfoText: {
    textAlign: 'center',
    fontSize: 13,
  },
  navigationControls: {
    alignItems: 'center',
  },
  mobileNavigation: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  mobileNavButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 44,
    minHeight: 44,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pageInputContainer: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  pageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mobilePageText: {
    textAlign: 'center',
    fontSize: 13,
  },
  pageInput: {
    width: 50,
    height: 32,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  mobilePageInfo: {
    flex: 1,
    alignItems: 'center',
  },
});
