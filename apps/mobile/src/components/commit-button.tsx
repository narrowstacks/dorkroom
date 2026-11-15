import { Button } from './button';

interface CommitButtonProps {
  label: string;
  onPress: () => void;
  /** Blocks the press, dims the button and tells VoiceOver. */
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Layout only, e.g. `flex-1`. */
  className?: string;
}

/**
 * The solid button that commits or creates (Start roll, Add shot, Save): the
 * surrounding phase's hue with dark ink, brand rose with white outside a phase.
 * `Button` with `variant="commit"`, so the fill can't drift per screen.
 */
export function CommitButton(props: CommitButtonProps) {
  return <Button {...props} variant="commit" />;
}
