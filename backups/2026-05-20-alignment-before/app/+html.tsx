import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Static HTML rendered for every web route by `expo export --platform web`.
 * Crawlers (Googlebot, Bingbot, GPTBot, ClaudeBot, etc.) read this even
 * before the React Native Web SPA hydrates.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en-IN">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#0F4C81" />
        <meta name="application-name" content="C-Supply" />
        <meta name="apple-mobile-web-app-title" content="C-Supply" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0F4C81" />

        {/* Default OG / Twitter tags (per-route metadata is overridden by Stack screens) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="C-Supply" />
        <meta property="og:locale" content="en_IN" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@csupplyin" />

        {/* JSON-LD: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'C-Supply',
              url: 'https://csupply.in',
              logo: 'https://csupply.in/assets/logo.png',
              sameAs: [
                'https://www.linkedin.com/company/csupply',
                'https://twitter.com/csupplyin',
              ],
              contactPoint: [
                {
                  '@type': 'ContactPoint',
                  contactType: 'customer service',
                  email: 'support@csupply.in',
                  telephone: '+91-1800-CSUPPLY',
                  availableLanguage: ['en', 'hi', 'te', 'ta'],
                },
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'C-Supply',
              url: 'https://csupply.in',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://csupply.in/search?q={query}',
                'query-input': 'required name=query',
              },
            }),
          }}
        />

        <ScrollViewStyleReset />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="alternate" type="application/rss+xml" title="C-Supply Blog RSS" href="/rss.xml" />
        <link rel="canonical" href="https://csupply.in/" />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
  body { background-color: #F8FAFC; }
  @media (prefers-color-scheme: dark) { body { background-color: #0F172A; } }
  noscript { display: block; padding: 24px; font-family: Inter, system-ui, sans-serif; max-width: 720px; margin: 0 auto; }
`;
