import { cn } from '../../lib/cn';
import { getTagColors } from '../../lib/tag-colors';

interface TagProps {
  children: string;
  className?: string;
  size?: 'sm' | 'xs';
}

export function Tag({ children, className, size = 'xs' }: TagProps) {
  const colors = getTagColors(children);

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 uppercase tracking-wide',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        colors.bg,
        colors.text,
        colors.border && `border ${colors.border}`,
        className
      )}
    >
      {children.replace(/-/g, ' ')}
    </span>
  );
}
