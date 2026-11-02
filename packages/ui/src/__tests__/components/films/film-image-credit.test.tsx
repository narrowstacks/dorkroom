import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FilmImageCredit } from '../../../components/films/film-image-credit';

describe('FilmImageCredit', () => {
  afterEach(cleanup);

  it('links the credit to an https source in a new tab', () => {
    render(
      <FilmImageCredit
        credit="El Grafo, CC BY-SA 4.0 via Wikimedia Commons"
        sourceUrl="https://commons.wikimedia.org/wiki/File:Ilford_Pan_100.jpg"
      />
    );

    const link = screen.getByRole('link', {
      name: 'El Grafo, CC BY-SA 4.0 via Wikimedia Commons',
    });
    expect(link.getAttribute('href')).toBe(
      'https://commons.wikimedia.org/wiki/File:Ilford_Pan_100.jpg'
    );
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText(/Photo:/)).toBeTruthy();
  });

  it('shows the credit as plain text when there is no source', () => {
    render(<FilmImageCredit credit="Rollei" sourceUrl={null} />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Photo: Rollei')).toBeTruthy();
  });

  it('links a bare "source" label when only the source is known', () => {
    render(
      <FilmImageCredit credit={null} sourceUrl="https://www.rollei.de/en" />
    );

    expect(
      screen.getByRole('link', { name: 'source' }).getAttribute('href')
    ).toBe('https://www.rollei.de/en');
  });

  it('never turns a non-http source into a link', () => {
    render(
      // eslint-disable-next-line no-script-url -- the unsafe input under test
      <FilmImageCredit credit="Someone" sourceUrl="javascript:alert(1)" />
    );

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Photo: Someone')).toBeTruthy();
  });

  it('renders nothing when neither credit nor a usable source is set', () => {
    const { container } = render(
      <FilmImageCredit credit="  " sourceUrl="not a url" />
    );

    expect(container.innerHTML).toBe('');
  });
});
