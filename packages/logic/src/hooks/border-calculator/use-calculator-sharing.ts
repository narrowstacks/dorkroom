import { useState } from 'react';
import type { BorderPresetSettings } from '../../types/border-calculator';
import { debugError } from '../../utils/debug-logger';
import { shouldUseWebShare } from '../../utils/device-detection';
import { shallowEqual } from '../../utils/object-comparison';
import { buildPresetShareUrl } from '../../utils/preset-sharing';
import {
  copyTextToClipboard,
  isClipboardSupported,
  shareLink,
} from '../../utils/share-link';

interface PresetWithSettings {
  id: string;
  name: string;
  settings: BorderPresetSettings;
}

/** How a border preset link reached the user. */
export type PresetShareMethod = 'native' | 'clipboard' | 'manual';

interface UseCalculatorSharingProps {
  presets: PresetWithSettings[];
  currentSettings: BorderPresetSettings;
  presetName: string;
  onAddPreset: (preset: PresetWithSettings) => void;
  /**
   * Called once a link has reached the user: copied from the share modal, or
   * sent through the native share flow. Not called for a cancelled share
   * sheet or a failed copy.
   */
  onShared?: (method: PresetShareMethod) => void;
}

interface UseCalculatorSharingReturn {
  isShareModalOpen: boolean;
  isSaveBeforeShareOpen: boolean;
  shareUrls: { webUrl: string } | null;
  isGeneratingShareUrl: boolean;
  isSharing: boolean;
  canShareNatively: boolean;
  canCopyToClipboard: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  setIsSaveBeforeShareOpen: (open: boolean) => void;
  handleShareClick: () => Promise<void>;
  handleSaveAndShare: (name: string) => Promise<void>;
  handleCopyToClipboard: (url: string) => Promise<void>;
  handleNativeShare: () => Promise<void>;
}

const toShareUrls = (preset: {
  name: string;
  settings: BorderPresetSettings;
}) => {
  const webUrl = buildPresetShareUrl(preset);
  return webUrl ? { webUrl } : null;
};

/**
 * The border calculator's one share hook: picks the link for the current
 * settings (saving them first when they have no name), drives the share
 * modal, and copies or natively shares the link through `utils/share-link`.
 */
export function useCalculatorSharing({
  presets,
  currentSettings,
  presetName,
  onAddPreset,
  onShared,
}: UseCalculatorSharingProps): UseCalculatorSharingReturn {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaveBeforeShareOpen, setIsSaveBeforeShareOpen] = useState(false);
  const [shareUrls, setShareUrls] = useState<{
    webUrl: string;
  } | null>(null);
  const [isGeneratingShareUrl, setIsGeneratingShareUrl] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const canShareNatively = shouldUseWebShare();
  const canCopyToClipboard = isClipboardSupported();

  /** Opens the modal on a link, or on its error state when there is none. */
  const openShareModal = (urls: { webUrl: string } | null) => {
    if (!urls) {
      debugError('Failed to generate sharing URLs');
    }
    setShareUrls(urls);
    setIsShareModalOpen(true);
  };

  const handleShareClick = async () => {
    setIsGeneratingShareUrl(true);

    try {
      // A saved preset is shared under its own name; unsaved settings under
      // the name typed so far, or after asking for one.
      const matchedPreset = presets.find((p) =>
        shallowEqual(p.settings, currentSettings)
      );
      const name = matchedPreset ? matchedPreset.name : presetName.trim();

      if (matchedPreset || name) {
        openShareModal(toShareUrls({ name, settings: currentSettings }));
      } else {
        setIsSaveBeforeShareOpen(true);
      }
    } catch (error) {
      debugError('Error during share URL generation:', error);
      openShareModal(null);
    } finally {
      setIsGeneratingShareUrl(false);
    }
  };

  const handleSaveAndShare = async (name: string) => {
    setIsGeneratingShareUrl(true);

    try {
      onAddPreset({
        id: `user-${Date.now()}`,
        name,
        settings: currentSettings,
      });
      setIsSaveBeforeShareOpen(false);
      openShareModal(toShareUrls({ name, settings: currentSettings }));
    } catch (error) {
      debugError('Error during save and share:', error);
      setIsSaveBeforeShareOpen(false);
      openShareModal(null);
    } finally {
      setIsGeneratingShareUrl(false);
    }
  };

  const handleCopyToClipboard = async (url: string) => {
    let copied: boolean;
    try {
      copied = await copyTextToClipboard(url);
    } catch (error) {
      debugError('Failed to copy to clipboard:', error);
      throw error;
    }
    // No Clipboard API: a silent no-op, as the modal hides its copy button.
    if (copied) {
      onShared?.('clipboard');
    }
  };

  /**
   * Shares the link the modal shows through the share sheet, falling back to
   * the clipboard and then to manual copying. The layouts currently pass
   * `canShareNatively={false}` to the modal, so nothing calls this yet.
   */
  const handleNativeShare = async () => {
    if (!shareUrls) return;

    const title = presetName || 'Border Calculator Settings';
    setIsSharing(true);
    try {
      const outcome = await shareLink({
        url: shareUrls.webUrl,
        title,
        text: `Check out this border calculator preset: ${title}`,
      });
      if (outcome.status === 'cancelled') return;

      const method = outcome.status === 'shared' ? outcome.method : 'manual';
      onShared?.(method);
      if (method === 'native') {
        setIsShareModalOpen(false);
      }
    } finally {
      setIsSharing(false);
    }
  };

  return {
    isShareModalOpen,
    isSaveBeforeShareOpen,
    shareUrls,
    isGeneratingShareUrl,
    isSharing,
    canShareNatively,
    canCopyToClipboard,
    setIsShareModalOpen,
    setIsSaveBeforeShareOpen,
    handleShareClick,
    handleSaveAndShare,
    handleCopyToClipboard,
    handleNativeShare,
  };
}
