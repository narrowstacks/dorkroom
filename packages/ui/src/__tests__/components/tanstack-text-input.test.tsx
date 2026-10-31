import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { TanStackTextInput } from '../../forms/components/tanstack-text-input';

const field = (errors: unknown[]) => ({
  name: 'encoded',
  state: {
    value: 'x',
    meta: { errors, isTouched: true, isDirty: true },
  },
  handleChange: () => undefined,
  handleBlur: () => undefined,
});

describe('TanStackTextInput errors', () => {
  it('shows the message of a zod issue, not [object Object]', () => {
    const result = z.string().min(5, 'Too short').safeParse('x');
    const issues = result.success ? [] : result.error.issues;
    render(<TanStackTextInput field={field(issues)} label="Code" />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Too short');
    expect(alert.textContent).not.toContain('[object Object]');
  });

  it('still shows plain string errors', () => {
    render(<TanStackTextInput field={field(['Required'])} label="Code" />);
    expect(screen.getByRole('alert').textContent).toBe('Required');
  });
});
