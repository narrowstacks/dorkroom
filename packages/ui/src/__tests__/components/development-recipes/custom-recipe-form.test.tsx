import type { Developer, Film } from '@dorkroom/api';
import type { CustomRecipeFormData } from '@dorkroom/logic';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomRecipeForm } from '../../../components/development-recipes/custom-recipe-form';

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

const makeFilm = (overrides: Partial<Film>): Film => ({
  id: 1,
  uuid: 'film-uuid-1',
  slug: 'kodak-tri-x',
  brand: 'Kodak',
  name: 'Tri-X',
  colorType: 'bw',
  isoSpeed: 400,
  grainStructure: null,
  description: '',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: TIMESTAMP,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  ...overrides,
});

const makeDeveloper = (overrides: Partial<Developer>): Developer => ({
  id: 1,
  uuid: 'dev-uuid-1',
  slug: 'kodak-hc-110',
  name: 'HC-110',
  manufacturer: 'Kodak',
  type: 'liquid',
  description: '',
  filmOrPaper: true,
  dilutions: [],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  notes: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  ...overrides,
});

const film = makeFilm({ uuid: 'film-1' });

const developerA = makeDeveloper({
  uuid: 'dev-a',
  manufacturer: 'Kodak',
  name: 'HC-110',
  dilutions: [
    { id: '1', name: 'A', dilution: '1+15' },
    { id: '2', name: 'B', dilution: '1+31' },
  ],
});

const developerB = makeDeveloper({
  uuid: 'dev-b',
  manufacturer: 'Ilford',
  name: 'ID-11',
  dilutions: [
    { id: '7', name: 'Stock', dilution: 'Stock' },
    { id: '8', name: '1+1', dilution: '1+1' },
  ],
});

const initialValue: CustomRecipeFormData = {
  name: 'HC-110 B',
  useExistingFilm: true,
  selectedFilmId: film.uuid,
  useExistingDeveloper: true,
  selectedDeveloperId: developerA.uuid,
  temperatureF: 68,
  timeMinutes: 5,
  shootingIso: 400,
  pushPull: 0,
  agitationSchedule: '30s initial',
  notes: '',
  selectedDilutionId: '2',
  customDilution: '',
  isPublic: false,
};

const renderForm = () => {
  const onSubmit = vi.fn<(data: CustomRecipeFormData) => void>();
  render(
    <CustomRecipeForm
      initialValue={initialValue}
      onSubmit={onSubmit}
      filmOptions={[{ label: 'Kodak Tri-X', value: film.uuid }]}
      developerOptions={[
        { label: 'Kodak HC-110', value: developerA.uuid },
        { label: 'Ilford ID-11', value: developerB.uuid },
      ]}
      allFilms={[film]}
      allDevelopers={[developerA, developerB]}
    />
  );
  return onSubmit;
};

afterEach(cleanup);

describe('CustomRecipeForm dilution (#322)', () => {
  it('submits the dilution picked from the dropdown', () => {
    const onSubmit = renderForm();

    fireEvent.submit(screen.getByRole('button', { name: /save/i }));

    expect(onSubmit.mock.calls[0][0].selectedDilutionId).toBe('2');
  });

  it('drops the previous developer dilution when the developer changes', () => {
    const onSubmit = renderForm();

    fireEvent.change(screen.getByLabelText('Developer'), {
      target: { value: developerB.uuid },
    });
    fireEvent.submit(screen.getByRole('button', { name: /save/i }));

    expect(onSubmit.mock.calls[0][0].selectedDeveloperId).toBe(developerB.uuid);
    expect(onSubmit.mock.calls[0][0].selectedDilutionId).toBe('');
  });
});
