import { FEATURE_FLAGS } from '../constants/feature-flags';

export const useFeatureFlags = () => {
  return {
    flags: FEATURE_FLAGS,
  };
};
