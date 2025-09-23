import React from 'react';
import {
  VStack,
  HStack,
  Heading,
  Button,
  ButtonIcon,
} from '@gluestack-ui/themed';
import { useThemeColor } from '@/hooks/useThemeColor';
import { X } from 'lucide-react-native';

interface SectionWrapperProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  space?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({
  title,
  onClose,
  children,
  space = 'lg',
}) => {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <VStack
      space={space}
      style={{
        flex: 1,
        backgroundColor,
        paddingTop: 0,
        paddingHorizontal: 16,
        paddingBottom: 4,
      }}
    >
      {/* Header with close button */}
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Heading size="lg">{title}</Heading>
        <Button onPress={onClose} variant="outline" size="sm">
          <ButtonIcon as={X} />
        </Button>
      </HStack>

      {children}
    </VStack>
  );
};
