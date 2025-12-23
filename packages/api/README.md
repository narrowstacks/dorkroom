# @dorkroom/api

API client and type definitions for the Dorkroom analog photography calculator.

## Overview

This package provides a complete API client for interacting with the Dorkroom API, including:

- **Type definitions** for all API entities (Film, Developer, Combination)
- **API client** with built-in data transformation and error handling
- **Convenience functions** for easy integration with TanStack Query

## Installation

```bash
npm install @dorkroom/api
```

## Usage

### Basic Usage (External Developers)

Perfect for external developers who want to access the Dorkroom API:

```typescript
import { apiClient, Film, Developer, Combination } from '@dorkroom/api';

// Fetch all films
const films = await apiClient.fetchFilms();

// Fetch all developers
const developers = await apiClient.fetchDevelopers();

// Fetch all combinations
const combinations = await apiClient.fetchCombinations();

console.log(`Found ${films.length} films, ${developers.length} developers, ${combinations.length} combinations`);
```

### Convenience Functions

Simple functions for quick API access:

```typescript
import { fetchFilms, fetchDevelopers, fetchCombinations } from '@dorkroom/api';

// With abort signal for cancellation
const controller = new AbortController();
const films = await fetchFilms({ signal: controller.signal });

// Without options
const developers = await fetchDevelopers();
const combinations = await fetchCombinations();
```

### With TanStack Query

For React projects using TanStack Query:

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchFilmsForQuery, fetchDevelopersForQuery, fetchCombinationsForQuery } from '@dorkroom/api';

function useFilms() {
  return useQuery({
    queryKey: ['films'],
    queryFn: fetchFilmsForQuery,
  });
}

function useDevelopers() {
  return useQuery({
    queryKey: ['developers'],
    queryFn: fetchDevelopersForQuery,
  });
}

function useCombinations() {
  return useQuery({
    queryKey: ['combinations'],
    queryFn: fetchCombinationsForQuery,
  });
}
```

### Custom API Client

By default, the client uses the production Dorkroom API at `https://dorkroom.art/api`. You can create a client with a custom base URL:

```typescript
import { DorkroomApiClient, DEFAULT_BASE_URL } from '@dorkroom/api';

// Default client uses production API
const client = new DorkroomApiClient();

// For staging environment
const stagingClient = new DorkroomApiClient('https://staging.dorkroom.art/api');

// For local development
const localClient = new DorkroomApiClient('http://localhost:3001/api');

// Reference the default URL if needed
console.log(DEFAULT_BASE_URL); // 'https://dorkroom.art/api'

const stagingFilms = await stagingClient.fetchFilms();
const localFilms = await localClient.fetchFilms();
```

## API Types

### Film

```typescript
interface Film {
  id: number;
  uuid: string;
  slug: string;
  brand: string;
  name: string;
  colorType: 'color' | 'black_and_white';
  isoSpeed: number;
  grainStructure: string;
  description: string | null;
  manufacturerNotes: string | null;
  reciprocityFailure: string | null;
  discontinued: boolean;
  staticImageUrl: string | null;
  dateAdded: string;
  createdAt: string;
  updatedAt: string;
}
```

### Developer

```typescript
interface Developer {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  manufacturer: string;
  type: string;
  description: string | null;
  filmOrPaper: 'film' | 'paper' | 'both';
  dilutions: Dilution[];
  mixingInstructions: string | null;
  storageRequirements: string | null;
  safetyNotes: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Dilution {
  id: string;
  name: string;
  dilution: string;
}
```

### Combination

```typescript
interface Combination {
  id: number;
  uuid: string;
  name: string;
  filmStockId: string;
  filmSlug: string;
  developerId: string;
  developerSlug: string;
  shootingIso: number;
  dilutionId: string | null;
  customDilution: string | null;
  temperatureC: number;
  temperatureF: number;
  timeMinutes: number;
  agitationMethod: string;
  agitationSchedule: string | null;
  pushPull: number;
  tags: string[] | null;
  notes: string | null;
  infoSource: string;
  createdAt: string;
  updatedAt: string;
}
```

## Data Transformation

The API client automatically transforms raw API responses from snake_case to camelCase format:

- `color_type` → `colorType`
- `iso_speed` → `isoSpeed`
- `film_or_paper` → `filmOrPaper`
- `temperature_celsius` → `temperatureC` (with calculated `temperatureF`)

## Error Handling

The API client throws descriptive errors for:

- Network failures
- HTTP error responses
- Invalid response data

```typescript
try {
  const films = await apiClient.fetchFilms();
} catch (error) {
  console.error('Failed to fetch films:', error.message);
}
```

## TanStack Query Integration

The convenience functions (`fetchFilms`, `fetchDevelopers`, `fetchCombinations`) are designed to work seamlessly with TanStack Query's `QueryFunctionContext`:

```typescript
import type { QueryFunctionContext } from '@tanstack/react-query';

// Automatic signal handling for request cancellation
export const fetchFilms = async (context?: QueryFunctionContext) => {
  const response = await fetch(`${BASE_URL}/films`, {
    signal: context?.signal,
  });
  // ... rest of implementation
};
```

## Development

### Building

```bash
turbo run build --filter=@dorkroom/api
```

### Testing

```bash
turbo run test --filter=@dorkroom/api
```

### Type Checking

```bash
turbo run typecheck --filter=@dorkroom/api
```

## Architecture

This package follows a clean architecture pattern:

- **Types**: Pure TypeScript interfaces for API entities
- **Client**: Encapsulated API communication with transformation logic
- **Convenience Functions**: Simple exports for common use cases

The API client is self-contained and can be used independently of the rest of the Dorkroom ecosystem, making it suitable for:

- Server-side applications
- Standalone utilities
- Integration with other frameworks
