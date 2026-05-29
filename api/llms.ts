// /llms.txt — for AI assistants (Claude, ChatGPT, Gemini, Perplexity).
// https://llmstxt.org spec.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://hvufqrkwyldyipvipmmi.supabase.co';
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_17QMKTuaNLw_gocT9pEzJQ_SJJ6MwRu';

const ORIGIN = 'https://csupply.in';

export default async function handler(_req: any, res: any) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const [{ data: cats }, { data: products }, { data: cities }] = await Promise.all([
    supabase.from('categories').select('name, slug').eq('is_active', true).order('priority', { ascending: false }),
    supabase
      .from('products')
      .select('name, slug, brand, base_price, unit')
      .eq('status', 'active')
      .limit(50),
    supabase.schema('geography').from('cities').select('name, slug').eq('is_active', true),
  ]);

  const md: string[] = [
    '# C-Supply',
    '',
    '> India\'s vertical marketplace for construction materials. Cement, steel, sand, aggregate, bricks, paints and TMT bars from verified suppliers, with same-day delivery, GST invoicing, and live tracking.',
    '',
    '- Built for: Builders, contractors, developers, retail customers across India.',
    '- Three sides: Customers (buyers), Vendors (suppliers), Transporters (logistics).',
    '- Pricing: INR (Indian Rupee). GST invoicing supported.',
    '- Delivery: Same-day in serviceable cities; scheduled across India.',
    '',
    '## Categories',
    ...(cats ?? []).map((c) => `- [${c.name}](${ORIGIN}/category/${c.slug}): Genuine, brand-verified ${c.name.toLowerCase()} in bulk MOQ tiers.`),
    '',
    '## Featured products',
    ...(products ?? []).map(
      (p) => `- [${p.name}](${ORIGIN}/product/${p.slug}): ${p.brand ?? 'C-Supply'} ${p.unit} — starting at INR ${p.base_price}`
    ),
    '',
    '## Service cities',
    ...(cities ?? []).map((c) => `- [${c.name}](${ORIGIN}/city/${c.slug ?? ''})`),
    '',
    '## Programmatic information',
    `- Sitemap: ${ORIGIN}/sitemap.xml`,
    `- Robots: ${ORIGIN}/robots.txt`,
    `- Contact: support@csupply.in`,
    '',
    '## How C-Supply works',
    '1. Customer browses by category or material name.',
    '2. Adds to cart with MOQ-aware quantity.',
    '3. Checks out via 7-step booking with GST, delivery time and vehicle entry slip.',
    '4. Vendor accepts; transporter accepts; live tracking from pickup to drop.',
    '5. Photo + WhatsApp OTP confirms delivery; payment is captured.',
  ];

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400');
  res.status(200).send(md.join('\n'));
}
