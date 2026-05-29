import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FractionField } from '../fraction-field';

function renderField(value: string) {
  const onChange = vi.fn();
  render(<FractionField label="Top" value={value} onChange={onChange} />);
  return { onChange, input: screen.getByRole('textbox') };
}

describe('FractionField', () => {
  it('accepts free-form typing', () => {
    const { onChange, input } = renderField('3');
    fireEvent.change(input, { target: { value: '2 3/4' } });
    expect(onChange).toHaveBeenCalledWith('2 3/4');
  });

  describe('1/16" stepping', () => {
    it('increments on ArrowUp', () => {
      const { onChange, input } = renderField('3');
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(onChange).toHaveBeenCalledWith('3 1/16');
    });

    it('decrements on ArrowDown', () => {
      const { onChange, input } = renderField('3');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(onChange).toHaveBeenCalledWith('2 15/16');
    });

    it('snaps fractions to the 1/16 grid', () => {
      const { onChange, input } = renderField('1/4');
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(onChange).toHaveBeenCalledWith('5/16');
    });

    it('clamps at zero', () => {
      const { onChange, input } = renderField('0');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(onChange).toHaveBeenCalledWith('0');
    });

    it('treats empty input as zero when stepping up', () => {
      const { onChange, input } = renderField('');
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(onChange).toHaveBeenCalledWith('1/16');
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
});
