import React, { useState } from "react";
import { TouchableOpacity } from "react-native";
import { Box, Text, HStack, VStack, Switch } from "@gluestack-ui/themed";
import { FormGroup } from "@/components/ui/forms/FormSection";
import { NumberInput, TextInput } from "@/components/ui/forms";
import { SearchInput, SearchDropdown } from "@/components/ui/search";
import { useThemeColor } from "@/hooks/useThemeColor";

import type {
  CustomRecipeFormData,
  CustomFilmData,
} from "@/types/customRecipeTypes";
import type { Film } from "@/api/dorkroom/types";

interface RecipeIdentityStepProps {
  formData: CustomRecipeFormData;
  updateFormData: (updates: Partial<CustomRecipeFormData>) => void;
  updateCustomFilm: (updates: Partial<CustomFilmData>) => void;
  filmOptions: { label: string; value: string }[];
  allFilms: Film[];
  isDesktop?: boolean;
}

/**
 * RecipeIdentityStep Component
 *
 * First step of the recipe creation process. Handles recipe naming and film selection.
 * This step focuses on the basic identity of the recipe - what it's called and what film it's for.
 *
 * @param formData - Current form data state
 * @param updateFormData - Function to update form data
 * @param updateCustomFilm - Function to update custom film data
 * @param filmOptions - Available films for selection dropdown
 * @param allFilms - All films for search functionality
 * @param isDesktop - Whether running on desktop layout
 */
