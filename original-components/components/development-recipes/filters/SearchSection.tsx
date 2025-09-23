import React from 'react';
import { Platform } from 'react-native';
import { Box, Text } from '@gluestack-ui/themed';
import { SearchInput } from '@/components/ui/search';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import type { Film, Developer } from '@/api/dorkroom/types';

interface SearchSectionProps {
  filmSearch: string;
  developerSearch: string;
  selectedFilm: Film | null;
  selectedDeveloper: Developer | null;
  onFilmSearchChange: (text: string) => void;
  onDeveloperSearchChange: (text: string) => void;
  onFilmClear: () => void;
  onDeveloperClear: () => void;
  onFilmFocus: () => void;
  onFilmBlur: () => void;
  onDeveloperFocus: () => void;
  onDeveloperBlur: () => void;
  onShowMobileFilmModal: () => void;
  onShowMobileDeveloperModal: () => void;
  filmSearchRef: React.RefObject<any>;
  developerSearchRef: React.RefObject<any>;
  onFilmSearchLayout: () => void;
  onDeveloperSearchLayout: () => void;
}

export function SearchSection({
  filmSearch,
  developerSearch,
  selectedFilm,
  selectedDeveloper,
  onFilmSearchChange,
  onDeveloperSearchChange,
  onFilmClear,
  onDeveloperClear,
  onFilmFocus,
  onFilmBlur,
  onDeveloperFocus,
  onDeveloperBlur,
  onShowMobileFilmModal,
  onShowMobileDeveloperModal,
  filmSearchRef,
  developerSearchRef,
  onFilmSearchLayout,
  onDeveloperSearchLayout,
}: SearchSectionProps) {
  const textColor = useThemeColor({}, 'text');
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  return (
    <Box>
      <Text
        style={[
          {
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 8,
          },
          { color: textColor },
        ]}
      >
        {isDesktop ? 'Search' : 'Select Film & Developer'}
      </Text>

      <Box
        style={[
          {
            gap: 16,
          },
          isDesktop && {
            flexDirection: 'row',
            gap: 16,
          },
          {
            overflow: 'visible',
            zIndex: 999999,
            position: 'relative',
          },
        ]}
      >
        <Box
          ref={filmSearchRef}
          style={[
            {
              flex: 1,
            },
            isDesktop && {
              flex: 1,
              minWidth: 0,
            },
            {
              overflow: 'visible',
              zIndex: 999999,
              position: 'relative',
            },
          ]}
          onLayout={onFilmSearchLayout}
        >
          <Box style={{ position: 'relative' }}>
            {isDesktop ? (
              <SearchInput
                variant="desktop"
                type="film"
                placeholder="Type to search films..."
                value={filmSearch}
                onChangeText={onFilmSearchChange}
                onClear={onFilmClear}
                onFocus={onFilmFocus}
                onBlur={onFilmBlur}
              />
            ) : (
              <SearchInput
                variant="mobile"
                type="film"
                placeholder="Type to search films..."
                selectedItem={selectedFilm}
                onPress={onShowMobileFilmModal}
                onClear={() => onFilmClear()}
              />
            )}
          </Box>
        </Box>

        <Box
          ref={developerSearchRef}
          style={[
            {
              flex: 1,
            },
            isDesktop && {
              flex: 1,
              minWidth: 0,
            },
            {
              overflow: 'visible',
              zIndex: 999999,
              position: 'relative',
            },
          ]}
          onLayout={onDeveloperSearchLayout}
        >
          <Box style={{ position: 'relative' }}>
            {isDesktop ? (
              <SearchInput
                variant="desktop"
                type="developer"
                placeholder="Type to search developers..."
                value={developerSearch}
                onChangeText={onDeveloperSearchChange}
                onClear={onDeveloperClear}
                onFocus={onDeveloperFocus}
                onBlur={onDeveloperBlur}
              />
            ) : (
              <SearchInput
                variant="mobile"
                type="developer"
                placeholder="Type to search developers..."
                selectedItem={selectedDeveloper}
                onPress={onShowMobileDeveloperModal}
                onClear={() => onDeveloperClear()}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
