import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportRecipeForm } from '../../components/development-recipes/import-recipe-form';

const button = () => screen.getByRole('button', { name: /import recipe/i });
const type = (value: string) =>
  fireEvent.change(screen.getByRole('textbox'), { target: { value } });

describe('ImportRecipeForm', () => {
  it('disables Import while empty and for garbage, with a readable error', async () => {
    render(<ImportRecipeForm onImport={vi.fn()} />);
    expect(button()).toBeDisabled();

    type('zzzzz zzz');
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(button()).toBeDisabled();
    expect(screen.getByRole('alert').textContent).not.toContain(
      '[object Object]'
    );
    expect(screen.getByRole('alert').textContent).toMatch(/valid/i);
  });

  it.each([
    ['bare code', 'abc-def_ghi', 'abc-def_ghi'],
    [
      'share link',
      'https://dorkroom.art/development?recipe=abc-def_ghi&source=share',
      'abc-def_ghi',
    ],
    ['recipe= prefix', 'recipe=abc-def_ghi', 'abc-def_ghi'],
    [
      'filmdev url',
      'https://filmdev.org/recipe/show/5001',
      'https://filmdev.org/recipe/show/5001',
    ],
    ['filmdev id', '5001', '5001'],
  ])(
    'enables Import and submits the code for a %s',
    async (_n, input, sent) => {
      const onImport = vi.fn();
      render(<ImportRecipeForm onImport={onImport} />);
      type(input);
      await waitFor(() => expect(button()).toBeEnabled());
      fireEvent.click(button());
      await waitFor(() => expect(onImport).toHaveBeenCalledWith(sent));
    }
  );
});
