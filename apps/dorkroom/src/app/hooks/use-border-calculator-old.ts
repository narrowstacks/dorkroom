// Temporarily keep the old hook for backward compatibility
import { useState, useMemo } from 'react';

export function useBorderCalculator() {
  const [aspectRatio, setAspectRatio] = useState('2:3');
  const [paperSize, setPaperSize] = useState('8x10');
  const [customAspectWidth, setCustomAspectWidth] = useState(2);
  const [customAspectHeight, setCustomAspectHeight] = useState(3);
  const [customPaperWidth, setCustomPaperWidth] = useState(8);
  const [customPaperHeight, setCustomPaperHeight] = useState(10);
  const [minBorder, setMinBorder] = useState(0.5);
  const [enableOffset, setEnableOffset] = useState(false);
  const [ignoreMinBorder, setIgnoreMinBorder] = useState(false);
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [showBlades, setShowBlades] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isRatioFlipped, setIsRatioFlipped] = useState(false);

  const setMinBorderSlider = (value: number) => {
    setMinBorder(value);
  };

  const setHorizontalOffsetSlider = (value: number) => {
    setHorizontalOffset(value);
  };

  const setVerticalOffsetSlider = (value: number) => {
    setVerticalOffset(value);
  };

  const calculation = useMemo(() => {
    let ratioWidth = 2;
    let ratioHeight = 3;

    if (aspectRatio === 'custom') {
      ratioWidth = customAspectWidth;
      ratioHeight = customAspectHeight;
    } else {
      const [w, h] = aspectRatio.split(':').map(Number);
      ratioWidth = w;
      ratioHeight = h;
    }

    if (isRatioFlipped) {
      [ratioWidth, ratioHeight] = [ratioHeight, ratioWidth];
    }

    let paperW = 8;
    let paperH = 10;

    if (paperSize === 'custom') {
      paperW = customPaperWidth;
      paperH = customPaperHeight;
    } else {
      const [w, h] = paperSize.split('x').map(Number);
      paperW = w;
      paperH = h;
    }

    if (isLandscape) {
      [paperW, paperH] = [paperH, paperW];
    }

    const aspectRatioValue = ratioWidth / ratioHeight;
    const availableWidth = paperW - 2 * minBorder;
    const availableHeight = paperH - 2 * minBorder;

    let printWidth: number;
    let printHeight: number;

    if (availableWidth / availableHeight > aspectRatioValue) {
      printHeight = availableHeight;
      printWidth = printHeight * aspectRatioValue;
    } else {
      printWidth = availableWidth;
      printHeight = printWidth / aspectRatioValue;
    }

    const leftBorder = (paperW - printWidth) / 2 + horizontalOffset;
    const rightBorder = (paperW - printWidth) / 2 - horizontalOffset;
    const topBorder = (paperH - printHeight) / 2 + verticalOffset;
    const bottomBorder = (paperH - printHeight) / 2 - verticalOffset;

    return {
      printWidth,
      printHeight,
      leftBladeReading: leftBorder,
      rightBladeReading: rightBorder,
      topBladeReading: topBorder,
      bottomBladeReading: bottomBorder,
      previewWidth: 200,
      previewHeight: 160,
      isNonStandardPaperSize: paperSize === 'custom',
      easelSizeLabel: `${paperW}"x${paperH}"`,
    };
  }, [
    aspectRatio,
    paperSize,
    customAspectWidth,
    customAspectHeight,
    customPaperWidth,
    customPaperHeight,
    minBorder,
    horizontalOffset,
    verticalOffset,
    isLandscape,
    isRatioFlipped,
  ]);

  const offsetWarning = useMemo(() => {
    if (!calculation || !enableOffset) return null;

    const { leftBladeReading, rightBladeReading, topBladeReading, bottomBladeReading } = calculation;

    if (leftBladeReading < 0 || rightBladeReading < 0 || topBladeReading < 0 || bottomBladeReading < 0) {
      return 'Image extends beyond paper edges with current offset';
    }

    return null;
  }, [calculation, enableOffset]);

  const bladeWarning = useMemo(() => {
    if (!calculation) return null;

    const { leftBladeReading, rightBladeReading, topBladeReading, bottomBladeReading } = calculation;

    if (leftBladeReading < 0.125 || rightBladeReading < 0.125 || topBladeReading < 0.125 || bottomBladeReading < 0.125) {
      return 'Blade positions may be too close to paper edge for reliable trimming';
    }

    return null;
  }, [calculation]);

  const minBorderWarning = useMemo(() => {
    if (minBorder < 0.25) {
      return 'Minimum border below 0.25" may result in difficult trimming';
    }
    return null;
  }, [minBorder]);

  const paperSizeWarning = useMemo(() => {
    if (paperSize === 'custom' && (customPaperWidth < 4 || customPaperHeight < 4)) {
      return 'Paper size may be too small for practical use';
    }
    return null;
  }, [paperSize, customPaperWidth, customPaperHeight]);

  const resetToDefaults = () => {
    setAspectRatio('2:3');
    setPaperSize('8x10');
    setCustomAspectWidth(2);
    setCustomAspectHeight(3);
    setCustomPaperWidth(8);
    setCustomPaperHeight(10);
    setMinBorder(0.5);
    setEnableOffset(false);
    setIgnoreMinBorder(false);
    setHorizontalOffset(0);
    setVerticalOffset(0);
    setShowBlades(true);
    setIsLandscape(false);
    setIsRatioFlipped(false);
  };

  const applyPreset = (settings: any) => {
    setAspectRatio(settings.aspectRatio);
    setPaperSize(settings.paperSize);
    setCustomAspectWidth(settings.customAspectWidth);
    setCustomAspectHeight(settings.customAspectHeight);
    setCustomPaperWidth(settings.customPaperWidth);
    setCustomPaperHeight(settings.customPaperHeight);
    setMinBorder(settings.minBorder);
    setEnableOffset(settings.enableOffset);
    setIgnoreMinBorder(settings.ignoreMinBorder);
    setHorizontalOffset(settings.horizontalOffset);
    setVerticalOffset(settings.verticalOffset);
    setShowBlades(settings.showBlades);
    setIsLandscape(settings.isLandscape);
    setIsRatioFlipped(settings.isRatioFlipped);
  };

  return {
    aspectRatio,
    setAspectRatio,
    paperSize,
    setPaperSize,
    customAspectWidth,
    setCustomAspectWidth,
    customAspectHeight,
    setCustomAspectHeight,
    customPaperWidth,
    setCustomPaperWidth,
    customPaperHeight,
    setCustomPaperHeight,
    minBorder,
    setMinBorder,
    setMinBorderSlider,
    enableOffset,
    setEnableOffset,
    ignoreMinBorder,
    setIgnoreMinBorder,
    horizontalOffset,
    setHorizontalOffset,
    setHorizontalOffsetSlider,
    verticalOffset,
    setVerticalOffset,
    setVerticalOffsetSlider,
    showBlades,
    setShowBlades,
    isLandscape,
    setIsLandscape,
    isRatioFlipped,
    setIsRatioFlipped,
    offsetWarning,
    bladeWarning,
    calculation,
    minBorderWarning,
    paperSizeWarning,
    resetToDefaults,
    applyPreset,
  };
}