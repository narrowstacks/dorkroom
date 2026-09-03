import {
  type PersistedValue,
  RECIPROCITY_FILM_TYPES,
  reciprocityFactorValidator,
} from '@dorkroom/logic';
import { reciprocityMeteredTimeSchema } from '@dorkroom/ui/forms';

// Not the form schema's customFactor: that one is optional-with-default, so
// it would accept `undefined` and hydrate it into a numeric field.
const customFactor = reciprocityFactorValidator();

// The form schema only requires a non-empty string because the select can
// never produce anything else; hydration has no such guarantee, so it checks
// membership in the film list the calculator actually looks values up in.
const filmTypeValues = new Set<PersistedValue>(
  RECIPROCITY_FILM_TYPES.map((film) => film.value)
);

/**
 * Hydration validators matching the reciprocity form schema's field bounds,
 * so a tampered localStorage value falls back to its default instead of
 * entering form state.
 */
export const reciprocityHydrationValidators = {
  filmType: {
    validate: (v: PersistedValue) => filmTypeValues.has(v),
  },
  meteredTime: {
    validate: (v: PersistedValue) =>
      reciprocityMeteredTimeSchema.safeParse(v).success,
  },
  customFactor: {
    validate: (v: PersistedValue) => customFactor.safeParse(v).success,
  },
};
