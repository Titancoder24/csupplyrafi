import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'C-Supply',
  slug: 'csupply',
  scheme: 'csupply',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0F4C81',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'in.csupply.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'C-Supply uses your location to suggest delivery addresses and to track deliveries.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'C-Supply uses your location to deliver materials to your site and let you track delivery progress.',
      NSCameraUsageDescription:
        'C-Supply needs camera access to capture photo proof of delivery.',
      NSPhotoLibraryUsageDescription:
        'C-Supply needs photo library access to upload product images and documents.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0F4C81',
    },
    package: 'in.csupply.app',
    permissions: [
      'CAMERA',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
    name: 'C-Supply | Construction Materials, Delivered',
    shortName: 'C-Supply',
    description:
      'India\'s vertical marketplace for cement, steel, sand, aggregate, bricks, paints, TMT bars and more. Same-day delivery, GST invoicing, verified suppliers.',
    themeColor: '#0F4C81',
    backgroundColor: '#FFFFFF',
    lang: 'en-IN',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-camera',
      {
        cameraPermission: 'C-Supply needs camera access to capture proof of delivery photos.',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'C-Supply uses your location for delivery and live tracking.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'C-Supply needs photo access to upload product images.',
      },
    ],
    'expo-font',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: 'https://csupply.in',
    },
    EXPO_PUBLIC_SUPABASE_URL:
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      'https://hvufqrkwyldyipvipmmi.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      'sb_publishable_17QMKTuaNLw_gocT9pEzJQ_SJJ6MwRu',
  },
});
