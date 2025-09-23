import {
  Linking,
  useColorScheme,
  useWindowDimensions,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Box,
  VStack,
  Text,
  Heading,
  ScrollView,
  Center,
  HStack,
} from '@gluestack-ui/themed';
import {
  MoveIcon,
  TimerIcon,
  CameraIcon,
  ClockIcon,
  GitBranchIcon,
  HeartIcon,
  FlaskConicalIcon,
  ArrowRightIcon,
  FrameIcon,
} from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Filter,
  FeTurbulence,
  FeColorMatrix,
  FeComposite,
} from 'react-native-svg';

const sanitizeId = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const lightenHex = (hex: string, factor: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  const ratio = Math.min(1, Math.max(0, factor));
  const mixChannel = (channel: number, target: number) =>
    clamp(channel + (target - channel) * ratio);
  const toHex = (value: number) =>
    Math.round(value).toString(16).padStart(2, '0');

  const r = mixChannel(rgb.r, 255);
  const g = mixChannel(rgb.g, 255);
  const b = mixChannel(rgb.b, 255);

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const darkenHex = (hex: string, factor: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  const ratio = Math.min(1, Math.max(0, factor));
  const mixChannel = (channel: number, target: number) =>
    clamp(channel + (target - channel) * ratio);
  const toHex = (value: number) =>
    Math.round(value).toString(16).padStart(2, '0');

  const r = mixChannel(rgb.r, 0);
  const g = mixChannel(rgb.g, 0);
  const b = mixChannel(rgb.b, 0);

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return { r, g, b };
};

const withAlpha = (hex: string, alpha: number) => {
  if (!/^#?[0-9a-fA-F]{6,8}$/.test(hex)) return hex;

  const normalized = hex.replace('#', '');
  const base = normalized.substring(0, 6);
  const clamped = Math.min(1, Math.max(0, alpha));
  const alphaHex = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${base}${alphaHex}`;
};

interface FeatureCardProps {
  href: string;
  title: string;
  subtitle: string;
  color: string;
  icon: React.ComponentType<any>;
  disabled?: boolean;
  basis: string;
  tag?: string;
}

const FeatureCard = ({
  href,
  title,
  subtitle,
  color,
  icon: Icon,
  disabled,
  basis,
  tag,
}: FeatureCardProps) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const glow = React.useRef(new Animated.Value(0)).current;
  const gradientId = React.useMemo(
    () => `feature-card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    [title]
  );

  React.useEffect(() => {
    Animated.timing(glow, {
      toValue: isHovered || isFocused ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [isHovered, isFocused, glow]);

  const bg = color + '26'; // ~15% alpha
  const border = color + '33'; // ~20% alpha

  const pressable = (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (href.startsWith('http')) {
          Linking.openURL(href);
        } else {
          router.push(href as any);
        }
      }}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed, hovered }) => ({
        borderRadius: 20,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        paddingVertical: 20,
        paddingHorizontal: 20,
        minHeight: 140,
        opacity: disabled ? 0.6 : 1,
        transform: [{ scale: disabled ? 1 : pressed ? 0.985 : 1 }],
        // Subtle glow on web hover/focus and slight lift on native
        shadowColor: color,
        shadowOpacity: hovered ? 0.35 : pressed ? 0.22 : 0.16,
        shadowRadius: hovered ? 25 : 10,
        // shadowOffset: { width: 0, height: hovered ? 10 : 5 },
        elevation: hovered ? 5 : 3,
      })}
    >
      {/* Edge glow ring that fades in/out */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -1,
          left: -1,
          right: -1,
          bottom: -1,
          borderRadius: 22,
          borderWidth: 2,
          borderColor: color,
          opacity: disabled ? 0 : glow,
          shadowColor: color,
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          zIndex: 2,
        }}
      />
      <Box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          borderRadius: 20,
          pointerEvents: 'none' as any,
        }}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <Defs>
            <Filter
              id={`noise-${gradientId}`}
              x="0%"
              y="0%"
              width="100%"
              height="100%"
            >
              <FeTurbulence
                baseFrequency="0.85 0.85"
                numOctaves="3"
                seed="2"
                stitchTiles="stitch"
                type="turbulence"
              />
              <FeColorMatrix type="saturate" values="0" />
              <FeColorMatrix
                type="matrix"
                values="0 0 0 0 0.5
                        0 0 0 0 0.5
                        0 0 0 0 0.5
                        0 0 0 0.06 0"
              />
              <FeComposite in2="SourceGraphic" operator="over" />
            </Filter>
            <SvgLinearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="100"
              y2="100"
              gradientUnits="userSpaceOnUse"
            >
              <Stop
                offset="0%"
                stopColor={colors.gradientStart}
                stopOpacity={1}
              />
              <Stop
                offset="25%"
                stopColor={colors.gradientMid}
                stopOpacity={1}
              />
              <Stop
                offset="65%"
                stopColor={colors.gradientMid}
                stopOpacity={0.8}
              />
              <Stop
                offset="100%"
                stopColor={colors.gradientEnd}
                stopOpacity={1}
              />
            </SvgLinearGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="100"
            height="100"
            fill={`url(#${gradientId})`}
            filter={`url(#noise-${gradientId})`}
          />
        </Svg>
      </Box>
      <VStack className="flex-1" style={{ gap: 16 }}>
        {tag ? (
          <Text
            className="font-semibold"
            style={{
              color: colors.textMuted,
              fontSize: 12,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {tag}
          </Text>
        ) : null}
        <HStack
          space="md"
          alignItems="center"
          style={{ justifyContent: 'space-between' }}
        >
          <HStack space="md" alignItems="center" style={{ flex: 1 }}>
            <Box
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: color + '1A', // ~10% alpha like PillLink
                borderWidth: 1,
                borderColor: color + '33', // ~20% alpha like PillLink
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={22} color={color} />
            </Box>
            <VStack className="flex-1" style={{ gap: 4, flex: 1 }}>
              <Text
                className="text-lg font-semibold"
                style={{ color: colors.text }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
              <Text
                className="text-sm"
                style={{ color: colors.textMuted, flexWrap: 'wrap' }}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {subtitle}
              </Text>
            </VStack>
          </HStack>
        </HStack>
        {disabled ? (
          <Box
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 9999,
              alignSelf: 'flex-start',
              backgroundColor: color + '33',
            }}
          >
            <Text className="text-xs font-semibold" style={{ color }}>
              Coming soon
            </Text>
          </Box>
        ) : null}
      </VStack>
    </Pressable>
  );

  return (
    <Box
      style={{ width: basis as any, paddingHorizontal: 8, paddingVertical: 8 }}
    >
      {pressable}
    </Box>
  );
};

