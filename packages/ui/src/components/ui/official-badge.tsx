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
        className="official-badge inline-flex size-[18px] items-center justify-center rounded-full border"
        style={{
          backgroundColor: themeStyle.backgroundColor,
          borderColor: themeStyle.borderColor,
          color: themeStyle.color,
        }}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- styled icon badge (SVG inside a span); a native <img> cannot render this, and role="img" makes the aria-label reliably announced
        role="img"
        aria-label={tooltipText}
        aria-describedby={showTooltip && pos ? tooltipId : undefined}
      >
        <Check className="size-3" strokeWidth={3} aria-hidden="true" />
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
        className="inline-flex size-[18px] items-center justify-center rounded-full border"
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
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- styled icon badge (SVG inside a span); a native <img> cannot render this, and role="img" makes the aria-label reliably announced
        role="img"
        aria-label={tooltipText}
        aria-describedby={showTooltip && pos ? tooltipId : undefined}
      >
        <Beaker className="size-2.5" strokeWidth={2.5} aria-hidden="true" />
      </span>
      {showTooltip && pos && (
        <PortalTooltip id={tooltipId} pos={pos} text={tooltipText} />
      )}
    </span>
  );
}
