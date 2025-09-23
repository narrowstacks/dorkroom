import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  BadgeText,
  Modal,
  ModalBackdrop,
  ModalContent,
} from '@gluestack-ui/themed';
import {
  X,
  Camera,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  FileText,
  Package,
  Layers,
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

interface FilmDetailModalProps {
  film: Film | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FilmDetailModal({
  film,
  isOpen,
  onClose,
}: FilmDetailModalProps) {
  const { height } = useWindowDimensions();
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'borderColor');
  const backgroundColor = useThemeColor({}, 'background');

  if (!film) return null;

  // Get brand color from theme
  const colorScheme = backgroundColor === '#fff' ? 'light' : 'dark';
  const brandKey = getBrandKey(film.brand);
  const brandColorKey = `${brandKey}BrandColor` as keyof typeof Colors.light;
  const brandColor =
    Colors[colorScheme][brandColorKey] || Colors[colorScheme].genericBrandColor;

  // Get type color
  const typeColor = getFilmTypeColor(film.color_type || film.colorType);
  const typeTextColor = getContrastingTextColor(typeColor);

  // Calculate responsive image height (max 30% of window height for mobile, min 150px, max 400px)
  const imageHeight = Math.min(Math.max(height * 0.3, 150), 400);

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
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalBackdrop />
      <ModalContent
        style={{
          backgroundColor: cardBackground,
          margin: 0,
          maxHeight: '100%',
          flex: 1,
        }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <Box style={[styles.header, { borderBottomColor: borderColor }]}>
            <HStack
              space="md"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box style={{ flex: 1 }}>
                <Text
                  style={[styles.modalTitle, { color: textColor }]}
                  numberOfLines={2}
                >
                  {film.name}
                </Text>
                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                  {film.brand}
                </Text>
              </Box>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={textColor} />
              </TouchableOpacity>
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
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Film Image
                </Text>
                <Box
                  style={[
                    styles.imageContainer,
                    { borderColor, height: imageHeight },
                  ]}
                >
                  <Image
                    source={{
                      uri: film.static_image_url || film.staticImageURL,
                    }}
                    style={styles.filmImage}
                    resizeMode="contain"
                  />
                </Box>
              </VStack>
            )}

            {/* Brand and Status */}
            <VStack space="md" style={styles.section}>
              <HStack
                space="sm"
                alignItems="center"
                style={{ flexWrap: 'wrap' }}
              >
                <Box
                  style={[styles.brandBadge, { backgroundColor: brandColor }]}
                >
                  <Text
                    style={[
                      styles.brandText,
                      { color: getContrastingTextColor(brandColor) },
                    ]}
                  >
                    {film.brand}
                  </Text>
                </Box>

                <Badge
                  style={[styles.typeBadge, { backgroundColor: typeColor }]}
                >
                  <BadgeText
                    style={[styles.typeText, { color: typeTextColor }]}
                  >
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
                    <AlertTriangle size={14} color="#fff" />
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
                  <Camera size={18} color={textSecondary} />
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>
                    ISO Speed:
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {formatISO()}
                  </Text>
                </HStack>

                <HStack space="sm" alignItems="center">
                  <Package size={18} color={textSecondary} />
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>
                    Film Type:
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {formatFilmType(film.color_type || film.colorType)}
                  </Text>
                </HStack>

                <HStack space="sm" alignItems="center">
                  <Calendar size={18} color={textSecondary} />
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
                      size={18}
                      color={textSecondary}
                      style={{ marginTop: 2 }}
                    />
                    <VStack space="xs" style={{ flex: 1 }}>
                      <Text
                        style={[styles.detailLabel, { color: textSecondary }]}
                      >
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
                      size={18}
                      color={textSecondary}
                      style={{ marginTop: 2 }}
                    />
                    <VStack space="xs" style={{ flex: 1 }}>
                      <Text
                        style={[styles.detailLabel, { color: textSecondary }]}
                      >
                        Reciprocity Failure:
                      </Text>
                      <Text style={[styles.detailValue, { color: textColor }]}>
                        {film.reciprocity_failure || film.reciprocityFailure}
                      </Text>
                    </VStack>
                  </HStack>
                )}

                {/* Manufacturer Notes */}
                {Array.isArray(
                  film.manufacturer_notes || film.manufacturerNotes
                ) &&
                  (film.manufacturer_notes || film.manufacturerNotes).length >
                    0 && (
                    <HStack space="sm" alignItems="flex-start">
                      <FileText
                        size={18}
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
                          {(
                            film.manufacturer_notes || film.manufacturerNotes
                          ).map((note, index) => (
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
                                  {
                                    color: getContrastingTextColor(brandColor),
                                  },
                                ]}
                              >
                                {note}
                              </Text>
                            </Box>
                          ))}
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
                  <Info size={18} color={textSecondary} />
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>
                    UUID:
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: textColor, fontFamily: 'monospace' },
                    ]}
                  >
                    {film.uuid}
                  </Text>
                </HStack>
                <HStack space="sm" alignItems="center">
                  <Info size={18} color={textSecondary} />
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>
                    Slug:
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: textColor, fontFamily: 'monospace' },
                    ]}
                  >
                    {film.slug}
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </ScrollView>
        </SafeAreaView>
      </ModalContent>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  imageContainer: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filmImage: {
    width: '100%',
    height: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  brandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  brandText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  discontinuedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discontinuedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  noteCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  noteTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
