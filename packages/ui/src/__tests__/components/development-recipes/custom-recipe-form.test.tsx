import type { Developer, Film } from '@dorkroom/api';
import {
  buildRecipeIndex,
  createCombinationFromCustomRecipe,
  createCustomRecipeStore,
  createMemoryRecipeAdapter,
  type CustomRecipeFormData,
} from '@dorkroom/logic';
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
  imageCredit: null,
  imageSourceUrl: null,
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
  imageCredit: null,
  imageSourceUrl: null,
  notes: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  ...overrides,
});

const film = makeFilm({
  uuid: 'film-1',
  aliases: [{ slug: 'kodak-tri-x-old', name: 'Tri-X Old' }],
});

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
  slug: 'ilford-id-11',
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

const save = () =>
  fireEvent.submit(screen.getByRole('button', { name: /save/i }));

const renderForm = (value: CustomRecipeFormData = initialValue) => {
  const onSubmit = vi.fn<(data: CustomRecipeFormData) => void>();
  render(
    <CustomRecipeForm
      initialValue={value}
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

    save();

    expect(onSubmit.mock.calls[0][0].selectedDilutionId).toBe('2');
  });

  it('drops the previous developer dilution when the developer changes', () => {
    const onSubmit = renderForm();

    fireEvent.change(screen.getByLabelText('Developer'), {
      target: { value: developerB.uuid },
    });
    save();

    expect(onSubmit.mock.calls[0][0].selectedDeveloperId).toBe(developerB.uuid);
    expect(onSubmit.mock.calls[0][0].selectedDilutionId).toBe('');
  });
});

