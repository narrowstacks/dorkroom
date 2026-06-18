import { StatusAlert } from '@dorkroom/ui';

// The component's two visual states are `warning` (default) and `error`.
export const Warning = () => (
  <div style={{ maxWidth: 460 }}>
    <StatusAlert
      action="warning"
      message="The aspect ratios of the original and target prints do not match. Match them as closely as possible."
    />
  </div>
);

export const Error = () => (
  <div style={{ maxWidth: 460 }}>
    <StatusAlert
      action="error"
      message="Check inputs. The outer mat must be positive and the borders must leave a window larger than zero on both axes."
    />
  </div>
);
