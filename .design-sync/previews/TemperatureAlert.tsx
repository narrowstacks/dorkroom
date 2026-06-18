import { TemperatureAlert } from '@dorkroom/ui';

// Higher-than-standard development temperature — warning/yellow with a flame.
export const Higher = () => (
  <div style={{ maxWidth: 460 }}>
    <TemperatureAlert temperatureF={75} />
  </div>
);

// Lower-than-standard development temperature — info/blue with a snowflake.
export const Lower = () => (
  <div style={{ maxWidth: 460 }}>
    <TemperatureAlert temperatureC={18} />
  </div>
);
