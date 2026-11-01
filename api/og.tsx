import { ImageResponse } from '@vercel/og';
import {
  type CalculatorDrawing,
  calculatorLinkParamNames,
  type CalculatorShare,
  readCalculatorShare,
} from '../utils/calculatorShare';
import { checkEdgeRateLimit, getRequestIp } from '../utils/edgeRateLimit';
import {
  BRAND_RE,
  ISO_RE,
  PRESET_RE,
  SLUG_RE,
  UUID_RE,
} from '../utils/queryPatterns';
import {
  ANONYMOUS_RATE_LIMIT,
  ANONYMOUS_RATE_WINDOW_MS,
} from '../utils/rateLimitPolicy';
import {
  BASE_URL,
  buildFilmFilterParts,
  decodeBorderPreset,
  getRouteMetadata,
  isKnownRoutePath,
  prettifySlug,
  ROUTE_TITLES,
  routeAccentHex,
  SITE_NAME,
} from '../utils/routeMetadata';
import { serverlessError } from '../utils/serverlessLogger';

export const config = { runtime: 'edge' };

/**
 * Every query param this endpoint reads on any route (verified against every
 * `searchParams.get(...)` call in this file). A calculator route also reads
 * its link params (`calculatorLinkParamNames`). Anything else is rejected
 * before any font fetch, upstream lookup, or image render — see the guard
 * at the top of `handler`. Keep this in sync when adding a new param.
 */
const ALLOWED_PARAMS = new Set([
  'route',
  'film',
  'developer',
  'recipe',
  'color',
  'iso',
  'brand',
  'status',
  'preset',
]);

function rejectUnknownParams(searchParams: URLSearchParams): boolean {
  const linkParams = new Set(
    calculatorLinkParamNames(searchParams.get('route') ?? '/')
  );
  const seen = new Set<string>();
  for (const key of searchParams.keys()) {
    if ((!ALLOWED_PARAMS.has(key) && !linkParams.has(key)) || seen.has(key)) {
      return true;
    }
    seen.add(key);
  }
  return false;
}

const FETCH_TIMEOUT_MS = 3000;
/** Rows requested per `/api/combinations` page when scanning for a recipe UUID. */
const COMBINATION_PAGE_SIZE = 50;
/**
 * Upper bound on pages scanned for a recipe UUID (500 rows at
 * `COMBINATION_PAGE_SIZE`). Prevents a pathological film+developer pairing
 * from fanning out into unbounded upstream requests.
 */
const MAX_COMBINATION_PAGES = 10;
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

/**
 * The `/api/developers` response is cast, not validated, so the label fields
 * are typed `unknown`: a row could carry a number or null where a string is
 * expected.
 */
interface DilutionInfo {
  id: string | number;
  name?: unknown;
  dilution?: unknown;
  ratio?: unknown;
}

function isLabelString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Same fallback chain as the API client's transformDeveloper: a dilution may
 * omit `name`, and some entries carry `ratio` instead of `dilution`. Each field
 * is trimmed so a whitespace-only value falls through to the next one, and a
 * non-string value is skipped rather than throwing.
 */
