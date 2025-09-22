import { Tabs, useRouter, useSegments } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Platform,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
} from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context"; // TESTING: Removed to test if SafeAreaProvider is causing white blocks
import { useColorScheme } from "@/hooks/useColorScheme";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useViewportHandler } from "@/hooks/useViewportHandler";
import { Colors } from "@/constants/Colors";
import * as Haptics from "expo-haptics";

import { HapticTab } from "@/components/ui/feedback/HapticTab";
import {
  Home,
  Crop,
  Move,
  Timer,
  Clock,
  Settings,
  Menu,
  Aperture,
  FlaskConical,
  Database,
} from "lucide-react-native";
import TabBarBackground from "@/components/ui/core/TabBarBackground";

// Navigation items configuration
const navigationItems = [
  {
    name: "index",
    title: "Home",
    icon: Home,
  },
  {
    name: "border",
    title: "Border",
    icon: Crop,
  },
  {
    name: "resize",
    title: "Resize",
    icon: Move,
  },
  {
    name: "exposure",
    title: "Stops",
    icon: Timer,
  },
  {
    name: "cameraExposure",
    title: "Exposure",
    icon: Aperture,
  },
  {
    name: "reciprocity",
    title: "Reciprocity",
    icon: Clock,
  },
  {
    name: "developmentRecipes",
    title: "Development",
    icon: FlaskConical,
  },
  {
    name: "infobase",
    title: "Infobase",
    icon: Database,
  },
  // {
  //   name: "settings",
  //   title: "Settings",
  //   icon: Settings,
  // },
];

// Function to get the tint color for each page
const getPageTintColor = (routeName: string, colors: typeof Colors.light) => {
  switch (routeName) {
    case "border":
      return colors.borderCalcTint;
    case "resize":
      return colors.resizeCalcTint;
    case "exposure":
      return colors.stopCalcTint;
    case "cameraExposure":
      return colors.cameraExposureCalcTint;
    case "reciprocity":
      return colors.reciprocityCalcTint;
    case "developmentRecipes":
      return colors.developmentRecipesTint;
    case "infobase":
      return colors.infobaseTint;
    case "index":
    case "settings":
    default:
      return colors.tint;
  }
};

// Function to get the page title for document title
const getPageTitle = (routeName: string) => {
  const item = navigationItems.find((item) => item.name === routeName);
  const pageTitle = item?.title || "Home";
  return `${pageTitle} - Dorkroom`;
};

