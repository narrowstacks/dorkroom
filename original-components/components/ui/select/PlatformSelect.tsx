import { Platform } from 'react-native';
import { StyledSelect } from './StyledSelect';
import { StyledMenu } from './StyledMenu';

interface PlatformSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  placeholder?: string;
}

export function PlatformSelect(props: PlatformSelectProps) {
  // Use StyledSelect for web platforms, StyledMenu for mobile
  if (Platform.OS === 'web') {
    return <StyledSelect {...props} />;
  } else {
    return <StyledMenu {...props} />;
  }
}
