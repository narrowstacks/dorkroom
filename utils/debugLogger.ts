// Tree-shakable debug logging - production builds will remove these entirely
const DEBUG_ENABLED = process.env.NODE_ENV === 'development';
const PERF_MONITORING_ENABLED = false;

// Use conditional compilation for better tree-shaking
export const debugLog = DEBUG_ENABLED
  ? (...args: any[]) => console.log(...args)
  : () => {};

export const debugWarn = DEBUG_ENABLED
  ? (...args: any[]) => console.warn(...args)
  : () => {};

export const debugError = DEBUG_ENABLED
  ? (...args: any[]) => console.error(...args)
  : () => {};

// Performance timing utilities - only in debug mode
const performanceTimers = DEBUG_ENABLED ? new Map<string, number>() : null;

export const debugLogTiming =
  DEBUG_ENABLED && PERF_MONITORING_ENABLED
    ? (label: string, startTime?: number) => {
        if (startTime === undefined) {
          // Start timing
          const now = performance.now();
          performanceTimers?.set(label, now);
          debugLog(`⏱️ [TIMING START] ${label}`);
          return now;
        } else {
          // End timing
          const endTime = performance.now();
          const duration = endTime - startTime;
          debugLog(`⏱️ [TIMING END] ${label}: ${duration.toFixed(2)}ms`);
          performanceTimers?.delete(label);
          return duration;
        }
      }
    : () => undefined;

// Continuous FPS monitoring - only initialize in debug mode
let fpsMonitoringState =
  DEBUG_ENABLED && PERF_MONITORING_ENABLED
    ? {
        isActive: false,
        frameCount: 0,
        lastFrameTime: 0,
        startTime: 0,
        frameTimes: [] as number[],
        animationFrameId: null as number | null,
        logInterval: null as NodeJS.Timeout | null,
      }
    : ({} as any);

const measureFrame =
  DEBUG_ENABLED && PERF_MONITORING_ENABLED
    ? () => {
        if (!fpsMonitoringState.isActive) return;

        const now = performance.now();

        if (fpsMonitoringState.lastFrameTime > 0) {
          const frameTime = now - fpsMonitoringState.lastFrameTime;
          fpsMonitoringState.frameTimes.push(frameTime);
          fpsMonitoringState.frameCount++;

          // Keep only last 120 frames (about 2 seconds at 60fps)
          if (fpsMonitoringState.frameTimes.length > 120) {
            fpsMonitoringState.frameTimes.shift();
          }
        }

        fpsMonitoringState.lastFrameTime = now;
        fpsMonitoringState.animationFrameId =
          requestAnimationFrame(measureFrame);
      }
    : () => {};

export const startContinuousFPSMonitoring =
  DEBUG_ENABLED && PERF_MONITORING_ENABLED
    ? (label: string = "Page") => {
        if (fpsMonitoringState.isActive) return;

        debugLog(
          `📊 [FPS MONITOR] Starting continuous monitoring for ${label}`,
        );

        fpsMonitoringState.isActive = true;
        fpsMonitoringState.frameCount = 0;
        fpsMonitoringState.startTime = performance.now();
        fpsMonitoringState.frameTimes = [];
        fpsMonitoringState.lastFrameTime = 0;

        // Start frame measurement
        fpsMonitoringState.animationFrameId =
          requestAnimationFrame(measureFrame);

        // Log averages every 5 seconds
        fpsMonitoringState.logInterval = setInterval(() => {
          if (fpsMonitoringState.frameTimes.length > 0) {
            const frameTimes = fpsMonitoringState.frameTimes;
            const avgFrameTime =
              frameTimes.reduce((a: number, b: number) => a + b, 0) /
              frameTimes.length;
            const minFrameTime = Math.min(...frameTimes);
            const maxFrameTime = Math.max(...frameTimes);
            const avgFPS = 1000 / avgFrameTime;
            const minFPS = 1000 / maxFrameTime;
            const maxFPS = 1000 / minFrameTime;

            const quality =
              avgFPS >= 55
                ? "excellent"
                : avgFPS >= 45
                  ? "good"
                  : avgFPS >= 30
                    ? "fair"
                    : "poor";
            const qualityColor =
              avgFPS >= 55
                ? "🟢"
                : avgFPS >= 45
                  ? "🟡"
                  : avgFPS >= 30
                    ? "🟠"
                    : "🔴";

            debugLog(
              `${qualityColor} [FPS MONITOR] ${label} - Avg: ${avgFPS.toFixed(1)}fps | Min: ${minFPS.toFixed(1)}fps | Max: ${maxFPS.toFixed(1)}fps | Quality: ${quality}`,
            );

            debugLogPerformance(`Continuous FPS - ${label}`, {
              avgFPS: parseFloat(avgFPS.toFixed(1)),
              minFPS: parseFloat(minFPS.toFixed(1)),
              maxFPS: parseFloat(maxFPS.toFixed(1)),
              avgFrameTime: parseFloat(avgFrameTime.toFixed(2)),
              quality,
              sampleSize: frameTimes.length,
              timestamp: new Date().toISOString(),
            });
          }
        }, 5000);
      }
    : () => {};

