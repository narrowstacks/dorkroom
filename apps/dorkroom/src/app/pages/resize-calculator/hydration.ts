import {
  exposureTimeValidator,
  type PersistedValue,
  positiveDimensionValidator,
} from '@dorkroom/logic';
import { z } from 'zod';

const dimension = positiveDimensionValidator();
const time = exposureTimeValidator();
const flag = z.boolean();

const isDimension = {
  validate: (v: PersistedValue) => dimension.safeParse(v).success,
};

const isPersistedFlag = (v: PersistedValue): boolean =>
  flag.safeParse(v).success;

/**
 * Hydration validators matching the resize form schema's field bounds, so a
 * tampered localStorage value falls back to its default instead of entering
 * form state.
 */
export const resizeHydrationValidators = {
  isEnlargerHeightMode: {
    validate: isPersistedFlag,
  },
  originalWidth: isDimension,
  originalLength: isDimension,
  newWidth: isDimension,
  newLength: isDimension,
  originalHeight: isDimension,
  newHeight: isDimension,
  originalTime: {
    validate: (v: PersistedValue) => time.safeParse(v).success,
  },
};
