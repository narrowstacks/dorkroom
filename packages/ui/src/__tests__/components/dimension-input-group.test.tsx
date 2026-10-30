import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DimensionInputGroup } from '../../components/dimension-input-group';
import { MeasurementProvider } from '../../contexts/measurement-context';

function renderGroup(
  props: Partial<React.ComponentProps<typeof DimensionInputGroup>> = {}
) {
  const handlers = {
    onWidthChange: vi.fn(),
    onHeightChange: vi.fn(),
    onWidthBlur: vi.fn(),
    onHeightBlur: vi.fn(),
  };
  render(
    <MeasurementProvider>
      <DimensionInputGroup
        widthValue="8"
        heightValue="10"
        widthLabel="Width"
        heightLabel="Height"
        {...handlers}
        {...props}
      />
    </MeasurementProvider>
  );
  return handlers;
}

describe('DimensionInputGroup min/max', () => {
  it('applies native min and max to both inputs', () => {
    renderGroup({ min: 0.1, max: 100 });
    for (const name of ['Width', 'Height']) {
      const input = screen.getByRole('spinbutton', { name });
      expect(input).toHaveAttribute('min', '0.1');
      expect(input).toHaveAttribute('max', '100');
    }
  });

  it('omits min and max attributes by default', () => {
    renderGroup();
    const input = screen.getByRole('spinbutton', { name: 'Width' });
    expect(input).not.toHaveAttribute('min');
    expect(input).not.toHaveAttribute('max');
  });

  it('clamps width below min on blur, then calls onWidthBlur', () => {
    const h = renderGroup({ widthValue: '-2', min: 0, max: 20 });
    fireEvent.blur(screen.getByRole('spinbutton', { name: 'Width' }));
    expect(h.onWidthChange).toHaveBeenCalledWith('0');
    expect(h.onWidthBlur).toHaveBeenCalledTimes(1);
    expect(h.onHeightChange).not.toHaveBeenCalled();
  });

  it('clamps height above max on blur', () => {
    const h = renderGroup({ heightValue: '50', min: 0, max: 20 });
    fireEvent.blur(screen.getByRole('spinbutton', { name: 'Height' }));
    expect(h.onHeightChange).toHaveBeenCalledWith('20');
    expect(h.onHeightBlur).toHaveBeenCalledTimes(1);
  });

  it('does not change in-range values on blur', () => {
    const h = renderGroup({ min: 0, max: 20 });
    fireEvent.blur(screen.getByRole('spinbutton', { name: 'Width' }));
    expect(h.onWidthChange).not.toHaveBeenCalled();
    expect(h.onWidthBlur).toHaveBeenCalledTimes(1);
  });
});
