// Ships the film-log export through the iOS share sheet via the RN core `Share`
// API (no extra native dep). The payload shape lives in `film-log-export.ts`.
import { Share } from 'react-native';
import { buildRollsExport } from '@/lib/film-log-export';
import { getCameras, getLenses, getRolls } from '@/lib/film-log-storage';

/** Opens the share sheet with the full log serialized as pretty JSON. */
export async function shareRollsAsJson(): Promise<void> {
  const payload = buildRollsExport({
    rolls: getRolls(),
    cameras: getCameras(),
    lenses: getLenses(),
    exportedAt: new Date().toISOString(),
  });
  await Share.share({ message: JSON.stringify(payload, null, 2) });
}