interface PillLinkProps {
  href: string;
  title: string;
  color: string;
  icon?: React.ComponentType<any>;
}

const PillLink = ({ href, title, color, icon: Icon }: PillLinkProps) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const glow = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(glow, {
      toValue: isHovered || isFocused ? 1 : 0,
      duration: 140,
      useNativeDriver: false,
    }).start();
  }, [isHovered, isFocused, glow]);
  // Soft-tinted background + subtle border to match overall styling
  // Also lighten very dark brand colors in dark mode so they don't blend in
  const isDarkMode = (colorScheme ?? 'light') === 'dark';
  const toRgb = (hex: string) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return { r, g, b };
  };
  const luminance = (hex: string) => {
    const { r, g, b } = toRgb(hex);
    // relative luminance (sRGB)
    const srgb = [r, g, b].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  };
  const isLowLuminance = (() => {
    try {
      return luminance(color) < 0.08; // quite dark
    } catch {
      return false;
    }
  })();
  const baseTint =
    isDarkMode && isLowLuminance ? lightenHex(color, 0.55) : color;
  const bg = baseTint + '26'; // ~15% alpha
  const border = baseTint + '33'; // ~20% alpha
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(href);
      }}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={({ pressed, hovered }) => ({
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 9999,
        backgroundColor: hovered ? baseTint + '33' : bg,
        borderWidth: 1,
        borderColor: hovered ? baseTint + '66' : border,
        transform: [{ scale: pressed ? 0.985 : 1 }],
        // Subtle glow on hover/focus
        shadowColor: baseTint,
        shadowOpacity: hovered ? 0.35 : 0.2,
        shadowRadius: hovered ? 10 : 6,
        // shadowOffset: { width: 0, height: hovered ? 6 : 3 },
        elevation: hovered ? 3 : 1,
      })}
      accessibilityRole="button"
    >
      {/* Edge glow ring that fades in/out */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -1,
          left: -1,
          right: -1,
          bottom: -1,
          borderRadius: 9999,
          borderWidth: 2,
          borderColor: baseTint,
          opacity: glow,
          shadowColor: baseTint,
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          zIndex: 2,
        }}
      />
      <Box
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 12,
          flex: 1,
        }}
      >
        {Icon ? (
          <Box
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: baseTint + '1A', // ~10% alpha
              borderWidth: 1,
              borderColor: baseTint + '33', // ~20% alpha
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0, // Prevent shrinking
            }}
          >
            <Icon size={14} color={baseTint} />
          </Box>
        ) : null}
        <Text
          className="text-sm font-semibold"
          style={{
            color: colors.text,
            flex: 1,
            textAlign: 'left',
          }}
        >
          {title}
        </Text>
      </Box>
    </Pressable>
  );
};

