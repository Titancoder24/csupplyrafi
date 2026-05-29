// Vercel serverless: dynamic /robots.txt driven by SEO crawler permissions in Supabase.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://hvufqrkwyldyipvipmmi.supabase.co';
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_17QMKTuaNLw_gocT9pEzJQ_SJJ6MwRu';

export default async function handler(req: any, res: any) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data } = await supabase
    .schema('seo')
    .from('crawler_permissions')
    .select('user_agent, allowed, paths');

  const lines: string[] = [];
  lines.push('# C-Supply robots.txt — driven by Super Admin CMS');
  lines.push('# Updated: ' + new Date().toISOString());
  lines.push('');

  if (data) {
    for (const row of data) {
      lines.push(`User-agent: ${row.user_agent}`);
      if (row.allowed) {
        for (const p of row.paths ?? ['/']) {
          lines.push(`Allow: ${p}`);
        }
      } else {
        lines.push('Disallow: /');
      }
      lines.push('');
    }
  }

  lines.push('User-agent: *');
  lines.push('Allow: /');
  lines.push('');
  lines.push('Sitemap: https://csupply.in/sitemap.xml');
  lines.push('Sitemap: https://csupply.in/llms.txt');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(lines.join('\n'));
}