describe('CustomRecipeForm with a recipe stored under a slug', () => {
  const stored: CustomRecipeFormData = {
    ...initialValue,
    selectedFilmId: film.slug,
    selectedDeveloperId: developerA.slug,
    shootingIso: 1600,
  };

  it('offers the dilutions and shows the box speed', () => {
    renderForm(stored);
    expect(screen.getByLabelText('Dilution')).toHaveValue('2');
    expect(screen.getByLabelText('Film')).toHaveValue(film.uuid);
    expect(screen.getByLabelText('Developer')).toHaveValue(developerA.uuid);
    expect(screen.getByText('Box: ISO 400')).toBeInTheDocument();
  });

  it('saves the typed dilution, the push and the uuids', () => {
    const onSubmit = renderForm(stored);
    fireEvent.change(screen.getByLabelText('Dilution'), {
      target: { value: 'custom' },
    });
    fireEvent.change(screen.getByLabelText('Custom dilution'), {
      target: { value: '1+9' },
    });
    save();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      selectedDilutionId: 'custom',
      customDilution: '1+9',
      pushPull: 2,
      selectedFilmId: film.uuid,
      selectedDeveloperId: developerA.uuid,
    });
  });

  it('saves a film stored under an old slug from before a rename', () => {
    const onSubmit = renderForm({
      ...stored,
      selectedFilmId: 'kodak-tri-x-old',
    });
    save();
    expect(onSubmit.mock.calls[0][0].selectedFilmId).toBe(film.uuid);
  });

  it('saves ids that still find the film and developer on /development', () => {
    const onSubmit = renderForm(stored);
    save();
    const store = createCustomRecipeStore(createMemoryRecipeAdapter());
    const recipe = store.add(onSubmit.mock.calls[0][0]);
    const combination = createCombinationFromCustomRecipe(recipe);
    const index = buildRecipeIndex(
      [{ combination, film, developer: developerA, source: 'custom' }],
      [film],
      [developerA]
    );
    expect(index.pairs.get(film.slug)?.get(developerA.slug)).toHaveLength(1);
  });

  it('matches a dilution id the API sends as a number', () => {
    // The live catalogue has numeric ids, which the Dilution type does not admit.
    const numericIds: Developer['dilutions'] = JSON.parse(
      '[{ "id": 2, "name": "B", "dilution": "1+31" }]'
    );
    const numeric = makeDeveloper({
      uuid: 'dev-n',
      dilutions: numericIds,
    });
    const onSubmit = vi.fn<(data: CustomRecipeFormData) => void>();
    render(
      <CustomRecipeForm
        initialValue={{ ...stored, selectedDeveloperId: numeric.slug }}
        onSubmit={onSubmit}
        filmOptions={[]}
        developerOptions={[]}
        allFilms={[film]}
        allDevelopers={[numeric]}
      />
    );
    save();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('CustomRecipeForm dilution checks', () => {
  it.each([
    ['custom with an empty box', { selectedDilutionId: 'custom' }],
    [
      'custom with a blank box',
      { selectedDilutionId: 'custom', customDilution: '   ' },
    ],
  ])('refuses %s', (_name, change) => {
    const onSubmit = renderForm({ ...initialValue, ...change });
    save();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter the custom dilution.'
    );
  });

  it('refuses a dilution the developer no longer has, then lets it be fixed', () => {
    const onSubmit = renderForm({ ...initialValue, selectedDilutionId: '99' });
    save();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'no longer listed for this developer'
    );
    fireEvent.change(screen.getByLabelText('Dilution'), {
      target: { value: '1' },
    });
    save();
    expect(onSubmit.mock.calls[0][0].selectedDilutionId).toBe('1');
  });

  it('lets a stale id be replaced when the developer has no list', () => {
    const onSubmit = vi.fn<(data: CustomRecipeFormData) => void>();
    const bare = makeDeveloper({ uuid: 'dev-bare', dilutions: [] });
    render(
      <CustomRecipeForm
        initialValue={{
          ...initialValue,
          selectedDeveloperId: bare.uuid,
          selectedDilutionId: '99',
        }}
        onSubmit={onSubmit}
        filmOptions={[]}
        developerOptions={[]}
        allFilms={[film]}
        allDevelopers={[bare]}
      />
    );
    save();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Custom dilution'), {
      target: { value: '1+9' },
    });
    save();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      selectedDilutionId: '',
      customDilution: '1+9',
    });
  });

  it.each([
    ['no dilution at all', { selectedDilutionId: '', customDilution: '' }],
    [
      'a stock dilution',
      { selectedDeveloperId: 'dev-b', selectedDilutionId: '7' },
    ],
    [
      'a typed dilution',
      { selectedDilutionId: 'custom', customDilution: '1+9' },
    ],
  ])('still saves %s', (_name, change) => {
    const onSubmit = renderForm({ ...initialValue, ...change });
    save();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('drops a custom dilution once "Select dilution" is chosen', () => {
    const onSubmit = renderForm({
      ...initialValue,
      selectedDilutionId: 'custom',
      customDilution: '1+9',
    });
    fireEvent.change(screen.getByLabelText('Dilution'), {
      target: { value: '' },
    });
    expect(screen.queryByLabelText('Custom dilution')).toBeNull();
    save();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      selectedDilutionId: '',
      customDilution: '',
    });
  });

  it('drops text typed for a custom developer once a listed one is picked', () => {
    const onSubmit = renderForm({
      ...initialValue,
      selectedDilutionId: '',
      useExistingDeveloper: false,
      selectedDeveloperId: '',
      customDeveloper: {
        manufacturer: 'Home',
        name: 'Caffenol',
        type: 'powder',
        filmOrPaper: 'film',
        dilutions: [{ name: 'Stock', dilution: 'Stock' }],
      },
    });
    fireEvent.change(screen.getByLabelText('Custom dilution'), {
      target: { value: '1+5' },
    });
    fireEvent.click(screen.getByLabelText('Use custom developer data'));
    fireEvent.change(screen.getByLabelText('Developer'), {
      target: { value: developerB.uuid },
    });
    expect(screen.queryByLabelText('Custom dilution')).toBeNull();
    save();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      selectedDeveloperId: developerB.uuid,
      selectedDilutionId: '',
      customDilution: '',
    });
  });

  it('keeps the text for a developer with no list, where the box is all there is', () => {
    const onSubmit = vi.fn<(data: CustomRecipeFormData) => void>();
    const bare = makeDeveloper({ uuid: 'dev-bare', dilutions: [] });
    render(
      <CustomRecipeForm
        initialValue={{
          ...initialValue,
          selectedDeveloperId: bare.uuid,
          selectedDilutionId: '',
          customDilution: '1+9',
        }}
        onSubmit={onSubmit}
        filmOptions={[]}
        developerOptions={[]}
        allFilms={[film]}
        allDevelopers={[bare]}
      />
    );
    save();
    expect(onSubmit.mock.calls[0][0].customDilution).toBe('1+9');
  });

  it('leaves a custom developer with no dilution alone', () => {
    const onSubmit = renderForm({
      ...initialValue,
      selectedDilutionId: 'custom',
      useExistingDeveloper: false,
      selectedDeveloperId: '',
      customDeveloper: {
        manufacturer: 'Home',
        name: 'Caffenol',
        type: 'powder',
        filmOrPaper: 'film',
        dilutions: [{ name: 'Stock', dilution: 'Stock' }],
      },
    });
    save();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('CustomRecipeForm validation', () => {
  const customFilm = {
    brand: 'Home',
    name: 'Stock 200',
    isoSpeed: 200,
    colorType: 'bw' as const,
  };
  const customDeveloper = {
    manufacturer: 'Home',
    name: 'Caffenol',
    type: 'powder',
    filmOrPaper: 'film' as const,
    dilutions: [{ name: 'Stock', dilution: 'Stock' }],
  };

  it.each([
    ['no name', { name: '' }, 'Recipe name is required'],
    ['a blank name', { name: '   ' }, 'Recipe name is required'],
    ['no film', { selectedFilmId: '' }, 'Choose a film, or enter your own.'],
    [
      'no developer',
      { selectedDeveloperId: '' },
      'Choose a developer, or enter your own.',
    ],
    [
      'a film that left the catalogue',
      { selectedFilmId: 'gone' },
      'Choose a film, or enter your own.',
    ],
  ])('stops on %s and says why', (_name, change, message) => {
    const onSubmit = renderForm({ ...initialValue, ...change });
    save();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });

  it('saves once a bad recipe has been fixed', () => {
    const onSubmit = renderForm({ ...initialValue, selectedFilmId: 'gone' });
    save();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: film.uuid },
    });
    save();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Choose a film, or enter your own.')).toBeNull();
  });

  it('saves a custom film and a custom developer', () => {
    const onSubmit = renderForm({
      ...initialValue,
      useExistingFilm: false,
      selectedFilmId: '',
      customFilm,
      useExistingDeveloper: false,
      selectedDeveloperId: '',
      customDeveloper,
    });
    save();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it.each([
    [3200, 2.97],
    [25000, 0],
  ])(
    'accepts what real recipes and the store do: EI 25000 on a %i film, long notes, no agitation',
    (isoSpeed, pushPull) => {
      const onSubmit = renderForm({
        ...initialValue,
        notes: 'x'.repeat(1100),
        shootingIso: 25000,
        agitationSchedule: '',
        useExistingFilm: false,
        selectedFilmId: '',
        customFilm: { ...customFilm, isoSpeed },
      });
      save();
      expect(onSubmit.mock.calls[0]?.[0].pushPull).toBe(pushPull);
    }
  );

  it.each([
    ['film', { customFilm: { ...customFilm, name: '' } }],
    ['developer', { customDeveloper: { ...customDeveloper, name: '' } }],
  ])(
    'ignores a custom %s draft once unticked, and does not save it',
    (_name, draft) => {
      const onSubmit = renderForm({ ...initialValue, ...draft });
      save();
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit.mock.calls[0][0].customFilm).toBeUndefined();
      expect(onSubmit.mock.calls[0][0].customDeveloper).toBeUndefined();
    }
  );

  it('does not let a blank dilution entry block a custom developer', () => {
    const onSubmit = renderForm({
      ...initialValue,
      useExistingDeveloper: false,
      selectedDeveloperId: '',
      customDeveloper: {
        ...customDeveloper,
        dilutions: [{ name: '', dilution: '' }],
      },
    });
    save();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('accepts a published pull past -2: EI 50 on a 400 film', () => {
    const onSubmit = renderForm({
      ...initialValue,
      shootingIso: 50,
      useExistingFilm: false,
      selectedFilmId: '',
      customFilm: { ...customFilm, isoSpeed: 400 },
    });
    save();
    expect(onSubmit.mock.calls[0]?.[0].pushPull).toBe(-3);
  });

  it.each([
    ['Development time (minutes)', '', 'Enter a development time as a number.'],
    ['Shooting ISO', '', 'Enter a shooting ISO as a number.'],
    [
      'Development time (minutes)',
      'abc',
      'Enter a development time as a number.',
    ],
  ])(
    'refuses %s set to "%s" instead of saving the old number',
    (label, value, message) => {
      const onSubmit = renderForm();
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
      save();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent(message);
    }
  );

  it('accepts a film saved under its slug', () => {
    const onSubmit = renderForm({
      ...initialValue,
      selectedFilmId: film.slug,
    });
    save();
    expect(onSubmit.mock.calls[0][0].selectedFilmId).toBe(film.uuid);
  });

  it.each([
    ['film brand', { customFilm: { ...customFilm, brand: '   ' } }],
    ['film name', { customFilm: { ...customFilm, name: ' ' } }],
    [
      'manufacturer',
      { customDeveloper: { ...customDeveloper, manufacturer: '  ' } },
    ],
    ['developer type', { customDeveloper: { ...customDeveloper, type: ' ' } }],
  ])('refuses a blank %s rather than saving Unknown', (_name, change) => {
    const onSubmit = renderForm({
      ...initialValue,
      useExistingFilm: false,
      useExistingDeveloper: false,
      customFilm,
      customDeveloper,
      ...change,
    });
    save();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('is required');
  });

  it('refuses a time past a day, and accepts the longest published', () => {
    const onSubmit = renderForm();
    const time = screen.getByLabelText('Development time (minutes)');
    fireEvent.change(time, { target: { value: '1e6' } });
    save();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('at most 1440');
    fireEvent.change(time, { target: { value: '480' } });
    save();
    expect(onSubmit.mock.calls[0][0].timeMinutes).toBe(480);
  });

  describe.each([
    ['Working life (hours)', 'workingLifeHours', 'a working life'],
    ['Stock life (months)', 'stockLifeMonths', 'a stock life'],
  ] as const)('%s', (label, key, name) => {
    const renderCustomDeveloper = () =>
      renderForm({
        ...initialValue,
        useExistingDeveloper: false,
        selectedDeveloperId: '',
        customDeveloper,
      });

    it('asks for a number in words, and keeps what was typed', () => {
      const onSubmit = renderCustomDeveloper();
      fireEvent.change(screen.getByLabelText(label), {
        target: { value: 'abc' },
      });
      expect(screen.getByLabelText(label)).toHaveValue('abc');
      save();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent(
        `Enter ${name} as a number, or leave it blank.`
      );
    });

    it('saves a decimal typed a key at a time', () => {
      const onSubmit = renderCustomDeveloper();
      for (const value of ['1', '1.', '1.5']) {
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
      }
      expect(screen.getByLabelText(label)).toHaveValue('1.5');
      save();
      expect(onSubmit.mock.calls[0][0].customDeveloper?.[key]).toBe(1.5);
    });

    it('saves nothing once it has been cleared', () => {
      const onSubmit = renderCustomDeveloper();
      const input = screen.getByLabelText(label);
      fireEvent.change(input, { target: { value: '6' } });
      fireEvent.change(input, { target: { value: '' } });
      save();
      expect(onSubmit.mock.calls[0][0].customDeveloper?.[key]).toBeUndefined();
    });

    it('does not block once the custom developer is unticked', () => {
      const onSubmit = renderCustomDeveloper();
      fireEvent.change(screen.getByLabelText(label), {
        target: { value: 'abc' },
      });
      fireEvent.click(screen.getByLabelText('Use custom developer data'));
      fireEvent.change(screen.getByLabelText('Developer'), {
        target: { value: developerB.uuid },
      });
      save();
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('shows no stray 0 when a custom film has no ISO', () => {
    renderForm({ ...initialValue, useExistingFilm: false, customFilm });
    fireEvent.change(screen.getByLabelText('ISO'), { target: { value: '' } });
    expect(screen.getByText('Box Speed').textContent).toBe('Box Speed');
  });

  // The most a field could hold when the store cut text and then added "...".
  const cutByStore = (limit: number) => `${'x'.repeat(limit)}...`;

  it('saves an older recipe unchanged, whatever the store cut it to', () => {
    const onSubmit = renderForm({
      ...initialValue,
      name: cutByStore(200),
      notes: cutByStore(2000),
      agitationSchedule: cutByStore(500),
      customDilution: cutByStore(100),
      useExistingFilm: false,
      customFilm: {
        ...customFilm,
        brand: cutByStore(100),
        name: cutByStore(100),
        grainStructure: cutByStore(100),
        description: cutByStore(500),
      },
      useExistingDeveloper: false,
      customDeveloper: {
        ...customDeveloper,
        manufacturer: cutByStore(100),
        name: cutByStore(100),
        type: cutByStore(100),
        notes: cutByStore(1000),
        mixingInstructions: cutByStore(2000),
        safetyNotes: cutByStore(1000),
      },
    });
    save();
    expect(screen.queryByText(/too long/)).toBeNull();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'a custom dilution',
      { selectedDilutionId: 'custom', customDilution: 'x'.repeat(101) },
      'Custom dilution is too long',
    ],
    ['notes', { notes: 'x'.repeat(2001) }, 'Recipe notes are too long'],
  ])('refuses %s the store would have to cut', (_name, change, message) => {
    const onSubmit = renderForm({ ...initialValue, ...change });
    save();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });

  it('accepts developer text up to what the store keeps', () => {
    const onSubmit = renderForm({
      ...initialValue,
      useExistingDeveloper: false,
      customDeveloper: {
        ...customDeveloper,
        notes: 'x'.repeat(1000),
        mixingInstructions: 'x'.repeat(2000),
        safetyNotes: 'x'.repeat(1000),
      },
    });
    save();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
