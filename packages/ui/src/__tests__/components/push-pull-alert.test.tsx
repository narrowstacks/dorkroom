import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PushPullAlert } from '../../components/push-pull-alert';

describe('PushPullAlert', () => {
  it.each([
    [2, 'For pushed film: ISO 1600'],
    [-2, 'For pulled film: ISO 1600'],
  ])(
    'carries the hook that drops its tint in high contrast and darkroom (%i)',
    (pushPull, text) => {
      render(<PushPullAlert shootingIso={1600} pushPull={pushPull} />);
      expect(screen.getByText(text).closest('.status-alert')).not.toBeNull();
    }
  );
});
