import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://hvufqrkwyldyipvipmmi.supabase.co';
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_17QMKTuaNLw_gocT9pEzJQ_SJJ6MwRu';

const ORIGIN = 'https://csupply.in';

export default async function handler(_req: any, res: any) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const [products, categories, cities] = await Promise.all([
    supabase.from('products').select('slug, updated_at').eq('status', 'active'),
    supabase.from('categories').select('slug, updated_at').eq('is_active', true),
    supabase.schema('geography').from('cities').select('slug, updated_at').eq('is_active', true),
  ]);

  const urls: Array<{ loc: string; lastmod?: string; priority?: number; changefreq?: string }> = [
    { loc: `${ORIGIN}/`, priority: 1, changefreq: 'daily' },
    { loc: `${ORIGIN}/about`, priority: 0.5, changefreq: 'monthly' },
    { loc: `${ORIGIN}/contact`, priority: 0.5, changefreq: 'monthly' },
    { loc: `${ORIGIN}/blog`, priority: 0.7, changefreq: 'weekly' },
  ];
  for (const c of categories.data ?? []) {
    urls.push({
      loc: `${ORIGIN}/category/${c.slug}`,
      lastmod: c.updated_at as string,
      priority: 0.8,
      changefreq: 'weekly',
    });
  }
  for (const p of products.data ?? []) {
    urls.push({
      loc: `${ORIGIN}/product/${p.slug}`,
      lastmod: p.updated_at as string,
      priority: 0.7,
      changefreq: 'weekly',
    });
  }
  for (const c of cities.data ?? []) {
    if (c.slug) {
      urls.push({
        loc: `${ORIGIN}/city/${c.slug}`,
        lastmod: c.updated_at as string,
        priority: 0.6,
        changefreq: 'weekly',
      });
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}${
        u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : ''
      }${u.priority ? `\n    <priority>${u.priority}</priority>` : ''}\n  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
