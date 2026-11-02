import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Calculator } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { useEscapeKey } from '../../hooks/use-escape-key';
import { NavigationDropdown } from '../navigation-dropdown';

const items = [
  { label: 'Border', to: '/border', icon: Calculator, summary: 'Borders' },
];

describe('NavigationDropdown Escape (#617)', () => {
  it('closes alone on Escape and returns focus to its trigger', async () => {
    const outer = vi.fn();
    function Outer() {
      useEscapeKey(true, outer);
      return (
        <NavigationDropdown
          label="Tools"
          icon={Calculator}
          items={items}
          currentPath="/"
          onNavigate={vi.fn()}
        />
      );
    }
    render(<Outer />);
    const trigger = screen.getByRole('button', { name: /Tools/ });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(outer).not.toHaveBeenCalled();
  });
});
