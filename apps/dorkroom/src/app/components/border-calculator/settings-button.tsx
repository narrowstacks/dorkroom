import { ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

interface SettingsButtonProps {
  label?: string;
  value?: string;
  onPress: () => void;
  icon?: LucideIcon;
  showChevron?: boolean;
  centerLabel?: boolean;
  className?: string;
}

export function SettingsButton({
  label,
  value,
  onPress,
  icon: Icon,
  showChevron = true,
  centerLabel = false,
  className,
}: SettingsButtonProps) {
  return (
    <button
      onClick={onPress}
      className={cn(
        'w-full rounded-lg border border-white/20 bg-white/5 p-4 text-left transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn('flex items-center gap-3', centerLabel && 'flex-1 justify-center')}>
          {Icon && <Icon className="h-5 w-5 text-white/70" />}
          <div className={cn(centerLabel && 'text-center')}>
            {label && (
              <div className="text-sm font-medium text-white/90">{label}</div>
            )}
            {value && (
              <div className={cn(
                'text-sm text-white/70',
                !label && 'font-medium text-white/90'
              )}>
                {value}
              </div>
            )}
          </div>
        </div>
        {showChevron && !centerLabel && (
          <ChevronRight className="h-4 w-4 text-white/50" />
        )}
      </div>
    </button>
  );
}