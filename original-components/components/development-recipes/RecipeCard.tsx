import React, { useMemo, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Box, Text } from '@gluestack-ui/themed';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import { formatTime } from '@/constants/developmentRecipes';
import { formatDilution } from '@/utils/dilutionUtils';
import { ShareButton } from '@/components/ShareButton';
import type { Film, Developer, Combination } from '@/api/dorkroom/types';

interface RecipeCardProps {
  combination: Combination;
  film: Film | undefined;
  developer: Developer | undefined;
  onPress: () => void;
  isCustomRecipe: boolean;
  onShare?: (e: any) => void; // Optional share handler to prevent card press
}

export const RecipeCard = React.memo(function RecipeCard({
  combination,
  film,
  developer,
  onPress,
  isCustomRecipe,
  onShare,
}: RecipeCardProps) {
  // Get theme colors (hooks must be called at top level)
  const textColor = useThemeColor({}, 'text');
  const developmentTint = useThemeColor({}, 'developmentRecipesTint');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'borderColor');
  const resultRowBackground = useThemeColor({}, 'resultRowBackground');

  // Consolidate theme colors into one object
  const colors = useMemo(
    () => ({
      text: textColor,
      developmentTint,
      cardBackground,
      borderColor,
      resultRowBackground,
    }),
    [
      textColor,
      developmentTint,
      cardBackground,
      borderColor,
      resultRowBackground,
    ]
  );

  const { width } = useWindowDimensions();
  const isMobile = useMemo(
    () => Platform.OS !== 'web' || width <= 768,
    [width]
  );

  // Memoize card width calculation
  const cardWidth = useMemo(() => {
    if (isMobile) {
      return '46%'; // 2 cards per row on mobile with more space
    } else if (width > 1600) {
      return '23%'; // 4 cards per row on very large desktop
    } else if (width > 1200) {
      return '30%'; // 3 cards per row on large desktop
    } else {
      return '47%'; // 2 cards per row on medium desktop
    }
  }, [isMobile, width]);

  // Memoize film name calculation
  const filmName = useMemo(() => {
    return film
      ? isMobile
        ? film.name
        : `${film.brand} ${film.name}`
      : 'Unknown Film';
  }, [film, isMobile]);

  // Memoize ISO calculations
  const isoInfo = useMemo(() => {
    const isNonStandardISO = film && combination.shootingIso !== film.isoSpeed;
    return {
      isNonStandardISO,
      display: combination.shootingIso,
    };
  }, [film, combination.shootingIso]);

  // Memoize push/pull calculations
  const pushPullInfo = useMemo(() => {
    const formatPushPullNumber = (num: number): string => {
      if (num === undefined || num === null) return '';
      return num % 1 === 0
        ? num.toString()
        : Number(num)
            .toFixed(2)
            .replace(/\.?0+$/, '');
    };

    const pushPullValue = combination.pushPull ?? 0;
    const display =
      pushPullValue !== 0
        ? ` ${
            pushPullValue > 0
              ? `+${formatPushPullNumber(pushPullValue)}`
              : formatPushPullNumber(pushPullValue)
          }`
        : null;

    return { pushPullValue, display };
  }, [combination.pushPull]);

  // Memoize developer name
  const developerName = useMemo(() => {
    return developer
      ? isMobile
        ? developer.name
        : `${developer.name}`
      : 'Unknown Developer';
  }, [developer, isMobile]);

  // Memoize dilution info
  const dilutionInfo = useMemo(() => {
    return formatDilution(
      combination.customDilution ||
        developer?.dilutions.find((d) => d.id === combination.dilutionId)
          ?.dilution ||
        'Stock'
    );
  }, [
    combination.customDilution,
    combination.dilutionId,
    developer?.dilutions,
  ]);

  // Memoize temperature info
  const temperatureInfo = useMemo(() => {
    const isNonStandardTemp = combination.temperatureF !== 68;
    const display = `${combination.temperatureF}°F`;
    return { isNonStandardTemp, display };
  }, [combination.temperatureF]);

  // Memoize style objects to prevent recreation
  const dynamicStyles = useMemo(
    () => ({
      cardTouchable: [styles.cardTouchable, { width: cardWidth as any }],
      recipeCard: [
        styles.recipeCard,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
        },
      ],
      customBadge: [
        styles.customBadge,
        { backgroundColor: colors.developmentTint },
      ],
      paramBox: [
        styles.paramBox,
        { backgroundColor: colors.resultRowBackground },
      ],
    }),
    [cardWidth, colors]
  );

  // Optimize callback to prevent recreation
  const handleShareStart = useCallback(() => {
    onShare?.(null);
  }, [onShare]);

  return (
    <TouchableOpacity onPress={onPress} style={dynamicStyles.cardTouchable}>
      <Box style={dynamicStyles.recipeCard}>
        {/* Header with Film and ISO */}
        <Box style={styles.cardHeader}>
          <Text
            style={[styles.cardFilmName, { color: colors.text }]}
            numberOfLines={2}
          >
            {filmName}
            {isoInfo.isNonStandardISO && (
              <Text style={[styles.cardISO, { color: colors.developmentTint }]}>
                {' @ '}
                {isoInfo.display} ISO
              </Text>
            )}
            {!isoInfo.isNonStandardISO && (
              <Text style={[styles.cardISO, { color: colors.text }]}>
                {' @ '}
                {isoInfo.display} ISO
              </Text>
            )}
            {pushPullInfo.display && (
              <Text
                style={[styles.pushPullText, { color: colors.developmentTint }]}
              >
                {pushPullInfo.display}
              </Text>
            )}
          </Text>

          <Box style={styles.cardHeaderActions}>
            {isCustomRecipe && (
              <Box style={dynamicStyles.customBadge}>
                <Text style={styles.customBadgeText}>●</Text>
              </Box>
            )}

            {/* Share Button */}
            <ShareButton
              recipe={combination}
              size="xs"
              style={styles.shareButton}
              onShareStart={handleShareStart}
            />
          </Box>
        </Box>

        {/* Developer and Dilution Parameters */}
        <Box style={[styles.cardParams, styles.firstParamSection]}>
          <Box style={dynamicStyles.paramBox}>
            <Text style={[styles.cardParamLabel, { color: colors.text }]}>
              Developer
            </Text>
            <Text
              style={[styles.cardParamValue, { color: colors.text }]}
              numberOfLines={1}
            >
              {developerName}
            </Text>
          </Box>
          <Box style={dynamicStyles.paramBox}>
            <Text style={[styles.cardParamLabel, { color: colors.text }]}>
              Dilution
            </Text>
            <Text style={[styles.cardParamValue, { color: colors.text }]}>
              {dilutionInfo}
            </Text>
          </Box>
        </Box>

        {/* Time and Temperature Parameters */}
        <Box style={styles.cardParams}>
          <Box style={dynamicStyles.paramBox}>
            <Text style={[styles.cardParamLabel, { color: colors.text }]}>
              Time
            </Text>
            <Text style={[styles.cardParamValue, { color: colors.text }]}>
              {formatTime(combination.timeMinutes)}
            </Text>
          </Box>
          <Box style={dynamicStyles.paramBox}>
            <Text
              style={[
                styles.cardParamLabel,
                {
                  color: temperatureInfo.isNonStandardTemp
                    ? colors.developmentTint
                    : colors.text,
                },
              ]}
            >
              Temperature
            </Text>
            <Text
              style={[
                styles.cardParamValue,
                {
                  color: temperatureInfo.isNonStandardTemp
                    ? colors.developmentTint
                    : colors.text,
                },
              ]}
            >
              {temperatureInfo.display}
              {temperatureInfo.isNonStandardTemp && ' ⚠'}
            </Text>
          </Box>
        </Box>
      </Box>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardTouchable: {
    minWidth: 320,
    maxWidth: 500,
    marginBottom: 12,
    marginHorizontal: 6, // Half of the original 12px gap for horizontal spacing
  },
  recipeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    minHeight: 24,
  },
  cardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  cardFilmName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
    marginRight: 8,
  },
  cardISO: {
    fontSize: 14,
    fontWeight: '500',
  },
  pushPullText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  shareButton: {
    opacity: 0.8,
  },
  customBadgeText: {
    fontSize: 6,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 8,
  },
  cardParams: {
    gap: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardParamLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  cardParamValue: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '400',
  },
  paramBox: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flex: 1,
    maxWidth: '48%',
    minWidth: '48%',
    alignItems: 'center',
  },
  firstParamSection: {
    marginBottom: 6,
  },
});
