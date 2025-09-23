import type { Film, Developer } from "../dorkroom/types";

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
 * Extract meaningful tokens from a string
 */
export function extractTokens(text: string): string[] {
  if (!text) return [];

  return (
    text
      .toLowerCase()
      .trim()
      // Split on whitespace, hyphens, and common punctuation
      .split(/[\s\-_.,;:()[\]{}\\]+/)
      // Remove empty strings and very short tokens
      .filter((token) => token.length > 0)
      // Remove common stop words that don't add search value
      .filter(
        (token) =>
          ![
            "the",
            "and",
            "or",
            "a",
            "an",
            "of",
            "in",
            "on",
            "at",
            "to",
            "for",
            "with",
          ].includes(token),
      )
  );
}

/**
 * Calculate token match score for a search result
 */
export function calculateTokenScore(
  queryTokens: string[],
  targetText: string,
  fieldWeight = 1.0,
  config: TokenizedSearchConfig = DEFAULT_TOKENIZED_CONFIG,
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
 * Calculate combined token score for a film
 */
export function calculateFilmTokenScore(
  queryTokens: string[],
  film: Film,
  config: TokenizedSearchConfig = DEFAULT_TOKENIZED_CONFIG,
): { score: number; matchedTokens: string[] } {
  const nameResult = calculateTokenScore(queryTokens, film.name, 0.7, config);
  const brandResult = calculateTokenScore(queryTokens, film.brand, 0.5, config);
  const descResult = calculateTokenScore(
    queryTokens,
    film.description || "",
    0.3,
    config,
  );

  const combinedScore = nameResult.score + brandResult.score + descResult.score;
  const allMatchedTokens = Array.from(
    new Set([
      ...nameResult.matchedTokens,
      ...brandResult.matchedTokens,
      ...descResult.matchedTokens,
    ]),
  );

  return {
    score: combinedScore, // Don't cap to allow field weight differences to show
    matchedTokens: allMatchedTokens,
  };
}

/**
 * Calculate combined token score for a developer
 */
export function calculateDeveloperTokenScore(
  queryTokens: string[],
  developer: Developer,
  config: TokenizedSearchConfig = DEFAULT_TOKENIZED_CONFIG,
): { score: number; matchedTokens: string[] } {
  const nameResult = calculateTokenScore(
    queryTokens,
    developer.name,
    0.7,
    config,
  );
  const manufacturerResult = calculateTokenScore(
    queryTokens,
    developer.manufacturer,
    0.5,
    config,
  );
  const notesResult = calculateTokenScore(
    queryTokens,
    developer.notes || "",
    0.3,
    config,
  );

  const combinedScore =
    nameResult.score + manufacturerResult.score + notesResult.score;
  const allMatchedTokens = Array.from(
    new Set([
      ...nameResult.matchedTokens,
      ...manufacturerResult.matchedTokens,
      ...notesResult.matchedTokens,
    ]),
  );

  return {
    score: combinedScore, // Don't cap to allow field weight differences to show
    matchedTokens: allMatchedTokens,
  };
}

/**
 * Post-process fuzzy search results with tokenization scoring
 */
export function enhanceFilmResults(
  query: string,
  fuzzyResults: Film[],
  config: TokenizedSearchConfig = DEFAULT_TOKENIZED_CONFIG,
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
      adjustedConfig,
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
 * Post-process fuzzy search results with tokenization scoring for developers
 */
export function enhanceDeveloperResults(
  query: string,
  fuzzyResults: Developer[],
  config: TokenizedSearchConfig = DEFAULT_TOKENIZED_CONFIG,
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
        config,
      );

      // Simple combined scoring: use token score as primary
      const combinedScore = tokenResult.score;

      return {
        item: developer,
        tokenScore: tokenResult.score,
        combinedScore,
        matchedTokens: tokenResult.matchedTokens,
      };
    },
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
