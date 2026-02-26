import { Beaker, Check } from 'lucide-react';
import { useCallback, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { colorMixOr } from '../../lib/color';
import { getTagThemeStyle } from '../../lib/tag-colors';

interface OfficialBadgeProps {
  tag: string;
  showTooltip?: boolean;
}

interface CustomBadgeProps {
  showTooltip?: boolean;
}

interface TooltipPosition {
  top: number;
  left: number;
}

export function isOfficialTag(tag: string): boolean {
  return tag.startsWith('official-');
}

function getManufacturerFromTag(tag: string): string {
  const name = tag.replace('official-', '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function usePortalTooltip() {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<TooltipPosition | null>(null);
  const tooltipId = useId();

  const show = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return { ref, pos, show, hide, tooltipId };
}

function PortalTooltip({
  id,
  pos,
  text,
}: {
  id: string;
  pos: TooltipPosition;
  text: string;
}) {
  return createPortal(
    <span
      className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium shadow-lg"
      style={{
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        backgroundColor: 'var(--color-text-primary)',
        color: 'var(--color-background)',
      }}
      id={id}
      role="tooltip"
    >
      {text}
      <span
        className="absolute top-full left-1/2 -mt-px -translate-x-1/2 border-4 border-transparent"
        style={{ borderTopColor: 'var(--color-text-primary)' }}
      />
    </span>,
    document.body
  );
}

export function OfficialBadge({ tag, showTooltip = true }: OfficialBadgeProps) {
  const themeStyle = getTagThemeStyle(tag);
  const manufacturer = getManufacturerFromTag(tag);
  const tooltipText = `Official ${manufacturer} Recipe`;
  const { ref, pos, show, hide, tooltipId } = usePortalTooltip();

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip hover container
    <span
      className="relative inline-flex shrink-0"
      ref={ref}
      onMouseEnter={showTooltip ? show : undefined}
      onMouseLeave={showTooltip ? hide : undefined}
    >
      <span
        className="official-badge inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border"
        role="img"
        style={{
          backgroundColor: themeStyle.backgroundColor,
          borderColor: themeStyle.borderColor,
          color: themeStyle.color,
        }}
        aria-label={tooltipText}
        aria-describedby={showTooltip && pos ? tooltipId : undefined}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      {showTooltip && pos && (
        <PortalTooltip id={tooltipId} pos={pos} text={tooltipText} />
      )}
    </span>
  );
}

export function CustomBadge({ showTooltip = true }: CustomBadgeProps) {
  const tooltipText = 'Custom Recipe';
  const { ref, pos, show, hide, tooltipId } = usePortalTooltip();

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip hover container
    <span
      className="relative inline-flex shrink-0"
      ref={ref}
      onMouseEnter={showTooltip ? show : undefined}
      onMouseLeave={showTooltip ? hide : undefined}
    >
      <span
        className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border"
        role="img"
        style={{
          backgroundColor: colorMixOr(
            'var(--color-accent)',
            15,
            'transparent',
            'var(--color-border-muted)'
          ),
          borderColor: colorMixOr(
            'var(--color-accent)',
            30,
            'transparent',
            'var(--color-border-secondary)'
          ),
          color: colorMixOr(
            'var(--color-accent)',
            80,
            'var(--color-text-primary)',
            'var(--color-text-primary)'
          ),
        }}
        aria-label={tooltipText}
        aria-describedby={showTooltip && pos ? tooltipId : undefined}
      >
        <Beaker className="h-2.5 w-2.5" strokeWidth={2.5} />
      </span>
      {showTooltip && pos && (
        <PortalTooltip id={tooltipId} pos={pos} text={tooltipText} />
      )}
    </span>
  );
}
