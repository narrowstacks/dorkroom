# Dorkroom API

Public REST API for querying analog photography film stocks, developers, and development recipes.

**Base URL:** `https://api.dorkroom.art`

## Authentication

Every request requires an API key sent via the `X-API-Key` header:

```
X-API-Key: dk_...
```

To request an API key, email [aaron+dorkroom@affords.art](mailto:aaron+dorkroom@affords.art) with your use case.

All endpoints are **GET only**.

## Rate Limits

Per-key rate limits are configured when your key is issued (e.g. 60/min free, 300/min standard).

Every response includes rate limit headers:

| Header | Description |
| --- | --- |
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp (seconds) when the window resets |
| `Retry-After` | Seconds until retry is allowed (only on `429`) |

## Common Error Responses

All error responses include a `requestId` for debugging.

| Status | Error | Cause |
| --- | --- | --- |
| `401` | `Unauthorized` | Missing or invalid API key |
| `405` | `Method Not Allowed` | Non-GET request |
| `429` | `Rate limit exceeded` | Too many requests |
| `500` | `Internal server error` | Unexpected server failure |
| `502` | `External API error` | Upstream service returned an error |
| `504` | `Request timeout` | Upstream did not respond within 30s |

Error body shape:

```json
{
  "error": "Rate limit exceeded",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Some errors include an additional `message` field with details.

---

## Endpoints

### GET /films

Search and filter the film stock database.

#### Query Parameters

All parameters are optional.

| Parameter | Type | Description |
| --- | --- | --- |
| `query` | string | Exact search term (max 200 chars) |
| `fuzzy` | string | Fuzzy search term (max 200 chars) |
| `limit` | integer | Max results to return (1-1000) |
| `colorType` | string | Filter by type: `bw`, `color`, or `slide` |
| `brand` | string | Filter by brand name (max 200 chars) |
| `slug` | string | Look up a specific film by slug (max 200 chars) |

#### Example

```bash
curl -H "X-API-Key: dk_..." \
  "https://api.dorkroom.art/films?query=portra&limit=2"
```

#### Response

```json
{
  "count": 3,
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "kodak-portra-160",
      "brand": "Kodak",
      "name": "Portra 160",
      "color_type": "color",
      "iso_speed": 160,
      "grain_structure": "very fine",
      "description": "Professional color negative film...",
      "manufacturer_notes": "{\"Push processing not recommended\"}",
      "reciprocity_failure": "1.3",
      "discontinued": false,
      "static_image_url": "https://...",
      "date_added": "2024-01-15",
      "created_at": "2024-01-15T00:00:00Z",
      "updated_at": "2024-06-01T00:00:00Z"
    }
  ]
}
```

#### Film Object

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | Internal ID |
| `uuid` | string | UUID |
| `slug` | string | URL-safe identifier (e.g. `kodak-portra-160`) |
| `brand` | string | Manufacturer name |
| `name` | string | Film name (without brand prefix) |
| `color_type` | string | `bw`, `color`, or `slide` |
| `iso_speed` | integer | Box speed ISO |
| `grain_structure` | string \| null | Grain description (e.g. `very fine`, `fine`, `medium`) |
| `description` | string | Full-text description |
| `manufacturer_notes` | string \| null | PostgreSQL array string of notes |
| `reciprocity_failure` | string \| null | Reciprocity correction exponent |
| `discontinued` | boolean | Whether the film is discontinued |
| `static_image_url` | string \| null | Sample image URL |
| `date_added` | string | Date added (YYYY-MM-DD) |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |

---

### GET /developers

Search and filter the developer (chemistry) database.

#### Query Parameters

All parameters are optional.

| Parameter | Type | Description |
| --- | --- | --- |
| `query` | string | Exact search term (max 200 chars) |
| `fuzzy` | string | Fuzzy search term (max 200 chars) |
| `limit` | integer | Max results to return (1-1000) |
| `type` | string | Filter by developer type (max 200 chars) |
| `manufacturer` | string | Filter by manufacturer (max 200 chars) |
| `slug` | string | Look up a specific developer by slug (max 200 chars) |

#### Example

```bash
curl -H "X-API-Key: dk_..." \
  "https://api.dorkroom.art/developers?query=rodinal&limit=1"
```

#### Response

```json
{
  "count": 1,
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "agfa-rodinal",
      "name": "Rodinal",
      "manufacturer": "Agfa",
      "type": "concentrate",
      "description": "One of the oldest photographic developers...",
      "film_or_paper": true,
      "dilutions": [
        { "id": 1, "name": "1+25", "dilution": "1:25" },
        { "id": 2, "name": "1+50", "dilution": "1:50" }
      ],
      "mixing_instructions": null,
      "storage_requirements": null,
      "safety_notes": null,
      "created_at": "2024-01-15T00:00:00Z",
      "updated_at": "2024-06-01T00:00:00Z"
    }
  ]
}
```

#### Developer Object

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | Internal ID |
| `uuid` | string | UUID |
| `slug` | string | URL-safe identifier (e.g. `agfa-rodinal`) |
| `name` | string | Developer name |
| `manufacturer` | string | Manufacturer name |
| `type` | string | Developer type (e.g. `concentrate`, `powder`) |
| `description` | string | Full-text description |
| `film_or_paper` | boolean | `true` for film developer, `false` for paper |
| `dilutions` | array | Available dilution ratios (see below) |
| `mixing_instructions` | string \| null | Mixing instructions |
| `storage_requirements` | string \| null | Storage guidance |
| `safety_notes` | string \| null | Safety information |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |

#### Dilution Object

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer \| string | Dilution ID |
| `name` | string | Display name (e.g. `1+25`) |
| `dilution` | string | Dilution ratio (e.g. `1:25`) |

---

### GET /combinations

Search for film + developer development recipes.

#### Query Parameters

All parameters are optional. Use `film` and `developer` (slug values) to find recipes for a specific pairing.

| Parameter | Type | Description |
| --- | --- | --- |
| `film` | string | Film slug (max 200 chars) |
| `developer` | string | Developer slug (max 200 chars) |
| `query` | string | Exact search term (max 200 chars) |
| `fuzzy` | string | Fuzzy search term (max 200 chars) |
| `limit` | integer | Max results to return (1-1000) |
| `count` | integer | Alias for limit (1-1000) |
| `page` | integer | Page number (>= 1) |
| `id` | string | Look up a specific combination by ID (max 200 chars) |

#### Example

```bash
curl -H "X-API-Key: dk_..." \
  "https://api.dorkroom.art/combinations?film=kodak-tri-x-400&developer=kodak-xtol&limit=2"
