import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Button,
  ButtonText,
  useToast,
  Toast,
  ToastTitle,
} from '@gluestack-ui/themed';
import { Share, Copy, Check } from 'lucide-react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import {
  useShareLink,
  ShareLinkOptions,
  ShareResult,
} from '@/hooks/useShareLink';

export interface ShareButtonProps {
  recipe: any; // Combination type
  variant?: 'outline' | 'solid';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showText?: boolean;
  style?: any;
  onShareStart?: () => void;
  onShareComplete?: (result: ShareResult) => void;
}

export function ShareButton({
  recipe,
  variant = 'outline',
  size = 'sm',
  showText = false,
  style,
  onShareStart,
  onShareComplete,
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [sharingMethod, setSharingMethod] = useState<string>('Share');
  const [showSuccess, setShowSuccess] = useState(false);

  const toast = useToast();
  const { shareRecipe, getSharingMethodDescription } = useShareLink();
  const textColor = useThemeColor({}, 'text');
  const developmentTint = useThemeColor({}, 'developmentRecipesTint');

  // Update sharing method description on mount
  useEffect(() => {
    const updateSharingMethod = async () => {
      const method = await getSharingMethodDescription();
      setSharingMethod(method);
    };
    updateSharingMethod();
  }, [getSharingMethodDescription]);

  const handleShare = async () => {
    if (isSharing) return;

    setIsSharing(true);
    onShareStart?.();

    // Add haptic feedback on mobile
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const shareOptions: ShareLinkOptions = {
        recipe,
        includeSource: true,
      };

      const result = await shareRecipe(shareOptions);

      if (result.success) {
        // Show success feedback
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);

        // Show appropriate success message
        let successMessage = 'Recipe shared successfully!';
        if (result.method === 'clipboard') {
          successMessage = 'Recipe link copied to clipboard!';
        } else if (result.method === 'webShare') {
          successMessage = 'Recipe shared!';
        } else if (result.method === 'expo') {
          successMessage = 'Recipe shared!';
        }

        toast.show({
          placement: 'top',
          render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="success" variant="solid">
              <ToastTitle>{successMessage}</ToastTitle>
            </Toast>
          ),
        });
      } else {
        // Show error message
        toast.show({
          placement: 'top',
          render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="error" variant="solid">
              <ToastTitle>
                {result.error || 'Failed to share recipe'}
              </ToastTitle>
            </Toast>
          ),
        });
      }

      onShareComplete?.(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to share recipe';

      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="error" variant="solid">
            <ToastTitle>{errorMessage}</ToastTitle>
          </Toast>
        ),
      });

      onShareComplete?.({ success: false, error: errorMessage });
    } finally {
      setIsSharing(false);
    }
  };

  // Determine icon based on sharing method and state
  const getIcon = () => {
    if (showSuccess) {
      return <Check size={16} color={developmentTint} />;
    }

    if (sharingMethod.toLowerCase().includes('copy')) {
      return <Copy size={16} color={textColor} />;
    }

    return <Share size={16} color={textColor} />;
  };

  // Button text based on state and props
  const getButtonText = () => {
    if (showSuccess) {
      return 'Shared!';
    }

    if (isSharing) {
      return 'Sharing...';
    }

    if (showText) {
      return sharingMethod;
    }

    return '';
  };

  return (
    <Button
      variant={variant}
      size={size}
      onPress={handleShare}
      disabled={isSharing}
      style={[
        {
          width: showText
            ? undefined
            : size === 'xs'
            ? 24
            : size === 'sm'
            ? 32
            : 40,
          height: showText
            ? undefined
            : size === 'xs'
            ? 24
            : size === 'sm'
            ? 32
            : 40,
          padding: showText ? undefined : 0,
          minHeight: showText
            ? undefined
            : size === 'xs'
            ? 24
            : size === 'sm'
            ? 32
            : 40,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: showText ? 'row' : 'column',
          gap: showText ? 8 : 0,
        },
        style,
      ]}
    >
      {getIcon()}
      {showText && (
        <ButtonText
          style={{
            fontSize: size === 'xs' ? 12 : size === 'sm' ? 14 : 16,
            color: showSuccess ? developmentTint : textColor,
          }}
        >
          {getButtonText()}
        </ButtonText>
      )}
    </Button>
  );
}
