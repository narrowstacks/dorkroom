# Dorkroom API Documentation

Dorkroom provides two ways to access film development data: REST API endpoints for external integrations, and a TypeScript client package for use within applications.

## Table of Contents

- [REST API Endpoints](#rest-api-endpoints)
- [TypeScript Client Package](#typescript-client-package)
- [Data Types](#data-types)
- [Error Handling](#error-handling)
- [Rate Limiting & Caching](#rate-limiting--caching)

---

## REST API Endpoints

Vercel serverless functions provide HTTP REST access to film development data. All endpoints support CORS and return JSON responses.

### Base URL

```
Production: https://dorkroom.art/api
Development: http://localhost:4200/api
```

### Authentication

No authentication required for GET requests. The server uses Supabase service role keys internally.

### Common Features

- **CORS enabled**: Works from any domain
- **Query parameters**: Filter and search capabilities
- **Caching**: 5-minute cache with 10-minute stale revalidation
- **Request IDs**: Every response includes a `requestId` for tracking

---

### `GET /api/films`

Retrieve film stock information with optional filtering and search.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `query` | string | Search term for film name or brand | `tri-x` |
| `fuzzy` | boolean | Enable fuzzy search | `true` \| `false` |
| `limit` | number | Maximum number of results | `5` |
| `colorType` | string | Filter by color type | `bw` \| `color` \| `slide` |
| `brand` | string | Filter by brand/manufacturer | `Kodak` |

#### Example Requests

**Get all films (first 2):**
```bash
curl "https://dorkroom.art/api/films?limit=2"
```

**Search for Kodak Tri-X:**
```bash
curl "https://dorkroom.art/api/films?query=tri-x&brand=Kodak"
```

**Get color films only:**
```bash
curl "https://dorkroom.art/api/films?colorType=color&limit=2"
```

**Fuzzy search (typo-tolerant):**
```bash
curl "https://dorkroom.art/api/films?query=velvi&fuzzy=true"
```

#### Example Response

```json
{
  "data": [
    {
      "id": 3,
      "uuid": "30c756e0-b62c-4fb1-a925-aacfbe7ae875",
      "slug": "arista-edu-ultra-200",
      "brand": "Arista",
      "name": "Edu Ultra 200",
      "color_type": "bw",
      "iso_speed": 200,
      "grain_structure": null,
      "description": "Arista's EDU Ultra 200 Black and White Negative Film is a traditional panchromatic film...",
      "manufacturer_notes": "{\"panchromatic b&w negative film\",\"fine grain and sharpness\",\"iso 200/24° in standard process\",\"designed for general use\",\"wide exposure latitude\"}",
      "reciprocity_failure": null,
      "discontinued": false,
      "static_image_url": "https://static.bhphoto.com/images/images500x500/arista_190362_edu_ultra_200_black_1452857041_1190990.jpg",
      "date_added": "2025-06-18T09:12:37.128",
      "created_at": "2025-06-19T06:21:11.321245",
      "updated_at": "2025-06-19T06:22:05.249969"
    },
    {
      "id": 5,
      "uuid": "c7857b8f-8a09-4137-8e55-117fb2f2ac31",
      "slug": "bergger-pancro-400",
      "brand": "Bergger",
      "name": "Pancro 400",
      "color_type": "bw",
      "iso_speed": 400,
      "grain_structure": null,
      "description": "Characterized by a unique dual emulsion design...",
      "discontinued": false
    }
  ]
}
```

---

### `GET /api/developers`

Retrieve developer chemistry information.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `query` | string | Search term for developer name | `D-76` |
| `fuzzy` | boolean | Enable fuzzy search | `true` \| `false` |
| `limit` | number | Maximum number of results | `5` |
| `type` | string | Filter by developer type | `concentrate` \| `powder` |
| `manufacturer` | string | Filter by manufacturer | `Kodak` |

#### Example Requests

**Get all developers (first 2):**
```bash
curl "https://dorkroom.art/api/developers?limit=2"
```

**Search for Kodak D-76:**
```bash
curl "https://dorkroom.art/api/developers?query=D-76&manufacturer=Kodak"
```

**Get Ilford developers:**
```bash
curl "https://dorkroom.art/api/developers?manufacturer=Ilford&limit=3"
```

**Get liquid concentrates:**
```bash
curl "https://dorkroom.art/api/developers?type=concentrate"
```

#### Example Response

```json
{
  "data": [
    {
      "id": 3,
      "uuid": "0fdf0997-e8e6-48ab-a610-3ec29f45062c",
      "slug": "ilford-dd-x",
      "name": "DD-X",
      "manufacturer": "Ilford",
      "type": "concentrate",
      "description": "Ilford ILFOTEC DD-X is a fine grain developer which gives full film speed...",
      "mixing_instructions": null,
      "storage_requirements": null,
      "safety_notes": null,
      "dilutions": [
        {
          "id": 1,
          "name": "1+4",
          "dilution": "1+4"
        },
        {
          "id": 2,
          "name": "1+10",
          "dilution": "1+10"
        },
        {
          "id": 3,
          "name": "1+19",
          "dilution": "1+19"
        }
      ],
      "created_at": "2025-06-19T06:22:10.149846",
      "updated_at": "2025-06-19T06:22:10.149846",
      "film_or_paper": true
    },
    {
      "id": 2,
      "uuid": "4b5fd524-b258-40cf-bec3-9d25c880d250",
      "slug": "kodak-d-76",
      "name": "D-76",
      "manufacturer": "Kodak",
      "type": "concentrate",
      "description": "Kodak Professional D-76 is a classic black and white film developer...",
      "dilutions": [
        {
          "id": 1,
          "name": "1+1",
          "dilution": "1+1"
        },
        {
          "id": 2,
          "name": "1+2",
          "dilution": "1+2"
        }
      ],
      "film_or_paper": true
    }
  ],
  "count": 24
}
```

---

### `GET /api/combinations`

Retrieve film + developer combinations with development recipes.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `film` | string | Filter by film stock slug | `ilford-hp5-plus` |
| `developer` | string | Filter by developer slug | `kodak-d76` |
| `query` | string | Search combinations | `tri-x` |
| `fuzzy` | boolean | Enable fuzzy search | `true` \| `false` |
| `limit` | number | Maximum number of results | `5` |
| `count` | number | Limit results per page | `20` |
| `page` | number | Page number for pagination | `2` |
| `id` | string | Get specific combination by ID | `179` |

#### Example Requests

**Get all combinations (first 2):**
```bash
curl "https://dorkroom.art/api/combinations?limit=2"
```

**Get combinations for Ilford HP5 Plus:**
```bash
curl "https://dorkroom.art/api/combinations?film=ilford-hp5-plus&limit=5"
```

**Get combinations for Kodak HC-110:**
```bash
curl "https://dorkroom.art/api/combinations?developer=kodak-hc-110&limit=3"
```

**Get specific combination:**
```bash
curl "https://dorkroom.art/api/combinations?id=179"
```

**Paginated results:**
```bash
curl "https://dorkroom.art/api/combinations?count=20&page=2"
```

#### Example Response

```json
{
  "data": [
    {
      "id": 179,
      "uuid": "baf74890-51fb-49da-8197-2ae6494d904e",
      "dilution_id": "1",
      "custom_dilution": null,
      "temperature_celsius": 20,
      "time_minutes": 9,
      "agitation_method": "Invert 4x in first 10 sec, then 4x in first 10 sec of each minute",
      "notes": null,
      "created_at": "2025-06-30T09:01:30.795313",
      "updated_at": "2025-07-01T00:42:13.049681",
      "film_stock": "ilford-fp4-plus",
      "developer": "tetenal-ultrafin-plus",
      "shooting_iso": 200,
      "name": "Ilford FP4 Plus @ 200 in Ultrafin Plus @ 1+4",
      "push_pull": 0.68,
      "tags": ["official-ilford"],
      "info_source": "https://www.ilfordphoto.com/amfile/file/download/file/1919/product/686/"
    },
    {
      "id": 178,
      "uuid": "19be6156-5934-4c8d-a8ca-173a466375e4",
      "dilution_id": "1",
      "temperature_celsius": 20,
      "time_minutes": 6,
      "agitation_method": "Invert 4x in first 10 sec, then 4x in first 10 sec of each minute",
      "film_stock": "ilford-fp4-plus",
      "developer": "tetenal-ultrafin-plus",
      "shooting_iso": 125,
      "name": "Ilford FP4 Plus @ 125 in Ultrafin Plus @ 1+4",
      "push_pull": 0,
      "tags": ["official-ilford"]
    }
  ]
}
```

---

### Response Format

All endpoints return JSON with consistent structure:

**Success Response:**
```json
{
  "data": [...],
  "count": 150  // Optional: total count
}
```

**Error Response:**
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "requestId": "abc123",
  "status": 500
}
```

### HTTP Methods

- `GET`: Retrieve data
- `OPTIONS`: CORS preflight (automatically handled)

All other methods return `405 Method Not Allowed`.

### CORS Support

All API endpoints support Cross-Origin Resource Sharing (CORS):

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
```

---

## TypeScript Client Package

The `@dorkroom/api` package provides a robust, typed TypeScript client with advanced features like fuzzy search, caching, and retry logic.

### Installation

```bash
bun add @dorkroom/api
# or
npm install @dorkroom/api
```

### Quick Start

```typescript
import { DorkroomClient } from '@dorkroom/api';

async function example() {
  // Create client instance
  const client = new DorkroomClient();

  // Load all data (required before using other methods)
  await client.loadAll();

  // Search for films
  const films = client.searchFilms('tri-x');

  // Fuzzy search for better results
  const fuzzyFilms = client.fuzzySearchFilms('trix', { limit: 5 });

  // Get specific film by ID
  const film = client.getFilm('kodak-tri-x-400');

  // Find development combinations for a film
  const combinations = client.getCombinationsForFilm('kodak-tri-x-400');
}
```

### Client Configuration

```typescript
interface DorkroomClientConfig {
  baseUrl?: string;        // API base URL (default: production API)
  timeout?: number;        // Request timeout in ms (default: 10000)
  maxRetries?: number;     // Max retry attempts (default: 3)
  logger?: Logger;         // Custom logger instance
}

const client = new DorkroomClient({
  baseUrl: 'https://dorkroom.art/api',
  timeout: 15000,
  maxRetries: 5,
});
```

### Client Methods

#### `loadAll(): Promise<void>`
Loads all data from the API. **Must be called before using other methods.**

#### `getFilm(filmId: string): Film | undefined`
Get a specific film by its ID.

#### `getDeveloper(developerId: string): Developer | undefined`
Get a specific developer by its ID.

#### `getAllFilms(): Film[]`
Get all films.

#### `getAllDevelopers(): Developer[]`
Get all developers.

#### `getAllCombinations(): Combination[]`
Get all development combinations.

#### `searchFilms(query: string, colorType?: string): Film[]`
Search films by name or brand with optional color type filter.

```typescript
const films = client.searchFilms('tri-x');
const colorFilms = client.searchFilms('portra', 'color');
```

#### `fuzzySearchFilms(query: string, options?: FuzzySearchOptions): Film[]`
Intelligent fuzzy search for films using Fuse.js.

```typescript
const films = client.fuzzySearchFilms('trix', {
  limit: 10,
  threshold: 0.6,  // 0.0 = perfect match, 1.0 = match anything
});
```

#### `getCombinationsForFilm(filmId: string): Combination[]`
Get all development combinations for a specific film.

#### `getCombinationsForDeveloper(developerId: string): Combination[]`
Get all development combinations for a specific developer.

### Features

- **TypeScript First**: Fully typed interfaces for all data structures
- **Promise-based**: Modern async/await API
- **Fuzzy Search**: Powered by Fuse.js for intelligent search capabilities
- **High Performance**: O(1) lookups via indexed Maps
- **Retry Logic**: Automatic retries with exponential backoff
- **Error Handling**: Comprehensive error types (see [Error Handling](#error-handling))

---

## Data Types

### Film

```typescript
interface Film {
  id: number;                      // Unique identifier
  uuid: string;                    // UUID
  slug: string;                    // URL-friendly identifier (e.g., "kodak-tri-x-400")
  brand: string;                   // Manufacturer/brand
  name: string;                    // Film name
  color_type: string;              // "bw" | "color" | "slide"
  iso_speed: number;               // ISO/ASA speed rating
  description?: string;            // Film description
  manufacturer_notes?: string;     // JSON string of notes from manufacturer
  grain_structure?: string;        // Grain characteristics
  reciprocity_failure?: string;    // Reciprocity failure information
  discontinued: boolean;           // Availability status
  static_image_url?: string;       // Product image URL
  date_added: string;              // ISO date string
  created_at: string;              // ISO date string
  updated_at: string;              // ISO date string
}
```

### Developer

```typescript
interface Developer {
  id: number;                      // Unique identifier
  uuid: string;                    // UUID
  slug: string;                    // URL-friendly identifier (e.g., "kodak-d76")
  name: string;                    // Developer name
  manufacturer: string;            // Manufacturer/brand
  type: string;                    // "concentrate" | "powder"
  description?: string;            // Developer description
  mixing_instructions?: string;    // How to mix the developer
  storage_requirements?: string;   // Storage information
  safety_notes?: string;           // Safety information
  dilutions: Dilution[];           // Available dilution ratios
  created_at: string;              // ISO date string
  updated_at: string;              // ISO date string
  film_or_paper: boolean;          // true = film, false = paper
}

interface Dilution {
  id: number;
  name: string;                    // e.g., "1+4", "Stock"
  dilution: string;                // Dilution ratio
}
```

### Combination

```typescript
interface Combination {
  id: number;                      // Unique identifier
  uuid: string;                    // UUID
  film_stock: string;              // Film slug (foreign key)
  developer: string;               // Developer slug (foreign key)
  dilution_id: string;             // Reference to Dilution.id
  custom_dilution?: string;        // Custom dilution if not standard
  temperature_celsius: number;     // Development temperature in Celsius
  time_minutes: number;            // Development time in minutes
  shooting_iso: number;            // ISO the film was shot at
  name: string;                    // Combination name
  push_pull: number;               // Stops pushed (+) or pulled (-)
  agitation_method?: string;       // Agitation instructions
  notes?: string;                  // Development notes
  tags?: string[];                 // Tags like ["official-ilford"]
  info_source?: string;            // Source URL
  created_at: string;              // ISO date string
  updated_at: string;              // ISO date string
}
```

---

## Error Handling

### TypeScript Client Errors

The client provides specific error types for different failure scenarios:

```typescript
import {
  DorkroomAPIError,      // Base error class
  DataFetchError,        // Network/fetch errors
  DataParseError,        // JSON parsing errors
  DataNotLoadedError     // Attempted to use data before loadAll()
} from '@dorkroom/api';

try {
  await client.loadAll();
} catch (error) {
  if (error instanceof DataFetchError) {
    console.error('Network error:', error.message);
  } else if (error instanceof DataParseError) {
    console.error('Invalid JSON:', error.message);
  } else if (error instanceof DataNotLoadedError) {
    console.error('Must call loadAll() first');
  }
}
```

### REST API Error Codes

| Status Code | Error Type | Description |
|------------|------------|-------------|
| `200` | Success | Request completed successfully |
| `405` | Method Not Allowed | Only GET and OPTIONS are allowed |
| `500` | Internal Server Error | Server configuration or internal error |
| `502` | Bad Gateway | Invalid response from upstream API |
| `504` | Gateway Timeout | Request timed out (30s timeout) |

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "requestId": "abc123",
  "status": 500,
  "details": {}  // Optional additional error details
}
```

### Common Error Scenarios

**Missing Environment Variables:**
```json
{
  "error": "API configuration error",
  "message": "Missing required environment configuration",
  "requestId": "xyz789"
}
```

**Request Timeout:**
```json
{
  "error": "Request timeout",
  "message": "Request timed out after 30000ms",
  "requestId": "xyz789"
}
```

**Network Error:**
```json
{
  "error": "Network error",
  "message": "Could not connect to upstream API",
  "requestId": "xyz789"
}
```

---

## Rate Limiting & Caching

### Client-Side Caching

The TypeScript client implements intelligent caching:

- Data is cached after the initial `loadAll()` call
- No automatic refresh (call `loadAll()` again to refresh)
- All lookups use in-memory indexed Maps for O(1) performance

### Server-Side Caching

REST API endpoints implement HTTP caching:

```
Cache-Control: public, max-age=300, stale-while-revalidate=600
```

- **max-age=300**: Response is fresh for 5 minutes
- **stale-while-revalidate=600**: Can serve stale data for 10 minutes while revalidating

### Rate Limiting

The API uses Supabase's master API key which provides:

- High rate limits suitable for production use
- No per-user authentication required for read operations
- Server-side authentication only (key never exposed to clients)

**Note:** The master API key is only used server-side in Vercel functions and should never be exposed to client applications.

---

## Environment Variables

### Required for API Endpoints

```bash
# Supabase configuration
SUPABASE_ENDPOINT=https://your-project.supabase.co
SUPABASE_MASTER_API_KEY=your_service_role_key
```

### Security Notes

- **Never commit** environment variables to version control
- Use `.env.local` for local development
- Configure environment variables in Vercel dashboard for production
- The master API key provides admin access - keep it secure
- Read-only operations are safe with the master key (GET only)

---

## Complete Examples

### REST API Example (JavaScript)

```javascript
// Fetch and display film development data
async function getFilmRecipes(filmName) {
  try {
    // Search for film
    const filmsResponse = await fetch(
      `https://dorkroom.art/api/films?query=${encodeURIComponent(filmName)}&limit=1`
    );
    const filmsData = await filmsResponse.json();

    if (filmsData.data.length === 0) {
      console.log('Film not found');
      return;
    }

    const film = filmsData.data[0];
    console.log(`Found: ${film.brand} ${film.name}`);

    // Get development combinations using the slug
    const combosResponse = await fetch(
      `https://dorkroom.art/api/combinations?film=${film.slug}&limit=5`
    );
    const combosData = await combosResponse.json();

    console.log(`\nDevelopment options: ${combosData.data.length}`);

    // Show each recipe
    for (const combo of combosData.data) {
      console.log(`\n${combo.name}`);
      console.log(`${combo.temperature_celsius}°C for ${combo.time_minutes} min`);
      console.log(`Agitation: ${combo.agitation_method}`);
      console.log(`Push/Pull: ${combo.push_pull > 0 ? '+' : ''}${combo.push_pull} stops`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Usage
getFilmRecipes('HP5');
```

### TypeScript Client Example

```typescript
import { DorkroomClient } from '@dorkroom/api';

async function findDevelopmentRecipe() {
  const client = new DorkroomClient();

  try {
    // Load all data
    await client.loadAll();

    // Find HP5 Plus
    const films = client.fuzzySearchFilms('hp5 plus', { limit: 1 });
    if (films.length === 0) {
      console.log('Film not found');
      return;
    }

    const hp5 = films[0];
    console.log(`Found: ${hp5.brand} ${hp5.name}`);

    // Get development options
    const combinations = client.getCombinationsForFilm(hp5.slug);
    console.log(`\nDevelopment options: ${combinations.length}`);

    // Show first 5 recipes
    combinations.slice(0, 5).forEach(recipe => {
      const developer = client.getDeveloper(recipe.developer);

      console.log(`\nRecipe: ${recipe.name}`);
      console.log(`Developer: ${developer?.name}`);
      console.log(`Temperature: ${recipe.temperature_celsius}°C`);
      console.log(`Time: ${recipe.time_minutes} minutes`);
      console.log(`Agitation: ${recipe.agitation_method}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

findDevelopmentRecipe();
```

### Testing with cURL

```bash
# Test films endpoint
curl -v "https://dorkroom.art/api/films?limit=1"

# Test with query parameters
curl -v "https://dorkroom.art/api/films?query=tri-x&limit=5"

# Test developers endpoint
curl -v "https://dorkroom.art/api/developers?manufacturer=Kodak"

# Test combinations endpoint
curl -v "https://dorkroom.art/api/combinations?film=ilford-hp5-plus&limit=3"

# Test with multiple filters
curl -v "https://dorkroom.art/api/films?colorType=bw&brand=Ilford&limit=10"
```

---

## Support

For API issues, questions, or feature requests:

- **GitHub Issues**: [https://github.com/narrowstacks/dorkroom/issues](https://github.com/narrowstacks/dorkroom/issues)
- **Documentation**: This file and [api/dorkroom/README.md](api/dorkroom/README.md)
- **Source Code**: See `api/` directory for endpoint implementations

---

**Made with ❤️ for the analog photography community**
