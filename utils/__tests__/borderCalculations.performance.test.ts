/* ------------------------------------------------------------------ *\
   borderCalculations.performance.test.ts
   -------------------------------------------------------------
   Performance tests for optimized border calculations
\* ------------------------------------------------------------------ */
import { debugLog } from '@/utils/debugLogger';

import { performance } from 'perf_hooks';
import {
  findCenteringOffsets,
  calculateOptimalMinBorder,
  computePrintSize,
  clampOffsets,
} from '../borderCalculations';

describe('Border Calculations Performance', () => {
  // Test data for performance benchmarks
  const testCases = [
    { paperW: 8, paperH: 10, ratioW: 3, ratioH: 2 },
    { paperW: 11, paperH: 14, ratioW: 4, ratioH: 5 },
    { paperW: 16, paperH: 20, ratioW: 2, ratioH: 3 },
    { paperW: 20, paperH: 24, ratioW: 1, ratioH: 1 },
    { paperW: 13.5, paperH: 10.25, ratioW: 3.2, ratioH: 2.1 }, // Non-standard sizes
  ];

  it('should handle repeated findCenteringOffsets calls efficiently', () => {
    const iterations = 1000;
    const start = performance.now();

    // Test memoization effectiveness
    for (let i = 0; i < iterations; i++) {
      const testCase = testCases[i % testCases.length];
      findCenteringOffsets(testCase.paperW, testCase.paperH, true);
      findCenteringOffsets(testCase.paperW, testCase.paperH, false);
    }

    const end = performance.now();
    const timePerCall = (end - start) / (iterations * 2);

    debugLog(
      `Average time per findCenteringOffsets call: ${timePerCall.toFixed(3)}ms`
    );

    // Should be very fast due to memoization (less than 0.1ms per call)
    expect(timePerCall).toBeLessThan(0.1);
  });

  it('should optimize calculateOptimalMinBorder with reasonable performance', () => {
    const iterations = 100; // Fewer iterations as this is more computationally intensive
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const testCase = testCases[i % testCases.length];
      calculateOptimalMinBorder(
        testCase.paperW,
        testCase.paperH,
        testCase.ratioW,
        testCase.ratioH,
        0.5
      );
    }

    const end = performance.now();
    const timePerCall = (end - start) / iterations;

    debugLog(
      `Average time per calculateOptimalMinBorder call: ${timePerCall.toFixed(
        3
      )}ms`
    );

    // Should complete within reasonable time (less than 5ms per call)
    expect(timePerCall).toBeLessThan(5);
  });

  it('should demonstrate memoization cache effectiveness', () => {
    // Clear any existing cache state by using unique values first
    const uniqueTests = [
      { paperW: 7.123, paperH: 9.456, landscape: true },
      { paperW: 7.123, paperH: 9.456, landscape: false },
    ];

    // First calls - should be slower (cache miss)
    const start1 = performance.now();
    uniqueTests.forEach((test) =>
      findCenteringOffsets(test.paperW, test.paperH, test.landscape)
    );
    const end1 = performance.now();
    const firstCallTime = end1 - start1;

    // Second calls - should be faster (cache hit)
    const start2 = performance.now();
    uniqueTests.forEach((test) =>
      findCenteringOffsets(test.paperW, test.paperH, test.landscape)
    );
    const end2 = performance.now();
    const secondCallTime = end2 - start2;

    debugLog(`First call time: ${firstCallTime.toFixed(3)}ms`);
    debugLog(`Second call time (cached): ${secondCallTime.toFixed(3)}ms`);
    debugLog(
      `Performance improvement: ${(
        ((firstCallTime - secondCallTime) / firstCallTime) *
        100
      ).toFixed(1)}%`
    );

    // Cached calls should be significantly faster
    expect(secondCallTime).toBeLessThan(firstCallTime);
  });

  it('should handle batch operations efficiently', () => {
    const batchSize = 50;
    const start = performance.now();

    // Simulate batch processing like what might happen in the hook
    const results = [];
    for (let i = 0; i < batchSize; i++) {
      const testCase = testCases[i % testCases.length];
      const printSize = computePrintSize(
        testCase.paperW,
        testCase.paperH,
        testCase.ratioW,
        testCase.ratioH,
        0.5
      );

      const offsets = clampOffsets(
        testCase.paperW,
        testCase.paperH,
        printSize.printW,
        printSize.printH,
        0.5,
        0, // no offset
        0, // no offset
        false
      );

      results.push({ printSize, offsets });
    }

    const end = performance.now();
    const totalTime = end - start;
    const timePerBatch = totalTime / batchSize;

    debugLog(
      `Batch processing time: ${totalTime.toFixed(
        3
      )}ms for ${batchSize} operations`
    );
    debugLog(`Average time per operation: ${timePerBatch.toFixed(3)}ms`);

    // Batch operations should be efficient
    expect(totalTime).toBeLessThan(100); // Total time under 100ms
    expect(timePerBatch).toBeLessThan(2); // Less than 2ms per operation
    expect(results).toHaveLength(batchSize);
  });

  it('should demonstrate memory efficiency with cache limits', () => {
    // Test that the cache doesn't grow indefinitely
    const uniqueInputCount = 150; // More than MAX_MEMO_SIZE (100)

    for (let i = 0; i < uniqueInputCount; i++) {
      // Generate unique paper sizes
      const paperW = 8 + i * 0.1;
      const paperH = 10 + i * 0.1;
      findCenteringOffsets(paperW, paperH, true);
    }

    // The cache should be limited and not grow indefinitely
    // This is more of a conceptual test - we can't directly access fitMemo size
    // but we can ensure the function still works efficiently
    const start = performance.now();
    findCenteringOffsets(8, 10, true); // This might be evicted from cache
    const end = performance.now();

    // Should still complete quickly even if not cached
    expect(end - start).toBeLessThan(1);
  });
});
