import { X } from 'lucide-react';
import type { FC, ReactNode } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { cn } from '../lib/cn';
import { Drawer, DrawerBody, DrawerContent } from './drawer';
import { Modal } from './modal';

/**
 * Props for the ResponsiveModal component.
 * Combines Modal and Drawer props for responsive behavior.
 */
export interface ResponsiveModalProps {
  /** Whether the modal/drawer is currently visible */
  isOpen: boolean;
  /** Callback function called when the modal/drawer should be closed */
  onClose: () => void;
  /** Title text displayed in the header */
  title: string;
  /** Content to be rendered inside the modal/drawer body */
  children: ReactNode;
  /** Size variant for the desktop modal width (defaults to 'md') */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Size variant for the mobile drawer height (defaults to 'lg') */
  mobileSize?: 'sm' | 'md' | 'lg';
  /**
   * Override the mobile detection. If not provided, uses useIsMobile() hook.
   * Pass this when you already have mobile state from parent to avoid extra hook calls.
   */
  isMobile?: boolean;
  /** Optional footer content displayed at the bottom of the modal/drawer */
  footer?: ReactNode;
  /** Custom max-height for mobile drawer (defaults to size-based value) */
  mobileMaxHeight?: string;
  /** Custom className for the drawer body */
  drawerBodyClassName?: string;
  /** Custom className for the drawer content wrapper */
  drawerContentClassName?: string;
  /** Whether to hide the close button in the header */
  hideCloseButton?: boolean;
}

/**
 * A responsive modal component that automatically switches between
 * a centered Modal on desktop and a bottom Drawer on mobile.
 *
 * This eliminates the need for manual `if (isMobile)` checks in every
 * modal component, providing a consistent responsive experience.
 *
 * @example
 * ```tsx
 * // Basic usage - auto-detects mobile
 * <ResponsiveModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Edit Recipe"
 * >
 *   <RecipeForm />
 * </ResponsiveModal>
 *
 * // With external mobile state
 * <ResponsiveModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Recipe Details"
 *   isMobile={isMobile}
 *   footer={<ActionButtons />}
 * >
 *   <RecipeContent />
 * </ResponsiveModal>
 * ```
 */
export const ResponsiveModal: FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  mobileSize = 'lg',
  isMobile: isMobileProp,
  footer,
  mobileMaxHeight,
  drawerBodyClassName,
  drawerContentClassName,
  hideCloseButton = false,
}) => {
  // Use prop if provided, otherwise use hook
  const isMobileHook = useIsMobile();
  const isMobile = isMobileProp ?? isMobileHook;

  // Default max-heights based on mobile size
  const defaultMaxHeights: Record<
    NonNullable<ResponsiveModalProps['mobileSize']>,
    string
  > = {
    sm: '50vh',
    md: '70vh',
    lg: '85vh',
  };

  const maxHeight = mobileMaxHeight ?? defaultMaxHeights[mobileSize];

  if (isMobile) {
    return (
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        size={mobileSize}
        anchor="bottom"
        enableBackgroundBlur={true}
      >
        <DrawerContent
          className={cn(
            'h-full bg-[color:var(--color-surface)]',
            drawerContentClassName
          )}
          style={{ maxHeight }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--color-border-secondary)' }}
          >
            <h2 className="text-base font-semibold text-[color:var(--color-text-primary)]">
              {title}
            </h2>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 transition"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderColor: 'var(--color-border-secondary)',
                  borderWidth: 1,
                }}
              >
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <DrawerBody className={cn('px-4 pb-6 pt-4', drawerBodyClassName)}>
            {children}
            {footer && <div className="flex flex-col gap-2 pt-4">{footer}</div>}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      footer={footer}
      hideCloseButton={hideCloseButton}
    >
      {children}
    </Modal>
  );
};
