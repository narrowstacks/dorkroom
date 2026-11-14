import { Button } from './button';

interface NeutralButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Layout only, e.g. `flex-1`. */
  className?: string;
}

/**
 * A solid-looking button that is not a commit: retry, a permission request, a
 * link to another screen. `Button` with `variant="secondary"`, because the solid
 * accent fill is reserved for commits.
 */
export function NeutralButton(props: NeutralButtonProps) {
  return <Button {...props} variant="secondary" />;
}
