import { Check, X } from 'lucide-react';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { cn } from '../lib/cn';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
  isVisible?: boolean;
}

export function Toast({
  message,
  type = 'success',
  duration = 3000,
  onClose,
  isVisible = true,
}: ToastProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // Trigger the slide-in transition once the toast becomes visible. isAnimating
  // intentionally starts false (off-screen) and flips true in an effect so the
  // browser paints the initial off-screen frame first, enabling the CSS enter
  // transition — it is animation timing, not a derivable/adjustable value.
  useEffect(() => {
    // eslint-disable-next-line react-doctor/no-event-handler -- two-commit CSS enter transition; there is no originating user event to move this into
    if (isVisible) {
      // eslint-disable-next-line react-doctor/no-adjust-state-on-prop-change -- two-commit CSS enter transition, not a derivable value (see comment above)
      setIsAnimating(true);
    }
  }, [isVisible]);

  // Auto-dismiss: animate out and notify after the duration elapses. This is a
  // setTimeout side effect, not a state reset; the early return when !isVisible
  // just skips arming the timer.
  // eslint-disable-next-line react-doctor/no-reset-all-state-on-prop-change -- timer-driven side effect, not a prop-change state reset (the provider already keys Toast by id)
  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setIsAnimating(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-doctor/prefer-use-effect-event -- simple auto-dismiss timer with intentional deps; useEffectEvent is unnecessary here
  }, [isVisible, duration, onClose]);

  if (!isVisible) {
    return null;
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="size-4" />;
      case 'error':
        return <X className="size-4" />;
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
      default:
        return {
          color: baseColor,
          backgroundColor: baseBg,
          borderColor: baseBorder,
        };
    }
  };

  return (
    <output
      className={cn(
        'fixed top-4 right-4 z-[9999] flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all duration-200',
        'border border-solid',
        isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
      aria-live="polite"
      style={getStyles()}
    >
      {getIcon()}
      <span>{message}</span>
    </output>
  );
}

export interface ToastProviderProps {
  children: ReactNode;
}

export interface ToastContextValue {
  showToast: (message: string, type?: ToastProps['type']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
export function useOptionalToast(): ToastContextValue | null {
  return use(ToastContext);
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastProps['type'];
    id: string;
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastProps['type'] = 'success') => {
      // Use crypto.randomUUID() if available, otherwise fall back to a timestamp-based ID
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      setToast({ message, type, id });
    },
    []
  );

  const hideToast = () => {
    setToast(null);
  };

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext value={contextValue}>
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
    </ToastContext>
  );
}

export function useToast(): ToastContextValue {
  const context = use(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
