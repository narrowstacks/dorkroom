import React from "react";

import {
  Text,
  Button,
  ButtonText,
  VStack,
  HStack,
  Box,
} from "@gluestack-ui/themed";
import { Save, Github, Trash2, CheckCircle } from "lucide-react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import type {
  CustomRecipe,
  CustomRecipeFormData,
} from "@/types/customRecipeTypes";

interface SaveSubmitStepProps {
  formData: CustomRecipeFormData;
  recipe?: CustomRecipe;
  onSave: () => void;
  onDelete?: () => void;
  onSubmitToGitHub?: () => void;
  isLoading: boolean;
  isDesktop?: boolean;
}

/**
 * SaveSubmitStep Component
 *
 * Fifth and final step of the recipe creation process. Handles all save and submission
 * actions including recipe save/update, GitHub submission, and deletion.
 *
 * @param formData - Current form data state
 * @param recipe - Optional existing recipe being edited
 * @param onSave - Callback for saving the recipe
 * @param onDelete - Optional callback for deleting the recipe
 * @param onSubmitToGitHub - Optional callback for GitHub submission
 * @param isLoading - Whether a save/delete operation is in progress
 * @param isDesktop - Whether running on desktop layout
 */
export function SaveSubmitStep({
  formData,
  recipe,
  onSave,
  onDelete,
  onSubmitToGitHub,
  isLoading,
  isDesktop = false,
}: SaveSubmitStepProps) {
  const textColor = useThemeColor({}, "text");
  const developmentTint = useThemeColor({}, "developmentRecipesTint");

  return (
    <VStack space="lg">
      {/* Recipe Summary */}
      <VStack
        space="sm"
        style={{
          padding: 20,
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <HStack style={{ alignItems: "center", marginBottom: 12 }}>
          <CheckCircle size={20} color={developmentTint} />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: textColor,
              marginLeft: 8,
            }}
          >
            Recipe Ready
          </Text>
        </HStack>

        <Text
          style={{
            fontSize: 14,
            color: textColor,
            opacity: 0.9,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontWeight: "600" }}>Recipe:</Text>{" "}
          {formData.name || "Untitled Recipe"}
        </Text>

        {formData.useExistingFilm ? (
          <Text
            style={{
              fontSize: 14,
              color: textColor,
              opacity: 0.9,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontWeight: "600" }}>Film:</Text> Selected from
            database
          </Text>
        ) : (
          <Text
            style={{
              fontSize: 14,
              color: textColor,
              opacity: 0.9,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontWeight: "600" }}>Film:</Text>{" "}
            {formData.customFilm?.brand} {formData.customFilm?.name} (Custom)
          </Text>
        )}

        {formData.useExistingDeveloper ? (
          <Text
            style={{
              fontSize: 14,
              color: textColor,
              opacity: 0.9,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontWeight: "600" }}>Developer:</Text> Selected from
            database
          </Text>
        ) : (
          <Text
            style={{
              fontSize: 14,
              color: textColor,
              opacity: 0.9,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontWeight: "600" }}>Developer:</Text>{" "}
            {formData.customDeveloper?.manufacturer}{" "}
            {formData.customDeveloper?.name} (Custom)
          </Text>
        )}

        <Text style={{ fontSize: 14, color: textColor, opacity: 0.9 }}>
          <Text style={{ fontWeight: "600" }}>Settings:</Text>{" "}
          {formData.temperatureF}°F, {formData.timeMinutes}min, ISO{" "}
          {formData.shootingIso}
          {formData.pushPull !== 0 &&
            `, ${formData.pushPull > 0 ? "+" : ""}${formData.pushPull} stops`}
        </Text>
      </VStack>

      {/* Save Actions */}
      <VStack space="md">
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: textColor,
            textAlign: "center",
          }}
        >
          Choose Action
        </Text>

        {/* Primary Save Button */}
        <Button
          onPress={onSave}
          disabled={isLoading}
          style={{
            backgroundColor: developmentTint,
            minHeight: 56,
            borderRadius: 16,
          }}
        >
          <Save size={20} color="#fff" />
          <ButtonText
            style={{
              marginLeft: 12,
              fontSize: 16,
              fontWeight: "600",
              color: "#fff",
            }}
          >
            {isLoading ? "Saving..." : recipe ? "Update Recipe" : "Save Recipe"}
          </ButtonText>
        </Button>

        {/* GitHub Submission (if public) */}
        {formData.isPublic && onSubmitToGitHub && (
          <Button
            onPress={onSubmitToGitHub}
            variant="outline"
            style={{
              borderColor: developmentTint,
              borderWidth: 2,
              minHeight: 56,
              borderRadius: 16,
            }}
            disabled={isLoading}
          >
            <Github size={20} color={developmentTint} />
            <ButtonText
              style={{
                marginLeft: 12,
                fontSize: 16,
                fontWeight: "600",
                color: developmentTint,
              }}
            >
              Submit to GitHub
            </ButtonText>
          </Button>
        )}

        {/* Additional Options */}
        {recipe && onDelete && (
          <VStack space="sm" style={{ marginTop: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: textColor,
                opacity: 0.7,
                textAlign: "center",
              }}
            >
              Other Actions
            </Text>

            <Button
              onPress={onDelete}
              variant="outline"
              style={{
                borderColor: "#ff4444",
                borderWidth: 1,
                minHeight: 48,
                borderRadius: 12,
              }}
              disabled={isLoading}
            >
              <Trash2 size={18} color="#ff4444" />
              <ButtonText
                style={{ marginLeft: 10, fontSize: 14, color: "#ff4444" }}
              >
                {isLoading ? "Deleting..." : "Delete Recipe"}
              </ButtonText>
            </Button>
          </VStack>
        )}
      </VStack>

      {/* Helpful Text */}
      <Box
        style={{
          padding: 16,
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          borderRadius: 12,
          marginTop: 12,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: textColor,
            opacity: 0.7,
            textAlign: "center",
            lineHeight: 18,
          }}
        >
          {recipe
            ? "Your changes will be saved to your local recipe collection."
            : "Your new recipe will be added to your local collection and can be used immediately."}
        </Text>
      </Box>
    </VStack>
  );
}
