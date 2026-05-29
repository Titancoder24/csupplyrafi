import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getProductImage } from './productImage';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const CSE_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_CSE_KEY || extra.EXPO_PUBLIC_GOOGLE_CSE_KEY || '';
const CSE_CX =
  process.env.EXPO_PUBLIC_GOOGLE_CSE_CX  || extra.EXPO_PUBLIC_GOOGLE_CSE_CX  || '';

const CACHE_PREFIX = 'gimg:v1:';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const memCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

type Cached = { url: string; ts: number };

function fallback(query: string): string {
  return getProductImage(query);
}

export function hasGoogleImageSearch(): boolean {
  return !!CSE_KEY && !!CSE_CX;
}

export async function fetchGoogleImage(query: string): Promise<string> {
  const key = query.trim().toLowerCase();
  if (!key) return fallback(query);
  if (memCache.has(key)) return memCache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const storageKey = CACHE_PREFIX + key;

  const promise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Cached;
        if (parsed?.url && Date.now() - parsed.ts < CACHE_TTL_MS) {
          memCache.set(key, parsed.url);
          return parsed.url;
        }
      }
    } catch {}

    if (!hasGoogleImageSearch()) {
      const url = fallback(query);
      memCache.set(key, url);
      return url;
    }

    try {
      const url =
        'https://www.googleapis.com/customsearch/v1' +
        `?key=${encodeURIComponent(CSE_KEY)}` +
        `&cx=${encodeURIComponent(CSE_CX)}` +
        '&searchType=image' +
        '&num=1' +
        '&safe=active' +
        '&imgSize=large' +
        `&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`CSE ${res.status}`);
      const json = (await res.json()) as { items?: { link?: string }[] };
      const link = json.items?.[0]?.link;
      if (!link) throw new Error('no result');
      memCache.set(key, link);
      AsyncStorage.setItem(storageKey, JSON.stringify({ url: link, ts: Date.now() } as Cached)).catch(() => {});
      return link;
    } catch {
      const url = fallback(query);
      memCache.set(key, url);
      return url;
    }
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
