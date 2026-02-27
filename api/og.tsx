import { ImageResponse } from '@vercel/og';
import {
  BASE_URL,
  buildFilmFilterParts,
  getRouteMetadata,
  prettifySlug,
  SITE_NAME,
} from '../utils/routeMetadata';

export const config = { runtime: 'edge' };

const FETCH_TIMEOUT_MS = 3000;
const FONT_URL =
  'https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-.ttf';
const FONT_BOLD_URL =
  'https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM70w-.ttf';
const FONT_ITALIC_URL =
  'https://fonts.gstatic.com/s/montserrat/v31/JTUFjIg1_i6t8kCHKm459Wx7xQYXK0vOoz6jq6R9aX8.ttf';

interface FilmInfo {
  brand: string;
  name: string;
  iso_speed?: number;
  color_type?: string;
  static_image_url?: string | null;
}

interface DilutionInfo {
  id: string | number;
  name?: string;
  ratio?: string;
}

interface DeveloperInfo {
  name: string;
  manufacturer: string;
  dilutions?: DilutionInfo[];
}

interface CombinationInfo {
  time_minutes: number;
  temperature_celsius: number;
  shooting_iso: number;
  dilution_id?: string | null;
  push_pull?: number | null;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function loadFontData(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function lookupFilm(slug: string): Promise<FilmInfo | null> {
  const data = await fetchJson<{ data: FilmInfo[] }>(
    `${BASE_URL}/api/films?slug=${encodeURIComponent(slug)}&limit=1`
  );
  return data?.data?.[0] ?? null;
}

async function lookupDeveloper(slug: string): Promise<DeveloperInfo | null> {
  const data = await fetchJson<{ data: DeveloperInfo[] }>(
    `${BASE_URL}/api/developers?slug=${encodeURIComponent(slug)}&limit=1`
  );
  return data?.data?.[0] ?? null;
}

async function lookupCombination(
  filmSlug: string,
  developerSlug: string,
  recipeUuid?: string
): Promise<CombinationInfo | null> {
  const url = recipeUuid
    ? `${BASE_URL}/api/combinations?film=${encodeURIComponent(filmSlug)}&developer=${encodeURIComponent(developerSlug)}&limit=50`
    : `${BASE_URL}/api/combinations?film=${encodeURIComponent(filmSlug)}&developer=${encodeURIComponent(developerSlug)}&limit=1`;
  const data = await fetchJson<{
    data: (CombinationInfo & { uuid?: string })[];
  }>(url);
  if (!data?.data?.length) return null;
  if (recipeUuid) {
    return data.data.find((c) => c.uuid === recipeUuid) ?? data.data[0];
  }
  return data.data[0];
}

function formatTime(minutes: number): string {
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getRouteAccent(route: string): string {
  switch (route) {
    case '/':
      return '#6ef3a4'; // green — app primary
    case '/films':
      return '#7dd6ff'; // cyan — app secondary
    case '/development':
      return '#f99f96'; // coral — app accent
    case '/docs':
      return '#c4b5fd'; // purple
    default:
      return '#e5ff7d'; // lime — calculators
  }
}

/** Lucide icon SVG children keyed by route. Each entry is an array of SVG elements. */
function getRouteIcon(route: string): React.JSX.Element[] | null {
  switch (route) {
    case '/': // Beaker
      return [
        <path key="1" d="M4.5 3h15" />,
        <path key="2" d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" />,
        <path key="3" d="M6 14h12" />,
      ];
    case '/development': // FlaskConical
      return [
        <path
          key="1"
          d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"
        />,
        <path key="2" d="M6.453 15h11.094" />,
        <path key="3" d="M8.5 2h7" />,
      ];
    case '/border': // Crop
      return [
        <path key="1" d="M6 2v14a2 2 0 0 0 2 2h14" />,
        <path key="2" d="M18 22V8a2 2 0 0 0-2-2H2" />,
      ];
    case '/resize': // Ruler
      return [
        <path
          key="1"
          d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"
        />,
        <path key="2" d="m14.5 12.5 2-2" />,
        <path key="3" d="m11.5 9.5 2-2" />,
        <path key="4" d="m8.5 6.5 2-2" />,
        <path key="5" d="m17.5 15.5 2-2" />,
      ];
    case '/stops': // Gauge
      return [
        <path key="1" d="m12 14 4-4" />,
        <path key="2" d="M3.34 19a10 10 0 1 1 17.32 0" />,
      ];
    case '/reciprocity': // Timer
      return [
        <line key="1" x1={10} x2={14} y1={2} y2={2} />,
        <line key="2" x1={12} x2={15} y1={14} y2={11} />,
        <circle key="3" cx={12} cy={14} r={8} />,
      ];
    case '/exposure': // Aperture
      return [
        <circle key="1" cx={12} cy={12} r={10} />,
        <path key="2" d="m14.31 8 5.74 9.94" />,
        <path key="3" d="M9.69 8h11.48" />,
        <path key="4" d="m7.38 12 5.74-9.94" />,
        <path key="5" d="M9.69 16 3.95 6.06" />,
        <path key="6" d="M14.31 16H2.83" />,
        <path key="7" d="m16.62 12-5.74 9.94" />,
      ];
    case '/lenses': // Focus
      return [
        <circle key="1" cx={12} cy={12} r={3} />,
        <path key="2" d="M3 7V5a2 2 0 0 1 2-2h2" />,
        <path key="3" d="M17 3h2a2 2 0 0 1 2 2v2" />,
        <path key="4" d="M21 17v2a2 2 0 0 1-2 2h-2" />,
        <path key="5" d="M7 21H5a2 2 0 0 1-2-2v-2" />,
      ];
    case '/films': // Film
      return [
        <rect key="1" width={18} height={18} x={3} y={3} rx={2} />,
        <path key="2" d="M7 3v18" />,
        <path key="3" d="M3 7.5h4" />,
        <path key="4" d="M3 12h18" />,
        <path key="5" d="M3 16.5h4" />,
        <path key="6" d="M17 3v18" />,
        <path key="7" d="M17 7.5h4" />,
        <path key="8" d="M17 16.5h4" />,
      ];
    case '/docs': // BookOpen
      return [
        <path key="1" d="M12 7v14" />,
        <path
          key="2"
          d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
        />,
      ];
    default:
      return null;
  }
}

// Dark theme colors from the site
const BORDER_COLOR = '#f36e6e'; // red from dark theme gradient
const BG = '#09090b';
const TEXT_PRIMARY = '#ffffff';
const TEXT_SECONDARY = '#e4e4e7';
const TEXT_TERTIARY = '#a1a1aa';
const TEXT_MUTED = '#52525b';
const PILL_TEXT = '#d4d4d8';

interface OgCardProps {
  accent: string;
  category?: string;
  title: string | string[];
  subtitle?: string;
  details?: string[];
  imageUrl?: string;
  iconChildren?: React.JSX.Element[];
}

function OgCard({
  accent,
  category,
  title,
  subtitle,
  details,
  imageUrl,
  iconChildren,
}: OgCardProps) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: BORDER_COLOR,
        padding: '12px',
        borderRadius: '16px',
        fontFamily: 'Montserrat',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          width: '100%',
          height: '100%',
          borderRadius: '10px',
          background: `radial-gradient(circle at 75% 15%, ${hexToRgba(accent, 0.22)}, transparent 55%), radial-gradient(circle at 30% 75%, ${hexToRgba(accent, 0.08)}, transparent 60%), ${BG}`,
          padding: '56px 72px',
        }}
      >
        {/* Site name — upper left */}
        <div
          style={{
            position: 'absolute',
            top: '48px',
            left: '78px',
            display: 'flex',
            fontSize: '36px',
            fontWeight: 700,
            color: TEXT_MUTED,
            letterSpacing: '0.04em',
          }}
        >
          dorkroom.art
        </div>

