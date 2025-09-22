import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import {
  Box,
  Text,
  VStack,
  Modal,
  ModalBackdrop,
  ModalContent,
  FlatList,
} from "@gluestack-ui/themed";
import { Search, X } from "lucide-react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useDebounce } from "@/hooks/useDebounce";
import type { Film, Developer } from "@/api/dorkroom/types";

interface DilutionOption {
  label: string;
  value: string;
}

interface MobileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "film" | "developer" | "dilution";
  films?: Film[];
  developers?: Developer[];
  dilutionOptions?: DilutionOption[];
  onFilmSelect?: (film: Film) => void;
  onDeveloperSelect?: (developer: Developer) => void;
  onDilutionSelect?: (dilution: DilutionOption) => void;
}

export function MobileSelectionModal({
  isOpen,
  onClose,
  type,
  films = [],
  developers = [],
  dilutionOptions = [],
  onFilmSelect,
  onDeveloperSelect,
  onDilutionSelect,
}: MobileSelectionModalProps) {
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText, 300);
  const textColor = useThemeColor({}, "text");
  const cardBackground = useThemeColor({}, "cardBackground");
  const borderColor = useThemeColor({}, "borderColor");

  const filteredItems = React.useMemo(() => {
    let items: (Film | Developer | DilutionOption)[];
    if (type === "film") {
      items = films;
    } else if (type === "developer") {
      items = developers;
    } else {
      items = dilutionOptions;
    }

    let filtered = items;
    if (debouncedSearchText.trim()) {
      filtered = items.filter((item) => {
        if (type === "film") {
          const film = item as Film;
          return (
            film.name
              .toLowerCase()
              .includes(debouncedSearchText.toLowerCase()) ||
            film.brand.toLowerCase().includes(debouncedSearchText.toLowerCase())
          );
        } else if (type === "developer") {
          const dev = item as Developer;
          return (
            dev.name
              .toLowerCase()
              .includes(debouncedSearchText.toLowerCase()) ||
            dev.manufacturer
              .toLowerCase()
              .includes(debouncedSearchText.toLowerCase())
          );
        } else {
          const dilution = item as DilutionOption;
          return (
            dilution.label
              .toLowerCase()
              .includes(debouncedSearchText.toLowerCase()) ||
            dilution.value
              .toLowerCase()
              .includes(debouncedSearchText.toLowerCase())
          );
        }
      });
    }

    // Limit results for better performance - show top 100 results on mobile
    return filtered.slice(0, 100);
  }, [type, films, developers, dilutionOptions, debouncedSearchText]);

  const handleSelect = (item: Film | Developer | DilutionOption) => {
    if (type === "film" && onFilmSelect) {
      onFilmSelect(item as Film);
    } else if (type === "developer" && onDeveloperSelect) {
      onDeveloperSelect(item as Developer);
    } else if (type === "dilution" && onDilutionSelect) {
      onDilutionSelect(item as DilutionOption);
    }
    setSearchText("");
    onClose();
  };

  const renderItem = ({ item }: { item: any }) => {
    let title: string;
    let subtitle: string;

    if (type === "film") {
      const film = item as Film;
      title = film.name;
      subtitle = film.brand;
    } else if (type === "developer") {
      const dev = item as Developer;
      title = dev.name;
      subtitle = dev.manufacturer;
    } else {
      const dilution = item as DilutionOption;
      title = dilution.label;
      subtitle = dilution.value;
    }

    return (
      <TouchableOpacity
        style={[styles.selectionItem, { borderBottomColor: borderColor }]}
        onPress={() => handleSelect(item)}
      >
        <VStack space="xs">
          <Text style={[styles.selectionItemTitle, { color: textColor }]}>
            {title}
          </Text>
          <Text
            style={[
              styles.selectionItemSubtitle,
              { color: textColor, opacity: 0.7 },
            ]}
          >
            {subtitle}
          </Text>
        </VStack>
      </TouchableOpacity>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalBackdrop />
      <ModalContent
        style={{
          backgroundColor: cardBackground,
          margin: 0,
          marginTop: 80,
          maxHeight: "100%",
          flex: 1,
        }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Search Box with Close Button */}
          <Box
            style={[
              styles.modalSearchContainer,
              {
                borderBottomColor: borderColor,
                backgroundColor: cardBackground,
                zIndex: 1000,
              },
            ]}
          >
            <Box style={styles.modalSearchInputContainer}>
              <Search
                size={20}
                color={textColor}
                style={styles.modalSearchIcon}
              />
              <TextInput
                style={[
                  styles.modalSearchInput,
                  { color: textColor, borderColor },
                ]}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={`Search ${type === "film" ? "films" : type === "developer" ? "developers" : "dilutions"}...`}
                placeholderTextColor={textColor + "80"}
                autoFocus
                returnKeyType="search"
              />
              <TouchableOpacity
                onPress={() => setSearchText("")}
                style={[
                  styles.modalClearButton,
                  {
                    backgroundColor: textColor + "40",
                    opacity: searchText.length > 0 ? 1 : 0,
                    pointerEvents: searchText.length > 0 ? "auto" : "none",
                  },
                ]}
              >
                <Text
                  style={[styles.modalClearButtonText, { color: textColor }]}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            </Box>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <X size={22} color={textColor} />
            </TouchableOpacity>
          </Box>

          {/* Results List */}
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => {
              if (type === "dilution") {
                return (item as DilutionOption).value;
              }
              return (item as Film | Developer).uuid;
            }}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => (
              <Box
                style={{
                  height: 1,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                }}
              />
            )}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        </SafeAreaView>
      </ModalContent>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
    elevation: 5, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalSearchInputContainer: {
    flex: 1,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  modalSearchIcon: {
    position: "absolute",
    left: 12,
    zIndex: 1,
  },
  modalSearchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 16,
  },
  modalClearButton: {
    position: "absolute",
    right: 8,
    zIndex: 1,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalClearButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  modalCloseButton: {
    padding: 8,
  },
  selectionItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  selectionItemTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  selectionItemSubtitle: {
    fontSize: 14,
    fontWeight: "400",
  },
});
