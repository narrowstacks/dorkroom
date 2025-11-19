import { useState } from 'react';
import type { BorderPresetSettings } from '../../types/border-calculator';
import { debugError } from '../../utils/debug-logger';

interface PresetWithSettings {
  id: string;
  name: string;
  settings: BorderPresetSettings;
}

interface UseCalculatorSharingProps {
  presets: PresetWithSettings[];
  currentSettings: BorderPresetSettings;
  presetName: string;
  getSharingUrls: (preset: {
    name: string;
    settings: BorderPresetSettings;
  }) => {
    webUrl: string;
  } | null;
  sharePreset: (
    preset: { name: string; settings: BorderPresetSettings },
    preferNative: boolean
  ) => Promise<void>;
  canShareNatively: boolean;
  canCopyToClipboard: boolean;
  onAddPreset: (preset: PresetWithSettings) => void;
  shallowEqual: (a: BorderPresetSettings, b: BorderPresetSettings) => boolean;
}

interface UseCalculatorSharingReturn {
  isShareModalOpen: boolean;
  isSaveBeforeShareOpen: boolean;
  shareUrls: { webUrl: string } | null;
  isGeneratingShareUrl: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  setIsSaveBeforeShareOpen: (open: boolean) => void;
  handleShareClick: () => Promise<void>;
  handleSaveAndShare: (name: string) => Promise<void>;
  handleCopyToClipboard: (url: string) => Promise<void>;
  handleNativeShare: () => Promise<void>;
}

/**
 * Hook to manage border calculator preset sharing workflows
 * Handles sharing, saving before sharing, URL generation, and clipboard/native share
 */
export function useCalculatorSharing({
  presets,
  currentSettings,
  presetName,
  getSharingUrls,
  sharePreset,
  canShareNatively,
  canCopyToClipboard,
  onAddPreset,
  shallowEqual,
}: UseCalculatorSharingProps): UseCalculatorSharingReturn {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaveBeforeShareOpen, setIsSaveBeforeShareOpen] = useState(false);
  const [shareUrls, setShareUrls] = useState<{
    webUrl: string;
  } | null>(null);
  const [isGeneratingShareUrl, setIsGeneratingShareUrl] = useState(false);

  const handleShareClick = async () => {
    setIsGeneratingShareUrl(true);

    try {
      // Check if current settings match a saved preset
      const matchedPreset = presets.find((p) =>
        shallowEqual(p.settings, currentSettings)
      );

      if (matchedPreset) {
        // If it's a saved preset, share it directly
        const urls = getSharingUrls({
          name: matchedPreset.name,
          settings: currentSettings,
        });
        if (urls) {
          setShareUrls(urls);
          setIsShareModalOpen(true);
        } else {
          debugError('Failed to generate sharing URLs for saved preset');
          // Still open modal to show error state
          setShareUrls(null);
          setIsShareModalOpen(true);
        }
      } else {
        // If not saved, check if user has a preset name already entered
        if (presetName.trim()) {
          // User has entered a name, generate URLs and share directly
          const urls = getSharingUrls({
            name: presetName.trim(),
            settings: currentSettings,
          });
          if (urls) {
            setShareUrls(urls);
            setIsShareModalOpen(true);
          } else {
            debugError('Failed to generate sharing URLs for named settings');
            setShareUrls(null);
            setIsShareModalOpen(true);
          }
        } else {
          // No name entered, open save-before-share modal
          setIsSaveBeforeShareOpen(true);
        }
      }
    } catch (error) {
      debugError('Error during share URL generation:', error);
      setShareUrls(null);
      setIsShareModalOpen(true);
    } finally {
      setIsGeneratingShareUrl(false);
    }
  };

  const handleSaveAndShare = async (name: string) => {
    setIsGeneratingShareUrl(true);

    try {
      // Create and save the new preset
      const newPreset = {
        id: 'user-' + Date.now(),
        name,
        settings: currentSettings,
      };
      onAddPreset(newPreset);

      // Generate share URLs and open share modal
      const urls = getSharingUrls({ name, settings: currentSettings });
      setIsSaveBeforeShareOpen(false);

      if (urls) {
        setShareUrls(urls);
        setIsShareModalOpen(true);
      } else {
        debugError('Failed to generate sharing URLs after saving preset');
        // Still open modal to show error state
        setShareUrls(null);
        setIsShareModalOpen(true);
      }
    } catch (error) {
      debugError('Error during save and share:', error);
      setIsSaveBeforeShareOpen(false);
      setShareUrls(null);
      setIsShareModalOpen(true);
    } finally {
      setIsGeneratingShareUrl(false);
    }
  };

  const handleCopyToClipboard = async (url: string) => {
    if (!canCopyToClipboard) return;

    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      debugError('Failed to copy to clipboard:', error);
      throw error;
    }
  };

  const handleNativeShare = async () => {
    if (!canShareNatively) return;
    if (!shareUrls) return;

    try {
      await sharePreset(
        {
          name: presetName || 'Border Calculator Settings',
          settings: currentSettings,
        },
        true // prefer native share
      );
    } catch (error) {
      debugError('Native share failed:', error);
      throw error;
    }
  };

  return {
    isShareModalOpen,
    isSaveBeforeShareOpen,
    shareUrls,
    isGeneratingShareUrl,
    setIsShareModalOpen,
    setIsSaveBeforeShareOpen,
    handleShareClick,
    handleSaveAndShare,
    handleCopyToClipboard,
    handleNativeShare,
  };
}
