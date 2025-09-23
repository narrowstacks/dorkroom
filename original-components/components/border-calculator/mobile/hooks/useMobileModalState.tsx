import { useState } from 'react';

export const useMobileModalState = () => {
  const [paperSizeModalVisible, setPaperSizeModalVisible] = useState(false);
  const [borderSizeModalVisible, setBorderSizeModalVisible] = useState(false);
  const [positionOffsetsModalVisible, setPositionOffsetsModalVisible] =
    useState(false);
  const [advancedOptionsModalVisible, setAdvancedOptionsModalVisible] =
    useState(false);
  const [copyResultsModalVisible, setCopyResultsModalVisible] = useState(false);
  const [presetModalVisible, setPresetModalVisible] = useState(false);

  const closeAllModals = () => {
    setPaperSizeModalVisible(false);
    setBorderSizeModalVisible(false);
    setPositionOffsetsModalVisible(false);
    setAdvancedOptionsModalVisible(false);
    setCopyResultsModalVisible(false);
    setPresetModalVisible(false);
  };

  return {
    // Visibility states
    paperSizeModalVisible,
    borderSizeModalVisible,
    positionOffsetsModalVisible,
    advancedOptionsModalVisible,
    copyResultsModalVisible,
    presetModalVisible,

    // Setters
    setPaperSizeModalVisible,
    setBorderSizeModalVisible,
    setPositionOffsetsModalVisible,
    setAdvancedOptionsModalVisible,
    setCopyResultsModalVisible,
    setPresetModalVisible,

    // Utilities
    closeAllModals,
  };
};
