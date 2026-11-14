/** The row's one spoken label. */
export function toolListRowLabel(
  label: string,
  accessoryText: string | undefined,
  external: boolean | undefined
): string {
  if (external) return `${label}, opens in the browser`;
  return accessoryText === undefined ? label : `${label}: ${accessoryText}`;
}
