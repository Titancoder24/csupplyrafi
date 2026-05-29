import { useEffect, useState } from 'react';
import { fetchGoogleImage } from '@/lib/googleImageSearch';
import { getProductImage } from '@/lib/productImage';

export function useGoogleImage(query: string | null | undefined): string {
  const fallback = getProductImage(query ?? '');
  const [uri, setUri] = useState<string>(fallback);

  useEffect(() => {
    if (!query) {
      setUri(fallback);
      return;
    }
    let cancelled = false;
    fetchGoogleImage(query).then((url) => {
      if (!cancelled) setUri(url);
    });
    return () => { cancelled = true; };
  }, [query]);

  return uri;
}