function TopNavigation() {
  const router = useRouter();
  const segments = useSegments();
  // Handle home page route detection - when on /(tabs) root, treat as "index"
  const lastSegment = segments[segments.length - 1];
  const currentRoute =
    lastSegment === "(tabs)" || !lastSegment ? "index" : lastSegment;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const styles = createDynamicStyles(colors);

  return (
    <View style={styles.topNavContainer}>
      <View style={styles.topNavContent}>
        <Text style={styles.appTitle}>Dorkroom</Text>
        <View style={styles.navItems}>
          {navigationItems.map((item) => {
            const isActive = currentRoute === item.name;
            const tintColor = getPageTintColor(item.name, colors);
            return (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.navItem,
                  isActive && {
                    ...styles.activeNavItem,
                    backgroundColor: tintColor,
                  },
                ]}
                onPress={() => {
                  if (item.name === "index") {
                    router.push("/(tabs)" as any);
                  } else {
                    router.push(`/(tabs)/${item.name}` as any);
                  }
                }}
              >
                <item.icon
                  size={20}
                  color={isActive ? colors.background : colors.icon}
                />
                <Text
                  style={[
                    styles.navItemText,
                    isActive && { color: colors.background },
                  ]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [modalScale] = useState(new Animated.Value(0));
  const [modalOpacity] = useState(new Animated.Value(0));
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const segments = useSegments();

  // Use enhanced viewport handler for better iOS Safari support
  const {
    width: screenWidth,
    height: screenHeight,
    isWeb,
    isMobileWeb,
    isDesktopWeb,
  } = useViewportHandler();
  const isNativeMobile = !isWeb;

  // Handle home page route detection - when on /(tabs) root, treat as "index"
  const lastSegment = segments[segments.length - 1];
  const currentRoute =
    lastSegment === "(tabs)" || !lastSegment ? "index" : lastSegment;

  // Set document title for web
  useDocumentTitle(getPageTitle(currentRoute));

  const showModal = () => {
    // Add haptic feedback for hamburger menu tap
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setMobileMenuVisible(true);

    // Reset to starting position
    modalScale.setValue(0.1);
    modalOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        tension: 80, // Higher tension for less bounce
        friction: 10, // Higher friction for less oscillation
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 250, // Slightly shorter duration
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideModal = () => {
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 0.1, // Shrink to small size like dock icon
        tension: 120, // Faster collapse
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMobileMenuVisible(false);
    });
  };

  const navigateToPage = (item: (typeof navigationItems)[0]) => {
    // Add haptic feedback for navigation item selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (item.name === "index") {
      router.push("/(tabs)" as any);
    } else {
      router.push(`/(tabs)/${item.name}` as any);
    }
    hideModal();
  };

  const styles = createDynamicStyles(colors);

  // Native mobile layout with floating hamburger menu
  if (isNativeMobile) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: "none" }, // Hide the tab bar completely
            }}
          >
            {navigationItems.map((item) => (
              <Tabs.Screen
                key={item.name}
                name={item.name}
                options={{
                  title: item.title,
                }}
              />
            ))}
          </Tabs>
        </View>

        {/* Floating Hamburger Button - Viewport Aware (Native) */}
        <TouchableOpacity
          style={[
            styles.floatingMenuButton,
            // Dynamic positioning based on actual viewport height for native mobile
            {
              bottom: Math.max(32, screenHeight * 0.05), // 5% from bottom or 32px minimum
              right: Math.max(24, screenWidth * 0.05), // 5% from right or 24px minimum
            },
          ]}
          onPress={showModal}
        >
          <Menu size={24} color={colors.background} />
        </TouchableOpacity>

        {/* Animated Navigation Modal */}
        {mobileMenuVisible && (
          <Animated.View
            style={[styles.modalOverlay, { opacity: modalOpacity }]}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={hideModal}
              activeOpacity={1}
            />
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [
                    { scale: modalScale },
                    {
                      translateX: modalScale.interpolate({
                        inputRange: [0.1, 1],
                        outputRange: [120, 0], // Start from hamburger button position
                        extrapolate: "clamp",
                      }),
                    },
                    {
                      translateY: modalScale.interpolate({
                        inputRange: [0.1, 1],
                        outputRange: [180, 0], // Start from hamburger button position
                        extrapolate: "clamp",
                      }),
                    },
                    {
                      scaleX: modalScale.interpolate({
                        inputRange: [0.1, 0.5, 1],
                        outputRange: [0.3, 1.05, 1], // Subtle horizontal stretch
                        extrapolate: "clamp",
                      }),
                    },
                    {
                      scaleY: modalScale.interpolate({
                        inputRange: [0.1, 0.5, 1],
                        outputRange: [0.3, 0.95, 1], // Subtle vertical compression
                        extrapolate: "clamp",
                      }),
                    },
                  ],
                  opacity: modalOpacity,
                },
              ]}
            >
              <View style={styles.modalNavItems}>
                {navigationItems.map((item) => {
                  const isActive = currentRoute === item.name;
                  const tintColor = getPageTintColor(item.name, colors);
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.modalNavItem,
                        isActive && {
                          ...styles.activeModalNavItem,
                          backgroundColor: tintColor,
                        },
                      ]}
                      onPress={() => navigateToPage(item)}
                    >
                      <item.icon
                        size={24}
                        color={isActive ? colors.background : colors.icon}
                      />
                      <Text
                        style={[
                          styles.modalNavItemText,
                          isActive && { color: colors.background },
                        ]}
                      >
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    );
  }

  if (isMobileWeb) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: "none" }, // Hide the tab bar on mobile web
            }}
          >
            {navigationItems.map((item) => (
              <Tabs.Screen
                key={item.name}
                name={item.name}
                options={{
                  title: item.title,
                }}
              />
            ))}
          </Tabs>
        </View>

        {/* Floating Hamburger Button - Viewport Aware (Mobile Web) */}
        <TouchableOpacity
          style={[
            styles.floatingMenuButton,
            {
              bottom: Math.max(32, screenHeight * 0.05),
              right: Math.max(24, screenWidth * 0.05),
            },
          ]}
          onPress={showModal}
        >
          <Menu size={24} color={colors.background} />
        </TouchableOpacity>

        {/* Animated Navigation Modal */}
        {mobileMenuVisible && (
          <View style={styles.webModalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={hideModal}
              activeOpacity={1}
            />
            <View style={styles.webModalContent}>
              <View style={styles.modalNavItems}>
                {navigationItems.map((item) => {
                  const isActive = currentRoute === item.name;
                  const tintColor = getPageTintColor(item.name, colors);
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.modalNavItem,
                        isActive && {
                          ...styles.activeModalNavItem,
                          backgroundColor: tintColor,
                        },
                      ]}
                      onPress={() => navigateToPage(item)}
                    >
                      <item.icon
                        size={24}
                        color={isActive ? colors.background : colors.icon}
                      />
                      <Text
                        style={[
                          styles.modalNavItemText,
                          isActive && { color: colors.background },
                        ]}
                      >
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (isDesktopWeb) {
    return (
      <View style={{ flex: 1 }}>
        <TopNavigation />
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: "none" }, // Hide the tab bar on web
            }}
          >
            {navigationItems.map((item) => (
              <Tabs.Screen
                key={item.name}
                name={item.name}
                options={{
                  title: item.title,
                }}
              />
            ))}
          </Tabs>
        </View>
      </View>
    );
  }

  // Original mobile layout with bottom tabs
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.tint, // This will be dynamically set per tab
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              position: "absolute",
              backgroundColor: "transparent", // Use a transparent background on iOS to show the blur effect
            },
            default: {
              backgroundColor: "#fff",
            },
          }),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarActiveTintColor: getPageTintColor("index", colors),
            tabBarIcon: ({ color }) => <Home size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="border"
          options={{
            title: "Border",
            tabBarActiveTintColor: getPageTintColor("border", colors),
            tabBarIcon: ({ color }) => <Crop size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="resize"
          options={{
            title: "Resize",
            tabBarActiveTintColor: getPageTintColor("resize", colors),
            tabBarIcon: ({ color }) => <Move size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="exposure"
          options={{
            title: "Stops",
            tabBarActiveTintColor: getPageTintColor("exposure", colors),
            tabBarIcon: ({ color }) => <Timer size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="cameraExposure"
          options={{
            title: "Exposure",
            tabBarActiveTintColor: getPageTintColor("cameraExposure", colors),
            tabBarIcon: ({ color }) => <Aperture size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reciprocity"
          options={{
            title: "Reciprocity",
            tabBarActiveTintColor: getPageTintColor("reciprocity", colors),
            tabBarIcon: ({ color }) => <Clock size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="developmentRecipes"
          options={{
            title: "Development",
            tabBarActiveTintColor: getPageTintColor(
              "developmentRecipes",
              colors,
            ),
            tabBarIcon: ({ color }) => <FlaskConical size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarActiveTintColor: getPageTintColor("settings", colors),
            tabBarIcon: ({ color }) => <Settings size={28} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}

// Dynamic styles function that takes colors as parameter
const createDynamicStyles = (colors: typeof Colors.light) =>
  StyleSheet.create({
    // Desktop top navigation styles
    topNavContainer: {
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.tabIconDefault,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    topNavContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      maxWidth: 1200,
      marginHorizontal: "auto",
      width: "100%",
    },
    appTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
    },
    navItems: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    navItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 6,
    },
    activeNavItem: {
      // backgroundColor will be set dynamically to tint color
    },
    navItemText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.icon,
    },
    activeNavItemText: {
      color: "#4CAF50",
    },

    // Native mobile floating menu styles - base styles (positioning handled dynamically)
    floatingMenuButton: {
      position: "absolute",
      // Dynamic positioning is handled in the component via style array
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.tint,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      zIndex: 100,
    },

    // Modal styles
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      alignItems: "flex-end",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    },
    modalBackdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 12,
      marginRight: 24,
      marginBottom: 100, // Position above the hamburger button
      maxWidth: 200,
      width: 280,
      maxHeight: "70%",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalNavItems: {
      paddingVertical: 16,
    },
    modalNavItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 16,
    },
    activeModalNavItem: {
      // backgroundColor will be set dynamically to tint color
    },
    modalNavItemText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.icon,
    },

    // Web modal styles (simpler version without animations)
    webModalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      alignItems: "flex-end",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    },
    webModalContent: {
      backgroundColor: colors.background,
      borderRadius: 12,
      marginRight: 24,
      marginBottom: 100, // Position above the hamburger button
      maxWidth: 200,
      width: 280,
      maxHeight: "70%",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
  });