        {/* Upper right visual — film image or page icon */}
        {imageUrl ? (
          <img
            src={imageUrl}
            width={270}
            height={270}
            style={{
              position: 'absolute',
              top: '48px',
              right: '78px',
              borderRadius: '12px',
              objectFit: 'cover',
            }}
          />
        ) : iconChildren ? (
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: '48px',
              right: '78px',
              alignItems: 'center',
              justifyContent: 'center',
              width: '190px',
              height: '190px',
            }}
          >
            {/* Glow behind icon */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                width: '250px',
                height: '250px',
                borderRadius: '9999px',
                background: `radial-gradient(circle, ${hexToRgba(accent, 0.18)}, transparent 70%)`,
              }}
            />
            {/* Circular container */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '190px',
                height: '190px',
                borderRadius: '9999px',
                border: `5px solid ${hexToRgba(accent, 0.35)}`,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={130}
                height={130}
                fill="none"
                stroke={accent}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {iconChildren}
              </svg>
            </div>
          </div>
        ) : null}

        {/* Category label */}
        {category ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '26px',
                color: accent,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              {category}
            </div>
            <div
              style={{
                display: 'flex',
                width: '80px',
                height: '3px',
                backgroundColor: accent,
                borderRadius: '2px',
              }}
            />
          </div>
        ) : null}

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize:
              (Array.isArray(title) ? title.join(' ') : title).length > 30
                ? '64px'
                : '76px',
            fontWeight: 700,
            color: TEXT_PRIMARY,
            lineHeight: 1.15,
            marginBottom: subtitle ? '16px' : '20px',
          }}
        >
          {Array.isArray(title)
            ? title.map((line) => (
                <div key={line} style={{ display: 'flex' }}>
                  {line}
                </div>
              ))
            : title}
        </div>

        {/* Subtitle */}
        {subtitle ? (
          <div
            style={{
              display: 'flex',
              fontSize: '32px',
              fontStyle: 'italic',
              color: TEXT_SECONDARY,
              lineHeight: 1.4,
              marginBottom: '20px',
              maxWidth: '1000px',
            }}
          >
            {subtitle}
          </div>
        ) : null}

        {/* Detail pills */}
        {details && details.length > 0 ? (
          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              marginTop: '8px',
            }}
          >
            {details.map((detail) => (
              <div
                key={detail}
                style={{
                  display: 'flex',
                  padding: '10px 24px',
                  borderRadius: '999px',
                  border: `1px solid ${hexToRgba(accent, 0.3)}`,
                  backgroundColor: hexToRgba(accent, 0.08),
                  color: PILL_TEXT,
                  fontSize: '26px',
                }}
              >
                {detail}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const route = searchParams.get('route') ?? '/';
  const filmSlug = searchParams.get('film');
  const developerSlug = searchParams.get('developer');
  const recipeUuid = searchParams.get('recipe');

  // Film filter card (e.g. /films?color=bw&brand=Kodak)
  if (route === '/films' && !filmSlug) {
    const color = searchParams.get('color');
    const iso = searchParams.get('iso');
    const brand = searchParams.get('brand');
    const status = searchParams.get('status');
    const filterParts = buildFilmFilterParts({
      color: color ?? undefined,
      iso: iso ?? undefined,
      brand: brand ?? undefined,
      status: status ?? undefined,
    });

    if (filterParts) {
      return renderImage(
        <OgCard
          accent={getRouteAccent('/films')}
          category="Film Database"
          title={filterParts.titleLines}
          subtitle={filterParts.subtitle}
          iconChildren={getRouteIcon('/films') ?? undefined}
        />
      );
    }
  }

  // Dynamic film detail card
  if (route === '/films' && filmSlug) {
    const film = await lookupFilm(filmSlug);
    const filmName = film
      ? `${film.brand} ${film.name}`
      : prettifySlug(filmSlug);
    const details: string[] = [];
    if (film?.iso_speed) details.push(`ISO ${film.iso_speed}`);
    if (film?.color_type) {
      details.push(
        film.color_type === 'bw'
          ? 'Black & White'
          : film.color_type === 'color'
            ? 'Color Negative'
            : 'Slide'
      );
    }

    return renderImage(
      <OgCard
        accent={getRouteAccent('/films')}
        category="Film Database"
        title={filmName}
        details={details}
        imageUrl={film?.static_image_url ?? undefined}
        iconChildren={
          film?.static_image_url
            ? undefined
            : (getRouteIcon('/films') ?? undefined)
        }
      />
    );
  }

  // Specific recipe card (film + developer + recipe UUID)
  if (route === '/development' && filmSlug && developerSlug && recipeUuid) {
    const [film, developer, combo] = await Promise.all([
      lookupFilm(filmSlug),
      lookupDeveloper(developerSlug),
      lookupCombination(filmSlug, developerSlug, recipeUuid),
    ]);

    const filmName = film
      ? `${film.brand} ${film.name}`
      : prettifySlug(filmSlug);
    const devName = developer
      ? `${developer.manufacturer} ${developer.name}`
      : prettifySlug(developerSlug);

    // Look up dilution name from developer's dilutions array
    let dilutionLabel: string | null = null;
    if (combo?.dilution_id && developer?.dilutions) {
      const dil = developer.dilutions.find(
        (d) => String(d.id) === combo.dilution_id
      );
      if (dil) dilutionLabel = dil.name ?? dil.ratio ?? null;
    }

    const subtitle = dilutionLabel
      ? `in ${devName} ${dilutionLabel}`
      : `in ${devName}`;

    const details: string[] = [];
    if (combo) {
      details.push(formatTime(combo.time_minutes));
      details.push(`${combo.temperature_celsius}\u00B0C`);
      if (combo.shooting_iso) details.push(`ISO ${combo.shooting_iso}`);
      if (combo.push_pull && combo.push_pull !== 0) {
        details.push(
          combo.push_pull > 0
            ? `Push +${combo.push_pull}`
            : `Pull ${combo.push_pull}`
        );
      }
    }

    return renderImage(
      <OgCard
        accent={getRouteAccent('/development')}
        category="Development Recipes"
        title={filmName}
        subtitle={subtitle}
        details={details}
        iconChildren={getRouteIcon('/development') ?? undefined}
      />
    );
  }

  // Film + developer search card (no specific recipe)
  if (route === '/development' && filmSlug && developerSlug) {
    const [film, developer] = await Promise.all([
      lookupFilm(filmSlug),
      lookupDeveloper(developerSlug),
    ]);

    const filmName = film
      ? `${film.brand} ${film.name}`
      : prettifySlug(filmSlug);
    const devName = developer
      ? `${developer.manufacturer} ${developer.name}`
      : prettifySlug(developerSlug);

    return renderImage(
      <OgCard
        accent={getRouteAccent('/development')}
        category="Development Recipes"
        title={filmName}
        subtitle={`in ${devName}`}
        iconChildren={getRouteIcon('/development') ?? undefined}
      />
    );
  }

  // Film-only development search card
  if (route === '/development' && filmSlug) {
    const film = await lookupFilm(filmSlug);
    const filmName = film
      ? `${film.brand} ${film.name}`
      : prettifySlug(filmSlug);

    return renderImage(
      <OgCard
        accent={getRouteAccent('/development')}
        category="Development Recipes"
        title={filmName}
        iconChildren={getRouteIcon('/development') ?? undefined}
      />
    );
  }

  // Dynamic development recipe card (developer only, no film)
  if (route === '/development' && developerSlug) {
    const developer = await lookupDeveloper(developerSlug);
    const devName = developer
      ? `${developer.manufacturer} ${developer.name}`
      : prettifySlug(developerSlug);

    const details: string[] = [];
    if (developer?.dilutions?.length) {
      for (const dil of developer.dilutions) {
        const label = dil.name ?? dil.ratio;
        if (label) details.push(label);
      }
    }

    return renderImage(
      <OgCard
        accent={getRouteAccent('/development')}
        category="Development Recipes"
        title={devName}
        details={details.length > 0 ? details : undefined}
        iconChildren={getRouteIcon('/development') ?? undefined}
      />
    );
  }

  // Generic page card (static routes)
  const meta = getRouteMetadata(route);
  const displayTitle = meta.title
    .replace(` | ${SITE_NAME}`, '')
    .replace(' - Photography Calculators and Resources', '');

  const firstSentence =
    meta.description.match(/^[^.!?]*[.!?]/)?.[0] ?? meta.description;
  const description =
    firstSentence.length > 120
      ? `${firstSentence.slice(0, 117)}...`
      : firstSentence;

  return renderImage(
    <OgCard
      accent={getRouteAccent(route)}
      title={displayTitle}
      subtitle={description}
      iconChildren={getRouteIcon(route) ?? getRouteIcon('/') ?? undefined}
    />
  );
}

async function renderImage(element: React.JSX.Element): Promise<Response> {
  const [regular, bold, italic] = await Promise.all([
    loadFontData(FONT_URL),
    loadFontData(FONT_BOLD_URL),
    loadFontData(FONT_ITALIC_URL),
  ]);
  const fonts: {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 700;
    style: 'normal' | 'italic';
  }[] = [];
  if (regular)
    fonts.push({
      name: 'Montserrat',
      data: regular,
      weight: 400,
      style: 'normal',
    });
  if (bold)
    fonts.push({
      name: 'Montserrat',
      data: bold,
      weight: 700,
      style: 'normal',
    });
  if (italic)
    fonts.push({
      name: 'Montserrat',
      data: italic,
      weight: 400,
      style: 'italic',
    });

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    fonts: fonts.length > 0 ? fonts : undefined,
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}