export function RecipeIdentityStep({
  formData,
  updateFormData,
  updateCustomFilm,
  filmOptions,
  allFilms,
  isDesktop = false,
}: RecipeIdentityStepProps) {
  const textColor = useThemeColor({}, "text");

  // State for film search and dropdown
  const [filmSearch, setFilmSearch] = useState("");
  const [isFilmSearchFocused, setIsFilmSearchFocused] = useState(false);
  const [filmSearchPosition, setFilmSearchPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Add refs for position tracking
  const filmSearchRef = React.useRef<any>(null);

  // Get selected film object
  const selectedFilm =
    allFilms.find((film) => film.uuid === formData.selectedFilmId) || null;

  // Ensure custom film is always black and white
  React.useEffect(() => {
    if (
      !formData.useExistingFilm &&
      formData.customFilm &&
      formData.customFilm.colorType !== "bw"
    ) {
      updateCustomFilm({ colorType: "bw" });
    }
  }, [formData.useExistingFilm, formData.customFilm, updateCustomFilm]);

  // Film suggestions for desktop search dropdown
  const filteredFilms = React.useMemo(() => {
    if (!isFilmSearchFocused) return [];
    if (!filmSearch.trim()) return allFilms;
    return allFilms.filter(
      (film) =>
        film.name.toLowerCase().includes(filmSearch.toLowerCase()) ||
        film.brand.toLowerCase().includes(filmSearch.toLowerCase()),
    );
  }, [allFilms, filmSearch, isFilmSearchFocused]);

  // Convert to SearchDropdownItem format
  const filmDropdownItems = React.useMemo(
    () =>
      filteredFilms.map((film) => ({
        id: film.uuid,
        title: film.name,
        subtitle: film.brand,
      })),
    [filteredFilms],
  );

  // Handle dropdown item selection
  const handleFilmDropdownSelect = (item: {
    id: string;
    title: string;
    subtitle: string;
  }) => {
    const film = allFilms.find((f) => f.uuid === item.id);
    if (film) {
      updateFormData({ selectedFilmId: film.uuid });
      setFilmSearch("");
      setIsFilmSearchFocused(false);
    }
  };

  // Handle layout for dynamic positioning
  const handleFilmSearchLayout = () => {
    if (filmSearchRef.current && isDesktop) {
      filmSearchRef.current.measure(
        (
          x: number,
          y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number,
        ) => {
          setFilmSearchPosition({
            top: pageY + height,
            left: pageX,
            width: width,
          });
        },
      );
    }
  };

  return (
    <VStack space="lg">
      {/* Recipe Name */}
      <FormGroup label="Recipe Name">
        <TextInput
          value={formData.name}
          onChangeText={(value: string) => updateFormData({ name: value })}
          placeholder="Enter recipe name (e.g., 'Tri-X in D-76')"
          inputTitle="Enter Recipe Name"
        />
      </FormGroup>

      {/* Film Section */}
      <VStack space="sm">
        <Text style={{ fontSize: 16, fontWeight: "600", color: textColor }}>
          Film
        </Text>

        <HStack style={{ alignItems: "center", marginBottom: 8 }}>
          <Switch
            value={formData.useExistingFilm}
            onValueChange={(value) =>
              updateFormData({ useExistingFilm: value })
            }
          />
          <Text style={{ marginLeft: 8, color: textColor, fontSize: 14 }}>
            Use existing film from database
          </Text>
        </HStack>

        {formData.useExistingFilm ? (
          <FormGroup label="Select Film">
            <Box
              ref={filmSearchRef}
              style={{
                position: "relative",
                overflow: "visible",
                zIndex: 999999,
              }}
              onLayout={handleFilmSearchLayout}
            >
              {isDesktop ? (
                <SearchInput
                  variant="desktop"
                  type="film"
                  placeholder="Type to search films..."
                  value={filmSearch}
                  onChangeText={setFilmSearch}
                  onClear={() => setFilmSearch("")}
                  onFocus={() => {
                    setIsFilmSearchFocused(true);
                    handleFilmSearchLayout();
                  }}
                  onBlur={() => {
                    // Delay hiding to allow item selection
                    setTimeout(() => setIsFilmSearchFocused(false), 150);
                  }}
                />
              ) : (
                <SearchInput
                  variant="mobile"
                  type="film"
                  placeholder="Type to search films..."
                  selectedItem={selectedFilm}
                  onPress={() => setIsFilmSearchFocused(true)}
                  onClear={() => updateFormData({ selectedFilmId: undefined })}
                />
              )}

              {/* Selected film display */}
              {selectedFilm && (
                <Box
                  style={{
                    marginTop: 8,
                    padding: 8,
                    backgroundColor: "rgba(0,0,0,0.05)",
                    borderRadius: 8,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 14, color: textColor }}>
                    Selected: {selectedFilm.brand} {selectedFilm.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      updateFormData({ selectedFilmId: undefined })
                    }
                  >
                    <Text style={{ fontSize: 14, color: textColor }}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </Box>
              )}
            </Box>
          </FormGroup>
        ) : (
          <VStack space="sm">
            <Box
              style={{
                flexDirection: isDesktop ? "row" : "column",
                gap: isDesktop ? 12 : 8,
              }}
            >
              <Box style={{ flex: isDesktop ? 1 : undefined }}>
                <FormGroup label="Film Brand">
                  <TextInput
                    value={formData.customFilm?.brand || ""}
                    onChangeText={(value: string) =>
                      updateCustomFilm({ brand: value })
                    }
                    placeholder="e.g., Kodak, Fujifilm, Ilford"
                    inputTitle="Enter Film Brand"
                  />
                </FormGroup>
              </Box>

              <Box style={{ flex: isDesktop ? 1 : undefined }}>
                <FormGroup label="Film Name">
                  <TextInput
                    value={formData.customFilm?.name || ""}
                    onChangeText={(value: string) =>
                      updateCustomFilm({ name: value })
                    }
                    placeholder="e.g., Tri-X 400, HP5 Plus"
                    inputTitle="Enter Film Name"
                  />
                </FormGroup>
              </Box>
            </Box>

            <FormGroup label="Box Speed (ISO)">
              <NumberInput
                value={String(formData.customFilm?.isoSpeed || 400)}
                onChangeText={(value) =>
                  updateCustomFilm({ isoSpeed: parseFloat(value) || 400 })
                }
                placeholder="400"
                inputTitle="Enter Film ISO Speed"
                step={25}
              />
            </FormGroup>

            <FormGroup label="Grain Structure (Optional)">
              <TextInput
                value={formData.customFilm?.grainStructure || ""}
                onChangeText={(value: string) =>
                  updateCustomFilm({ grainStructure: value })
                }
                placeholder="e.g., Fine, Medium, Coarse"
                inputTitle="Enter Grain Structure"
              />
            </FormGroup>
          </VStack>
        )}
      </VStack>

      {/* Film Search Dropdown - Desktop only */}
      {isDesktop && (
        <SearchDropdown
          variant="desktop"
          isOpen={isFilmSearchFocused}
          onClose={() => setIsFilmSearchFocused(false)}
          items={filmDropdownItems}
          onItemSelect={handleFilmDropdownSelect}
          position="left"
          dynamicPosition={filmSearchPosition}
        />
      )}

      {/* Mobile Film Selection Modal */}
      {!isDesktop && (
        <SearchDropdown
          variant="mobile"
          type="film"
          isOpen={isFilmSearchFocused}
          onClose={() => setIsFilmSearchFocused(false)}
          films={allFilms}
          onFilmSelect={(film) => {
            updateFormData({ selectedFilmId: film.uuid });
          }}
          onItemSelect={() => {}} // Not used for mobile variant
        />
      )}
    </VStack>
  );
}
