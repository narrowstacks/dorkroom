import React from "react";
import { StyleSheet, TouchableOpacity, Image } from "react-native";
import {
  Box,
  Text,
  HStack,
  VStack,
  Badge,
  BadgeText,
} from "@gluestack-ui/themed";
import { Camera, AlertTriangle } from "lucide-react-native";
import type { Film } from "@/api/dorkroom/types";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  getBrandKey,
  getFilmTypeColor,
  getContrastingTextColor,
} from "@/constants/brands";
import { Colors } from "@/constants/Colors";
import { formatFilmType } from "@/utils/filmTypeFormatter";

interface FilmListItemProps {
  film: Film;
  isSelected?: boolean;
  onPress?: (film: Film) => void;
}

export function FilmListItem({
  film,
  isSelected = false,
  onPress,
}: FilmListItemProps) {
  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "borderColor");
  const backgroundColor = useThemeColor({}, "background");
  const infobaseTint = useThemeColor({}, "infobaseTint");

  // Get brand color from theme
  const colorScheme = backgroundColor === "#fff" ? "light" : "dark";
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

  const formatISO = (iso?: number) => {
    const isoValue = iso || film.iso_speed || film.isoSpeed;
    if (isoValue === undefined || isoValue === null || Number.isNaN(isoValue))
      return "N/A";
    return isoValue.toString();
  };

  const imageUrl = film.static_image_url || film.staticImageURL;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isSelected ? infobaseTint + "15" : cardBackground,
          borderColor: isSelected ? infobaseTint : borderColor,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <HStack space="md" alignItems="center" style={styles.content}>
        {/* Film Image */}
        <Box style={[styles.imageContainer, { borderColor }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <Box
              style={[
                styles.imagePlaceholder,
                { backgroundColor: brandColor + "20" },
              ]}
            >
              <Camera size={20} color={brandColor} />
            </Box>
          )}
        </Box>

        {/* Film Info */}
        <VStack space="xs" style={styles.infoContainer}>
          {/* Brand and Name */}
          <HStack space="sm" alignItems="center">
            <Box style={[styles.brandBadge, { backgroundColor: brandColor }]}>
              <Text
                style={[
                  styles.brandName,
                  { color: getContrastingTextColor(brandColor) },
                ]}
              >
                {film.brand}
              </Text>
            </Box>
            <Text style={[styles.filmName, { color: textColor }]}>
              {film.name}
            </Text>
          </HStack>

          {/* Details Row */}
          <HStack space="md" alignItems="center">
            {/* ISO */}
            <HStack space="xs" alignItems="center">
              <Text style={[styles.label, { color: textSecondary }]}>ISO</Text>
              <Text style={[styles.value, { color: textColor }]}>
                {formatISO()}
              </Text>
            </HStack>

            {/* Type Badge */}
            <Badge style={[styles.typeBadge, { backgroundColor: typeColor }]}>
              <BadgeText style={[styles.typeText, { color: typeTextColor }]}>
                {formatFilmType(film.color_type || film.colorType)}
              </BadgeText>
            </Badge>

            {/* Discontinued Badge */}
            {film.discontinued === 1 && (
              <Badge
                style={[
                  styles.discontinuedBadge,
                  { backgroundColor: "#ff6b6b" },
                ]}
              >
                <AlertTriangle size={10} color="#fff" />
                <BadgeText style={styles.discontinuedText}>
                  Discontinued
                </BadgeText>
              </Badge>
            )}
          </HStack>

          {/* Description Preview */}
          {film.description && (
            <Text
              style={[styles.description, { color: textSecondary }]}
              numberOfLines={1}
            >
              {film.description}
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
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
  },
  brandBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  brandName: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  filmName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
  value: {
    fontSize: 12,
    fontWeight: "400",
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  discontinuedBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  discontinuedText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#fff",
  },
  description: {
    fontSize: 11,
    lineHeight: 14,
  },
});
