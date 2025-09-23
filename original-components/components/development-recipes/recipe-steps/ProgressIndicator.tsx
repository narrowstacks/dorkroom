import React from 'react';
import { Box, Text, HStack, VStack } from '@gluestack-ui/themed';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  stepValidation: Record<number, boolean>;
}

/**
 * ProgressIndicator Component
 *
 * Displays the current progress through a multi-step form with visual indicators
 * and step validation status. Shows progress bars and current step title.
 *
 * @param currentStep - The currently active step (0-indexed)
 * @param totalSteps - Total number of steps in the process
 * @param stepTitles - Array of titles for each step
 * @param stepValidation - Object mapping step indices to their validation status
 */
export function ProgressIndicator({
  currentStep,
  totalSteps,
  stepTitles,
  stepValidation,
}: ProgressIndicatorProps) {
  const developmentTint = useThemeColor({}, 'developmentRecipesTint');
  const textColor = useThemeColor({}, 'text');
  const outline = useThemeColor({}, 'outline');

  return (
    <VStack space="xs">
      {/* Progress bars */}
      <HStack space="xs">
        {Array.from({ length: totalSteps }, (_, index) => {
          let backgroundColor = outline;

          if (index < currentStep) {
            // Completed steps
            backgroundColor = developmentTint;
          } else if (index === currentStep) {
            // Current step
            backgroundColor = developmentTint;
          }
          // Remove validation highlighting for future steps entirely
          // All future steps should be grey until they become current

          return (
            <Box
              key={index}
              style={{
                flex: 1,
                height: 4,
                backgroundColor,
                borderRadius: 2,
                marginHorizontal: 1,
              }}
            />
          );
        })}
      </HStack>

      {/* Current step title and progress */}
      <Text
        style={{
          fontSize: 14,
          color: textColor,
          textAlign: 'center',
          opacity: 0.8,
        }}
      >
        {stepTitles[currentStep]} ({currentStep + 1} of {totalSteps})
      </Text>
    </VStack>
  );
}