export function getDilutionLabel(dil: DilutionInfo): string | null {
  for (const value of [dil.name, dil.dilution, dil.ratio]) {
    const label = isLabelString(value) ? value.trim() : '';
    if (label) return label;
  }
  return null;
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
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchFontData(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Font downloads keyed by URL, held in module scope so a warm edge isolate
 * fetches each face once rather than once per render. The promise itself is
 * stored, so concurrent renders share one in-flight download. A failed
 * download (null) is evicted, so the next render retries instead of pinning
 * the fallback face for the isolate's lifetime.
 */
const fontCache = new Map<string, Promise<ArrayBuffer | null>>();

export async function loadFontData(url: string): Promise<ArrayBuffer | null> {
  const cached = fontCache.get(url);
  if (cached) return cached;

  const pending = fetchFontData(url);
  fontCache.set(url, pending);
  const data = await pending;
  if (data === null && fontCache.get(url) === pending) {
    fontCache.delete(url);
  }
  return data;
}

/** Test hook: forget every cached font so each test starts cold. */
export function clearFontCache(): void {
  fontCache.clear();
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

/**
 * Resolves a film+developer combination.
 *
 * Without a `recipeUuid`, returns the first row (`limit=1`) — there is no
 * specific recipe to match, so any row for the pairing is fine.
 *
 * With a `recipeUuid`, pages through `/api/combinations` looking for that
 * exact row, since the backend gives no ordering guarantee that would put it
 * on page 1. The upstream function only honours `page` when the page size is
 * sent as `count`; with `limit` it ignores `page` and returns the first rows
 * every time (see `supabase/functions/combinations/index.ts`). A miss returns
 * `null` rather than substituting an unrelated recipe — see issue #252. Paging
 * stops once the UUID is found, the upstream reports no more matching rows
 * (via the response's `count`), a page comes back empty, or
 * `MAX_COMBINATION_PAGES` is reached.
 */
export async function lookupCombination(
  filmSlug: string,
  developerSlug: string,
  recipeUuid?: string
): Promise<CombinationInfo | null> {
  const baseUrl = `${BASE_URL}/api/combinations?film=${encodeURIComponent(filmSlug)}&developer=${encodeURIComponent(developerSlug)}`;

  if (!recipeUuid) {
    const data = await fetchJson<{
      data: (CombinationInfo & { uuid?: string })[];
      count?: number;
    }>(`${baseUrl}&limit=1`);
    return data?.data?.[0] ?? null;
  }

  for (let page = 1; page <= MAX_COMBINATION_PAGES; page++) {
    const data = await fetchJson<{
      data: (CombinationInfo & { uuid?: string })[];
      count?: number;
    }>(`${baseUrl}&count=${COMBINATION_PAGE_SIZE}&page=${page}`);
    if (!data?.data?.length) return null;

    const match = data.data.find((c) => c.uuid === recipeUuid);
    if (match) return match;

    const rowsSeen = page * COMBINATION_PAGE_SIZE;
    if (data.count === undefined || rowsSeen >= data.count) return null;
  }
  return null;
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

/**
 * The card accent for a route: the page's own accent tone from the tool
 * manifest (dark-theme value, `routeAccentHex`), so a card matches the page
 * header and home card it links to. Pages without a manifest tone keep a
 * fixed colour.
 */
export function getRouteAccent(route: string): string {
  const toneHex = routeAccentHex(route);
  if (toneHex) return toneHex;
  switch (route) {
    case '/':
      return '#6ef3a4'; // green — app primary
    case '/docs':
      return '#c4b5fd'; // purple
    case '/privacy':
      return '#c4b5fd'; // purple — reference, same family as /docs
    case '/settings':
      return '#c4b5fd'; // purple — reference, same family as /docs and /privacy
    default:
      return '#e5ff7d'; // lime: unknown routes
  }
}

/** Lucide icon SVG children keyed by route. Each entry is an array of SVG elements. */
export function getRouteIcon(route: string): React.JSX.Element[] | null {
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
    case '/mat': // Frame
      return [
        <line key="1" x1={22} x2={2} y1={6} y2={6} />,
        <line key="2" x1={22} x2={2} y1={18} y2={18} />,
        <line key="3" x1={6} x2={6} y1={2} y2={22} />,
        <line key="4" x1={18} x2={18} y1={2} y2={22} />,
      ];
    case '/negative-inverter': // Contrast
      return [
        <circle key="1" cx={12} cy={12} r={10} />,
        <path key="2" d="M12 18a6 6 0 0 0 0-12v12z" />,
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
    case '/privacy': // ShieldCheck
      return [
        <path
          key="1"
          d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
        />,
        <path key="2" d="m9 12 2 2 4-4" />,
      ];
    case '/docs': // BookOpen
      return [
        <path key="1" d="M12 7v14" />,
        <path
          key="2"
          d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
        />,
      ];
    case '/settings': // Settings
      return [
        <path
          key="1"
          d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
        />,
        <circle key="2" cx={12} cy={12} r={3} />,
      ];
    default:
      return null;
  }
}

// Dark theme colors from the site
const BG = '#09090b';
const TEXT_PRIMARY = '#ffffff';
const TEXT_SECONDARY = '#e4e4e7';
const TEXT_MUTED = '#52525b';
const PILL_TEXT = '#d4d4d8';

// Static style objects (hoisted so satori-only inline styles stay maintainable)
const SITE_NAME_STYLE = {
  position: 'absolute',
  top: '48px',
  left: '78px',
  display: 'flex',
  fontSize: '36px',
  fontWeight: 700,
  color: TEXT_MUTED,
  letterSpacing: '0.04em',
} as const;

const ICON_CONTAINER_STYLE = {
  display: 'flex',
  position: 'absolute',
  top: '48px',
  right: '78px',
  alignItems: 'center',
  justifyContent: 'center',
  width: '190px',
  height: '190px',
} as const;

interface OgCardProps {
  accent: string;
  category?: string;
  title: string | string[];
  subtitle?: string;
  details?: string[];
  imageUrl?: string;
  iconChildren?: React.JSX.Element[];
}

// eslint-disable-next-line react-doctor/only-export-components -- Vercel OG serverless function: JSX is rendered server-side to an image, not a Fast Refresh component module
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
          background: `radial-gradient(circle at 75% 15%, ${hexToRgba(accent, 0.22)}, transparent 55%), radial-gradient(circle at 30% 75%, ${hexToRgba(accent, 0.08)}, transparent 60%), ${BG}`,
          padding: '56px 72px',
        }}
      >
        {/* Site name — upper left */}
        <div style={SITE_NAME_STYLE}>dorkroom.art</div>

        {/* Upper right visual — film image or page icon */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={Array.isArray(title) ? title.join(' ') : title}
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
          <div style={ICON_CONTAINER_STYLE}>
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

// ---- Shared calculator link cards ----
//
// Drawn previews for a calculator link: the text on the left, a to-scale
// picture of the result on the right. Every number comes from the share
// (`utils/calculatorShare.ts`), which takes it from @dorkroom/logic.

/** Box the picture is fitted into, and the room left under it for captions. */
const DRAWING_W = 440;
const DRAWING_H = 380;
const PAPER = '#f4f4f5';
const MAT_BOARD = '#ece7dc';
const IMAGE_AREA = '#18181b';
const SECOND_FRAME = '#7dd6ff';
const CAPTION_STYLE = {
  display: 'flex',
  marginTop: '18px',
  fontSize: '24px',
  color: TEXT_SECONDARY,
} as const;
/** Smallest side drawn, so a tiny print or frame still shows up. */
const MIN_SIDE_PX = 6;
/** Narrowest box that still gets a label written inside it. */
const MIN_LABELLED_PX = 170;

/** Pixels per unit that fit a `w` x `h` thing into a `boxW` x `boxH` box. */
function fitScale(w: number, h: number, boxW: number, boxH: number): number {
  return Math.min(boxW / w, boxH / h);
}

function px(value: number): number {
  return Math.max(MIN_SIDE_PX, Math.round(value));
}

// eslint-disable-next-line react-doctor/only-export-components -- Vercel OG serverless function: JSX is rendered server-side to an image, not a Fast Refresh component module
function BorderPicture({
  drawing,
  accent,
}: {
  drawing: Extract<CalculatorDrawing, { kind: 'border' }>;
  accent: string;
}) {
  const s = fitScale(drawing.paperW, drawing.paperH, DRAWING_W, DRAWING_H);
  const printW = px(drawing.printW * s);
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: `${px(drawing.paperW * s)}px`,
          height: `${px(drawing.paperH * s)}px`,
          backgroundColor: PAPER,
          borderRadius: '4px',
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: `${Math.round(drawing.printLeft * s)}px`,
            top: `${Math.round(drawing.printTop * s)}px`,
            width: `${printW}px`,
            height: `${px(drawing.printH * s)}px`,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: IMAGE_AREA,
            border: `3px solid ${accent}`,
            color: accent,
            fontSize: '30px',
            fontWeight: 700,
          }}
        >
          {printW >= MIN_LABELLED_PX ? drawing.printLabel : ''}
        </div>
      </div>
      <div style={CAPTION_STYLE}>{drawing.caption}</div>
    </div>
  );
}

