import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  extra.EXPO_PUBLIC_SUPABASE_URL ||
  'https://hvufqrkwyldyipvipmmi.supabase.co';

const SUPABASE_ANON =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dWZxcmt3eWxkeWlwdmlwbW1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTk3ODgsImV4cCI6MjA5Mzg5NTc4OH0.9mAIN-X5unXJpvH336siBcmzMDRnJI3VsBOTMAUFvzE';

const isWeb = Platform.OS === 'web';

const SecureStorageAdapter = {
  getItem:    (key: string)              => SecureStore.getItemAsync(key),
  setItem:    (key: string, val: string) => SecureStore.setItemAsync(key, val),
  removeItem: (key: string)              => SecureStore.deleteItemAsync(key),
};

// On web, AsyncStorage can silently hang during Supabase session persistence.
// Use localStorage directly — synchronous ops wrapped in resolved promises.
const WebStorageAdapter = {
  getItem:    (key: string)              => Promise.resolve(localStorage.getItem(key)),
  setItem:    (key: string, val: string) => Promise.resolve(localStorage.setItem(key, val)),
  removeItem: (key: string)              => Promise.resolve(localStorage.removeItem(key)),
};

const storage = isWeb ? WebStorageAdapter : SecureStorageAdapter;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: storage as never,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
  global: {
    headers: {
      'x-csupply-client': Platform.OS,
    },
  },
});
