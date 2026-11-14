# The app's local Expo module (apps/mobile/modules/dorkroom-shared), found by
# expo-modules-autolinking because it sits under apps/mobile/modules/.
Pod::Spec.new do |s|
  s.name           = 'DorkroomShared'
  s.version        = '1.0.0'
  s.summary        = 'App Group UserDefaults and Control Center reloads for Dorkroom'
  s.description    = s.summary
  s.license        = 'AGPL-3.0-only'
  s.author         = 'Dorkroom'
  s.homepage       = 'https://dorkroom.art'
  s.platforms      = { :ios => '26.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