// eslint-disable-next-line react-doctor/only-export-components -- Vercel OG serverless function: JSX is rendered server-side to an image, not a Fast Refresh component module
function LensPicture({
  drawing,
  accent,
}: {
  drawing: Extract<CalculatorDrawing, { kind: 'lens' }>;
  accent: string;
}) {
  const { source, target } = drawing;
  const unionW = Math.max(source.w, target.w);
  const unionH = Math.max(source.h, target.h);
  // Leave room under the frames for the two-line legend.
  const s = fitScale(unionW, unionH, DRAWING_W, DRAWING_H - 90);
  const frames = [
    { frame: source, color: accent, line: 'solid' },
    { frame: target, color: SECOND_FRAME, line: 'dashed' },
  ] as const;
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: `${px(unionW * s)}px`,
          height: `${px(unionH * s)}px`,
        }}
      >
        {frames.map(({ frame, color, line }) => (
          <div
            key={line}
            style={{
              display: 'flex',
              position: 'absolute',
              left: `${Math.round(((unionW - frame.w) / 2) * s)}px`,
              top: `${Math.round(((unionH - frame.h) / 2) * s)}px`,
              width: `${px(frame.w * s)}px`,
              height: `${px(frame.h * s)}px`,
              border: `4px ${line} ${color}`,
              backgroundColor: hexToRgba(color, 0.1),
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: '22px',
          gap: '10px',
        }}
      >
        {frames.map(({ frame, color, line }) => (
          <div
            key={line}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '26px',
              color: TEXT_SECONDARY,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '26px',
                height: '18px',
                border: `3px ${line} ${color}`,
              }}
            />
            {frame.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line react-doctor/only-export-components -- Vercel OG serverless function: JSX is rendered server-side to an image, not a Fast Refresh component module
function ResizePicture({
  drawing,
  accent,
}: {
  drawing: Extract<CalculatorDrawing, { kind: 'resize' }>;
  accent: string;
}) {
  const gap = 48;
  const { from, to } = drawing;
  // One scale for both prints, leaving room for two caption lines under each.
  const s = Math.min(
    (DRAWING_W - gap) / (from.w + to.w),
    (DRAWING_H - 50) / Math.max(from.h, to.h)
  );
  const prints = [
    { print: from, color: '#a1a1aa', fill: 0.06, key: 'from' },
    { print: to, color: accent, fill: 0.15, key: 'to' },
  ] as const;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: `${gap}px` }}>
      {prints.map(({ print, color, fill, key }) => (
        <div
          key={key}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: `${px(print.w * s)}px`,
              height: `${px(print.h * s)}px`,
              border: `3px solid ${color}`,
              backgroundColor: hexToRgba(color, fill),
            }}
          />
          <div style={{ ...CAPTION_STYLE, fontSize: '22px' }}>
            {print.label}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '32px',
              fontWeight: 700,
              color: key === 'to' ? accent : TEXT_PRIMARY,
            }}
          >
            {print.time}
          </div>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line react-doctor/only-export-components -- Vercel OG serverless function: JSX is rendered server-side to an image, not a Fast Refresh component module
function MatPicture({
  drawing,
  accent,
}: {
  drawing: Extract<CalculatorDrawing, { kind: 'mat' }>;
  accent: string;
}) {
  const s = fitScale(drawing.boardW, drawing.boardH, DRAWING_W, DRAWING_H);
  const { window: opening, art } = drawing;
  const rectStyle = (rect: typeof opening) =>
    ({
      display: 'flex',
      position: 'absolute',
      left: `${Math.round(rect.left * s)}px`,
      top: `${Math.round(rect.top * s)}px`,
      width: `${px(rect.w * s)}px`,
      height: `${px(rect.h * s)}px`,
    }) as const;
  const windowW = px(opening.w * s);
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: `${px(drawing.boardW * s)}px`,
          height: `${px(drawing.boardH * s)}px`,
          backgroundColor: MAT_BOARD,
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div style={{ ...rectStyle(opening), backgroundColor: IMAGE_AREA }} />
        {art ? (
          <div style={{ ...rectStyle(art), border: `3px dashed ${accent}` }} />
        ) : null}
        <div
          style={{
            ...rectStyle(opening),
            alignItems: 'center',
            justifyContent: 'center',
            color: TEXT_PRIMARY,
            fontSize: '24px',
            fontWeight: 700,
          }}
        >
          {windowW >= MIN_LABELLED_PX ? drawing.windowLabel : ''}
        </div>
      </div>
      <div style={CAPTION_STYLE}>{drawing.caption}</div>
    </div>
  );
}

// eslint-disable-next-line react-doctor/only-export-components -- Vercel OG serverless function: JSX is rendered server-side to an image, not a Fast Refresh component module
function SharePicture({
  drawing,
  accent,
}: {
  drawing: CalculatorDrawing;
  accent: string;
}) {
  switch (drawing.kind) {
    case 'border':
      return <BorderPicture drawing={drawing} accent={accent} />;
    case 'lens':
      return <LensPicture drawing={drawing} accent={accent} />;
    case 'resize':
      return <ResizePicture drawing={drawing} accent={accent} />;
    case 'mat':
      return <MatPicture drawing={drawing} accent={accent} />;
  }
}

// eslint-disable-next-line react-doctor/only-export-components -- Vercel OG serverless function: JSX is rendered server-side to an image, not a Fast Refresh component module
function ShareDrawingCard({
  share,
  drawing,
}: {
  share: CalculatorShare;
  drawing: CalculatorDrawing;
}) {
  const accent = getRouteAccent(share.route);
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: '100%',
        height: '100%',
        fontFamily: 'Montserrat',
        background: `radial-gradient(circle at 78% 40%, ${hexToRgba(accent, 0.16)}, transparent 50%), radial-gradient(circle at 25% 80%, ${hexToRgba(accent, 0.07)}, transparent 60%), ${BG}`,
      }}
    >
      <div style={SITE_NAME_STYLE}>dorkroom.art</div>

      {/* Text column, bottom left */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: '72px',
          bottom: '56px',
          width: '560px',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: '24px',
            color: accent,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          {ROUTE_TITLES[share.route]}
        </div>
        <div
          style={{
            display: 'flex',
            width: '80px',
            height: '3px',
            backgroundColor: accent,
            borderRadius: '2px',
            marginBottom: '20px',
          }}
        />
        <div
          style={{
            display: 'flex',
            fontSize: share.title.length > 40 ? '46px' : '56px',
            fontWeight: 700,
            color: TEXT_PRIMARY,
            lineHeight: 1.15,
            marginBottom: '24px',
          }}
        >
          {share.title}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {share.details.map((detail) => (
            <div
              key={detail}
              style={{
                display: 'flex',
                padding: '8px 20px',
                borderRadius: '999px',
                border: `1px solid ${hexToRgba(accent, 0.3)}`,
                backgroundColor: hexToRgba(accent, 0.08),
                color: PILL_TEXT,
                fontSize: '22px',
              }}
            >
              {detail}
            </div>
          ))}
        </div>
      </div>

      {/* Picture, right */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          right: '64px',
          top: '56px',
          bottom: '56px',
          width: `${DRAWING_W + 16}px`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SharePicture drawing={drawing} accent={accent} />
      </div>
    </div>
  );
}

/** Never cached: a limited or failed request must not stick to its URL at the CDN. */
const NO_STORE = 'no-store';

/**
 * Params after shape validation. A value that fails its check is treated as
 * absent — the same values `meta.ts` would have dropped before writing the
 * `og:image` URL — so no upstream lookup ever runs on a malformed slug and
 * attacker-chosen text never reaches the rendered card.
 */
interface OgParams {
  route: string;
  film: string | null;
  developer: string | null;
  recipe: string | null;
  color: string | null;
  iso: string | null;
  brand: string | null;
  status: string | null;
  preset: string | null;
  /**
   * The route's calculator link params as sent. They are validated by the
   * calculator's own link (`readCalculatorShare`), which drops bad values.
   */
  linkSearch: Record<string, string>;
}

function validated(value: string | null, pattern: RegExp): string | null {
  return value !== null && pattern.test(value) ? value : null;
}

function parseOgParams(searchParams: URLSearchParams): OgParams {
  const route = searchParams.get('route') ?? '/';
  const linkSearch: Record<string, string> = {};
  for (const name of calculatorLinkParamNames(route)) {
    const value = searchParams.get(name);
    if (value !== null) linkSearch[name] = value;
  }
  return {
    route,
    linkSearch,
    film: validated(searchParams.get('film'), SLUG_RE),
    developer: validated(searchParams.get('developer'), SLUG_RE),
    recipe: validated(searchParams.get('recipe'), UUID_RE),
    // color and status are checked against closed sets in buildFilmFilterParts.
    color: searchParams.get('color'),
    iso: validated(searchParams.get('iso'), ISO_RE),
    brand: validated(searchParams.get('brand'), BRAND_RE),
    status: searchParams.get('status'),
    preset: validated(searchParams.get('preset'), PRESET_RE),
  };
}

/**
 * True for the static page cards: a known route in its normalized form and no
 * other param. That set is small and fixed (one URL per route), so the CDN's
 * `s-maxage` absorbs it entirely and it needs no rate limit. It is also where
 * a rate-limited request is sent.
 */
function isStaticCardRequest(searchParams: URLSearchParams): boolean {
  for (const key of searchParams.keys()) {
    if (key !== 'route') return false;
  }
  const route = searchParams.get('route') ?? '/';
  return staticCardRoute(route) === route;
}

/** `route` when it names a known page in normalized form, else null. */
function staticCardRoute(route: string): string | null {
  if (!isKnownRoutePath(route)) return null;
  if (route !== '/' && route.endsWith('/')) return null;
  return route;
}

/**
 * Over-limit response: a temporary redirect to the static card for the same
 * route (the home card when the route is unknown). That target is CDN-cached,
 * so a throttled requester costs no render and no upstream call, while a
 * social crawler that trips the limit still gets a usable image instead of a
 * broken preview. `no-store` keeps the redirect itself from being cached
 * under the dynamic URL, so the real card renders once the window resets.
 */
function rateLimitedResponse(
  request: Request,
  route: string,
  limit: { limit: number; remaining: number; resetMs: number }
): Response {
  const target = new URL('/api/og', request.url);
  const staticRoute = staticCardRoute(route);
  if (staticRoute && staticRoute !== '/') {
    target.searchParams.set('route', staticRoute);
  }
  const retryAfter = Math.max(
    1,
    Math.ceil((limit.resetMs - Date.now()) / 1000)
  );

  return new Response(null, {
    status: 307,
    headers: {
      Location: target.toString(),
      'Cache-Control': NO_STORE,
      'Retry-After': String(retryAfter),
      'X-RateLimit-Limit': String(limit.limit),
      'X-RateLimit-Remaining': String(limit.remaining),
      'X-RateLimit-Reset': String(Math.ceil(limit.resetMs / 1000)),
    },
  });
}

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  if (rejectUnknownParams(searchParams)) {
    return new Response('Bad Request', {
      status: 400,
      headers: { 'Cache-Control': 'public, s-maxage=86400' },
    });
  }

  const params = parseOgParams(searchParams);

  // Every request that is not one of the fixed static cards can name a fresh
  // CDN cache key, and so costs a render and possibly upstream lookups.
  // Budget those per client IP, like the anonymous limit on /api/*.
  if (!isStaticCardRequest(searchParams)) {
    const limit = await checkEdgeRateLimit({
      identifier: `og:${getRequestIp(request)}`,
      limit: ANONYMOUS_RATE_LIMIT,
      durationMs: ANONYMOUS_RATE_WINDOW_MS,
    });
    if (limit.status === 'limited') {
      return rateLimitedResponse(request, params.route, limit);
    }
  }

  try {
    return await renderCard(params);
  } catch (cause) {
    serverlessError('OG image render failed', {
      route: params.route,
      cause: cause instanceof Error ? cause.message : String(cause),
    });
    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'Cache-Control': NO_STORE },
    });
  }
}

