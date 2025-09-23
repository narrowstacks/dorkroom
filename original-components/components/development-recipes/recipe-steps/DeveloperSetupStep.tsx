import React, { useState } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  HStack,
  VStack,
  Switch,
  Button,
  ButtonText,
} from '@gluestack-ui/themed';
import { Plus, Trash2 } from 'lucide-react-native';
import { FormGroup } from '@/components/ui/forms/FormSection';
import { StyledSelect } from '@/components/ui/select/StyledSelect';
import { NumberInput, TextInput } from '@/components/ui/forms';
import { SearchInput, SearchDropdown } from '@/components/ui/search';
import { MobileSelectButton } from '@/components/ui/select/MobileSelectButton';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import { DEVELOPER_TYPES } from '@/constants/developmentRecipes';
import type {
  CustomRecipeFormData,
  CustomDeveloperData,
} from '@/types/customRecipeTypes';
import type { Developer } from '@/api/dorkroom/types';

interface DeveloperSetupStepProps {
  formData: CustomRecipeFormData;
  updateFormData: (updates: Partial<CustomRecipeFormData>) => void;
  updateCustomDeveloper: (updates: Partial<CustomDeveloperData>) => void;
  allDevelopers: Developer[];
  selectedDeveloper: Developer | null;
  dilutionOptions: { label: string; value: string }[];
  selectedDilution: string;
  handleDilutionChange: (value: string) => void;
  addDilution: () => void;
  updateDilution: (
    index: number,
    field: 'name' | 'dilution',
    value: string
  ) => void;
  removeDilution: (index: number) => void;
  isDesktop?: boolean;
}

const FILM_OR_PAPER_TYPES = [{ label: 'Film', value: 'film' }];

/**
 * DeveloperSetupStep Component
 *
 * Second step of the recipe creation process. Handles developer selection and configuration.
 * This step manages the complex developer setup including dilutions and custom developer creation.
 *
 * @param formData - Current form data state
 * @param updateFormData - Function to update form data
 * @param updateCustomDeveloper - Function to update custom developer data
 * @param allDevelopers - Available developers for selection
 * @param selectedDeveloper - Currently selected developer object
 * @param dilutionOptions - Available dilutions for selected developer
 * @param selectedDilution - Currently selected dilution
 * @param handleDilutionChange - Function to handle dilution selection changes
 * @param addDilution - Function to add a new dilution to custom developer
 * @param updateDilution - Function to update a dilution in custom developer
 * @param removeDilution - Function to remove a dilution from custom developer
 * @param isDesktop - Whether running on desktop layout
 */
