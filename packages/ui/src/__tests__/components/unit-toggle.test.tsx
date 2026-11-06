import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnitToggle } from '../../components/unit-toggle';

const options: [
  { value: string; label: string },
  { value: string; label: string },
] = [
  { value: 'fahrenheit', label: '°F' },
  { value: 'celsius', label: '°C' },
];

describe('UnitToggle', () => {
  it.each([
    ['celsius', '°C', '°F'],
    ['fahrenheit', '°F', '°C'],
  ])('marks only the selected unit: %s', (unit, selected, other) => {
    render(
      <UnitToggle
        currentUnit={unit}
        onToggle={vi.fn()}
        options={options}
        ariaLabel="Switch"
      />
    );
    expect(screen.getByText(selected)).toHaveClass('unit-toggle-active');
    expect(screen.getByText(other)).not.toHaveClass('unit-toggle-active');
  });
});
