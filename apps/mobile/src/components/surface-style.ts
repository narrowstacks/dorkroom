/**
 * The flat content surfaces, as class names, shared so they cannot drift.
 *
 * A card (`Surface`): one fill token (`bg-surface`), a 16pt radius, no blur and
 * no rim. Under safelight the fill is transparent and the `border-hw
 * border-line` hairline carries the shape, so there is no branch.
 *
 * A grouped list has ONE look, whether it is an `InsetGroup` (a few rows laid
 * out at once) or a `FlatList` drawn row by row with `groupRowClassName`: the
 * inset fill, an `edge` outline, radius 16, and an `edge` line between rows.
 */

export const SURFACE_CLASS = 'rounded-2xl border-hw border-line bg-surface';

/** The whole group, for `InsetGroup`. */
export const GROUP_CLASS =
  'overflow-hidden rounded-2xl border border-edge bg-surface-inset';

/** The line above every row but the first. */
export const GROUP_SEPARATOR_CLASS = 'border-t border-edge';

/**
 * One row of a grouped list that a `FlatList` renders row by row (an
 * `InsetGroup` would defeat virtualization), drawn to look exactly like an
 * `InsetGroup`: the fill and the side outline on every row, the top outline
 * (the first row) or the separator (the others) above it, and the rounded top
 * or bottom on the ends. `count` is the number of rows in the group.
 */
export function groupRowClassName(index: number, count: number): string {
  const first = index === 0;
  const last = index === count - 1;
  return [
    'border-x border-edge bg-surface-inset',
    // The first row's top line is the group's outline; on the others the same
    // line is the separator.
    GROUP_SEPARATOR_CLASS,
    first ? 'rounded-t-2xl' : '',
    last ? 'rounded-b-2xl border-b' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
