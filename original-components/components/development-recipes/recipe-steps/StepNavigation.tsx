import React from 'react';
import { Button, ButtonText, HStack } from '@gluestack-ui/themed';
import { Save } from 'lucide-react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { CustomRecipe } from '@/types/customRecipeTypes';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSave?: () => void;
  isLoading: boolean;
  recipe?: CustomRecipe;
  showGitHubSubmit?: boolean;
  isDesktop?: boolean;
}

/**
 * StepNavigation Component
 *
 * Handles navigation between steps in the multi-step recipe form.
 * Displays Previous/Next buttons for navigation. Save functionality is now
 * handled by the SaveSubmitStep component.
 *
 * @param currentStep - The currently active step (0-indexed)
 * @param totalSteps - Total number of steps in the process
 * @param canProceed - Whether the user can proceed from the current step
 * @param onPrevious - Callback for going to previous step
 * @param onNext - Callback for going to next step
 * @param onSave - Optional callback for saving (only used on intermediate steps if needed)
 * @param isLoading - Whether a save/delete operation is in progress
 * @param recipe - Optional existing recipe being edited
 * @param showGitHubSubmit - Whether to show GitHub submission button (deprecated)
 * @param isDesktop - Whether running on desktop layout
 */
export function StepNavigation({
  currentStep,
  totalSteps,
  canProceed,
  onPrevious,
  onNext,
  onSave,
  isLoading,
  recipe,
  showGitHubSubmit = false,
  isDesktop = false,
}: StepNavigationProps) {
  const developmentTint = useThemeColor({}, 'developmentRecipesTint');

  const isLastStep = currentStep === totalSteps - 1;

  return (
    <HStack space="md">
      <Button
        variant="outline"
        onPress={onPrevious}
        disabled={currentStep === 0}
        style={{ flex: 1 }}
      >
        <ButtonText>Previous</ButtonText>
      </Button>

      {isLastStep && onSave ? (
        <Button
          onPress={onSave}
          disabled={!canProceed || isLoading}
          style={{ flex: 1, backgroundColor: developmentTint }}
        >
          <Save size={16} color="#fff" />
          <ButtonText style={{ marginLeft: 8, color: '#fff' }}>
            {isLoading ? 'Saving...' : recipe ? 'Update Recipe' : 'Save Recipe'}
          </ButtonText>
        </Button>
      ) : (
        <Button
          onPress={onNext}
          disabled={!canProceed}
          style={{ flex: 1, backgroundColor: developmentTint }}
        >
          <ButtonText style={{ color: '#fff' }}>Next</ButtonText>
        </Button>
      )}
    </HStack>
  );
}
