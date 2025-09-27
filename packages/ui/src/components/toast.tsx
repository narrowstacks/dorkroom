import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../lib/cn';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
  isVisible?: boolean;
}

/**
 * Render a dismissible toast notification with type-based styling and auto-dismiss behavior.
 *
 * @param message - Text content displayed inside the toast
 * @param type - Visual intent of the toast; one of `"success"`, `"error"`, or `"info"`
 * @param duration - Time in milliseconds before the toast begins its exit animation
 * @param onClose - Optional callback invoked after the toast has finished its exit animation
 * @param isVisible - Controls whether the toast is rendered and animated
 * @returns The toast element when visible, otherwise `null`
 */
export function Toast({
  message,
  type = 'success',
  duration = 3000,
  onClose,
  isVisible = true,
}: ToastProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => onClose?.(), 200); // Allow fade-out animation to complete
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible, duration, onClose]);

  if (!isVisible) {
    return null;
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="h-4 w-4" />;
      case 'error':
        return <X className="h-4 w-4" />;
      case 'info':
      default:
        return null;
    }
  };

  const getStyles = () => {
    const baseColor = 'var(--color-text-primary)';
    const baseBg = 'var(--color-surface)';
    const baseBorder = 'var(--color-border-primary)';

    switch (type) {
      case 'success':
        return {
          color: baseColor,
          backgroundColor: baseBg,
          borderColor: 'var(--color-semantic-success)',
        };
      case 'error':
        return {
          color: baseColor,
          backgroundColor: baseBg,
          borderColor: 'var(--color-semantic-error)',
        };
      case 'info':
      default:
        return {
          color: baseColor,
          backgroundColor: baseBg,
          borderColor: baseBorder,
        };
    }
  };

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all duration-200',
        'border border-solid',
        isAnimating
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      )}
      role="status"
      aria-live="polite"
      style={getStyles()}
    >
      {getIcon()}
      <span>{message}</span>
    </div>
  );
}

export interface ToastProviderProps {
  children: React.ReactNode;
}

export interface ToastContextValue {
  showToast: (message: string, type?: ToastProps['type']) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);
/**
 * Returns the Toast context value when available, or `null` if no provider is present.
 *
 * @returns The current `ToastContextValue`, or `null` if the hook is used outside a `ToastProvider`.
 */
export function useOptionalToast(): ToastContextValue | null {
  return React.useContext(ToastContext);
}

/**
 * Provides a Toast context and renders a single toast notification when triggered.
 *
 * The provider supplies a `showToast(message, type?)` function via context to descendants so they can display a toast with a message and optional type (`'success' | 'error' | 'info'`).
 *
 * @param children - React nodes that will receive the toast context
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastProps['type'];
    id: string;
  } | null>(null);

  const showToast = (message: string, type: ToastProps['type'] = 'success') => {
    const id = Math.random().toString(36).substring(7);
    setToast({ message, type, id });
  };

  const hideToast = () => {
    setToast(null);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
          isVisible={!!toast}
        />
      )}
    </ToastContext.Provider>
  );
}

/**
 * Retrieve the toast API from the nearest ToastProvider.
 *
 * @returns The ToastContextValue exposing `showToast` to trigger toasts.
 * @throws Error if called outside of a ToastProvider.
 */
export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
