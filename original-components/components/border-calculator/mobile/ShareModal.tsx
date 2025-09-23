import React from 'react';
import { Platform } from 'react-native';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Heading,
  Text,
  Button,
  ButtonText,
  ButtonIcon,
  VStack,
  HStack,
  Icon,
  CloseIcon,
  useToast,
  Toast,
  ToastTitle,
  VStack as ToastVStack,
} from '@gluestack-ui/themed';
import {
  Copy,
  Share2,
  ExternalLink,
  Smartphone,
  Clock,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { encodePreset } from '@/utils/presetSharing';
import { generateSharingUrls } from '@/utils/urlHelpers';
import { isRunningOnMobileWeb, openInNativeApp } from '@/utils/appDetection';
import { MOBILE_WEB_APP_CONFIG } from '@/constants/urls';
import { debugError } from '@/utils/debugLogger';
import type { BorderPresetSettings } from '@/types/borderPresetTypes';

interface ShareModalProps {
  isVisible: boolean;
  onClose: () => void;
  currentSettings: BorderPresetSettings;
  presetName?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isVisible,
  onClose,
  currentSettings,
  presetName = 'Border Settings',
}) => {
  const toast = useToast();
  const isMobileWeb = isRunningOnMobileWeb();

  const shareData = React.useMemo(() => {
    // Only generate URLs when the modal is actually visible to avoid unnecessary computation
    if (!isVisible) return null;

    const preset = { name: presetName, settings: currentSettings };
    const encoded = encodePreset(preset);

    if (!encoded) return null;

    const { webUrl, nativeUrl } = generateSharingUrls(encoded);
    return { webUrl, nativeUrl, preset };
  }, [isVisible, currentSettings, presetName]);

  const copyToClipboard = async (url: string, label: string) => {
    try {
      await Clipboard.setStringAsync(url);
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success" variant="solid">
            <ToastVStack space="xs">
              <ToastTitle>{label} copied to clipboard!</ToastTitle>
            </ToastVStack>
          </Toast>
        ),
      });
    } catch {
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="error" variant="solid">
            <ToastTitle>Failed to copy to clipboard</ToastTitle>
          </Toast>
        ),
      });
    }
  };

  const shareViaSystem = async () => {
    if (!shareData) return;

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareData.webUrl, {
          dialogTitle: `Share ${presetName}`,
          mimeType: 'text/plain',
        });
      } else {
        // Fallback to clipboard
        await copyToClipboard(shareData.webUrl, 'Share link');
      }
    } catch {
      debugError('Share failed');
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="error" variant="solid">
            <ToastTitle>Sharing failed</ToastTitle>
          </Toast>
        ),
      });
    }
  };

  const handleOpenInApp = async () => {
    if (!shareData) return;

    try {
      const success = await openInNativeApp(shareData.nativeUrl);
      if (success) {
        toast.show({
          placement: 'top',
          render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="success" variant="solid">
              <ToastVStack space="xs">
                <ToastTitle>Opening in Dorkroom app...</ToastTitle>
              </ToastVStack>
            </Toast>
          ),
        });
        onClose(); // Close the modal since we're switching to the app
      } else {
        toast.show({
          placement: 'top',
          render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="warning" variant="solid">
              <ToastVStack space="xs">
                <ToastTitle>Dorkroom app not installed</ToastTitle>
              </ToastVStack>
            </Toast>
          ),
        });
      }
    } catch (error) {
      debugError('Failed to open in app:', error);
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="error" variant="solid">
            <ToastTitle>Failed to open in app</ToastTitle>
          </Toast>
        ),
      });
    }
  };

  if (!shareData) {
    return (
      <Modal isOpen={isVisible} onClose={onClose}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Share Failed</Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <Text>Unable to create share link. Please try again.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onPress={onClose}>
              <ButtonText>Close</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isVisible} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg">Share &quot;{presetName}&quot;</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="md">
            <Text>
              Choose how you&apos;d like to share your border calculator
              settings:
            </Text>

            {/* Mobile Web: Open in App Button or Coming Soon */}
            {isMobileWeb &&
              (MOBILE_WEB_APP_CONFIG.ENABLE_APP_LINKS ? (
                <Button
                  onPress={handleOpenInApp}
                  variant="solid"
                  action="primary"
                  size="lg"
                >
                  <ButtonIcon as={Smartphone} size="sm" />
                  <ButtonText style={{ marginLeft: 8 }}>
                    Open in Dorkroom App
                  </ButtonText>
                </Button>
              ) : (
                <Button
                  variant="solid"
                  action="secondary"
                  size="lg"
                  disabled={true}
                  style={{ opacity: 0.6 }}
                >
                  <ButtonIcon as={Clock} size="sm" />
                  <ButtonText style={{ marginLeft: 8 }}>
                    App Coming Soon!
                  </ButtonText>
                </Button>
              ))}

            {/* Native Share Button - only show on native or if not mobile web */}
            {!isMobileWeb && (
              <Button
                onPress={shareViaSystem}
                variant="solid"
                action="primary"
                size="lg"
              >
                <ButtonIcon as={Share2} size="sm" />
                <ButtonText style={{ marginLeft: 8 }}>Share via...</ButtonText>
              </Button>
            )}

            {/* Web URL Section */}
            <VStack space="sm">
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Web Link</Text>
              <Text style={{ fontSize: 14, opacity: 0.8 }}>
                Works on any device with a web browser
              </Text>
              <HStack space="sm" style={{ alignItems: 'center' }}>
                <Button
                  onPress={() => copyToClipboard(shareData.webUrl, 'Web link')}
                  variant="outline"
                  action="secondary"
                  size="sm"
                  style={{ flex: 1 }}
                >
                  <ButtonIcon as={Copy} size="sm" />
                  <ButtonText style={{ marginLeft: 6 }}>
                    Copy Web Link
                  </ButtonText>
                </Button>
                <ButtonIcon
                  as={ExternalLink}
                  size="sm"
                  style={{ opacity: 0.6 }}
                />
              </HStack>
            </VStack>

            {/* Native App URI Section - only show on native apps, not mobile web */}
            {Platform.OS !== 'web' && (
              <VStack space="sm">
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                  App Link
                </Text>
                <Text style={{ fontSize: 14, opacity: 0.8 }}>
                  Opens directly in the Dorkroom app
                </Text>
                <HStack space="sm" style={{ alignItems: 'center' }}>
                  <Button
                    onPress={() =>
                      copyToClipboard(shareData.nativeUrl, 'App link')
                    }
                    variant="outline"
                    action="secondary"
                    size="sm"
                    style={{ flex: 1 }}
                  >
                    <ButtonIcon as={Copy} size="sm" />
                    <ButtonText style={{ marginLeft: 6 }}>
                      Copy App Link
                    </ButtonText>
                  </Button>
                  <ButtonIcon
                    as={Smartphone}
                    size="sm"
                    style={{ opacity: 0.6 }}
                  />
                </HStack>
              </VStack>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onPress={onClose}>
            <ButtonText>Done</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
