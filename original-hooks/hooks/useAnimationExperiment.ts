import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  debugLog,
  debugLogPerformance,
  debugLogMemory,
} from '@/utils/debugLogger';

const ANIMATION_EXPERIMENT_KEY = '@animation_experiment';

export type AnimationEngine = 'legacy' | 'reanimated';

interface AnimationExperimentState {
  engine: AnimationEngine;
  setEngine: (engine: AnimationEngine) => void;
  isLoading: boolean;
}

/**
 * Hook for A/B testing between legacy Animated API and React Native Reanimated
 * Only available in development environment
 */
export const useAnimationExperiment = (): AnimationExperimentState => {
  const [engine, setEngineState] = useState<AnimationEngine>('legacy');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preference on mount
  useEffect(() => {
    const loadSavedEngine = async () => {
      if (!__DEV__) {
        setIsLoading(false);
        return;
      }

      try {
        const saved = await AsyncStorage.getItem(ANIMATION_EXPERIMENT_KEY);
        const savedEngine = (saved as AnimationEngine) || 'legacy';

        debugLog('🔬 [ANIMATION EXPERIMENT] Loaded saved engine:', savedEngine);
        setEngineState(savedEngine);
      } catch (error) {
        debugLog(
          '🔬 [ANIMATION EXPERIMENT] Failed to load saved engine:',
          error
        );
        setEngineState('legacy');
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedEngine();
  }, []);

  const setEngine = async (newEngine: AnimationEngine) => {
    if (!__DEV__) {
      debugLog(
        '🔬 [ANIMATION EXPERIMENT] Not in dev mode, ignoring engine change'
      );
      return;
    }

    const previousEngine = engine;

    try {
      // Log performance before switch
      debugLogMemory(`Animation Engine Switch - Before (${previousEngine})`);

      // Save to AsyncStorage
      await AsyncStorage.setItem(ANIMATION_EXPERIMENT_KEY, newEngine);

      // Update state
      setEngineState(newEngine);

      // Log the switch
      debugLogPerformance('Animation Engine Switch', {
        from: previousEngine,
        to: newEngine,
        timestamp: new Date().toISOString(),
      });

      // Log performance after switch
      setTimeout(() => {
        debugLogMemory(`Animation Engine Switch - After (${newEngine})`);
      }, 100);
    } catch (error) {
      debugLog(
        '🔬 [ANIMATION EXPERIMENT] Failed to save engine preference:',
        error
      );
    }
  };

  // In production, always return legacy engine
  if (!__DEV__) {
    return {
      engine: 'legacy',
      setEngine: () => {},
      isLoading: false,
    };
  }

  return {
    engine,
    setEngine,
    isLoading,
  };
};

/**
 * Utility function to check if Reanimated should be used
 */
export const useIsReanimatedEnabled = (): boolean => {
  const { engine } = useAnimationExperiment();
  return __DEV__ && engine === 'reanimated';
};
