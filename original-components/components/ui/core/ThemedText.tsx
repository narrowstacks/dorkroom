import { Text, TextProps, TextStyle } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export type TextType =
  | 'default'
  | 'defaultSemiBold'
  | 'defaultBold'
  | 'small'
  | 'smallSemiBold'
  | 'smallBold'
  | 'large'
  | 'largeSemiBold'
  | 'largeBold';

const textStyles: Record<TextType, TextStyle> = {
  default: {
    fontSize: 16,
    fontWeight: '400',
  },
  defaultSemiBold: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultBold: {
    fontSize: 16,
    fontWeight: '700',
  },
  small: {
    fontSize: 14,
    fontWeight: '400',
  },
  smallSemiBold: {
    fontSize: 14,
    fontWeight: '600',
  },
  smallBold: {
    fontSize: 14,
    fontWeight: '700',
  },
  large: {
    fontSize: 18,
    fontWeight: '400',
  },
  largeSemiBold: {
    fontSize: 18,
    fontWeight: '600',
  },
  largeBold: {
    fontSize: 18,
    fontWeight: '700',
  },
};

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: TextType;
};

export function ThemedText(props: ThemedTextProps) {
  const {
    style,
    lightColor,
    darkColor,
    type = 'default',
    ...otherProps
  } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const textStyle = type ? textStyles[type] : undefined;

  return <Text style={[textStyle, { color }, style]} {...otherProps} />;
}
