import { ImageResponse } from '@vercel/og';
import {
  BASE_URL,
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
  name: string;
  dilution: string;
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
const PILL_BORDER = '#3f3f46';
const PILL_TEXT = '#d4d4d8';

interface OgCardProps {
  category?: string;
  title: string;
  subtitle?: string;
  details?: string[];
  imageUrl?: string;
  iconChildren?: React.JSX.Element[];
}

function OgCard({
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
          background: `radial-gradient(circle at 20% 20%, rgba(243, 110, 110, 0.2), transparent 60%), radial-gradient(circle at 80% 20%, rgba(125, 214, 255, 0.16), transparent 55%), radial-gradient(circle at 40% 80%, rgba(246, 249, 150, 0.14), transparent 60%), ${BG}`,
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
            fontSize: '42px',
            fontWeight: 700,
            color: TEXT_SECONDARY,
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
          <svg
            viewBox="0 0 24 24"
            width={160}
            height={160}
            style={{
              position: 'absolute',
              top: '48px',
              right: '78px',
            }}
            fill="none"
            stroke={TEXT_PRIMARY}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {iconChildren}
          </svg>
        ) : null}

        {/* Category label */}
        {category ? (
          <div
            style={{
              display: 'flex',
              fontSize: '26px',
              color: TEXT_TERTIARY,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            {category}
          </div>
        ) : null}

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 30 ? '64px' : '76px',
            fontWeight: 700,
            color: TEXT_PRIMARY,
            lineHeight: 1.15,
            marginBottom: subtitle ? '16px' : '20px',
          }}
        >
          {title}
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
                  border: `1px solid ${PILL_BORDER}`,
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

  // Dynamic development recipe card
  if (route === '/development' && filmSlug) {
    const [film, developer, combo] = await Promise.all([
      lookupFilm(filmSlug),
      developerSlug ? lookupDeveloper(developerSlug) : Promise.resolve(null),
      developerSlug
        ? lookupCombination(filmSlug, developerSlug, recipeUuid ?? undefined)
        : Promise.resolve(null),
    ]);

    const filmName = film
      ? `${film.brand} ${film.name}`
      : prettifySlug(filmSlug);
    const devName = developer
      ? `${developer.manufacturer} ${developer.name}`
      : developerSlug
        ? prettifySlug(developerSlug)
        : null;

    const title = filmName;

    // Look up dilution name from developer's dilutions array
    let dilutionLabel: string | null = null;
    if (combo?.dilution_id && developer?.dilutions) {
      const dil = developer.dilutions.find(
        (d) => String(d.id) === combo.dilution_id
      );
      if (dil) dilutionLabel = dil.dilution;
    }

    const subtitle = devName
      ? dilutionLabel
        ? `in ${devName} ${dilutionLabel}`
        : `in ${devName}`
      : null;

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
        category="Development Recipe"
        title={title}
        subtitle={subtitle ?? undefined}
        details={details}
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
