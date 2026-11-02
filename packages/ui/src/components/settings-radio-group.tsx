import type { KeyboardEvent, ReactNode } from 'react';

export interface SettingsRadioGroupProps {
  /** Id of the heading that names the group. */
  labelledBy: string;
  className?: string;
  children: ReactNode;
}

const MOVE_KEYS = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
} as const;

function isMoveKey(key: string): key is keyof typeof MOVE_KEYS {
  return key in MOVE_KEYS;
}

/**
 * WAI-ARIA radio group wrapper for `SettingsButton role="radio"` options.
 *
 * Arrow keys move focus to the neighbouring option (wrapping) and activate it
 * by clicking it, so selection goes through the option's own `onPress` exactly
 * once. Home and End jump to the first and last option. Tab order is handled
 * by the options (only the checked one is tabbable).
 */
export function SettingsRadioGroup({
  labelledBy,
  className,
  children,
}: SettingsRadioGroupProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const radios = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')
    );
    const current = radios.findIndex((radio) => radio === event.target);
    if (current === -1 || radios.length === 0) return;

    let next: number;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = radios.length - 1;
    else if (isMoveKey(event.key)) {
      next = (current + MOVE_KEYS[event.key] + radios.length) % radios.length;
    } else return;

    event.preventDefault();
    const target = radios[next];
    target.focus();
    target.click();
  };

  return (
    // The options hold focus; the group only listens for their bubbled keys.
    // oxlint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      className={className}
    >
      {children}
    </div>
  );
}
