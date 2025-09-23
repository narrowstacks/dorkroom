import { StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  BadgeText,
} from '@gluestack-ui/themed';
import {
  Camera,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  FileText,
  Package,
  Layers,
  X,
} from 'lucide-react-native';
import type { Film } from '@/api/dorkroom/types';
import { useThemeColor } from '@/hooks/useThemeColor';
import {
  getBrandKey,
  getFilmTypeColor,
  getContrastingTextColor,
} from '@/constants/brands';
import { Colors } from '@/constants/Colors';
import { formatFilmType } from '@/utils/filmTypeFormatter';

interface FilmDetailPanelProps {
  film: Film | null;
  onClose?: () => void;
}

export function FilmDetailPanel({ film, onClose }: FilmDetailPanelProps) {
  const { height } = useWindowDimensions();
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'borderColor');
  const backgroundColor = useThemeColor({}, 'background');

  if (!film) {
    return (
      <Box
        style={[
          styles.container,
          { backgroundColor: cardBackground, borderLeftColor: borderColor },
        ]}
      >
        <Box style={styles.emptyState}>
          <Info size={48} color={textSecondary} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>
            Select a Film
          </Text>
          <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
            Choose a film from the list to view detailed information
          </Text>
        </Box>
      </Box>
    );
  }

  // Get brand color from theme
  const colorScheme = backgroundColor === '#fff' ? 'light' : 'dark';
  const brandKey = getBrandKey(film.brand);
  const brandColorKey = `${brandKey}BrandColor` as keyof typeof Colors.light;
  const brandColor =
    Colors[colorScheme][brandColorKey] || Colors[colorScheme].genericBrandColor;

  // Get type color
  const typeColor = getFilmTypeColor(film.color_type || film.colorType);
  const typeTextColor = getContrastingTextColor(typeColor);

  // Calculate responsive image height (max 25% of window height, min 120px, max 300px)
  const imageHeight = Math.min(Math.max(height * 0.25, 120), 300);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const formatISO = (iso?: number) => {
    const isoValue = iso || film.iso_speed || film.isoSpeed;
    if (isoValue === undefined || isoValue === null || Number.isNaN(isoValue))
      return 'N/A';
    return isoValue.toString();
  };

  return (
    <Box
      style={[
        styles.container,
        { backgroundColor: cardBackground, borderLeftColor: borderColor },
      ]}
    >
      {/* Header */}
      <Box style={[styles.header, { borderBottomColor: borderColor }]}>
        <HStack
          space="md"
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Box style={{ flex: 1 }}>
            <Text style={[styles.title, { color: textSecondary }]}>
              {film.brand}
            </Text>
            <Text
              style={[styles.title, { color: textColor }]}
              numberOfLines={2}
            >
              {film.name}
            </Text>
          </Box>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={textSecondary} />
            </TouchableOpacity>
          )}
        </HStack>
      </Box>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Film Image */}
        {(film.static_image_url || film.staticImageURL) && (
          <VStack space="md" style={styles.section}>
            <Box
              style={[
                styles.imageContainer,
                { borderColor, height: imageHeight },
              ]}
            >
              <Image
                source={{ uri: film.static_image_url || film.staticImageURL }}
                style={styles.filmImage}
                resizeMode="contain"
              />
            </Box>
          </VStack>
        )}

        {/* Brand and Status */}
        <VStack space="md" style={styles.section}>
          <HStack space="sm" alignItems="center" style={{ flexWrap: 'wrap' }}>
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

            <Badge style={[styles.typeBadge, { backgroundColor: typeColor }]}>
              <BadgeText style={[styles.typeText, { color: typeTextColor }]}>
                {formatFilmType(film.color_type || film.colorType)}
              </BadgeText>
            </Badge>

            {film.discontinued === 1 && (
              <Badge
                style={[
                  styles.discontinuedBadge,
                  { backgroundColor: '#ff6b6b' },
                ]}
              >
                <AlertTriangle size={12} color="#fff" />
                <BadgeText style={styles.discontinuedText}>
                  Discontinued
                </BadgeText>
              </Badge>
            )}
          </HStack>
        </VStack>

        {/* Basic Information */}
        <VStack space="md" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Basic Information
          </Text>

          <VStack space="sm">
            <HStack space="sm" alignItems="center">
              <Camera size={16} color={textSecondary} />
              <Text style={[styles.detailLabel, { color: textSecondary }]}>
                ISO Speed:
              </Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {formatISO()}
              </Text>
            </HStack>

            <HStack space="sm" alignItems="center">
              <Package size={16} color={textSecondary} />
              <Text style={[styles.detailLabel, { color: textSecondary }]}>
                Film Type:
              </Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {formatFilmType(film.color_type || film.colorType)}
              </Text>
            </HStack>

            <HStack space="sm" alignItems="center">
              <Calendar size={16} color={textSecondary} />
              <Text style={[styles.detailLabel, { color: textSecondary }]}>
                Date Added:
              </Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {formatDate(film.date_added || film.dateAdded)}
              </Text>
            </HStack>
          </VStack>
        </VStack>

        {/* Description */}
        {film.description && (
          <VStack space="md" style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Description
            </Text>
            <Text style={[styles.description, { color: textSecondary }]}>
              {film.description}
            </Text>
          </VStack>
        )}

        {/* Technical Details */}
        <VStack space="md" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Technical Details
          </Text>

          <VStack space="sm">
            {(film.grain_structure || film.grainStructure) && (
              <HStack space="sm" alignItems="flex-start">
                <Layers
                  size={16}
                  color={textSecondary}
                  style={{ marginTop: 2 }}
                />
                <VStack space="xs" style={{ flex: 1 }}>
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>
                    Grain Structure:
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {film.grain_structure || film.grainStructure}
                  </Text>
                </VStack>
              </HStack>
            )}

            {(film.reciprocity_failure || film.reciprocityFailure) && (
              <HStack space="sm" alignItems="flex-start">
                <Clock
                  size={16}
                  color={textSecondary}
                  style={{ marginTop: 2 }}
                />
                <VStack space="xs" style={{ flex: 1 }}>
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>
                    Reciprocity Failure:
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {film.reciprocity_failure || film.reciprocityFailure}{' '}
                  </Text>
                </VStack>
              </HStack>
            )}

            {/* Manufacturer Notes */}
            {Array.isArray(film.manufacturer_notes || film.manufacturerNotes) &&
              (film.manufacturer_notes || film.manufacturerNotes).length >
                0 && (
                <HStack space="sm" alignItems="flex-start">
                  <FileText
                    size={16}
                    color={textSecondary}
                    style={{ marginTop: 2 }}
                  />
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text
                      style={[styles.detailLabel, { color: textSecondary }]}
                    >
                      Qualities:
                    </Text>
                    <HStack space="xs" style={{ flexWrap: 'wrap' }}>
                      {(film.manufacturer_notes || film.manufacturerNotes).map(
                        (note, index) => (
                          <Box
                            key={index}
                            style={[
                              styles.noteTag,
                              { backgroundColor: brandColor },
                            ]}
                          >
                            <Text
                              style={[
                                styles.noteTagText,
                                { color: getContrastingTextColor(brandColor) },
                              ]}
                            >
                              {note}
                            </Text>
                          </Box>
                        )
                      )}
                    </HStack>
                  </VStack>
                </HStack>
              )}
          </VStack>
        </VStack>

        {/* Technical IDs */}
        <VStack space="md" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Technical Information
          </Text>
          <VStack space="sm">
            <HStack space="sm" alignItems="center">
              <Info size={16} color={textSecondary} />
              <Text style={[styles.detailLabel, { color: textSecondary }]}>
                UUID:
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: textColor, fontFamily: 'monospace', fontSize: 12 },
                ]}
              >
                {film.uuid}
              </Text>
            </HStack>
            <HStack space="sm" alignItems="center">
              <Info size={16} color={textSecondary} />
              <Text style={[styles.detailLabel, { color: textSecondary }]}>
                Slug:
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: textColor, fontFamily: 'monospace', fontSize: 12 },
                ]}
              >
                {film.slug}
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderLeftWidth: 1,
  },
  imageContainer: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filmImage: {
    width: '100%',
    height: '100%',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  brandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  discontinuedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
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
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 90,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '400',
    flex: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteCard: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
  },
  noteTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  noteTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
