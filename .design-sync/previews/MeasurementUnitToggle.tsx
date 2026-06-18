import { MeasurementUnitToggle } from '@dorkroom/ui';

// Context-driven toggle (in | cm) used across the border calculator.
// Reads/writes the global MeasurementProvider, so it takes no props.
export const Default = () => (
  <div style={{ maxWidth: 200 }}>
    <MeasurementUnitToggle />
  </div>
);
