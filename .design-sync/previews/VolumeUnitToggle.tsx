import { VolumeUnitToggle } from '@dorkroom/ui';

// Context-driven toggle (ml | fl oz) used in the development-recipe volume mixer.
// Reads/writes the global VolumeProvider, so it takes no props.
export const Default = () => (
  <div style={{ maxWidth: 200 }}>
    <VolumeUnitToggle />
  </div>
);
