import React from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
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
  Beaker,
  Calendar,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  Droplets,
  Info,
  ExternalLink,
  Package,
  Layers,
} from 'lucide-react-native';
import type { Developer } from '@/api/dorkroom/types';
import { useThemeColor } from '@/hooks/useThemeColor';
import {
  getBrandKey,
  getDeveloperTypeColor,
  getContrastingTextColor,
} from '@/constants/brands';
import { Colors } from '@/constants/Colors';

interface DeveloperDetailModalProps {
  developer: Developer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeveloperDetailModal({
  developer,
  isOpen,
  onClose,
}: DeveloperDetailModalProps) {
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'borderColor');
  const infobaseTint = useThemeColor({}, 'infobaseTint');
  const backgroundColor = useThemeColor({}, 'background');

  if (!developer) return null;

  // Get brand color from theme
  const colorScheme = backgroundColor === '#fff' ? 'light' : 'dark';
  const brandKey = getBrandKey(developer.manufacturer);
  const brandColorKey = `${brandKey}BrandColor` as keyof typeof Colors.light;
  const brandColor =
    Colors[colorScheme][brandColorKey] || Colors[colorScheme].genericBrandColor;

  // Get type color
  const typeColor = getDeveloperTypeColor(developer.type);
  const typeTextColor = getContrastingTextColor(typeColor);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const formatLifetime = (value: number | null | undefined, unit: string) => {
    if (!value) return 'N/A';
    return `${value} ${unit}${value !== 1 ? 's' : ''}`;
  };

  const handleDatasheetPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening datasheet URL:', error);
    }
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
                  {developer.name}
                </Text>
                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                  {developer.manufacturer}
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
                    {developer.manufacturer}
                  </Text>
                </Box>

                <Badge
                  style={[styles.typeBadge, { backgroundColor: typeColor }]}
                >
                  <BadgeText
                    style={[styles.typeText, { color: typeTextColor }]}
                  >
                    {developer.type}
                  </BadgeText>
                </Badge>

                {developer.discontinued === 1 && (
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
                  <Package size={18} color={textSecondary} />
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>
                    Type:
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {developer.type}
                  </Text>
                </HStack>

                <HStack space="sm" alignItems="center">
                  <Beaker size={18} color={textSecondary} />
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>
                    For:
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {developer.filmOrPaper}
                  </Text>
                </HStack>

                <HStack space="sm" alignItems="center">
                  <Calendar size={18} color={textSecondary} />
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>
                    Date Added:
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {formatDate(developer.dateAdded)}
                  </Text>
                </HStack>
              </VStack>
            </VStack>

            {/* Dilutions */}
            {developer.dilutions.length > 0 && (
              <VStack space="md" style={styles.section}>
                <HStack space="sm" alignItems="center">
                  <Droplets size={18} color={textColor} />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>
                    Available Dilutions
                  </Text>
                </HStack>

                <VStack space="sm">
                  {developer.dilutions.map((dilution, index) => (
                    <Box
                      key={dilution.id}
                      style={[
                        styles.dilutionCard,
                        { backgroundColor: cardBackground, borderColor },
                      ]}
                    >
                      <HStack
                        space="sm"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Text
                          style={[styles.dilutionName, { color: textColor }]}
                        >
                          {dilution.name}
                        </Text>
                        <Badge
                          style={[
                            styles.dilutionBadge,
                            { backgroundColor: infobaseTint },
                          ]}
                        >
                          <BadgeText
                            style={[styles.dilutionText, { color: '#fff' }]}
                          >
                            {dilution.dilution}
                          </BadgeText>
                        </Badge>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            )}

            {/* Lifetime Information */}
            {(developer.workingLifeHours || developer.stockLifeMonths) && (
              <VStack space="md" style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Lifetime Information
                </Text>

                <VStack space="sm">
                  {developer.workingLifeHours && (
                    <HStack space="sm" alignItems="center">
                      <Clock size={18} color={textSecondary} />
                      <Text
                        style={[styles.detailLabel, { color: textSecondary }]}
                      >
                        Working Life:
                      </Text>
                      <Text style={[styles.detailValue, { color: textColor }]}>
                        {formatLifetime(developer.workingLifeHours, 'hour')}
                      </Text>
                    </HStack>
                  )}

                  {developer.stockLifeMonths && (
                    <HStack space="sm" alignItems="center">
                      <Shield size={18} color={textSecondary} />
                      <Text
                        style={[styles.detailLabel, { color: textSecondary }]}
                      >
                        Stock Life:
                      </Text>
                      <Text style={[styles.detailValue, { color: textColor }]}>
                        {formatLifetime(developer.stockLifeMonths, 'month')}
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </VStack>
            )}

            {/* Notes */}
            {developer.notes && (
              <VStack space="md" style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Notes
                </Text>
                <Text style={[styles.description, { color: textSecondary }]}>
                  {developer.notes}
                </Text>
              </VStack>
            )}

            {/* Mixing Instructions */}
            {developer.mixingInstructions && (
              <VStack space="md" style={styles.section}>
                <HStack space="sm" alignItems="center">
                  <Layers size={18} color={textColor} />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>
                    Mixing Instructions
                  </Text>
                </HStack>
                <Box
                  style={[
                    styles.instructionCard,
                    { backgroundColor: cardBackground, borderColor },
                  ]}
                >
                  <Text style={[styles.description, { color: textSecondary }]}>
                    {developer.mixingInstructions}
                  </Text>
                </Box>
              </VStack>
            )}

            {/* Safety Notes */}
            {developer.safetyNotes && (
              <VStack space="md" style={styles.section}>
                <HStack space="sm" alignItems="center">
                  <Shield size={18} color="#ff6b6b" />
                  <Text style={[styles.sectionTitle, { color: '#ff6b6b' }]}>
                    Safety Information
                  </Text>
                </HStack>
                <Box
                  style={[
                    styles.safetyCard,
                    { backgroundColor: '#fff5f5', borderColor: '#ff6b6b' },
                  ]}
                >
                  <Text style={[styles.description, { color: '#dc2626' }]}>
                    {developer.safetyNotes}
                  </Text>
                </Box>
              </VStack>
            )}

            {/* Datasheets */}
            {developer.datasheetUrl && developer.datasheetUrl.length > 0 && (
              <VStack space="md" style={styles.section}>
                <HStack space="sm" alignItems="center">
                  <FileText size={18} color={textColor} />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>
                    Datasheets
                  </Text>
                </HStack>

                <VStack space="sm">
                  {developer.datasheetUrl.map((url, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.datasheetCard,
                        { backgroundColor: cardBackground, borderColor },
                      ]}
                      onPress={() => handleDatasheetPress(url)}
                    >
                      <HStack
                        space="sm"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Text
                          style={[
                            styles.datasheetText,
                            { color: infobaseTint },
                          ]}
                        >
                          View Datasheet {index + 1}
                        </Text>
                        <ExternalLink size={16} color={infobaseTint} />
                      </HStack>
                    </TouchableOpacity>
                  ))}
                </VStack>
              </VStack>
            )}

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
                    {developer.uuid}
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
                    {developer.slug}
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
  dilutionCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dilutionName: {
    fontSize: 14,
    fontWeight: '500',
  },
  dilutionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dilutionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  instructionCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  safetyCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  datasheetCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  datasheetText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
