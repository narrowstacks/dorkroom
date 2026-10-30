import '@testing-library/jest-dom/vitest';
import type { MeasurementUnit } from '@dorkroom/logic';
import { MeasurementProvider } from '@dorkroom/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FractionField } from '../fraction-field';

const MEASUREMENT_STORAGE_KEY = 'dorkroom-measurement-unit';

function renderField(value: string, unit: MeasurementUnit = 'imperial') {
  window.localStorage.setItem(MEASUREMENT_STORAGE_KEY, unit);
  const onChange = vi.fn();
  render(
    <MeasurementProvider>
      <FractionField label="Top" value={value} onChange={onChange} />
    </MeasurementProvider>
  );
  return { onChange, input: screen.getByRole('textbox') };
}

describe('FractionField', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('accepts free-form typing', () => {
    const { onChange, input } = renderField('3');
    fireEvent.change(input, { target: { value: '2 3/4' } });
    expect(onChange).toHaveBeenCalledWith('2 3/4');
  });

  // The stepping and conversion arithmetic is pinned in mat-units.test.ts.
  // These only prove each input path is wired to it: one test per path.
  describe('keyboard stepping', () => {
    it('steps by 1/16" on ArrowUp and ArrowDown', () => {
      const { onChange, input } = renderField('3');
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(onChange).toHaveBeenLastCalledWith('3 1/16');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(onChange).toHaveBeenLastCalledWith('2 15/16');
    });

    it('ignores unrelated keys', () => {
      const { onChange, input } = renderField('3');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('tap steppers (mobile support)', () => {
    it('exposes accessible up/down buttons', () => {
      renderField('3');
      expect(
        screen.getByLabelText('Increase Top by 1/16 inch')
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Decrease Top by 1/16 inch')
      ).toBeInTheDocument();
    });

    it('increments when the up button is tapped', () => {
      const { onChange } = renderField('3');
      fireEvent.click(screen.getByLabelText('Increase Top by 1/16 inch'));
      expect(onChange).toHaveBeenCalledWith('3 1/16');
    });

    it('decrements when the down button is tapped', () => {
      const { onChange } = renderField('3');
      fireEvent.click(screen.getByLabelText('Decrease Top by 1/16 inch'));
      expect(onChange).toHaveBeenCalledWith('2 15/16');
    });
  });

  describe('metric preference', () => {
    it('commits typed centimetres as inches', () => {
      const { onChange, input } = renderField('16', 'metric');
      fireEvent.change(input, { target: { value: '50' } });
      expect(onChange).toHaveBeenCalledWith('19.685');
    });

    it('holds a transitional keystroke while focused', () => {
      const { onChange, input } = renderField('16', 'metric');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '30.' } });
      // The draft is what the user typed; the parent still gets inches.
      expect(input).toHaveValue('30.');
      expect(onChange).toHaveBeenCalledWith('11.811');
    });
  });
});