export function DeveloperSetupStep({
  formData,
  updateFormData,
  updateCustomDeveloper,
  allDevelopers,
  selectedDeveloper,
  dilutionOptions,
  selectedDilution,
  handleDilutionChange,
  addDilution,
  updateDilution,
  removeDilution,
  isDesktop = false,
}: DeveloperSetupStepProps) {
  const textColor = useThemeColor({}, 'text');
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width <= 768;

  // State for developer search and dropdown
  const [developerSearch, setDeveloperSearch] = useState('');
  const [isDeveloperSearchFocused, setIsDeveloperSearchFocused] =
    useState(false);
  const [developerSearchPosition, setDeveloperSearchPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // State for mobile dilution selection
  const [showMobileDilutionModal, setShowMobileDilutionModal] = useState(false);

  // Add refs for position tracking
  const developerSearchRef = React.useRef<any>(null);

  // Developer suggestions for desktop search dropdown
  const filteredDevelopers = React.useMemo(() => {
    if (!isDeveloperSearchFocused) return [];
    if (!developerSearch.trim()) return allDevelopers;
    return allDevelopers.filter(
      (dev) =>
        dev.name.toLowerCase().includes(developerSearch.toLowerCase()) ||
        dev.manufacturer.toLowerCase().includes(developerSearch.toLowerCase())
    );
  }, [allDevelopers, developerSearch, isDeveloperSearchFocused]);

  // Convert to SearchDropdownItem format
  const developerDropdownItems = React.useMemo(
    () =>
      filteredDevelopers.map((developer) => ({
        id: developer.uuid,
        title: developer.name,
        subtitle: developer.manufacturer,
      })),
    [filteredDevelopers]
  );

  // Handle dropdown item selection
  const handleDeveloperDropdownSelect = (item: {
    id: string;
    title: string;
    subtitle: string;
  }) => {
    const developer = allDevelopers.find((d) => d.uuid === item.id);
    if (developer) {
      updateFormData({ selectedDeveloperId: developer.uuid });
      setDeveloperSearch('');
      setIsDeveloperSearchFocused(false);
    }
  };

  // Handle layout for dynamic positioning
  const handleDeveloperSearchLayout = () => {
    if (developerSearchRef.current && isDesktop) {
      developerSearchRef.current.measure(
        (
          x: number,
          y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number
        ) => {
          setDeveloperSearchPosition({
            top: pageY + height,
            left: pageX,
            width: width,
          });
        }
      );
    }
  };

  return (
    <VStack space="lg">
      {/* Developer Section */}
      <VStack space="sm">
        <Text style={{ fontSize: 16, fontWeight: '600', color: textColor }}>
          Developer
        </Text>

        <HStack style={{ alignItems: 'center', marginBottom: 8 }}>
          <Switch
            value={formData.useExistingDeveloper}
            onValueChange={(value) =>
              updateFormData({ useExistingDeveloper: value })
            }
          />
          <Text style={{ marginLeft: 8, color: textColor, fontSize: 14 }}>
            Use existing developer from database
          </Text>
        </HStack>

        {formData.useExistingDeveloper ? (
          <VStack space="sm">
            <FormGroup label="Select Developer">
              <Box
                ref={developerSearchRef}
                style={{
                  position: 'relative',
                  overflow: 'visible',
                  zIndex: 999999,
                }}
                onLayout={handleDeveloperSearchLayout}
              >
                {isDesktop ? (
                  <SearchInput
                    variant="desktop"
                    type="developer"
                    placeholder="Type to search developers..."
                    value={developerSearch}
                    onChangeText={setDeveloperSearch}
                    onClear={() => setDeveloperSearch('')}
                    onFocus={() => {
                      setIsDeveloperSearchFocused(true);
                      handleDeveloperSearchLayout();
                    }}
                    onBlur={() => {
                      // Delay hiding to allow item selection
                      setTimeout(() => setIsDeveloperSearchFocused(false), 150);
                    }}
                  />
                ) : (
                  <SearchInput
                    variant="mobile"
                    type="developer"
                    placeholder="Type to search developers..."
                    selectedItem={selectedDeveloper}
                    onPress={() => setIsDeveloperSearchFocused(true)}
                    onClear={() =>
                      updateFormData({ selectedDeveloperId: undefined })
                    }
                  />
                )}

                {/* Selected developer display */}
                {selectedDeveloper && (
                  <Box
                    style={{
                      marginTop: 8,
                      padding: 8,
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      borderRadius: 8,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 14, color: textColor }}>
                      Selected: {selectedDeveloper.manufacturer}{' '}
                      {selectedDeveloper.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        updateFormData({ selectedDeveloperId: undefined })
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

            {selectedDeveloper && dilutionOptions.length > 0 && (
              <FormGroup label="Select Dilution">
                {!isMobile ? (
                  // Desktop: Show traditional select
                  <StyledSelect
                    value={selectedDilution}
                    onValueChange={handleDilutionChange}
                    items={dilutionOptions}
                  />
                ) : (
                  // Mobile: Show selection button
                  <MobileSelectButton
                    label="Dilution"
                    selectedValue={selectedDilution}
                    selectedLabel={
                      dilutionOptions.find(
                        (opt) => opt.value === selectedDilution
                      )?.label
                    }
                    onPress={() => setShowMobileDilutionModal(true)}
                    type="dilution"
                  />
                )}
              </FormGroup>
            )}
          </VStack>
        ) : (
          <VStack space="sm">
            <Box
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap: isDesktop ? 12 : 8,
              }}
            >
              <Box style={{ flex: isDesktop ? 1 : undefined }}>
                <FormGroup label="Developer Manufacturer">
                  <TextInput
                    value={formData.customDeveloper?.manufacturer || ''}
                    onChangeText={(value: string) =>
                      updateCustomDeveloper({ manufacturer: value })
                    }
                    placeholder="e.g., Kodak, Ilford, Adox"
                    inputTitle="Enter Developer Manufacturer"
                  />
                </FormGroup>
              </Box>

              <Box style={{ flex: isDesktop ? 1 : undefined }}>
                <FormGroup label="Developer Name">
                  <TextInput
                    value={formData.customDeveloper?.name || ''}
                    onChangeText={(value: string) =>
                      updateCustomDeveloper({ name: value })
                    }
                    placeholder="e.g., D-76, ID-11, Rodinal"
                    inputTitle="Enter Developer Name"
                  />
                </FormGroup>
              </Box>
            </Box>

            <Box
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap: isDesktop ? 12 : 8,
              }}
            >
              <Box style={{ flex: isDesktop ? 1 : undefined }}>
                <FormGroup label="Developer Type">
                  <StyledSelect
                    value={formData.customDeveloper?.type || ''}
                    onValueChange={(value) =>
                      updateCustomDeveloper({ type: value })
                    }
                    items={DEVELOPER_TYPES}
                  />
                </FormGroup>
              </Box>

              <Box style={{ flex: isDesktop ? 1 : undefined }}>
                <FormGroup label="For Use With">
                  <StyledSelect
                    value={formData.customDeveloper?.filmOrPaper || 'film'}
                    onValueChange={(value) =>
                      updateCustomDeveloper({
                        filmOrPaper: value as 'film' | 'paper' | 'both',
                      })
                    }
                    items={FILM_OR_PAPER_TYPES}
                  />
                </FormGroup>
              </Box>
            </Box>

            <Box
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap: isDesktop ? 12 : 8,
              }}
            >
              <Box style={{ flex: isDesktop ? 1 : undefined }}>
                <FormGroup label="Working Life (Hours) - Optional">
                  <NumberInput
                    value={String(
                      formData.customDeveloper?.workingLifeHours || ''
                    )}
                    onChangeText={(value) =>
                      updateCustomDeveloper({
                        workingLifeHours: parseInt(value) || undefined,
                      })
                    }
                    placeholder="24"
                    inputTitle="Enter Working Life (Hours)"
                    step={1}
                  />
                </FormGroup>
              </Box>

              <Box style={{ flex: isDesktop ? 1 : undefined }}>
                <FormGroup label="Stock Life (Months) - Optional">
                  <NumberInput
                    value={String(
                      formData.customDeveloper?.stockLifeMonths || ''
                    )}
                    onChangeText={(value) =>
                      updateCustomDeveloper({
                        stockLifeMonths: parseInt(value) || undefined,
                      })
                    }
                    placeholder="6"
                    inputTitle="Enter Stock Life (Months)"
                    step={1}
                  />
                </FormGroup>
              </Box>
            </Box>

            {/* Dilutions */}
            <Box>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: textColor,
                  marginBottom: 8,
                }}
              >
                Dilutions
              </Text>
              <VStack space="xs">
                {formData.customDeveloper?.dilutions.map((dilution, index) => (
                  <HStack key={index} style={{ alignItems: 'center', gap: 8 }}>
                    <Box style={{ flex: 1 }}>
                      <TextInput
                        value={dilution.name}
                        onChangeText={(value: string) =>
                          updateDilution(index, 'name', value)
                        }
                        placeholder="e.g., Stock, 1+1, 1+9"
                        inputTitle="Enter Dilution Name"
                      />
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <TextInput
                        value={dilution.dilution}
                        onChangeText={(value: string) =>
                          updateDilution(index, 'dilution', value)
                        }
                        placeholder="e.g., Stock, 1+1, 1+9"
                        inputTitle="Enter Dilution Ratio"
                      />
                    </Box>
                    {formData.customDeveloper?.dilutions.length! > 1 && (
                      <TouchableOpacity onPress={() => removeDilution(index)}>
                        <Trash2 size={20} color={textColor} />
                      </TouchableOpacity>
                    )}
                  </HStack>
                ))}

                <Button
                  variant="outline"
                  onPress={addDilution}
                  style={{ marginTop: 8 }}
                >
                  <Plus size={16} color={textColor} />
                  <ButtonText style={{ color: textColor, marginLeft: 4 }}>
                    Add Dilution
                  </ButtonText>
                </Button>
              </VStack>
            </Box>

            {/* Optional fields */}
            <VStack space="sm">
              <FormGroup label="Mixing Instructions (Optional)">
                <TextInput
                  value={formData.customDeveloper?.mixingInstructions || ''}
                  onChangeText={(value: string) =>
                    updateCustomDeveloper({ mixingInstructions: value })
                  }
                  placeholder="e.g., Dissolve chemicals in order at 125°F"
                  inputTitle="Enter Mixing Instructions"
                  multiline
                />
              </FormGroup>

              <FormGroup label="Safety Notes (Optional)">
                <TextInput
                  value={formData.customDeveloper?.safetyNotes || ''}
                  onChangeText={(value: string) =>
                    updateCustomDeveloper({ safetyNotes: value })
                  }
                  placeholder="e.g., Use in well-ventilated area, avoid skin contact"
                  inputTitle="Enter Safety Notes"
                  multiline
                />
              </FormGroup>

              <FormGroup label="General Notes (Optional)">
                <TextInput
                  value={formData.customDeveloper?.notes || ''}
                  onChangeText={(value: string) =>
                    updateCustomDeveloper({ notes: value })
                  }
                  placeholder="Additional notes about the developer"
                  inputTitle="Enter General Notes"
                  multiline
                />
              </FormGroup>
            </VStack>
          </VStack>
        )}
      </VStack>

      {/* Developer Search Dropdown - Desktop only */}
      {isDesktop && (
        <SearchDropdown
          variant="desktop"
          isOpen={isDeveloperSearchFocused}
          onClose={() => setIsDeveloperSearchFocused(false)}
          items={developerDropdownItems}
          onItemSelect={handleDeveloperDropdownSelect}
          position="right"
          dynamicPosition={developerSearchPosition}
        />
      )}

      {/* Mobile Developer Selection Modal */}
      {!isDesktop && (
        <SearchDropdown
          variant="mobile"
          type="developer"
          isOpen={isDeveloperSearchFocused}
          onClose={() => setIsDeveloperSearchFocused(false)}
          developers={allDevelopers}
          onDeveloperSelect={(developer) => {
            updateFormData({ selectedDeveloperId: developer.uuid });
          }}
          onItemSelect={() => {}} // Not used for mobile variant
        />
      )}

      {/* Mobile Dilution Selection Modal */}
      {!isDesktop && (
        <SearchDropdown
          variant="mobile"
          type="dilution"
          isOpen={showMobileDilutionModal}
          onClose={() => setShowMobileDilutionModal(false)}
          dilutionOptions={dilutionOptions}
          onDilutionSelect={handleDilutionChange}
          onItemSelect={() => {}} // Not used for mobile variant
        />
      )}
    </VStack>
  );
}
