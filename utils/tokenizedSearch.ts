import type { Film, Developer } from '../api/dorkroom/types';

/**
 * Configuration for tokenized search scoring
 */
export interface TokenizedSearchConfig {
  /** Minimum token score threshold (0-1) to include result */
  minTokenScore: number;
  /** Minimum percentage of query tokens that must match (0-1) */
  minTokenCoverage: number;
  /** Weight for exact token matches */
  exactMatchWeight: number;
  /** Weight for partial token matches */
  partialMatchWeight: number;
  /** Weight for matches at the beginning of fields */
  startPositionWeight: number;
  /** Weight for preserved token order */
  orderPreservationWeight: number;
}

/**
 * Default configuration for tokenized search
 */
export const DEFAULT_TOKENIZED_CONFIG: TokenizedSearchConfig = {
  minTokenScore: 0.4, // Increased from 0.2 - be more strict
  minTokenCoverage: 0.7, // Require 70% of query tokens to match
  exactMatchWeight: 1.0,
  partialMatchWeight: 0.4, // Reduced from 0.6 - prioritize exact matches
  startPositionWeight: 1.8, // Increased from 1.5 - heavily favor matches at start
  orderPreservationWeight: 0.3,
};

/**
 * Result with both fuzzy and token scores
 */
export interface ScoredResult<T> {
  item: T;
  fuzzyScore?: number;
  tokenScore: number;
  combinedScore: number;
  matchedTokens: string[];
}

/**
 * Convert an input string into meaningful lowercase tokens for search.
 *
 * Splits on whitespace, hyphens, and common punctuation; removes empty tokens,
 * very short tokens, and common stop words (e.g., "the", "and", "of").
 *
 * @param text - The input string to tokenize; if falsy, an empty array is returned
 * @returns An array of lowercase tokens; returns an empty array if `text` is falsy or yields no tokens
 */
export function extractTokens(text: string): string[] {
  if (!text) return [];

  return (
    text
      .toLowerCase()
      .trim()
      // Split on whitespace, hyphens, and common punctuation
      .split(/[\s\-_.,;:()[\]{}\/\\]+/)
      // Remove empty strings and very short tokens
      .filter((token) => token.length > 0)
      // Remove common stop words that don't add search value
      .filter(
        (token) =>
          ![
            'the',
            'and',
            'or',
            'a',
            'an',
            'of',
            'in',
            'on',
            'at',
            'to',
            'for',
            'with',
          ].includes(token)
      )
  );
}

/**
 * Compute a normalized, field-weighted token similarity score between query tokens and a target text.
 *
 * The returned score accounts for exact matches, partial/token substring matches, start-position bonuses,
 * and order-preservation bonuses as configured. Tokens that matched are listed in `matchedTokens`.
 *
 * @param queryTokens - Query tokens extracted from the user's input
 * @param targetText - The text to match against
 * @param fieldWeight - Multiplier applied to the normalized token score for the field (default: 1.0)
 * @param config - Tokenized search configuration controlling weights and thresholds
 * @returns An object with `score` (the normalized, field-weighted token score) and `matchedTokens` (query tokens that matched)
 */
export function calculateTokenScore(
  queryTokens: string[],
  targetText: string,
  fieldWeight: number = 1.0,
  config: TokenizedSearchConfig = DEFAULT_TOKENIZED_CONFIG
): { score: number; matchedTokens: string[] } {
  if (queryTokens.length === 0 || !targetText) {
    return { score: 0, matchedTokens: [] };
  }

  const targetTokens = extractTokens(targetText);
  const targetLower = targetText.toLowerCase();
  const matchedTokens: string[] = [];
  let totalScore = 0;

  for (let i = 0; i < queryTokens.length; i++) {
    const queryToken = queryTokens[i];
    let bestTokenScore = 0;
    let tokenMatched = false;

    // Check for exact token matches
    for (let j = 0; j < targetTokens.length; j++) {
      const targetToken = targetTokens[j];

      if (targetToken === queryToken) {
        // Exact match
        let score = config.exactMatchWeight;

        // Bonus for matches at the beginning
        if (j === 0) {
          score *= config.startPositionWeight;
        }

        // Bonus for preserved order
        if (i === j) {
          score += config.orderPreservationWeight;
        }

        bestTokenScore = Math.max(bestTokenScore, score);
        tokenMatched = true;
      } else if (
        targetToken.includes(queryToken) ||
        queryToken.includes(targetToken)
      ) {
        // Partial match
        const similarity =
          Math.min(queryToken.length, targetToken.length) /
          Math.max(queryToken.length, targetToken.length);
        let score = config.partialMatchWeight * similarity;

        // Bonus for matches at the beginning
        if (j === 0) {
          score *= config.startPositionWeight;
        }

        bestTokenScore = Math.max(bestTokenScore, score);
        tokenMatched = true;
      }
    }

    // Also check for substring matches in the original text
    if (!tokenMatched && targetLower.includes(queryToken)) {
      const position = targetLower.indexOf(queryToken);
      let score = config.partialMatchWeight * 0.8; // Slightly lower than token matches

      // Bonus for matches at the very beginning of the text
      if (position === 0) {
        score *= config.startPositionWeight;
      }

      bestTokenScore = Math.max(bestTokenScore, score);
      tokenMatched = true;
    }

    if (tokenMatched) {
      matchedTokens.push(queryToken);
      totalScore += bestTokenScore;
    }
  }

  // Normalize score by query length and apply field weight
  const normalizedScore = (totalScore / queryTokens.length) * fieldWeight;

  return {
    score: normalizedScore, // Don't cap at 1.0 to allow position bonuses to have effect
    matchedTokens,
  };
}

