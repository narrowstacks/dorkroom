import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

export enum ModalSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

export interface ModalConfiguration {
  size: 'xs' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  style?: ViewStyle;
}

export function getModalConfiguration(
  modalSize: ModalSize,
  isDesktop: boolean
): ModalConfiguration {
  switch (modalSize) {
    case ModalSize.SMALL:
      return {
        size: isDesktop ? 'md' : 'full',
        className: isDesktop ? 'max-w-2xl' : 'h-full',
        style:
          Platform.OS !== 'web' && !isDesktop
            ? {
                maxHeight: '65%',
                marginTop: 'auto',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
              }
            : undefined,
      };

    case ModalSize.MEDIUM:
      return {
        size: isDesktop ? 'md' : 'full',
        className: isDesktop ? 'max-w-2xl' : 'h-full',
        style:
          Platform.OS !== 'web' && !isDesktop
            ? {
                maxHeight: '95%',
                marginTop: 'auto',
                borderTopLeftRadius: 48,
                borderTopRightRadius: 48,
                borderBottomLeftRadius: 48,
                borderBottomRightRadius: 48,
              }
            : undefined,
      };

    case ModalSize.LARGE:
      return {
        size: isDesktop ? 'lg' : 'full',
        className: isDesktop ? 'max-w-3xl max-h-[95vh] m-4' : 'h-full w-full',
        style:
          Platform.OS !== 'web'
            ? {
                maxHeight: '95%',
                marginTop: 'auto',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }
            : undefined,
      };

    default:
      return {
        size: 'md',
        className: 'max-w-2xl',
      };
  }
}

// Convenience functions for common modal types
export const getRecipeDetailModalConfig = (
  isDesktop: boolean
): ModalConfiguration => getModalConfiguration(ModalSize.SMALL, isDesktop);

// Use the same configuration for both regular and custom recipe modals
export const getCustomRecipeDetailModalConfig = (
  isDesktop: boolean
): ModalConfiguration => getModalConfiguration(ModalSize.SMALL, isDesktop);

export const getRecipeFormModalConfig = (
  isDesktop: boolean
): ModalConfiguration => getModalConfiguration(ModalSize.SMALL, isDesktop);
