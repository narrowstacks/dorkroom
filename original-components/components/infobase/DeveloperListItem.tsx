import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  HStack,
  VStack,
  Badge,
  BadgeText,
} from '@gluestack-ui/themed';
import { Beaker, AlertTriangle, Droplets } from 'lucide-react-native';
import type { Developer } from '@/api/dorkroom/types';
import { useThemeColor } from '@/hooks/useThemeColor';
import {
  getBrandKey,
  getDeveloperTypeColor,
  getContrastingTextColor,
} from '@/constants/brands';
import { Colors } from '@/constants/Colors';

interface DeveloperListItemProps {
  developer: Developer;
  isSelected?: boolean;
  onPress?: (developer: Developer) => void;
}

export function DeveloperListItem({
  developer,
  isSelected = false,
  onPress,
}: DeveloperListItemProps) {
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'borderColor');
  const backgroundColor = useThemeColor({}, 'background');
  const infobaseTint = useThemeColor({}, 'infobaseTint');

  // Get brand color from theme
  const colorScheme = backgroundColor === '#fff' ? 'light' : 'dark';
  const brandKey = getBrandKey(developer.manufacturer);
  const brandColorKey = `${brandKey}BrandColor` as keyof typeof Colors.light;
  const brandColor =
    Colors[colorScheme][brandColorKey] || Colors[colorScheme].genericBrandColor;

  // Get type color
  const typeColor = getDeveloperTypeColor(developer.type);
  const typeTextColor = getContrastingTextColor(typeColor);

  const handlePress = () => {
    if (onPress) {
      onPress(developer);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isSelected ? infobaseTint + '15' : cardBackground,
          borderColor: isSelected ? infobaseTint : borderColor,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <HStack space="md" alignItems="center" style={styles.content}>
        {/* Developer Icon */}
        <Box
          style={[
            styles.iconContainer,
            { backgroundColor: brandColor + '20', borderColor },
          ]}
        >
          <Beaker size={20} color={brandColor} />
        </Box>

        {/* Developer Info */}
        <VStack space="xs" style={styles.infoContainer}>
          {/* Manufacturer and Name */}
          <HStack space="sm" alignItems="center">
            <Text style={[styles.manufacturerName, { color: brandColor }]}>
              {developer.manufacturer}
            </Text>
            <Text style={[styles.developerName, { color: textColor }]}>
              {developer.name}
            </Text>
          </HStack>

          {/* Details Row */}
          <HStack space="md" alignItems="center">
            {/* Type Badge */}
            <Badge style={[styles.typeBadge, { backgroundColor: typeColor }]}>
              <BadgeText style={[styles.typeText, { color: typeTextColor }]}>
                {developer.type}
              </BadgeText>
            </Badge>

            {/* Film/Paper */}
            <HStack space="xs" alignItems="center">
              <Text style={[styles.label, { color: textSecondary }]}>For:</Text>
              <Text style={[styles.value, { color: textColor }]}>
                {developer.filmOrPaper}
              </Text>
            </HStack>

            {/* Dilutions */}
            {developer.dilutions.length > 0 && (
              <HStack space="xs" alignItems="center">
                <Droplets size={10} color={textSecondary} />
                <Text style={[styles.value, { color: textSecondary }]}>
                  {developer.dilutions.length} dilution
                  {developer.dilutions.length !== 1 ? 's' : ''}
                </Text>
              </HStack>
            )}

            {/* Discontinued Badge */}
            {developer.discontinued === 1 && (
              <Badge
                style={[
                  styles.discontinuedBadge,
                  { backgroundColor: '#ff6b6b' },
                ]}
              >
                <AlertTriangle size={10} color="#fff" />
                <BadgeText style={styles.discontinuedText}>
                  Discontinued
                </BadgeText>
              </Badge>
            )}
          </HStack>

          {/* Notes Preview */}
          {developer.notes && (
            <Text
              style={[styles.description, { color: textSecondary }]}
              numberOfLines={1}
            >
              {developer.notes}
            </Text>
          )}
        </VStack>
      </HStack>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 2,
    marginHorizontal: 8,
  },
  content: {
    padding: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  manufacturerName: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  developerName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  value: {
    fontSize: 12,
    fontWeight: '400',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  discontinuedBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  discontinuedText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#fff',
  },
  description: {
    fontSize: 11,
    lineHeight: 14,
  },
});
