import React from "react";
import {
  Platform,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Box, Text, Modal } from "@gluestack-ui/themed";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";
import { MobileSelectionModal } from "../select/MobileSelectionModal";
import type { Film, Developer } from "@/api/dorkroom/types";

export interface SearchDropdownItem {
  id: string;
  title: string;
  subtitle: string;
}

interface BaseSearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onItemSelect: (item: SearchDropdownItem) => void;
}

interface DesktopSearchDropdownProps extends BaseSearchDropdownProps {
  variant: "desktop";
  items: SearchDropdownItem[];
  position: "left" | "right";
  dynamicPosition?: {
    top: number;
    left: number;
    width: number;
  } | null;
}

interface MobileSearchDropdownProps extends BaseSearchDropdownProps {
  variant: "mobile";
  type: "film" | "developer" | "dilution";
  films?: Film[];
  developers?: Developer[];
  dilutionOptions?: { label: string; value: string }[];
  selectedDilution?: string;
  onFilmSelect?: (film: Film) => void;
  onDeveloperSelect?: (developer: Developer) => void;
  onDilutionSelect?: (value: string) => void;
}

type SearchDropdownProps =
  | DesktopSearchDropdownProps
  | MobileSearchDropdownProps;

export const SearchDropdown = React.memo(function SearchDropdown(
  props: SearchDropdownProps,
) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width > 768;

  // Colors and theme
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "borderColor");
  const cardBackground = useThemeColor({}, "cardBackground");

  const variant = props.variant || (isDesktop ? "desktop" : "mobile");

  // Sort items alphabetically by manufacturer (subtitle) - memoized for performance
  const sortedItems = React.useMemo(() => {
    if (variant === "desktop") {
      const desktopProps = props as DesktopSearchDropdownProps;
      return desktopProps.items
        .slice()
        .sort((a, b) => a.subtitle.localeCompare(b.subtitle));
    }
    return [];
  }, [
    variant,
    variant === "desktop" ? (props as DesktopSearchDropdownProps).items : [],
  ]);

  if (variant === "mobile") {
    const mobileProps = props as MobileSearchDropdownProps;
    return (
      <MobileSelectionModal
        isOpen={props.isOpen}
        onClose={props.onClose}
        type={mobileProps.type}
        films={mobileProps.films}
        developers={mobileProps.developers}
        dilutionOptions={mobileProps.dilutionOptions}
        onFilmSelect={(film) => {
          if (mobileProps.onFilmSelect) {
            mobileProps.onFilmSelect(film);
          } else {
            props.onItemSelect({
              id: film.uuid,
              title: film.name,
              subtitle: film.brand,
            });
          }
        }}
        onDeveloperSelect={(developer) => {
          if (mobileProps.onDeveloperSelect) {
            mobileProps.onDeveloperSelect(developer);
          } else {
            props.onItemSelect({
              id: developer.uuid,
              title: developer.name,
              subtitle: developer.manufacturer,
            });
          }
        }}
        onDilutionSelect={(dilution) => {
          if (mobileProps.onDilutionSelect) {
            mobileProps.onDilutionSelect(dilution.value);
          } else {
            props.onItemSelect({
              id: dilution.value,
              title: dilution.label,
              subtitle: dilution.value,
            });
          }
        }}
      />
    );
  }

  // Desktop variant
  const desktopProps = props as DesktopSearchDropdownProps;

  if (!isDesktop || sortedItems.length === 0 || !desktopProps.dynamicPosition) {
    return null;
  }

  const dynamicOverlayStyle = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    justifyContent: "flex-start" as const,
    alignItems: "flex-start" as const,
    paddingTop: desktopProps.dynamicPosition.top,
    paddingLeft: desktopProps.dynamicPosition.left,
    paddingRight: 0,
  };

  const dropdownWidth = desktopProps.dynamicPosition.width;

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} size="sm">
      <Box style={dynamicOverlayStyle} onTouchEnd={props.onClose}>
        <Box
          style={[
            styles.dropdownContent,
            {
              borderColor,
              backgroundColor: cardBackground,
              shadowColor: textColor,
              width: dropdownWidth,
            },
          ]}
        >
          <ScrollView
            style={styles.dropdownScroll}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {sortedItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.dropdownItem,
                  { borderBottomColor: borderColor },
                ]}
                onPress={() => props.onItemSelect(item)}
              >
                <Text style={[styles.dropdownItemTitle, { color: textColor }]}>
                  {item.title}
                </Text>
                <Text
                  style={[styles.dropdownItemSubtitle, { color: textColor }]}
                >
                  {item.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Box>
      </Box>
    </Modal>
  );
});

const styles = StyleSheet.create({
  dropdownContent: {
    borderWidth: 1,
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 200,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1000,
    overflow: "hidden",
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    backgroundColor: "transparent",
  },
  dropdownItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 20,
  },
  dropdownItemSubtitle: {
    fontSize: 13,
    opacity: 0.75,
    fontWeight: "500",
    lineHeight: 16,
  },
});
