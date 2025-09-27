interface AspectRatio {
  label: string;
  value: string;
  width?: number;
  height?: number;
}

interface PaperSize {
  label: string;
  value: string;
  width: number;
  height: number;
}

interface BorderCalculation {
  leftBorder: number;
  rightBorder: number;
  topBorder: number;
  bottomBorder: number;
  printWidth: number;
  printHeight: number;
  paperWidth: number;
  paperHeight: number;

  previewScale: number;
  previewHeight: number;
  previewWidth: number;

  printWidthPercent: number;
  printHeightPercent: number;
  leftBorderPercent: number;
  topBorderPercent: number;
  rightBorderPercent: number;
  bottomBorderPercent: number;

  // NEW Blade Readings (based on Saunders-type scale from center)
  leftBladeReading: number;
  rightBladeReading: number;
  topBladeReading: number;
  bottomBladeReading: number;

  bladeThickness: number;

  // Easel information
  isNonStandardPaperSize: boolean;
  easelSize: { width: number; height: number };
  easelSizeLabel: string;
}

interface SelectListProps {
  value: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  placeholder?: string;
}

const types = {
  AspectRatio: {} as AspectRatio,
  PaperSize: {} as PaperSize,
  BorderCalculation: {} as BorderCalculation,
  SelectListProps: {} as SelectListProps,
};

export type { AspectRatio, PaperSize, BorderCalculation, SelectListProps };
export default types;

// empty comment to make a new commit to see what's going on with vercel
