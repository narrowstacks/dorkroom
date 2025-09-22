/* ------------------------------------------------------------------ *\
   useWorkerCalculation.ts
   -------------------------------------------------------------
   Hook for managing web worker calculations with fallback
\* ------------------------------------------------------------------ */

import { useState, useEffect, useRef, useMemo } from "react";
import type {
  WorkerInput,
  WorkerOutput,
} from "../workers/borderCalculations.worker";
import { performCalculations } from "../workers/borderCalculations.worker";

interface UseWorkerCalculationOptions {
  enabled?: boolean;
  fallbackToSync?: boolean;
}

export function useWorkerCalculation(
  input: WorkerInput | null,
  options: UseWorkerCalculationOptions = {},
) {
  const { enabled = true, fallbackToSync = true } = options;

  const [result, setResult] = useState<WorkerOutput | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const pendingInputRef = useRef<WorkerInput | null>(null);

  // Initialize worker
  const worker = useMemo(() => {
    if (!enabled || typeof Worker === "undefined") return null;

    try {
      // Create worker from the compiled worker file
      const worker = new Worker("/workers/borderCalculations.worker.js");

      worker.onmessage = (
        e: MessageEvent<WorkerOutput | { error: string }>,
      ) => {
        setIsCalculating(false);

        if ("error" in e.data) {
          setError(e.data.error);
          // Fallback to synchronous calculation if worker fails
          if (fallbackToSync && pendingInputRef.current) {
            try {
              const syncResult = performCalculations(pendingInputRef.current);
              setResult(syncResult);
              setError(null);
            } catch (syncError) {
              setError(
                syncError instanceof Error
                  ? syncError.message
                  : String(syncError),
              );
            }
          }
        } else {
          setResult(e.data);
          setError(null);
        }
      };

      worker.onerror = (error) => {
        setIsCalculating(false);
        setError(error.message || "Worker error");

        // Fallback to synchronous calculation
        if (fallbackToSync && pendingInputRef.current) {
          try {
            const syncResult = performCalculations(pendingInputRef.current);
            setResult(syncResult);
            setError(null);
          } catch (syncError) {
            setError(
              syncError instanceof Error
                ? syncError.message
                : String(syncError),
            );
          }
        }
      };

      return worker;
    } catch {
      console.warn(
        "Failed to create web worker, falling back to synchronous calculation",
      );
      return null;
    }
  }, [enabled, fallbackToSync]);

  // Store worker reference
  useEffect(() => {
    workerRef.current = worker;

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [worker]);

  // Perform calculation when input changes
  useEffect(() => {
    if (!input) {
      setResult(null);
      return;
    }

    pendingInputRef.current = input;
    setError(null);

    if (worker && enabled) {
      // Use web worker
      setIsCalculating(true);
      worker.postMessage(input);
    } else if (fallbackToSync) {
      // Fallback to synchronous calculation
      setIsCalculating(true);
      try {
        // Use a small delay to prevent blocking
        requestAnimationFrame(() => {
          try {
            const syncResult = performCalculations(input);
            setResult(syncResult);
            setError(null);
          } catch (syncError) {
            setError(
              syncError instanceof Error
                ? syncError.message
                : String(syncError),
            );
          } finally {
            setIsCalculating(false);
          }
        });
      } catch (syncError) {
        setError(
          syncError instanceof Error ? syncError.message : String(syncError),
        );
        setIsCalculating(false);
      }
    }
  }, [input, worker, enabled, fallbackToSync]);

  return {
    result,
    isCalculating,
    error,
    isWorkerSupported: worker !== null,
  };
}