```

#### Response

```json
{
  "count": 5,
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "name": null,
      "film_stock": "kodak-tri-x-400",
      "developer": "kodak-xtol",
      "shooting_iso": 400,
      "dilution_id": "2",
      "custom_dilution": null,
      "temperature_celsius": 24,
      "time_minutes": 7.25,
      "agitation_method": null,
      "push_pull": 0,
      "tags": ["official-kodak"],
      "notes": null,
      "info_source": null,
      "created_at": "2024-01-15T00:00:00Z",
      "updated_at": "2024-06-01T00:00:00Z"
    }
  ]
}
```

#### Combination Object

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | Internal ID |
| `uuid` | string | UUID |
| `name` | string \| null | Optional recipe name |
| `film_stock` | string | Film slug |
| `developer` | string | Developer slug |
| `shooting_iso` | integer | ISO the film was shot at |
| `dilution_id` | string \| null | References a dilution from the developer's `dilutions` array |
| `custom_dilution` | string \| null | Free-text dilution if not using a standard one |
| `temperature_celsius` | number | Development temperature in Celsius |
| `time_minutes` | number | Development time in minutes (decimal) |
| `agitation_method` | string \| null | Agitation description |
| `push_pull` | integer \| null | Push/pull stops (0 = box speed, +1 = one stop push, etc.) |
| `tags` | string[] \| null | Tags (e.g. `official-kodak`, `user-submitted`) |
| `notes` | string \| null | Additional notes |
| `info_source` | string \| null | Where this recipe came from |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |

---

### GET /filmdev

Proxy to [filmdev.org](https://filmdev.org) recipe detail endpoint.

#### Query Parameters

| Parameter | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | Recipe ID (positive integer, digits only, max 10,000,000) |

#### Example

```bash
curl -H "X-API-Key: dk_..." \
  "https://api.dorkroom.art/filmdev?id=12345"
```

#### Response

```json
{
  "recipe": {
    "id": 12345,
    "recipe_name": "Kodak Tri-X 400 in Agfa Rodinal 1:50",
    "film": "Kodak Tri-X 400",
    "developer": "Agfa Rodinal",
    "dilution_ratio": "1:50",
    "celcius": "20.0",
    "fahrenheit": "68.0",
    "duration_hours": 0,
    "duration_minutes": 13,
    "duration_seconds": 0,
    "notes": "Stand development with minimal agitation",
    "created": "2020-01-15",
    "user": "darkroomist",
    "recipe_link": "https://filmdev.org/recipe/show/12345",
    "profile_link": "https://filmdev.org/profile/darkroomist",
    "photos_link": "https://filmdev.org/recipe/show/12345/photos",
    "format": "MF",
    "developed_at": 400
  }
}
```

#### Recipe Object

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | filmdev.org recipe ID |
| `recipe_name` | string | Full recipe title |
| `film` | string | Film name |
| `developer` | string | Developer name |
| `dilution_ratio` | string | Dilution (e.g. `1:50`) |
| `celcius` | string | Temperature in Celsius |
| `fahrenheit` | string | Temperature in Fahrenheit |
| `duration_hours` | integer | Hours portion of development time |
| `duration_minutes` | integer | Minutes portion of development time |
| `duration_seconds` | integer | Seconds portion of development time |
| `notes` | string | User notes |
| `created` | string | Date created (YYYY-MM-DD) |
| `user` | string | filmdev.org username |
| `recipe_link` | string | Link to recipe on filmdev.org |
| `profile_link` | string | Link to user profile on filmdev.org |
| `photos_link` | string | Link to recipe photos on filmdev.org |
| `format` | string \| null | Film format (e.g. `35mm`, `MF`, `LF`) |
| `developed_at` | integer \| null | ISO the film was actually developed at |

#### Errors

| Status | Error | Cause |
| --- | --- | --- |
| `400` | `Invalid recipe ID` | Missing `id` or not a positive integer |
| `404` | `Recipe not found` | No recipe with that ID exists on filmdev.org |

---

## Caching

Responses from `api.dorkroom.art` are not cached (`private, no-store`) to ensure API key consumers always get fresh data.

Internal app requests to `dorkroom.art/api/*` use server-side caching:

| Endpoint | Cache TTL | Stale-While-Revalidate |
| --- | --- | --- |
| `/films`, `/developers`, `/combinations` | 5 minutes | 10 minutes |
| `/filmdev` | 1 hour | 2 hours |

## CORS

The public API (`api.dorkroom.art`) sets permissive CORS headers:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-API-Key`
- `Access-Control-Max-Age: 86400`

Preflight `OPTIONS` requests return `200` immediately.
