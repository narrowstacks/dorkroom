import { useEffect, useState } from 'react';
import { recordLastResult } from '@/lib/last-result-store';
import { createResultRecorder } from '@/lib/result-recorder';
import type { RecordingToolId } from '@/lib/tools';

/**
 * Remembers the readout a tool is showing, for its hub tile (see
 * `createResultRecorder` for when it writes). Passing no tool id records
 * nothing, so a shared component can offer it as an option.
 */
export function useRecordResult(
  toolId: RecordingToolId | undefined,
  text: string | null
): void {
  const [recorder] = useState(() => createResultRecorder(recordLastResult));
  useEffect(() => {
    recorder.report(toolId, text);
  }, [recorder, toolId, text]);
  // Leaving inside the quiet period must not lose the result.
  useEffect(() => () => recorder.flush(), [recorder]);
}