interface HeroActionButtonProps {
  href: string;
  label: string;
  description?: string;
  color: string;
  icon: React.ComponentType<any>;
  variant?: 'solid' | 'ghost';
}

const HeroActionButton = ({
  href,
  label,
  description,
  color,
  icon: Icon,
  variant = 'solid',
}: HeroActionButtonProps) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const glow = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(glow, {
      toValue: isHovered || isFocused ? 1 : 0,
      duration: 140,
      useNativeDriver: false,
    }).start();
  }, [glow, isFocused, isHovered]);

  const isGhost = variant === 'ghost';
  const sanitizedLabel = React.useMemo(
    () => sanitizeId(label || 'action'),
    [label]
  );
  const gradientId = React.useMemo(
    () => `hero-action-${sanitizedLabel}-gradient`,
    [sanitizedLabel]
  );
  const noiseId = React.useMemo(
    () => `hero-action-${sanitizedLabel}-noise`,
    [sanitizedLabel]
  );

  const baseBackground = isGhost
    ? color + '40' // ~25% alpha - more opaque for better contrast
    : color + 'E6'; // ~90% alpha - slightly transparent for better contrast
  const hoverBackground = isGhost
    ? color + '4D' // ~30% alpha
    : color + 'F0'; // ~94% alpha
  const pressedBackground = isGhost
    ? color + '47' // ~28% alpha
    : color + 'E0'; // ~88% alpha
  const borderColor = isGhost
    ? color + '66' // ~40% alpha - more visible border
    : color + '80'; // ~50% alpha
  const shadowColor = darkenHex(color, 0.22);
  const textColor = isGhost ? colors.text : colors.background;
  const descriptionColor = isGhost
    ? colors.textMuted // Use muted text color for better contrast
    : withAlpha(colors.background, 0.9); // More opaque description text
  const iconColor = isGhost
    ? href === '/(tabs)/developmentRecipes'
      ? colors.background
      : color // White for dev recipes, brand color for other ghost buttons
    : colors.background; // Background for solid buttons
  const iconBackground = isGhost
    ? color + '1A' // ~10% alpha for ghost
    : withAlpha(colors.background, 0.2); // Background-based for solid
  const iconBorder = isGhost
    ? color + '33' // ~20% alpha for ghost
    : withAlpha(colors.background, 0.4); // Background-based for solid
  const arrowBackground = isGhost
    ? color + '1A' // ~10% alpha to match icon
    : withAlpha(colors.background, 0.2); // Match icon background
  const arrowBorder = isGhost
    ? color + '33' // ~20% alpha to match icon
    : withAlpha(colors.background, 0.4); // Match icon border
  const arrowColor = iconColor;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (href.startsWith('http')) {
      Linking.openURL(href);
    } else {
      router.push(href as any);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      accessibilityRole="button"
      style={({ pressed, hovered }) => ({
        borderRadius: 22,
        paddingVertical: 18,
        paddingHorizontal: 22,
        minWidth: 240,
        borderWidth: 1,
        borderColor,
        backgroundColor: pressed
          ? pressedBackground
          : hovered
          ? hoverBackground
          : baseBackground,
        transform: [{ scale: pressed ? 0.985 : 1 }],
        shadowColor,
        shadowOpacity: hovered ? 0.36 : 0.22,
        shadowRadius: hovered ? 20 : 14,
        // shadowOffset: { width: 0, height: hovered ? 10 : 6 },
        elevation: hovered ? 5 : 3,
        overflow: 'hidden',
      })}
    >
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <Defs>
          <Filter id={noiseId} x="0%" y="0%" width="100%" height="100%">
            <FeTurbulence
              baseFrequency="0.85 0.85"
              numOctaves="3"
              seed="2"
              stitchTiles="stitch"
              type="turbulence"
            />
            <FeColorMatrix type="saturate" values="0" />
            <FeColorMatrix
              type="matrix"
              values="0 0 0 0 0.5
                      0 0 0 0 0.5
                      0 0 0 0 0.5
                      0 0 0 0.06 0"
            />
            <FeComposite in2="SourceGraphic" operator="over" />
          </Filter>
          <SvgLinearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="100"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <Stop
              offset="0%"
              stopColor={colors.gradientStart}
              stopOpacity={1}
            />
            <Stop offset="25%" stopColor={colors.gradientMid} stopOpacity={1} />
            <Stop
              offset="65%"
              stopColor={colors.gradientMid}
              stopOpacity={0.8}
            />
            <Stop
              offset="100%"
              stopColor={colors.gradientEnd}
              stopOpacity={1}
            />
          </SvgLinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100"
          height="60"
          fill={`url(#${gradientId})`}
          filter={`url(#${noiseId})`}
        />
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -1,
          left: -1,
          right: -1,
          bottom: -1,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: color,
          shadowColor: color,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          opacity: glow,
        }}
      />
      <VStack style={{ gap: 12 }}>
        <HStack
          alignItems="center"
          space="sm"
          style={{ justifyContent: 'space-between' }}
        >
          <HStack alignItems="center" space="sm" style={{ flex: 1 }}>
            <Box
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: iconBackground,
                borderWidth: 1,
                borderColor: iconBorder,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: color,
                shadowOpacity: isGhost ? 0.15 : 0.25,
                shadowRadius: 10,
                // shadowOffset: { width: 0, height: 4 },
              }}
            >
              <Icon size={20} color={iconColor} />
            </Box>
            <Text
              className="text-base font-semibold"
              style={{ color: textColor, flexShrink: 1 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {label}
            </Text>
          </HStack>
          <Box
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: arrowBackground,
              borderWidth: 1,
              borderColor: arrowBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowRightIcon size={16} color={arrowColor} />
          </Box>
        </HStack>
        {description ? (
          <Text className="text-xs" style={{ color: descriptionColor }}>
            {description}
          </Text>
        ) : null}
      </VStack>
    </Pressable>
  );
};

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();

  // Responsive columns
  const columns = width >= 1200 ? 3 : width >= 768 ? 2 : 1;
  const basis = useMemo(() => {
    if (columns === 3) return '33.333%';
    if (columns === 2) return '50%';
    return '100%';
  }, [columns]);

  const features = [
    {
      href: '/(tabs)/border',
      title: 'Border Calculator',
      subtitle: 'Calculate precise print borders',
      color: colors.borderCalcTint,
      icon: FrameIcon,
      tag: 'Printmaking',
    },
    {
      href: '/(tabs)/exposure',
      title: 'Stops Calculator',
      subtitle: 'Calculate exposure in stops and time',
      color: colors.stopCalcTint,
      icon: TimerIcon,
      tag: 'Exposure math',
    },
    {
      href: '/(tabs)/resize',
      title: 'Resize Calculator',
      subtitle: 'Scale prints without making tons of test strips',
      color: colors.resizeCalcTint,
      icon: MoveIcon,
      tag: 'Digital prep',
    },
    {
      href: '/(tabs)/cameraExposure',
      title: 'Exposure Calculator',
      subtitle: 'Aperture, shutter, ISO trade-offs',
      color: colors.cameraExposureCalcTint,
      icon: CameraIcon,
      tag: 'On-location',
    },
    {
      href: '/(tabs)/reciprocity',
      title: 'Reciprocity',
      subtitle: 'Correct for long exposure failure',
      color: colors.reciprocityCalcTint,
      icon: ClockIcon,
      tag: 'Long exposure',
    },
  ] as const;

  const heroActions = [
    {
      href: '/(tabs)/border',
      label: 'Launch border calculator',
      description: 'Get instant print guides and trim-safe borders',
      color: colors.borderCalcTint,
      icon: FrameIcon,
    },
    {
      href: '/(tabs)/developmentRecipes',
      label: 'Browse development recipes',
      description: 'Film + chemistry pairings with trusted results',
      color: colors.developmentRecipesTint,
      icon: FlaskConicalIcon,
      variant: 'ghost' as const,
    },
  ] as const;

  const heroHighlights = [
    {
      icon: CameraIcon,
      label: 'Built for analog photographers',
    },
    {
      icon: ClockIcon,
      label: 'Fast exposure & reciprocity math',
    },
    {
      icon: GitBranchIcon,
      label: 'Open source, community powered',
    },
  ] as const;

  const activeFeatures = features.filter(
    (feature) => !(feature as any).disabled
  );
  const featureSections = [
    {
      key: 'active',
      heading: 'Calculators',
      description:
        'Everything you need to plan exposures, prints, and reciprocity fixes in the darkroom.',
      items: activeFeatures,
      basis,
    },
  ];

  const externalLinks = [
    {
      href: 'https://github.com/narrowstacks/DorkroomReact',
      title: 'Contribute on GitHub',
      color: '#24292e',
      icon: GitBranchIcon,
    },
    {
      href: 'https://ko-fi.com/affords',
      title: 'Support on Ko-fi',
      color: '#FF5E5B',
      icon: HeartIcon,
    },
  ] as const;

  const heroBackgroundColor = colors.heroBackground;
  const heroBorderColor = colors.heroBorder;
  const panelBackgroundColor = colors.panelBackground;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 64 }}
    >
      <Box className="w-full" style={{ paddingHorizontal: 16, paddingTop: 48 }}>
        <Box
          style={{
            width: '100%',
            maxWidth: 1080,
            alignSelf: 'center',
            gap: 32,
          }}
        >
          <Box
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 32,
              paddingVertical: width >= 768 ? 48 : 36,
              paddingHorizontal: width >= 768 ? 48 : 24,
              backgroundColor: heroBackgroundColor,
              borderWidth: 1,
              borderColor: heroBorderColor,
            }}
          >
            <Svg
              pointerEvents="none"
              width="100%"
              height="100%"
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <Defs>
                <RadialGradient
                  id="heroGlowA"
                  cx="20%"
                  cy="20%"
                  rx="45%"
                  ry="45%"
                >
                  <Stop
                    offset="0%"
                    stopColor={colors.borderCalcTint}
                    stopOpacity={0.45}
                  />
                  <Stop
                    offset="100%"
                    stopColor={colors.borderCalcTint}
                    stopOpacity={0}
                  />
                </RadialGradient>
                <RadialGradient
                  id="heroGlowB"
                  cx="85%"
                  cy="35%"
                  rx="38%"
                  ry="38%"
                >
                  <Stop
                    offset="0%"
                    stopColor={colors.resizeCalcTint}
                    stopOpacity={0.4}
                  />
                  <Stop
                    offset="100%"
                    stopColor={colors.resizeCalcTint}
                    stopOpacity={0}
                  />
                </RadialGradient>
                <Filter id="heroNoise" x="0%" y="0%" width="100%" height="100%">
                  <FeTurbulence
                    baseFrequency="0.8 0.8"
                    numOctaves="1"
                    seed="5"
                    stitchTiles="stitch"
                    type="fractalNoise"
                  />
                  <FeColorMatrix type="saturate" values="0" />
                  <FeColorMatrix
                    type="matrix"
                    values="0 0 0 0 0.5
                            0 0 0 0 0.5
                            0 0 0 0 0.5
                            0 0 0 0.015 0"
                  />
                  <FeComposite in2="SourceGraphic" operator="over" />
                </Filter>
                <SvgLinearGradient
                  id="heroSheen"
                  x1="0"
                  y1="0"
                  x2="100"
                  y2="60"
                >
                  <Stop
                    offset="0%"
                    stopColor={colors.gradientStart}
                    stopOpacity={1}
                  />
                  <Stop
                    offset="20%"
                    stopColor={colors.gradientMid}
                    stopOpacity={1}
                  />
                  <Stop
                    offset="60%"
                    stopColor={colors.gradientMid}
                    stopOpacity={0.85}
                  />
                  <Stop
                    offset="100%"
                    stopColor={colors.gradientEnd}
                    stopOpacity={1}
                  />
                </SvgLinearGradient>
              </Defs>
              <Rect
                x="-10"
                y="-10"
                width="80"
                height="80"
                fill="url(#heroGlowA)"
              />
              <Rect
                x="40"
                y="0"
                width="70"
                height="80"
                fill="url(#heroGlowB)"
              />
              <Rect
                x="0"
                y="0"
                width="100"
                height="60"
                fill="url(#heroSheen)"
                filter="url(#heroNoise)"
              />
            </Svg>

            <VStack style={{ gap: 24 }}>
              <Box>
                <Heading
                  className="font-bold"
                  style={{
                    fontSize: width >= 768 ? 50 : 40,
                    lineHeight: width >= 768 ? 55 : 45,
                    marginBottom: 8,
                    color: colors.text,
                  }}
                >
                  Dorkroom.art
                </Heading>
                <Heading
                  className="font-bold"
                  style={{
                    fontSize: width >= 768 ? 40 : 32,
                    lineHeight: width >= 768 ? 48 : 38,
                  }}
                >
                  Skip the math. Make prints.
                </Heading>
              </Box>
              <Text
                className="text-base"
                style={{ color: colors.textSecondary, maxWidth: 680 }}
              >
                Dorkroom keeps the math and planning out of the way so you can
                focus on making prints and beautiful exposures. Explore
                calculators that balance exposure, size prints, and guide
                darkroom chemistry.
              </Text>

              <Box
                style={{
                  flexDirection: width >= 768 ? 'row' : 'column',
                  alignItems: width >= 768 ? 'center' : 'stretch',
                }}
              >
                {heroActions.map((action, index) => (
                  <Box
                    key={action.label}
                    style={{
                      marginRight:
                        width >= 768 && index !== heroActions.length - 1
                          ? 16
                          : 0,
                      marginBottom:
                        width < 768 && index !== heroActions.length - 1
                          ? 12
                          : 0,
                    }}
                  >
                    <HeroActionButton {...action} />
                  </Box>
                ))}
              </Box>

              <Box
                style={{
                  flexDirection: width >= 768 ? 'row' : 'column',
                  flexWrap: 'wrap',
                }}
              >
                {heroHighlights.map((item, index) => (
                  <HStack
                    key={item.label}
                    space="sm"
                    alignItems="center"
                    style={{
                      marginRight:
                        width >= 768 && index !== heroHighlights.length - 1
                          ? 20
                          : 0,
                      marginBottom: width >= 768 ? 0 : 10,
                    }}
                  >
                    <Box
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: colors.text + '1A', // ~10% alpha like PillLink
                        borderWidth: 1,
                        borderColor: colors.text + '33', // ~20% alpha like PillLink
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <item.icon size={16} color={colors.text} />
                    </Box>
                    <Text className="text-sm" style={{ color: colors.text }}>
                      {item.label}
                    </Text>
                  </HStack>
                ))}
              </Box>
            </VStack>
          </Box>

          {featureSections.map((section) => {
            if (!section.items.length) return null;
            return (
              <VStack key={section.key} style={{ gap: 16 }}>
                <VStack style={{ gap: 8 }}>
                  {/* <Text
                    className="text-xs font-semibold"
                    style={{
                      color: colors.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {section.key === "active" ? "Tools" : "Roadmap"}
                  </Text> */}
                  <Heading className="font-semibold" size="xl">
                    {section.heading}
                  </Heading>
                  <Text
                    className="text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    {section.description}
                  </Text>
                </VStack>
                <Box
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginHorizontal: -8,
                  }}
                >
                  {section.items.map((feature) => (
                    <FeatureCard
                      key={feature.title}
                      basis={section.basis}
                      {...feature}
                    />
                  ))}
                </Box>
              </VStack>
            );
          })}

          <Box
            style={{
              borderRadius: 28,
              paddingVertical: 28,
              paddingHorizontal: width >= 768 ? 32 : 20,
              backgroundColor: panelBackgroundColor,
              borderWidth: 1,
              borderColor: heroBorderColor,
            }}
          >
            <VStack style={{ gap: 16 }}>
              <Heading size="lg">Stay in the loop</Heading>
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                Support the project, download the code, or share feedback with
                other darkroom techs.
              </Text>
              <Center>
                <Box
                  style={{
                    flexDirection: width >= 480 ? 'row' : 'column',
                    alignItems: 'center',
                  }}
                >
                  {externalLinks.map((link, index) => (
                    <Box
                      key={link.title}
                      style={{
                        marginRight:
                          width >= 480 && index !== externalLinks.length - 1
                            ? 12
                            : 0,
                        marginBottom:
                          width < 480 && index !== externalLinks.length - 1
                            ? 12
                            : 0,
                      }}
                    >
                      <PillLink
                        href={link.href}
                        title={link.title}
                        color={link.color}
                        icon={link.icon}
                      />
                    </Box>
                  ))}
                </Box>
              </Center>
            </VStack>
          </Box>
        </Box>
      </Box>
    </ScrollView>
  );
}
