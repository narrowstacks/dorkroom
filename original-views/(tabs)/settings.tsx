import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { debugLog } from '@/utils/debugLogger';

export default function SettingsScreen() {
  const [selectedTheme, setSelectedTheme] = useState('system');
  const [selectedLengthUnit, setSelectedLengthUnit] = useState('inches');
  const [selectedVolumeUnit, setSelectedVolumeUnit] = useState('ml');

  // Placeholder functions for settings changes
  const handleThemeChange = (value: string) => {
    debugLog('Theme changed to:', value);
    setSelectedTheme(value);
  };

  const handleLengthUnitChange = (value: string) => {
    debugLog('Length unit changed to:', value);
    setSelectedLengthUnit(value);
  };

  const handleVolumeUnitChange = (value: string) => {
    debugLog('Volume unit changed to:', value);
    setSelectedVolumeUnit(value);
  };

  // Theme options
  const themeOptions = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
    { label: 'High Contrast', value: 'highContrast' },
    { label: 'Darkroom', value: 'darkroom' },
  ];

  const SettingsRow = ({
    children,
    isLast = false,
  }: {
    children: React.ReactNode;
    isLast?: boolean;
  }) => (
    <View
      className={`${
        !isLast ? 'border-b border-gray-200 dark:border-gray-700' : ''
      }`}
    >
      {children}
    </View>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text className="px-4 py-2 text-sm font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
      {title}
    </Text>
  );

  const SectionFooter = ({ text }: { text: string }) => (
    <Text className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">
      {text}
    </Text>
  );

  return (
    <View className="flex-1 bg-gray-100 dark:bg-black">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="pb-6 pt-4">
          <Text className="text-center text-2xl font-bold text-black dark:text-white">
            Settings
          </Text>
        </View>

        {/* Appearance Section */}
        <View className="mb-8">
          <SectionHeader title="Appearance" />
          <View className="mx-4 overflow-hidden rounded-lg bg-white dark:bg-gray-900">
            <SettingsRow>
              <View className="px-4 py-3">
                <Text className="mb-2 text-base font-medium text-black dark:text-white">
                  Theme
                </Text>
                <View className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <Picker
                    selectedValue={selectedTheme}
                    onValueChange={handleThemeChange}
                    style={{
                      height: Platform.OS === 'ios' ? 120 : 50,
                      width: '100%',
                    }}
                    itemStyle={
                      Platform.OS === 'ios'
                        ? {
                            height: 120,
                            fontSize: 16,
                            color: undefined, // Let the system handle the color
                          }
                        : undefined
                    }
                  >
                    {themeOptions.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </SettingsRow>
          </View>
        </View>

        {/* Units Section */}
        <View className="mb-8">
          <SectionHeader title="Units" />
          <View className="mx-4 overflow-hidden rounded-lg bg-white dark:bg-gray-900">
            {/* Length Unit */}
            <SettingsRow>
              <View className="px-4 py-4">
                <Text className="mb-3 text-base font-medium text-black dark:text-white">
                  Length
                </Text>
                <View className="flex-row rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                  <Pressable
                    className={`flex-1 rounded-md px-4 py-2 ${
                      selectedLengthUnit === 'inches'
                        ? 'bg-blue-500 dark:bg-blue-600'
                        : 'bg-transparent'
                    }`}
                    onPress={() => handleLengthUnitChange('inches')}
                  >
                    <Text
                      className={`text-center text-sm font-medium ${
                        selectedLengthUnit === 'inches'
                          ? 'text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Inches
                    </Text>
                  </Pressable>
                  <Pressable
                    className={`flex-1 rounded-md px-4 py-2 ${
                      selectedLengthUnit === 'mm'
                        ? 'bg-blue-500 dark:bg-blue-600'
                        : 'bg-transparent'
                    }`}
                    onPress={() => handleLengthUnitChange('mm')}
                  >
                    <Text
                      className={`text-center text-sm font-medium ${
                        selectedLengthUnit === 'mm'
                          ? 'text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Millimeters
                    </Text>
                  </Pressable>
                </View>
              </View>
            </SettingsRow>

            {/* Volume Unit */}
            <SettingsRow isLast>
              <View className="px-4 py-4">
                <Text className="mb-3 text-base font-medium text-black dark:text-white">
                  Volume
                </Text>
                <View className="flex-row rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                  <Pressable
                    className={`flex-1 rounded-md px-4 py-2 ${
                      selectedVolumeUnit === 'floz'
                        ? 'bg-blue-500 dark:bg-blue-600'
                        : 'bg-transparent'
                    }`}
                    onPress={() => handleVolumeUnitChange('floz')}
                  >
                    <Text
                      className={`text-center text-sm font-medium ${
                        selectedVolumeUnit === 'floz'
                          ? 'text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Fl. Oz / Gallons
                    </Text>
                  </Pressable>
                  <Pressable
                    className={`flex-1 rounded-md px-4 py-2 ${
                      selectedVolumeUnit === 'ml'
                        ? 'bg-blue-500 dark:bg-blue-600'
                        : 'bg-transparent'
                    }`}
                    onPress={() => handleVolumeUnitChange('ml')}
                  >
                    <Text
                      className={`text-center text-sm font-medium ${
                        selectedVolumeUnit === 'ml'
                          ? 'text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Milliliters / Liters
                    </Text>
                  </Pressable>
                </View>
              </View>
            </SettingsRow>
          </View>
          <SectionFooter text="Choose your preferred measurement units for the app." />
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
