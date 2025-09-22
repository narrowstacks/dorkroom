import React, { ReactNode } from "react";
import { StyleSheet, ScrollView, Platform } from "react-native";
import { Box, Text } from "@gluestack-ui/themed";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";
import { useThemeColor } from "@/hooks/useThemeColor";

interface CalculatorLayoutProps {
  title: string;
  children: ReactNode;
  infoSection?: ReactNode;
}

export function CalculatorLayout({
  title,
  children,
  infoSection,
}: CalculatorLayoutProps) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width > 768;
  const backgroundColor = useThemeColor({}, "background");
  const outline = useThemeColor({}, "outline");

  // Detect if we have a single child for smart centering
  const isSingleChild = React.Children.count(children) === 1;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Box
        className="flex-1 p-4 web:mx-auto web:w-full web:max-w-5xl web:p-6"
        style={[styles.content, Platform.OS === "web" && styles.webContent]}
      >
        <Box
          className="mb-6 w-full flex-row items-center justify-center border-b pb-4"
          style={[styles.header, { borderBottomColor: outline }]}
        >
          <Text
            className="text-center text-3xl font-semibold"
            style={styles.title}
          >
            {title}
          </Text>
        </Box>

        <Box
          className="w-full web:flex-row web:items-start web:gap-10"
          style={[
            styles.mainContent,
            Platform.OS === "web" && isDesktop && styles.webMainContent,
            Platform.OS === "web" &&
              isDesktop &&
              isSingleChild &&
              styles.webMainContentCentered,
          ]}
        >
          {children}
        </Box>

        {/* Info Section - Full width on desktop */}
        {infoSection && (
          <Box
            className="mt-8 w-full"
            style={[
              styles.infoContainer,
              Platform.OS === "web" && isDesktop && styles.webInfoContainer,
            ]}
          >
            {infoSection}
          </Box>
        )}
      </Box>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom:
      Platform.OS === "ios" || Platform.OS === "android" ? 100 : 80,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  webContent: {
    maxWidth: 1024,
    marginHorizontal: "auto",
    width: "100%",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    fontWeight: "600",
  },
  mainContent: {
    width: "100%",
  },
  webMainContent: {
    flexDirection: "row",
    gap: 40,
    alignItems: "flex-start",
  },
  webMainContentCentered: {
    justifyContent: "center",
  },
  infoContainer: {
    width: "100%",
    marginTop: 32,
  },
  webInfoContainer: {
    maxWidth: "100%",
    marginTop: 40,
  },
});
