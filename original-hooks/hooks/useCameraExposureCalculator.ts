import { useState, useCallback, useMemo } from 'react';
import {
  parseShutterSpeed,
  calculateEV,
  findClosestValue,
} from './commonFunctions';
import { APERTURE_VALUES, SHUTTER_SPEED_VALUES } from '@/constants/exposure';

export type ExposureSetting = 'aperture' | 'iso' | 'shutterSpeed';

export type EquivalentExposure = {
  aperture: string;
  iso: string;
  shutterSpeed: string;
  ev: string;
};

export const useCameraExposureCalculator = () => {
  // Form state with new default values
  const [aperture, setAperture] = useState<string>('5.6');
  const [iso, setIso] = useState<string>('100');
  const [shutterSpeed, setShutterSpeed] = useState<string>('1/250'); // Changed from 1/60 to 1/250
  const [settingToChange, setSettingToChange] =
    useState<ExposureSetting>('aperture');
  const [newValue, setNewValue] = useState<string>('16'); // Set default to f16

  // Find the closest standard shutter speed value to the calculated seconds
  const findClosestShutterSpeed = useCallback((seconds: number): string => {
    // Convert all standard shutter speeds to decimal seconds for comparison
    const decimalShutterSpeeds = SHUTTER_SPEED_VALUES.map((speed) => ({
      original: speed.value,
      decimal: parseShutterSpeed(speed.value),
    }));

    // Find the closest value
    const closest = decimalShutterSpeeds.reduce((prev, curr) => {
      return Math.abs(curr.decimal - seconds) < Math.abs(prev.decimal - seconds)
        ? curr
        : prev;
    });

    return closest.original;
  }, []);

  // Calculate new settings based on the exposure value and the changed setting
  const calculateEquivalentExposure = useMemo((): EquivalentExposure | null => {
    if (!aperture || !iso || !shutterSpeed || !newValue) return null;

    try {
      // Parse current values
      const apertureValue = parseFloat(aperture);
      const isoValue = parseInt(iso);
      const speedSeconds = parseShutterSpeed(shutterSpeed);

      // Calculate the current exposure value
      const currentEV = calculateEV(apertureValue, isoValue, speedSeconds);

      // Calculate new settings based on the setting being changed
      if (settingToChange === 'aperture') {
        const newAperture = parseFloat(newValue);

        // New settings
        const newIso = iso;
        // Calculate the exact shutter speed in decimal seconds
        const newSpeedSeconds =
          speedSeconds * Math.pow(newAperture / apertureValue, 2);
        // Find the closest standard shutter speed
        const standardShutterSpeed = findClosestShutterSpeed(newSpeedSeconds);

        return {
          aperture: newValue,
          iso: newIso,
          shutterSpeed: standardShutterSpeed,
          ev: currentEV.toFixed(1),
        };
      } else if (settingToChange === 'iso') {
        const newIsoValue = parseInt(newValue);

        // New settings
        const newAperture = aperture;
        // Calculate the exact shutter speed in decimal seconds
        const newSpeedSeconds = speedSeconds * (isoValue / newIsoValue);
        // Find the closest standard shutter speed
        const standardShutterSpeed = findClosestShutterSpeed(newSpeedSeconds);

        return {
          aperture: newAperture,
          iso: newValue,
          shutterSpeed: standardShutterSpeed,
          ev: currentEV.toFixed(1),
        };
      } else if (settingToChange === 'shutterSpeed') {
        const newSpeedSeconds = parseShutterSpeed(newValue);

        // New settings
        const newAperture =
          apertureValue * Math.sqrt(speedSeconds / newSpeedSeconds);
        const newIso = iso;

        // Round to nearest standard aperture if close
        const apertureValues = APERTURE_VALUES.map((item) => item.value);
        const closestAperture = findClosestValue(newAperture, apertureValues);

        return {
          aperture: parseFloat(closestAperture).toFixed(1).replace(/\.0$/, ''),
          iso: newIso,
          shutterSpeed: newValue,
          ev: currentEV.toFixed(1),
        };
      }
    } catch {
      //
    }

    return null;
  }, [
    aperture,
    iso,
    shutterSpeed,
    settingToChange,
    newValue,
    findClosestShutterSpeed,
  ]);

  return {
    aperture,
    setAperture,
    iso,
    setIso,
    shutterSpeed,
    setShutterSpeed,
    settingToChange,
    setSettingToChange,
    newValue,
    setNewValue,
    equivalentExposure: calculateEquivalentExposure,
  };
};

export default useCameraExposureCalculator;
