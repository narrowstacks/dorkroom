import type { FC } from 'react';

interface VirtualTableSpacerProps {
  height: number;
  colSpan: number;
}

/** Stands in for the rows a virtualized table is not rendering. */
export const VirtualTableSpacer: FC<VirtualTableSpacerProps> = ({
  height,
  colSpan,
}) =>
  height > 0 ? (
    <tr aria-hidden="true">
      <td aria-hidden="true" colSpan={colSpan} style={{ height }} />
    </tr>
  ) : null;
