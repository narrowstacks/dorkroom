import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import type { BorderCalculation } from '../../types/border-calculator';

interface BladeResultsDisplayProps {
  calculation: BorderCalculation | null;
  paperSize: string;
  aspectRatio: string;
}

export function BladeResultsDisplay({
  calculation,
  paperSize,
  aspectRatio,
}: BladeResultsDisplayProps) {
  if (!calculation) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-800/80 p-6">
        <h2 className="text-xl font-semibold text-white mb-4 text-center">Blade Positions</h2>
        <p className="text-white/60 text-center">Configure your settings to see blade positions</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-800/80 p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Blade Positions</h2>
        <p className="text-white/70">
          {calculation.printWidth.toFixed(2)}" × {calculation.printHeight.toFixed(2)}" image on {paperSize}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-white/20 bg-zinc-700/50 p-3 text-center">
          <div className="flex items-center justify-center text-white/80 mb-1">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">L</span>
          </div>
          <div className="text-lg font-bold text-white">
            {calculation.leftBladeReading.toFixed(2)}"
          </div>
        </div>

        <div className="rounded-lg border border-white/20 bg-zinc-700/50 p-3 text-center">
          <div className="flex items-center justify-center text-white/80 mb-1">
            <ArrowUp className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">T</span>
          </div>
          <div className="text-lg font-bold text-white">
            {calculation.topBladeReading.toFixed(2)}"
          </div>
        </div>

        <div className="rounded-lg border border-white/20 bg-zinc-700/50 p-3 text-center">
          <div className="flex items-center justify-center text-white/80 mb-1">
            <span className="text-sm font-medium mr-1">B</span>
            <ArrowDown className="h-4 w-4" />
          </div>
          <div className="text-lg font-bold text-white">
            {calculation.bottomBladeReading.toFixed(2)}"
          </div>
        </div>

        <div className="rounded-lg border border-white/20 bg-zinc-700/50 p-3 text-center">
          <div className="flex items-center justify-center text-white/80 mb-1">
            <span className="text-sm font-medium mr-1">R</span>
            <ArrowRight className="h-4 w-4" />
          </div>
          <div className="text-lg font-bold text-white">
            {calculation.rightBladeReading.toFixed(2)}"
          </div>
        </div>
      </div>

      {calculation.isNonStandardPaperSize && (
        <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-3">
          <p className="text-center text-sm text-blue-200">
            <strong>Non-Standard Paper Size</strong>
            <br />
            Position paper in the {calculation.easelSizeLabel} slot all the way to the left.
          </p>
        </div>
      )}
    </div>
  );
}