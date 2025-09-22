import React, { useState } from "react";
import { Platform, Alert, Modal, TouchableOpacity } from "react-native";
import {
  Box,
  Text,
  Button,
  ButtonText,
  VStack,
  HStack,
} from "@gluestack-ui/themed";
import { useThemeColor } from "@/hooks/useThemeColor";

interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

interface ConfirmAlertProps {
  title: string;
  message: string;
  buttons?: AlertButton[];
  onShow?: () => void;
  onHide?: () => void;
}

interface ConfirmAlertRef {
  show: () => void;
}

// Web Modal Alert Component
const WebModalAlert: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  onHide: () => void;
}> = ({ visible, title, message, buttons, onHide }) => {
  const textColor = useThemeColor({}, "text");
  const cardBackground = useThemeColor({}, "cardBackground");
  const outline = useThemeColor({}, "outline");

  const handleButtonPress = (button: AlertButton) => {
    onHide();
    button.onPress?.();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onHide}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
        activeOpacity={1}
        onPress={onHide}
      >
        <TouchableOpacity
          style={{
            backgroundColor: cardBackground,
            borderRadius: 20,
            maxWidth: 400,
            width: "100%",
            padding: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 16,
          }}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <VStack space="lg">
            <Box>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "600",
                  color: textColor,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                {title}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: textColor,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                {message}
              </Text>
            </Box>

            <HStack space="md" style={{ justifyContent: "center" }}>
              {buttons.map((button, index) => (
                <Button
                  key={index}
                  variant={button.style === "cancel" ? "outline" : "solid"}
                  onPress={() => handleButtonPress(button)}
                  style={{
                    flex: 1,
                    backgroundColor:
                      button.style === "destructive"
                        ? "#ff4444"
                        : button.style === "cancel"
                          ? "transparent"
                          : undefined,
                    borderColor:
                      button.style === "cancel" ? outline : undefined,
                  }}
                >
                  <ButtonText
                    style={{
                      color:
                        button.style === "destructive"
                          ? "#fff"
                          : button.style === "cancel"
                            ? textColor
                            : undefined,
                    }}
                  >
                    {button.text}
                  </ButtonText>
                </Button>
              ))}
            </HStack>
          </VStack>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// Global state for web modals
let webModalState: {
  setModalData: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      title: string;
      message: string;
      buttons: AlertButton[];
    }>
  > | null;
} = { setModalData: null };

// Global Web Modal Manager
export const WebModalManager: React.FC = () => {
  const [modalData, setModalData] = useState({
    visible: false,
    title: "",
    message: "",
    buttons: [] as AlertButton[],
  });

  React.useEffect(() => {
    webModalState.setModalData = setModalData;
    return () => {
      webModalState.setModalData = null;
    };
  }, []);

  const handleHide = () => {
    setModalData((prev) => ({ ...prev, visible: false }));
  };

  if (Platform.OS !== "web") return null;

  return (
    <WebModalAlert
      visible={modalData.visible}
      title={modalData.title}
      message={modalData.message}
      buttons={modalData.buttons}
      onHide={handleHide}
    />
  );
};

// Simple alert function for single button alerts
export const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    if (webModalState.setModalData) {
      webModalState.setModalData({
        visible: true,
        title,
        message,
        buttons: [{ text: "OK", style: "default" }],
      });
    } else {
      // Fallback to browser alert if modal manager not available
      alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message);
  }
};

// Confirm alert function for multi-button alerts
export const showConfirmAlert = (
  title: string,
  message: string,
  buttons: AlertButton[] = [{ text: "OK", style: "default" }],
) => {
  if (Platform.OS === "web") {
    if (webModalState.setModalData) {
      webModalState.setModalData({
        visible: true,
        title,
        message,
        buttons,
      });
    } else {
      // Fallback to browser confirm if modal manager not available
      if (buttons.length === 2) {
        const confirmed = confirm(`${title}\n\n${message}`);
        if (confirmed) {
          const confirmButton = buttons.find((b) => b.style !== "cancel");
          confirmButton?.onPress?.();
        } else {
          const cancelButton = buttons.find((b) => b.style === "cancel");
          cancelButton?.onPress?.();
        }
      } else {
        alert(`${title}\n\n${message}`);
        buttons[0]?.onPress?.();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

// Advanced modal-based alert component for complex scenarios
export const ConfirmAlert = React.forwardRef<
  ConfirmAlertRef,
  ConfirmAlertProps
>(
  (
    {
      title,
      message,
      buttons = [{ text: "OK", style: "default" }],
      onShow,
      onHide,
    },
    ref,
  ) => {
    const [isVisible, setIsVisible] = useState(false);

    const show = () => {
      if (Platform.OS === "web") {
        setIsVisible(true);
        onShow?.();
      } else {
        Alert.alert(title, message, buttons);
      }
    };

    const hide = () => {
      setIsVisible(false);
      onHide?.();
    };

    React.useImperativeHandle(ref, () => ({
      show,
    }));

    // Only render modal on web
    if (Platform.OS !== "web") {
      return null;
    }

    return (
      <WebModalAlert
        visible={isVisible}
        title={title}
        message={message}
        buttons={buttons}
        onHide={hide}
      />
    );
  },
);

ConfirmAlert.displayName = "ConfirmAlert";
