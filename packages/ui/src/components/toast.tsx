import { Check, X } from 'lucide-react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { hasGlobal } from '../lib/dom';
import { ToastContext, type ToastType } from './toast-context';

export interface ToastProps {
  message: string;
  type?: ToastType;
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
    <div
      className={cn(
        'fixed top-4 right-4 z-[9999] flex max-w-[calc(100vw-2rem)] items-center gap-2 break-words rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all duration-200',
        'border border-solid',
        isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
      data-testid="toast"
      style={getStyles()}
    >
      {getIcon()}
      <span>{message}</span>
    </div>
  );
}

const ANNOUNCE_DELAY_MS = 50;

export interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastProps['type'];
    id: string;
  } | null>(null);

  // Announcements live in regions that stay mounted for the provider's whole
  // lifetime: a live region that mounts with its text is not reliably read.
  const [announcement, setAnnouncement] = useState<{
    message: string;
    assertive: boolean;
  }>({ message: '', assertive: false });
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (announceTimer.current) clearTimeout(announceTimer.current);
    },
    []
  );

  const showToast = useCallback(
    (message: string, type: ToastProps['type'] = 'success') => {
      // Clear, then set on a later tick, so the same message twice in a row
      // is still a change the screen reader announces.
      if (announceTimer.current) clearTimeout(announceTimer.current);
      setAnnouncement({ message: '', assertive: type === 'error' });
      announceTimer.current = setTimeout(() => {
        setAnnouncement({ message, assertive: type === 'error' });
        announceTimer.current = null;
      }, ANNOUNCE_DELAY_MS);

      // Use crypto.randomUUID() if available, otherwise fall back to a timestamp-based ID
      const id =
        hasGlobal('crypto') && crypto.randomUUID
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      setToast({ message, type, id });
    },
    []
  );

  const hideToast = () => {
    setToast(null);
    // Drop the stale text so it is not left behind for the virtual cursor.
    setAnnouncement((current) => ({ ...current, message: '' }));
  };

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext value={contextValue}>
      {children}
      {/* Portalled to the body so an open modal, which makes the rest of the
          page inert (see useModalLayer), leaves the toast announced. */}
      {hasGlobal('document') &&
        createPortal(
          <>
            {/* Direct body children matching [aria-live], so useModalLayer
                never makes them inert. The visible toast carries no live
                role, so nothing is read twice. */}
            <div
              data-toast-live-region="polite"
              className="sr-only"
              aria-live="polite"
              aria-atomic="true"
            >
              {announcement.assertive ? '' : announcement.message}
            </div>
            <div
              data-toast-live-region="assertive"
              className="sr-only"
              aria-live="assertive"
              aria-atomic="true"
            >
              {announcement.assertive ? announcement.message : ''}
            </div>
            {toast && (
              <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                onClose={hideToast}
                isVisible={!!toast}
              />
            )}
          </>,
          document.body
        )}
    </ToastContext>
  );
}
