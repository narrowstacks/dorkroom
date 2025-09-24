import { cn } from '../../lib/cn';
import { getTagThemeStyle } from '../../lib/tag-colors';

interface TagProps {
  children: string;
  className?: string;
  size?: 'sm' | 'xs';
}

export function Tag({ children, className, size = 'xs' }: TagProps) {
  const themeStyle = getTagThemeStyle(children);

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 uppercase tracking-wide border',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        className
      )}
      style={{
        backgroundColor: themeStyle.backgroundColor,
        color: themeStyle.color,
        borderColor: themeStyle.borderColor,
      }}
    >
      {children.replace(/-/g, ' ')}
    </span>
  );
}
