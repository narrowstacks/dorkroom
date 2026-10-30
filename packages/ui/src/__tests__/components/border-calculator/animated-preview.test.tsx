import {
  borderCalculatorInitialState,
  computeBorderLayout,
} from '@dorkroom/logic';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnimatedPreview } from '../../../components/border-calculator/animated-preview';
import { MeasurementProvider } from '../../../contexts/measurement-context';

/**
 * The preview renders the size `computePreviewScale` chose and reads no
 * viewport of its own (#457): the layout switch and the preview size come
 * from the same window sample.
 */
function renderAt(width: number) {
  // 8x10 landscape: 10in wide, so the width cap is what limits it.
  const { calculation } = computeBorderLayout(
    { ...borderCalculatorInitialState, paperSize: '8x10', isLandscape: true },
    { viewport: { width, height: 1000 } }
  );
  const { container } = render(
    <MeasurementProvider>
      <AnimatedPreview calculation={calculation} />
    </MeasurementProvider>
  );
  // SAFETY: AnimatedPreview renders exactly one root element, a <div>, which
  // is always an HTMLElement in the DOM environment.
  return container.firstElementChild as HTMLElement;
}

describe('AnimatedPreview', () => {
  it('renders the placeholder at 400x300 without a calculation', () => {
    const { container } = render(<AnimatedPreview calculation={null} />);
    // SAFETY: same single-root <div> as above.
    const previewEl = container.firstElementChild as HTMLElement;
    expect(previewEl.style.width).toBe('400px');
    expect(previewEl.style.height).toBe('300px');
  });

  it('sizes itself as mobile at exactly 768px, matching the mobile layout', () => {
    expect(renderAt(768).style.width).toBe('320px');
    expect(renderAt(768).style.height).toBe('256px');
  });

  it('keeps the mobile size at 767px and the desktop size at 769px', () => {
    expect(renderAt(767).style.width).toBe('320px');
    expect(renderAt(769).style.width).toBe('400px');
    expect(renderAt(769).style.height).toBe('320px');
  });

  it('shrinks to width - 80 on narrow phones', () => {
    // min(320, 320 - 80) = 240.
    expect(renderAt(320).style.width).toBe('240px');
  });
});
