import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import {
  useCameraExposureCalculator,
  ExposureSetting,
} from '@/hooks/useCameraExposureCalculator';
import {
  APERTURE_VALUES,
  ISO_VALUES,
  SHUTTER_SPEED_VALUES,
} from '@/constants/exposure';
import { Box, Text } from '@gluestack-ui/themed';
import { CalculatorLayout } from '@/components/ui/layout/CalculatorLayout';
import {
  ResultsSection,
  ResultRow,
} from '@/components/ui/calculator/ResultsSection';
import { FormSection, FormGroup } from '@/components/ui/forms/FormSection';
import {
  InfoSection,
  InfoText,
  InfoSubtitle,
} from '@/components/ui/calculator/InfoSection';
import { PlatformSelect } from '@/components/ui/select/PlatformSelect';

export default function CameraExposureCalculator() {
  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

  const {
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
    equivalentExposure,
  } = useCameraExposureCalculator();

  const settingOptions = [
    { label: 'Aperture', value: 'aperture' as ExposureSetting },
    { label: 'ISO', value: 'iso' as ExposureSetting },
    { label: 'Shutter Speed', value: 'shutterSpeed' as ExposureSetting },
  ];

  const getNewValueOptions = () => {
    switch (settingToChange) {
      case 'aperture':
        return APERTURE_VALUES;
      case 'iso':
        return ISO_VALUES;
      case 'shutterSpeed':
        return SHUTTER_SPEED_VALUES;
      default:
        return [];
    }
  };

  const infoSection = (
    <InfoSection title="About This Tool">
      <InfoText>
        The camera exposure calculator helps you find equivalent exposures when
        you want to change one aspect of your exposure triangle (aperture, ISO,
        or shutter speed) while maintaining the same overall exposure.
      </InfoText>

      <InfoSubtitle>How to Use:</InfoSubtitle>
      <InfoText>
        1. Enter your current camera settings (aperture, ISO, and shutter speed)
      </InfoText>
      <InfoText>2. Select which setting you want to change</InfoText>
      <InfoText>3. Choose the new value for that setting</InfoText>
      <InfoText>
        4. The calculator will show equivalent settings that maintain the same
        exposure
      </InfoText>

      <InfoSubtitle>The Exposure Triangle:</InfoSubtitle>
      <InfoText>
        • Aperture: Controls depth of field. Lower number = larger opening =
        more light
      </InfoText>
      <InfoText>
        • ISO: Controls sensitivity. Higher number = more sensitivity = more
        noise
      </InfoText>
      <InfoText>
        • Shutter Speed: Controls motion blur. Faster speed = less motion blur =
        less light
      </InfoText>

      <InfoSubtitle>Notes:</InfoSubtitle>
      <InfoText>
        • Calculated shutter speeds are automatically rounded to the nearest
        standard camera value (e.g., 1/125, 1/60, 1/30, etc.)
      </InfoText>
      <InfoText>
        • Aperture values are also rounded to standard f-stops when changing
        shutter speed
      </InfoText>
      <InfoText>
        • Default values (f/5.6, ISO 100, 1/250s) with aperture change to f/16
        are pre-loaded for quick reference
      </InfoText>
    </InfoSection>
  );

  return (
    <CalculatorLayout
      title="Camera Exposure Calculator"
      infoSection={infoSection}
    >
      <ResultsSection title="Equivalent Exposure" show={!!equivalentExposure}>
        <ResultRow
          label="Aperture"
          value={`f/${equivalentExposure?.aperture}`}
        />
        <ResultRow label="ISO" value={equivalentExposure?.iso || ''} />
        <ResultRow
          label="Shutter Speed"
          value={`${equivalentExposure?.shutterSpeed}s`}
        />
        <ResultRow
          label="Exposure Value"
          value={`EV ${equivalentExposure?.ev}`}
          isLast
        />
      </ResultsSection>

      <FormSection>
        <Box style={[isMobile ? styles.mobileFormColumns : {}]}>
          <Box style={[isMobile ? styles.mobileFormColumn : styles.fullWidth]}>
            <Text
              className="mb-4 text-lg font-semibold"
              style={styles.sectionTitle}
            >
              Current Settings
            </Text>

            <FormGroup label="Aperture">
              <PlatformSelect
                value={aperture}
                onValueChange={setAperture}
                items={APERTURE_VALUES}
              />
            </FormGroup>

            <FormGroup label="ISO">
              <PlatformSelect
                value={iso}
                onValueChange={setIso}
                items={ISO_VALUES}
              />
            </FormGroup>

            <FormGroup label="Shutter Speed">
              <PlatformSelect
                value={shutterSpeed}
                onValueChange={setShutterSpeed}
                items={SHUTTER_SPEED_VALUES}
              />
            </FormGroup>
          </Box>

          <Box style={[isMobile ? styles.mobileFormColumn : styles.fullWidth]}>
            <Text
              className="mb-4 text-lg font-semibold"
              style={styles.sectionTitle}
            >
              Change Setting
            </Text>

            <FormGroup label="Setting to Change">
              <PlatformSelect
                value={settingToChange}
                onValueChange={setSettingToChange as (value: string) => void}
                items={settingOptions}
              />
            </FormGroup>

            <FormGroup label="New Value">
              <PlatformSelect
                value={newValue}
                onValueChange={setNewValue}
                items={getNewValueOptions()}
              />
            </FormGroup>
          </Box>
        </Box>
      </FormSection>
    </CalculatorLayout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
    fontWeight: '600',
  },
  mobileFormColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  mobileFormColumn: {
    flex: 1,
    width: '48%',
  },
  fullWidth: {
    width: '100%',
  },
});
