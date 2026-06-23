import type { FC, ReactNode } from 'react';

/** Format time as "Xm XXs" instead of decimal minutes */
// eslint-disable-next-line react-doctor/only-export-components -- intentional shared helper module for recipe-detail views; consumers import formatTime alongside DetailRow from here
export const formatTime = (minutes: number): string => {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  }

  const wholeMinutes = Math.floor(minutes);
  const seconds = Math.round((minutes - wholeMinutes) * 60);
  if (seconds === 0) {
    return `${wholeMinutes}m`;
  }
  return `${wholeMinutes}m ${seconds.toString().padStart(2, '0')}s`;
};

/** Helper component for detail rows */
export const DetailRow: FC<{ label: string; value: ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex justify-between gap-6 text-sm">
    <span className="text-tertiary">{label}</span>
    <span className="text-right text-primary">{value}</span>
  </div>
);
