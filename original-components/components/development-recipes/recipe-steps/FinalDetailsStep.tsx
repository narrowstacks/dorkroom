import React from 'react';
import {
  Text,
  HStack,
  VStack,
  Switch,
  Textarea,
  TextareaInput,
} from '@gluestack-ui/themed';
import { FormGroup } from '@/components/ui/forms/FormSection';
import { TextInput } from '@/components/ui/forms';
import { useThemeColor } from '@/hooks/useThemeColor';
import { normalizeDilution } from '@/utils/dilutionUtils';
import type { CustomRecipeFormData } from '@/types/customRecipeTypes';

interface FinalDetailsStepProps {
  formData: CustomRecipeFormData;
  updateFormData: (updates: Partial<CustomRecipeFormData>) => void;
  selectedDilution: string;
  isDesktop?: boolean;
}

/**
 * FinalDetailsStep Component
 *
 * Fourth step of the recipe creation process. Handles optional details
 * including custom dilution, agitation schedule, notes, and public recipe settings.
 *
 * @param formData - Current form data state
 * @param updateFormData - Function to update form data
 * @param selectedDilution - Currently selected dilution (for display purposes)
 * @param isDesktop - Whether running on desktop layout
 */
export function FinalDetailsStep({
  formData,
  updateFormData,
  selectedDilution,
  isDesktop = false,
}: FinalDetailsStepProps) {
  const textColor = useThemeColor({}, 'text');

  return (
    <VStack space="lg">
      <FormGroup
        label={
          selectedDilution && selectedDilution !== 'custom'
            ? `Dilution (${selectedDilution})`
            : 'Custom Dilution (Optional)'
        }
      >
        <TextInput
          value={formData.customDilution}
          onChangeText={(value: string) =>
            updateFormData({ customDilution: normalizeDilution(value) })
          }
          placeholder="e.g., 1+1, 1+9, Stock"
          inputTitle="Enter Custom Dilution"
          editable={!selectedDilution || selectedDilution === 'custom'}
        />
      </FormGroup>

      <FormGroup label="Agitation Schedule (Optional)">
        <Textarea>
          <TextareaInput
            value={formData.agitationSchedule}
            onChangeText={(value) =>
              updateFormData({ agitationSchedule: value })
            }
            placeholder="e.g., Initial 30s, then 5s every 30s"
            multiline
            numberOfLines={3}
          />
        </Textarea>
      </FormGroup>

      <FormGroup label="Notes (Optional)">
        <Textarea>
          <TextareaInput
            value={formData.notes}
            onChangeText={(value) => updateFormData({ notes: value })}
            placeholder="Additional notes about this recipe, tips, observations, etc."
            multiline
            numberOfLines={4}
          />
        </Textarea>
      </FormGroup>

      {/* Public/GitHub Submission */}
      <HStack
        style={{
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <VStack style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
            Public Recipe
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: textColor,
              opacity: 0.8,
              marginTop: 4,
            }}
          >
            Consider submitting to GitHub for inclusion in the public database
          </Text>
        </VStack>
        <Switch
          value={formData.isPublic}
          onValueChange={(value) => updateFormData({ isPublic: value })}
        />
      </HStack>
    </VStack>
  );
}