/**
 * Compute a combined token similarity score for a Film using weighted field contributions.
 *
 * The function evaluates `queryTokens` against the film's `name`, `brand`, and `description`,
 * applies per-field weights, and aggregates matched query tokens across fields.
 *
 * @param queryTokens - Tokens extracted from the search query to match against film fields
 * @param film - Film entity whose `name`, `brand`, and `description` are scored
 * @param config - Optional tokenized search configuration (thresholds and weights) to override defaults
 * @returns An object with `score` equal to the sum of weighted field scores and `matchedTokens` containing unique query tokens that matched any field
 */
export function calculateFilmTokenScore(
  queryTokens: string[],
  film: Film,
  config: TokenizedSearchConfig = DEFAULT_TOKENIZED_CONFIG
): { score: number; matchedTokens: string[] } {
  const nameResult = calculateTokenScore(queryTokens, film.name, 0.7, config);
  const brandResult = calculateTokenScore(queryTokens, film.brand, 0.5, config);
  const descResult = calculateTokenScore(
    queryTokens,
    film.description || '',
    0.3,
    config
  );

  const combinedScore = nameResult.score + brandResult.score + descResult.score;
  const allMatchedTokens = Array.from(
    new Set([
      ...nameResult.matchedTokens,
      ...brandResult.matchedTokens,
      ...descResult.matchedTokens,
    ])
  );

  return {
    score: combinedScore, // Don't cap to allow field weight differences to show
    matchedTokens: allMatchedTokens,
  };
}

/**
 * Compute a combined token-based relevance score for a developer by evaluating
 * the developer's name, manufacturer, and notes with predetermined field weights.
 *
 * @param queryTokens - Tokens extracted from the search query
 * @param developer - Developer entity whose fields will be scored
 * @param config - Tokenized search configuration to control thresholds and bonuses; defaults to DEFAULT_TOKENIZED_CONFIG
 * @returns The combined (un-capped) weighted token score and the list of unique query tokens that matched any evaluated field
 */
export function calculateDeveloperTokenScore(
  queryTokens: string[],
  developer: Developer,
  config: TokenizedSearchConfig = DEFAULT_TOKENIZED_CONFIG
): { score: number; matchedTokens: string[] } {
  const nameResult = calculateTokenScore(
    queryTokens,
    developer.name,
    0.7,
    config
  );
  const manufacturerResult = calculateTokenScore(
    queryTokens,
    developer.manufacturer,
    0.5,
    config
  );
  const notesResult = calculateTokenScore(
    queryTokens,
    developer.notes || '',
    0.3,
    config
  );

  const combinedScore =
    nameResult.score + manufacturerResult.score + notesResult.score;
  const allMatchedTokens = Array.from(
    new Set([
      ...nameResult.matchedTokens,
      ...manufacturerResult.matchedTokens,
      ...notesResult.matchedTokens,
    ])
  );

  return {
    score: combinedScore, // Don't cap to allow field weight differences to show
    matchedTokens: allMatchedTokens,
  };
}

