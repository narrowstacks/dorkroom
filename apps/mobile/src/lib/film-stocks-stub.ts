// Stubbed film database. The mobile port hasn't wired up the real film API yet,
// so this is a small hardcoded list of common stocks for the roll/shot pickers.
//
// TODO(film-db): replace `useFilmStocks()` with a mapping over the real
// `useFilms()` from @dorkroom/logic once the API is integrated into mobile —
// map `Film.colorType` → `process` (bw|color|slide), `Film.isoSpeed` → `iso`,
// keeping brand/name. The `FilmStock` shape is intentionally a subset of `Film`.
import type { FilmStock } from '@/types/film-log';

export const STUB_FILM_STOCKS: readonly FilmStock[] = [
  // Black & white
  {
    id: 'kodak-trix-400',
    brand: 'Kodak',
    name: 'Tri-X 400',
    iso: 400,
    process: 'bw',
  },
  {
    id: 'kodak-tmax-100',
    brand: 'Kodak',
    name: 'T-Max 100',
    iso: 100,
    process: 'bw',
  },
  {
    id: 'kodak-tmax-400',
    brand: 'Kodak',
    name: 'T-Max 400',
    iso: 400,
    process: 'bw',
  },
  {
    id: 'ilford-hp5',
    brand: 'Ilford',
    name: 'HP5 Plus',
    iso: 400,
    process: 'bw',
  },
  {
    id: 'ilford-fp4',
    brand: 'Ilford',
    name: 'FP4 Plus',
    iso: 125,
    process: 'bw',
  },
  {
    id: 'ilford-delta-3200',
    brand: 'Ilford',
    name: 'Delta 3200',
    iso: 3200,
    process: 'bw',
  },
  {
    id: 'ilford-panf',
    brand: 'Ilford',
    name: 'Pan F Plus',
    iso: 50,
    process: 'bw',
  },
  {
    id: 'kodak-tmax-p3200',
    brand: 'Kodak',
    name: 'T-Max P3200',
    iso: 3200,
    process: 'bw',
  },
  {
    id: 'fuji-acros-100',
    brand: 'Fujifilm',
    name: 'Acros 100 II',
    iso: 100,
    process: 'bw',
  },
  {
    id: 'foma-100',
    brand: 'Fomapan',
    name: '100 Classic',
    iso: 100,
    process: 'bw',
  },

  // Color negative
  {
    id: 'kodak-portra-160',
    brand: 'Kodak',
    name: 'Portra 160',
    iso: 160,
    process: 'color',
  },
  {
    id: 'kodak-portra-400',
    brand: 'Kodak',
    name: 'Portra 400',
    iso: 400,
    process: 'color',
  },
  {
    id: 'kodak-portra-800',
    brand: 'Kodak',
    name: 'Portra 800',
    iso: 800,
    process: 'color',
  },
  {
    id: 'kodak-gold-200',
    brand: 'Kodak',
    name: 'Gold 200',
    iso: 200,
    process: 'color',
  },
  {
    id: 'kodak-ultramax-400',
    brand: 'Kodak',
    name: 'UltraMax 400',
    iso: 400,
    process: 'color',
  },
  {
    id: 'kodak-ektar-100',
    brand: 'Kodak',
    name: 'Ektar 100',
    iso: 100,
    process: 'color',
  },
  {
    id: 'fuji-c200',
    brand: 'Fujifilm',
    name: 'C200',
    iso: 200,
    process: 'color',
  },
  {
    id: 'fuji-superia-400',
    brand: 'Fujifilm',
    name: 'Superia X-TRA 400',
    iso: 400,
    process: 'color',
  },
  {
    id: 'cinestill-800t',
    brand: 'CineStill',
    name: '800T',
    iso: 800,
    process: 'color',
  },
  {
    id: 'cinestill-50d',
    brand: 'CineStill',
    name: '50D',
    iso: 50,
    process: 'color',
  },

  // Color slide (E-6)
  {
    id: 'fuji-velvia-50',
    brand: 'Fujifilm',
    name: 'Velvia 50',
    iso: 50,
    process: 'slide',
  },
  {
    id: 'fuji-velvia-100',
    brand: 'Fujifilm',
    name: 'Velvia 100',
    iso: 100,
    process: 'slide',
  },
  {
    id: 'fuji-provia-100f',
    brand: 'Fujifilm',
    name: 'Provia 100F',
    iso: 100,
    process: 'slide',
  },
  {
    id: 'kodak-ektachrome-e100',
    brand: 'Kodak',
    name: 'Ektachrome E100',
    iso: 100,
    process: 'slide',
  },
];

const FILM_BY_ID = new Map(STUB_FILM_STOCKS.map((film) => [film.id, film]));

export function getFilmStock(id: string | undefined): FilmStock | undefined {
  return id ? FILM_BY_ID.get(id) : undefined;
}

/** Stubbed film source. Swap to a `useFilms()`-backed mapping later (see TODO). */
export function useFilmStocks(): readonly FilmStock[] {
  return STUB_FILM_STOCKS;
}