async function renderCard(params: OgParams): Promise<Response> {
  const {
    route,
    film: filmSlug,
    developer: developerSlug,
    recipe: recipeUuid,
  } = params;

  // Film filter card (e.g. /films?color=bw&brand=Kodak)
  if (route === '/films' && !filmSlug) {
    const { color, iso, brand, status } = params;
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
      if (dil) dilutionLabel = getDilutionLabel(dil);
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
        const label = getDilutionLabel(dil);
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

  // Border preset card (e.g. /border?preset=encoded)
  if (route === '/border') {
    const presetParam = params.preset;
    if (presetParam) {
      const decoded = decodeBorderPreset(presetParam);
      if (decoded) {
        const title = `${decoded.name}`;
        return renderImage(
          <OgCard
            accent={getRouteAccent('/border')}
            category="Border Calculator"
            title={title}
            iconChildren={getRouteIcon('/border') ?? undefined}
            details={[
              `${decoded.paperLabel} paper`,
              `${decoded.printW}×${decoded.printH}in print`,
            ]}
          />
        );
      }
    }
  }

  // Shared calculator link card (e.g. /lenses?focal=80&from=film-6x6). The
  // values are validated and the numbers computed by @dorkroom/logic; a link
  // with nothing usable falls through to the generic card for the route.
  const share = readCalculatorShare(route, params.linkSearch);
  if (share) {
    return renderImage(
      share.drawing ? (
        <ShareDrawingCard share={share} drawing={share.drawing} />
      ) : (
        <OgCard
          accent={getRouteAccent(route)}
          category={ROUTE_TITLES[share.route]}
          title={share.title}
          subtitle={share.subtitle}
          details={share.details}
          iconChildren={getRouteIcon(route) ?? undefined}
        />
      )
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