/**
 * Refines fuzzy film search outputs by scoring results against tokenized query terms and returning ranked matches.
 *
 * Extracts tokens from `query`, computes a token-based score for each film, applies stricter matching when the
 * query consists of two very short tokens, filters out results that fail the configured minimum token score or
 * token coverage, and returns results sorted by descending combined score.
 *
 * @param query - The raw search query string
 * @param fuzzyResults - Candidate films from an initial fuzzy search pass
 * @param config - Tokenized search configuration (thresholds and weights); defaults to DEFAULT_TOKENIZED_CONFIG
 * @returns An array of scored film results including `tokenScore`, `combinedScore`, and `matchedTokens`, sorted by `combinedScore` descending.
export function enhanceFilmResults(
  query: string,
  fuzzyResults: Film[],
  config: TokenizedSearchConfig = DEFAULT_TOKENIZED_CONFIG
): ScoredResult<Film>[] {
  const queryTokens = extractTokens(query);

  if (queryTokens.length === 0) {
    return fuzzyResults.map((film) => ({
      item: film,
      tokenScore: 0,
      combinedScore: 0.5, // Neutral score for empty query
      matchedTokens: [],
    }));
  }

  // For short, specific queries like "tri x", be even more strict
  let adjustedConfig = { ...config };
  if (
    queryTokens.length === 2 &&
    queryTokens.every((token) => token.length <= 3)
  ) {
    adjustedConfig = {
      ...config,
      minTokenScore: 0.6, // Even higher threshold for short queries
      minTokenCoverage: 1.0, // Require ALL tokens to match
      exactMatchWeight: 1.2, // Boost exact matches more
      partialMatchWeight: 0.2, // Heavily penalize partial matches
    };
  }

  const scoredResults: ScoredResult<Film>[] = fuzzyResults.map((film) => {
    const tokenResult = calculateFilmTokenScore(
      queryTokens,
      film,
      adjustedConfig
    );

    // Simple combined scoring: average of fuzzy relevance and token score
    // Note: Fuzzy search doesn't return scores in this implementation,
    // so we use token score as primary
    const combinedScore = tokenResult.score;

    return {
      item: film,
      tokenScore: tokenResult.score,
      combinedScore,
      matchedTokens: tokenResult.matchedTokens,
    };
  });

  // Filter by minimum token score and token coverage requirements
  return scoredResults
    .filter((result) => {
      const tokenCoverage = result.matchedTokens.length / queryTokens.length;
      return (
        result.tokenScore >= adjustedConfig.minTokenScore &&
        tokenCoverage >= adjustedConfig.minTokenCoverage
      );
    })
    .sort((a, b) => b.combinedScore - a.combinedScore);
}

/**
 * Enhances fuzzy developer search results by computing token-based relevance scores, filtering out low-scoring entries, and ranking the remainder.
 *
 * If the query yields no tokens, each developer is returned with `tokenScore` 0 and `combinedScore` 0.5.
 *
 * @param query - The raw search string provided by the user
 * @param fuzzyResults - Candidate developers produced by a prior fuzzy search pass
 * @param config - Tokenized search configuration (defaults to DEFAULT_TOKENIZED_CONFIG)
 * @returns A list of `ScoredResult<Developer>` objects sorted in descending order by `combinedScore`; entries with `tokenScore` below `config.minTokenScore` or token coverage below `config.minTokenCoverage` are excluded.
 */
export function enhanceDeveloperResults(
  query: string,
  fuzzyResults: Developer[],
  config: TokenizedSearchConfig = DEFAULT_TOKENIZED_CONFIG
): ScoredResult<Developer>[] {
  const queryTokens = extractTokens(query);

  if (queryTokens.length === 0) {
    return fuzzyResults.map((developer) => ({
      item: developer,
      tokenScore: 0,
      combinedScore: 0.5, // Neutral score for empty query
      matchedTokens: [],
    }));
  }

  const scoredResults: ScoredResult<Developer>[] = fuzzyResults.map(
    (developer) => {
      const tokenResult = calculateDeveloperTokenScore(
        queryTokens,
        developer,
        config
      );

      // Simple combined scoring: use token score as primary
      const combinedScore = tokenResult.score;

      return {
        item: developer,
        tokenScore: tokenResult.score,
        combinedScore,
        matchedTokens: tokenResult.matchedTokens,
      };
    }
  );

  // Filter by minimum token score and token coverage requirements
  return scoredResults
    .filter((result) => {
      const tokenCoverage = result.matchedTokens.length / queryTokens.length;
      return (
        result.tokenScore >= config.minTokenScore &&
        tokenCoverage >= config.minTokenCoverage
      );
    })
    .sort((a, b) => b.combinedScore - a.combinedScore);
}
