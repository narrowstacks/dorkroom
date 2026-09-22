import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useResizeCalculator } from '../../hooks/use-resize-calculator';

describe('useResizeCalculator decimal-comma input (#318)', () => {
  it('gives the same print-size result for comma and dot input', () => {
    const dot = renderHook(() => useResizeCalculator());
    const comma = renderHook(() => useResizeCalculator());

    act(() => {
      dot.result.current.setOriginalTime('12.5');
      dot.result.current.setOriginalWidth('6.5');
      dot.result.current.setNewWidth('9.75');
      comma.result.current.setOriginalTime('12,5');
      comma.result.current.setOriginalWidth('6,5');
      comma.result.current.setNewWidth('9,75');
    });

    expect(comma.result.current.originalTime).toBe('12,5');
    expect(dot.result.current.newTime).not.toBe('');
    expect(comma.result.current.newTime).toBe(dot.result.current.newTime);
    expect(comma.result.current.stopsDifference).toBe(
      dot.result.current.stopsDifference
    );
    expect(comma.result.current.isAspectRatioMatched).toBe(
      dot.result.current.isAspectRatioMatched
    );
  });

  it('gives the same enlarger-height result for comma and dot input', () => {
    const dot = renderHook(() => useResizeCalculator());
    const comma = renderHook(() => useResizeCalculator());

    act(() => {
      dot.result.current.setIsEnlargerHeightMode(true);
      dot.result.current.setOriginalHeight('12.5');
      dot.result.current.setNewHeight('30.5');
      comma.result.current.setIsEnlargerHeightMode(true);
      comma.result.current.setOriginalHeight('12,5');
      comma.result.current.setNewHeight('30,5');
    });

    expect(dot.result.current.newTime).not.toBe('');
    expect(comma.result.current.newTime).toBe(dot.result.current.newTime);
  });
});
