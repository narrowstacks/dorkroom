# Dorkroom API Client

A robust, typed TypeScript client for the [Dorkroom Static API](https://github.com/narrowstacks/dorkroom-static-api). This client provides easy access to film stocks, developers, and development combinations with advanced features like fuzzy search, caching, and retry logic.

## Features

- **TypeScript First**: Fully typed interfaces for all data structures
- **Promise-based**: Modern async/await API
- **Fuzzy Search**: Powered by Fuse.js for intelligent search capabilities
- **High Performance**: O(1) lookups via indexed Maps
- **Retry Logic**: Automatic retries with exponential backoff
- **Configurable**: Customizable timeouts, retries, and base URLs
- **Testable**: Dependency injection for easy mocking
- **Error Handling**: Comprehensive error types for different failure scenarios

## Installation

The client uses `fuse.js` for fuzzy search functionality. This dependency should already be installed if you're using this client in the DorkroomReact project.

## Quick Start

```typescript
import { DorkroomClient } from '@/api/dorkroom';

async function example() {
  // Create client instance
  const client = new DorkroomClient();

  // Load all data (required before using other methods)
  await client.loadAll();

  // Search for films
  const films = client.searchFilms('tri-x');
  debugLog(films);

  // Fuzzy search for better results
  const fuzzyFilms = client.fuzzySearchFilms('trix', { limit: 5 });
  debugLog(fuzzyFilms);

  // Get specific film by ID
  const film = client.getFilm('kodak-tri-x-400');
  if (film) {
    debugLog(`${film.brand} ${film.name} - ISO ${film.iso_speed}`);
  }

  // Find development combinations for a film
  const combinations = client.getCombinationsForFilm('kodak-tri-x-400');
  debugLog(`Found ${combinations.length} development combinations`);
}
```

## Configuration

```typescript
import { DorkroomClient, ConsoleLogger } from '@/api/dorkroom';

const client = new DorkroomClient({
  baseUrl: 'https://custom-api-endpoint.com/', // Optional custom API endpoint
  timeout: 15000, // 15 second timeout (default: 10000)
  maxRetries: 5, // Max retry attempts (default: 3)
  logger: new ConsoleLogger(), // Custom logger (optional)
});
```

## API Reference

### DorkroomClient

#### Constructor Options

```typescript
interface DorkroomClientConfig {
  baseUrl?: string; // API base URL
  timeout?: number; // Request timeout in milliseconds
  maxRetries?: number; // Maximum retry attempts
  logger?: Logger; // Custom logger instance
}
```

#### Methods

##### `loadAll(): Promise<void>`

Loads all data from the API. **Must be called before using other methods.**

```typescript
await client.loadAll();
```

##### `getFilm(filmId: string): Film | undefined`

Get a specific film by its ID.

```typescript
const film = client.getFilm('kodak-tri-x-400');
```

##### `getDeveloper(developerId: string): Developer | undefined`

Get a specific developer by its ID.

```typescript
const developer = client.getDeveloper('kodak-d76');
```

##### `searchFilms(query: string, colorType?: string): Film[]`

Search films by name or brand with optional color type filter.

```typescript
const films = client.searchFilms('tri-x');
const colorFilms = client.searchFilms('portra', 'Color');
```

##### `fuzzySearchFilms(query: string, options?: FuzzySearchOptions): Film[]`

Intelligent fuzzy search for films.

```typescript
const films = client.fuzzySearchFilms('trix', {
  limit: 10,
  threshold: 0.6,
});
```

##### `getCombinationsForFilm(filmId: string): Combination[]`

Get all development combinations for a specific film.

```typescript
const combinations = client.getCombinationsForFilm('kodak-tri-x-400');
```

##### `getCombinationsForDeveloper(developerId: string): Combination[]`

Get all development combinations for a specific developer.

```typescript
const combinations = client.getCombinationsForDeveloper('kodak-d76');
```

### Data Types

#### Film

```typescript
interface Film {
  id: string;
  name: string;
  brand: string;
  iso_speed: number;
  color_type: string;
  description?: string;
  discontinued: number;
  manufacturer_notes: string[];
  grain_structure?: string;
  reciprocity_failure?: string;
}
```

#### Developer

```typescript
interface Developer {
  id: string;
  name: string;
  manufacturer: string;
  type: string;
  film_or_paper: string;
  dilutions: Dilution[];
  working_life_hours?: number;
  stock_life_months?: number;
  notes?: string;
  discontinued: number;
  mixing_instructions?: string;
  safety_notes?: string;
  datasheet_url?: string[];
}
```

#### Combination

```typescript
interface Combination {
  id: string;
  name: string;
  film_stock_id: string;
  developer_id: string;
  temperature_f: number;
  time_minutes: number;
  shooting_iso: number;
  push_pull: number;
  agitation_schedule?: string;
  notes?: string;
  dilution_id?: number;
  custom_dilution?: string;
}
```

### Error Handling

The client provides specific error types for different failure scenarios:

```typescript
import { DorkroomAPIError, DataFetchError, DataParseError, DataNotLoadedError } from '@/api/dorkroom';

try {
  await client.loadAll();
} catch (error) {
  if (error instanceof DataFetchError) {
    console.error('Network error:', error.message);
  } else if (error instanceof DataParseError) {
    console.error('Invalid JSON response:', error.message);
  } else if (error instanceof DataNotLoadedError) {
    console.error('Must call loadAll() first:', error.message);
  }
}
```

### Testing

The client supports dependency injection for easy testing:

```typescript
import { DorkroomClient, HTTPTransport } from '@/api/dorkroom';

// Mock transport for testing
class MockTransport implements HTTPTransport {
  async get(url: string): Promise<Response> {
    return new Response(JSON.stringify(mockData));
  }
}

// Inject mock transport
const client = new DorkroomClient({
  transport: new MockTransport(),
});
```

## Performance Notes

- The client builds indexes for O(1) lookups by ID
- Fuzzy search is powered by Fuse.js for optimal performance
- All API calls are cached after the initial `loadAll()` call
- Use fuzzy search sparingly for best performance

## Contributing

This client is part of the DorkroomReact project. When making changes:

1. Follow the existing TypeScript patterns
2. Update tests when adding new functionality
3. Maintain backward compatibility
4. Update this documentation for API changes
