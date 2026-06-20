import { PushPullAlert } from '@dorkroom/ui';

// Pushed film — warning/yellow with an up arrow.
export const Pushed = () => (
  <div style={{ maxWidth: 460 }}>
    <PushPullAlert shootingIso={1600} pushPull={2} />
  </div>
);

// Pulled film — info/blue with a down arrow.
export const Pulled = () => (
  <div style={{ maxWidth: 460 }}>
    <PushPullAlert shootingIso={200} pushPull={-1} />
  </div>
);
