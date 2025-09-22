// This file serves as a fallback for platform-specific routing.
// Expo Router automatically resolves to:
// - index.web.tsx for web platforms
// - index.native.tsx for native platforms (iOS/Android)

// Import and re-export the native version as the default fallback
export { default } from "./index.native";
