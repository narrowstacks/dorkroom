import React from "react";
import {
  Box,
  Alert,
  AlertIcon,
  AlertText,
  InfoIcon,
} from "@gluestack-ui/themed";

interface WarningAlertProps {
  message: string;
  action?: "error" | "warning";
}

export const WarningAlert = ({
  message,
  action = "error",
}: WarningAlertProps) => (
  <Box style={{ marginTop: 8 }}>
    <Alert action={action} variant="outline">
      <AlertIcon as={InfoIcon} />
      <AlertText>{message}</AlertText>
    </Alert>
  </Box>
);
