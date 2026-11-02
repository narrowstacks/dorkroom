import type { Film } from '@dorkroom/api';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FilmCard } from '../../../components/films/film-card';
import { FilmDetailPanel } from '../../../components/films/film-detail-panel';
import {
  type FilmImageMode,
  FilmImageModeContext,
} from '../../../components/films/film-image-mode-context';

const PHOTO = 'https://example.com/hp5.jpeg';

const film: Film = {
  id: 1,
  uuid: 'film-1',
  slug: 'ilford-hp5-plus',
  name: 'HP5 Plus',
  brand: 'Ilford',
  isoSpeed: 400,
  colorType: 'bw',
  grainStructure: null,
  description: '',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: PHOTO,
  imageCredit: 'Photo by A. Photographer, CC BY 4.0',
  imageSourceUrl: 'https://example.com/source',
  aliases: [],
  baseFilmSlug: null,
  dateAdded: '2023-01-01',
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
};

const noop = () => undefined;

const photos = () =>
  Array.from(document.querySelectorAll('img')).filter(
    (img) => img.getAttribute('src') === PHOTO
  );

function renderCard(mode?: FilmImageMode) {
  const card = <FilmCard film={film} onClick={noop} />;
  return render(
    mode ? (
      <FilmImageModeContext value={mode}>{card}</FilmImageModeContext>
    ) : (
      card
    )
  );
}

function renderPanel(mode: FilmImageMode) {
  return render(
    <FilmImageModeContext value={mode}>
      <FilmDetailPanel
        film={film}
        baseFilm={null}
        isOpen
        onClose={noop}
        isMobile={false}
      />
    </FilmImageModeContext>
  );
}

describe('film photo modes (#636)', () => {
  afterEach(cleanup);

  it('loads the card thumbnail without a provider', () => {
    renderCard();
    expect(photos()).toHaveLength(1);
  });

  it.each<FilmImageMode>(['detail-only', 'none'])(
    'shows the film icon and mounts no <img> on a card in %s mode',
    (mode) => {
      const { container } = renderCard(mode);
      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('svg')).not.toBeNull();
    }
  );

  it('still shows the opened film photo and its credit in detail-only mode', () => {
    renderPanel('detail-only');
    expect(photos().length).toBeGreaterThan(0);
    expect(screen.getByText(/A\. Photographer/)).toBeInTheDocument();
  });

  it('shows no photo and no credit in the panel in none mode', () => {
    renderPanel('none');
    expect(photos()).toHaveLength(0);
    expect(screen.queryByText(/A\. Photographer/)).not.toBeInTheDocument();
  });
});
