import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Calculator } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { NavigationDropdown } from '../navigation-dropdown';

const items = [
  { label: 'Border', to: '/border', icon: Calculator, summary: 'Borders' },
];

describe('NavigationDropdown Escape (#617)', () => {
  it('closes on Escape and returns focus to its trigger', async () => {
    render(
      <NavigationDropdown
        label="Tools"
        icon={Calculator}
        items={items}
        currentPath="/"
        onNavigate={vi.fn()}
      />
    );
    const trigger = screen.getByRole('button', { name: /Tools/ });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
});