export const stopContinuousFPSMonitoring =
  DEBUG_ENABLED && PERF_MONITORING_ENABLED
    ? () => {
        if (!fpsMonitoringState.isActive) return;

        debugLog(`📊 [FPS MONITOR] Stopping continuous monitoring`);

        fpsMonitoringState.isActive = false;

        if (fpsMonitoringState.animationFrameId !== null) {
          cancelAnimationFrame(fpsMonitoringState.animationFrameId);
          fpsMonitoringState.animationFrameId = null;
        }

        if (fpsMonitoringState.logInterval !== null) {
          clearInterval(fpsMonitoringState.logInterval);
          fpsMonitoringState.logInterval = null;
        }

        // Final summary
        if (fpsMonitoringState.frameTimes.length > 0) {
          const totalTime = performance.now() - fpsMonitoringState.startTime;
          const avgFPS = (fpsMonitoringState.frameCount / totalTime) * 1000;
          debugLog(
            `📊 [FPS MONITOR] Final Summary - Total time: ${(totalTime / 1000).toFixed(1)}s | Avg FPS: ${avgFPS.toFixed(1)}fps | Total frames: ${fpsMonitoringState.frameCount}`,
          );
        }
      }
    : () => {};

export const debugLogPerformance =
  DEBUG_ENABLED && PERF_MONITORING_ENABLED
    ? (label: string, data: Record<string, any>) => {
        console.log(`🚀 [PERFORMANCE] ${label}:`, data);
      }
    : () => {};

export const debugLogAnimationFrame =
  DEBUG_ENABLED && PERF_MONITORING_ENABLED
    ? (label: string, frameTime: number) => {
        // Only log if frameTime is reasonable (avoid division by zero or tiny values)
        if (frameTime > 0 && frameTime < 1000) {
          const fps = 1000 / frameTime;
          const fpsColor = fps >= 55 ? "🟢" : fps >= 45 ? "🟡" : "🔴";
          debugLog(
            `${fpsColor} [ANIMATION] ${label}: ${fps.toFixed(1)}fps (${frameTime.toFixed(2)}ms)`,
          );

          // Also log detailed FPS data
          debugLogPerformance(`FPS - ${label}`, {
            fps: parseFloat(fps.toFixed(1)),
            frameTime: parseFloat(frameTime.toFixed(2)),
            quality: fps >= 55 ? "excellent" : fps >= 45 ? "good" : "poor",
            timestamp: new Date().toISOString(),
          });
        } else {
          debugWarn(`[ANIMATION] ${label}: Invalid frameTime: ${frameTime}ms`);
        }
      }
    : () => {};

export const debugLogMemory =
  DEBUG_ENABLED && PERF_MONITORING_ENABLED
    ? (label: string) => {
        if ((performance as any).memory) {
          const memory = (performance as any).memory;
          debugLogPerformance(`${label} - Memory`, {
            used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
          });
        }
      }
    : () => {};
