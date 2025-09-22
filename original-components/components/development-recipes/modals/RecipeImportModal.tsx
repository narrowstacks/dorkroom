import React from "react";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Text,
  Button,
  ButtonText,
  VStack,
  HStack,
} from "@gluestack-ui/themed";
import { X } from "lucide-react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { formatTime } from "@/constants/developmentRecipes";
import type { Film, Developer } from "@/api/dorkroom/types";
import type { CustomRecipe } from "@/types/customRecipeTypes";

interface RecipeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
  sharedCustomRecipe: Omit<
    CustomRecipe,
    "id" | "dateCreated" | "dateModified"
  > | null;
  getFilmById: (filmId: string) => Film | undefined;
  getDeveloperById: (developerId: string) => Developer | undefined;
}

export function RecipeImportModal({
  isOpen,
  onClose,
  onImport,
  sharedCustomRecipe,
  getFilmById,
  getDeveloperById,
}: RecipeImportModalProps) {
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const developmentTint = useThemeColor({}, "developmentRecipesTint");
  const cardBackground = useThemeColor({}, "cardBackground");
  const inputBackground = useThemeColor({}, "inputBackground");
  const borderColor = useThemeColor({}, "borderColor");

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBackdrop />
      <ModalContent style={{ backgroundColor: cardBackground }}>
        <ModalHeader>
          <Text
            style={[{ fontSize: 18, fontWeight: "600" }, { color: textColor }]}
          >
            Import Shared Recipe
          </Text>
          <ModalCloseButton>
            <X size={20} color={textColor} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <VStack space="lg">
            {sharedCustomRecipe && (
              <>
                {/* Recipe Preview */}
                <Box
                  style={[
                    {
                      padding: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                    },
                    {
                      backgroundColor: inputBackground,
                      borderColor: borderColor,
                    },
                  ]}
                >
                  <VStack space="sm">
                    <Text
                      style={[
                        { fontSize: 16, fontWeight: "600" },
                        { color: developmentTint },
                      ]}
                    >
                      {sharedCustomRecipe.name}
                    </Text>

                    {/* Film and Developer Information */}
                    <HStack
                      space="md"
                      style={{ justifyContent: "space-around" }}
                    >
                      <VStack
                        space="xs"
                        style={{ alignItems: "center", flex: 1 }}
                      >
                        <Text
                          style={[
                            { fontSize: 12, fontWeight: "500" },
                            { color: textSecondary },
                          ]}
                        >
                          Film
                        </Text>
                        <Text
                          style={[
                            { fontSize: 14, fontWeight: "600" },
                            { color: textColor },
                          ]}
                          numberOfLines={2}
                          textAlign="center"
                        >
                          {(() => {
                            if (
                              sharedCustomRecipe.isCustomFilm &&
                              sharedCustomRecipe.customFilm
                            ) {
                              return `${sharedCustomRecipe.customFilm.brand} ${sharedCustomRecipe.customFilm.name}`;
                            } else {
                              const film = getFilmById(
                                sharedCustomRecipe.filmId,
                              );
                              return film
                                ? `${film.brand} ${film.name}`
                                : "Unknown Film";
                            }
                          })()}
                        </Text>
                      </VStack>

                      <VStack
                        space="xs"
                        style={{ alignItems: "center", flex: 1 }}
                      >
                        <Text
                          style={[
                            { fontSize: 12, fontWeight: "500" },
                            { color: textSecondary },
                          ]}
                        >
                          Developer
                        </Text>
                        <Text
                          style={[
                            { fontSize: 14, fontWeight: "600" },
                            { color: textColor },
                          ]}
                          numberOfLines={2}
                          textAlign="center"
                        >
                          {(() => {
                            if (
                              sharedCustomRecipe.isCustomDeveloper &&
                              sharedCustomRecipe.customDeveloper
                            ) {
                              return `${sharedCustomRecipe.customDeveloper.manufacturer} ${sharedCustomRecipe.customDeveloper.name}`;
                            } else {
                              const developer = getDeveloperById(
                                sharedCustomRecipe.developerId,
                              );
                              return developer
                                ? `${developer.manufacturer} ${developer.name}`
                                : "Unknown Developer";
                            }
                          })()}
                        </Text>
                      </VStack>
                    </HStack>

                    <HStack
                      space="md"
                      style={{ justifyContent: "space-around" }}
                    >
                      <VStack
                        space="xs"
                        style={{ alignItems: "center", flex: 1 }}
                      >
                        <Text
                          style={[
                            { fontSize: 12, fontWeight: "500" },
                            { color: textSecondary },
                          ]}
                        >
                          Time
                        </Text>
                        <Text
                          style={[
                            { fontSize: 14, fontWeight: "600" },
                            { color: textColor },
                          ]}
                        >
                          {formatTime(sharedCustomRecipe.timeMinutes)}
                        </Text>
                      </VStack>

                      <VStack
                        space="xs"
                        style={{ alignItems: "center", flex: 1 }}
                      >
                        <Text
                          style={[
                            { fontSize: 12, fontWeight: "500" },
                            { color: textSecondary },
                          ]}
                        >
                          Temperature
                        </Text>
                        <Text
                          style={[
                            { fontSize: 14, fontWeight: "600" },
                            { color: textColor },
                          ]}
                        >
                          {sharedCustomRecipe.temperatureF}°F
                        </Text>
                      </VStack>

                      <VStack
                        space="xs"
                        style={{ alignItems: "center", flex: 1 }}
                      >
                        <Text
                          style={[
                            { fontSize: 12, fontWeight: "500" },
                            { color: textSecondary },
                          ]}
                        >
                          ISO
                        </Text>
                        <Text
                          style={[
                            { fontSize: 14, fontWeight: "600" },
                            { color: textColor },
                          ]}
                        >
                          {sharedCustomRecipe.shootingIso}
                        </Text>
                      </VStack>
                    </HStack>

                    {sharedCustomRecipe.notes && (
                      <VStack space="xs">
                        <Text
                          style={[
                            { fontSize: 12, fontWeight: "500" },
                            { color: textSecondary },
                          ]}
                        >
                          Notes
                        </Text>
                        <Text style={[{ fontSize: 14 }, { color: textColor }]}>
                          {sharedCustomRecipe.notes}
                        </Text>
                      </VStack>
                    )}
                  </VStack>
                </Box>

                {/* Import Options */}
                <VStack space="md">
                  <Text
                    style={[
                      { fontSize: 16, fontWeight: "600" },
                      { color: textColor },
                    ]}
                  >
                    Import this recipe to your collection?
                  </Text>

                  <HStack space="md">
                    <Button
                      variant="outline"
                      onPress={onClose}
                      style={[{ flex: 1, borderColor: borderColor }]}
                    >
                      <ButtonText style={[{ color: textColor }]}>
                        Cancel
                      </ButtonText>
                    </Button>

                    <Button
                      variant="solid"
                      onPress={onImport}
                      style={[{ flex: 1, backgroundColor: developmentTint }]}
                    >
                      <ButtonText style={[{ color: "white" }]}>
                        Import Recipe
                      </ButtonText>
                    </Button>
                  </HStack>
                </VStack>
              </>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
