import React, { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, Image } from 'react-native';
import {
  Box,
  Text,
  HStack,
  VStack,
  Badge,
  BadgeText,
} from '@gluestack-ui/themed';
import {
  Camera,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import type { Film } from '@/api/dorkroom/types';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import {
  getBrandKey,
  getFilmTypeColor,
  getContrastingTextColor,
} from '@/constants/brands';
import { Colors } from '@/constants/Colors';
import { formatFilmType } from '@/utils/filmTypeFormatter';

interface FilmCardProps {
  film: Film;
  onPress?: (film: Film) => void;
  variant?: 'default' | 'compact';
}

export function FilmCard({
  film,
  onPress,
  variant = 'default',
}: FilmCardProps) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;
  const [showNotes, setShowNotes] = useState(false);

  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'borderColor');
  const shadowColor = useThemeColor({}, 'shadowColor');

  // Get brand color from theme
  const colorScheme =
    useThemeColor({}, 'background') === '#fff' ? 'light' : 'dark';
  const brandKey = getBrandKey(film.brand);
  const brandColorKey = `${brandKey}BrandColor` as keyof typeof Colors.light;
  const brandColor =
    Colors[colorScheme][brandColorKey] || Colors[colorScheme].genericBrandColor;

  // Get type color
  const typeColor = getFilmTypeColor(film.color_type || film.colorType);
  const typeTextColor = getContrastingTextColor(typeColor);

  const handlePress = () => {
    if (onPress) {
      onPress(film);
    }
  };

  const cardStyle = {
    backgroundColor: cardBackground,
    borderColor,
    shadowColor,
    borderWidth: 1,
    borderRadius: 12,
    padding: variant === 'compact' ? 12 : 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...(isDesktop && {
      maxWidth: variant === 'compact' ? 280 : 320,
    }),
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const formatISO = (iso?: number) => {
    // Handle both camelCase and snake_case
    const isoValue = iso || film.iso_speed || film.isoSpeed;
    if (isoValue === undefined || isoValue === null || Number.isNaN(isoValue))
      return 'N/A';
    return isoValue.toString();
  };

  const Component = onPress ? TouchableOpacity : Box;

  return (
    <Component
      style={cardStyle}
      onPress={onPress ? handlePress : undefined}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Film Image */}
      {(film.static_image_url || film.staticImageURL) && (
        <Box style={[styles.imageContainer, { borderColor }]}>
          <Image
            source={{ uri: film.static_image_url || film.staticImageURL }}
            style={styles.filmImage}
            resizeMode="cover"
          />
        </Box>
      )}

      {/* Film Name with Brand Badge */}
      <HStack space="sm" alignItems="center" style={styles.nameContainer}>
        <Box style={[styles.brandBadge, { backgroundColor: brandColor }]}>
          <Text
            style={[
              styles.brandText,
              { color: getContrastingTextColor(brandColor) },
            ]}
          >
            {film.brand}
          </Text>
        </Box>
        <Text style={[styles.filmName, { color: textColor }]} numberOfLines={1}>
          {film.name}
        </Text>
        {film.discontinued === 1 && (
          <Badge
            style={[styles.discontinuedBadge, { backgroundColor: '#ff6b6b' }]}
          >
            <AlertTriangle size={12} color="#fff" />
            <BadgeText style={styles.discontinuedText}>Discontinued</BadgeText>
          </Badge>
        )}
      </HStack>

      {/* Film Details */}
      <VStack space="xs" style={styles.detailsContainer}>
        {/* ISO and Type */}
        <HStack space="md" alignItems="center">
          <HStack space="xs" alignItems="center">
            <Camera size={14} color={textSecondary} />
            <Text style={[styles.detailText, { color: textSecondary }]}>
              ISO {formatISO()}
            </Text>
          </HStack>

          <Badge style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <BadgeText style={[styles.typeText, { color: typeTextColor }]}>
              {formatFilmType(film.color_type || film.colorType)}
            </BadgeText>
          </Badge>
        </HStack>

        {/* Description */}
        {film.description && variant !== 'compact' && (
          <Text
            style={[styles.description, { color: textSecondary }]}
            numberOfLines={2}
          >
            {film.description}
          </Text>
        )}

        {/* Additional Details */}
        {variant !== 'compact' && (
          <VStack space="xs">
            {/* Grain Structure */}
            {(film.grain_structure || film.grainStructure) && (
              <HStack space="xs" alignItems="center">
                <Info size={12} color={textSecondary} />
                <Text
                  style={[styles.smallDetailText, { color: textSecondary }]}
                >
                  Grain: {film.grain_structure || film.grainStructure}
                </Text>
              </HStack>
            )}

            {/* Reciprocity Failure */}
            {(film.reciprocity_failure || film.reciprocityFailure) && (
              <HStack space="xs" alignItems="center">
                <Clock size={12} color={textSecondary} />
                <Text
                  style={[styles.smallDetailText, { color: textSecondary }]}
                >
                  Reciprocity:{' '}
                  {film.reciprocity_failure || film.reciprocityFailure}s
                </Text>
              </HStack>
            )}

            {/* Date Added */}
            <HStack space="xs" alignItems="center">
              <Calendar size={12} color={textSecondary} />
              <Text style={[styles.smallDetailText, { color: textSecondary }]}>
                Added {formatDate(film.date_added || film.dateAdded)}
              </Text>
            </HStack>
          </VStack>
        )}
      </VStack>

      {/* Manufacturer Notes Section */}
      {Array.isArray(film.manufacturer_notes || film.manufacturerNotes) &&
        (film.manufacturer_notes || film.manufacturerNotes).length > 0 && (
          <VStack space="xs" style={styles.notesSection}>
            <TouchableOpacity
              onPress={() => setShowNotes(!showNotes)}
              style={styles.notesToggle}
            >
              <HStack space="xs" alignItems="center">
                <Text style={[styles.notesCount, { color: textSecondary }]}>
                  {(film.manufacturer_notes || film.manufacturerNotes).length}{' '}
                  note
                  {(film.manufacturer_notes || film.manufacturerNotes)
                    .length !== 1
                    ? 's'
                    : ''}
                </Text>
                {showNotes ? (
                  <ChevronUp size={14} color={textSecondary} />
                ) : (
                  <ChevronDown size={14} color={textSecondary} />
                )}
              </HStack>
            </TouchableOpacity>

            {showNotes && (
              <VStack space="xs" style={styles.notesList}>
                {(film.manufacturer_notes || film.manufacturerNotes).map(
                  (note, index) => (
                    <Text
                      key={index}
                      style={[styles.noteText, { color: textSecondary }]}
                    >
                      • {note}
                    </Text>
                  )
                )}
              </VStack>
            )}
          </VStack>
        )}
    </Component>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  filmImage: {
    width: '100%',
    height: '100%',
  },
  nameContainer: {
    marginBottom: 8,
  },
  brandBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 1,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  discontinuedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discontinuedText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#fff',
  },
  filmName: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    flex: 1,
  },
  detailsContainer: {
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  smallDetailText: {
    fontSize: 11,
    fontWeight: '400',
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  notesToggle: {
    paddingVertical: 4,
  },
  notesCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  notesList: {
    paddingLeft: 8,
    marginTop: 4,
  },
  noteText: {
    fontSize: 10,
    lineHeight: 14,
  },
});

export default FilmCard;
