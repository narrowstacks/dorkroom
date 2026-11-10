import { vars } from 'nativewind';
import {
  NORMAL_VAR_VALUES,
  SAFELIGHT_VAR_VALUES,
} from '@/theme/safelight-tokens';

/**
 * The NativeWind variable styles, built once. `SafelightRoot` passes the result
 * of `rootVarsStyle` on EVERY render, from the first: a `vars()` style that
 * appears later remounts the component and everything under it
 * (react-native-css-interop). This is the only file that touches these two
 * constants; a test fails if any other file does, or if either is ever used
 * conditionally.
 */
const NORMAL_VARS = vars(NORMAL_VAR_VALUES);
const SAFELIGHT_VARS = vars(SAFELIGHT_VAR_VALUES);

/** The root variable style for the mode; never nullish. */
export function rootVarsStyle(on: boolean) {
  return on ? SAFELIGHT_VARS : NORMAL_VARS;
}
