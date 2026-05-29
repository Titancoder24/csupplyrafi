# C-Supply

India's vertical marketplace for construction materials — built as a single React Native + Expo
codebase that targets **Web (Vercel), iOS, and Android** from one source tree.

## Stack

- **Frontend**: React Native 0.76 + Expo SDK 52 + Expo Router 4 (file-based routing)
- **Web**: Expo for Web (React Native Web), deployed to Vercel as a static SPA + serverless `/api/*` endpoints
- **Styling**: NativeWind v4 (Tailwind for React Native) + a runtime CMS theme overlay
- **State**: Zustand (UI / cart / booking) + TanStack Query (server cache)
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) — no separate Node API
- **Maps**: OpenStreetMap stack (Nominatim, OSRM) behind a `MapProvider` interface — Google Maps swappable
- **Auth**: Phone OTP (operational roles) + email/password + TOTP (admin/super-admin)
- **Build**: EAS Build for iOS/Android, `expo export --platform web` for the web bundle

## Project layout

```
app/                       Expo Router routes
  index.tsx                Public marketing home
  about.tsx, blog.tsx, contact.tsx, privacy.tsx, terms.tsx
  category/[slug].tsx      Catalog listing (public)
  product/[slug].tsx       Product detail (public)
  city/[slug].tsx          City landing pages (programmatic SEO)
  auth/login.tsx           OTP entry
  auth/verify.tsx          OTP verification
  role-redirect.tsx        Sends signed-in users to their dashboard
  customer/                Bottom-tab customer surface
    home, orders, cart, account, search, calculator, notifications, profile, ...
    book/                  7-step booking wizard (address, gst, material, time, vehicle-entry, review, confirm)
  vendor/                  15-step onboarding + dashboard
  transporter/             12-step onboarding + dashboard
  admin/                   Operations dashboard
  superadmin/              CMS, theme editor, SEO, AI crawler permissions
src/
  components/ui/           Button, Card, Input, Pill, Header, Stepper, Screen, ...
  components/catalog/      Catalog-specific components
  features/                Feature-scoped state (vendor onboarding, transporter onboarding)
  hooks/                   TanStack Query hooks (catalog, orders, ...)
  lib/                     Pure helpers (format INR, quote engine)
  services/
    supabase.ts            Configured Supabase client
    auth/                  Auth provider, OTP send/verify
    map/                   MapProvider interface + OSM implementation
  stores/                  Zustand stores (cart, booking)
  theme/                   tokens + ThemeProvider (Realtime CMS overrides)
api/                       Vercel serverless functions
  robots.ts                /robots.txt — driven by Super Admin CMS
  sitemap.ts               /sitemap.xml — products + categories + cities
  llms.ts                  /llms.txt and /ai.txt — for AI assistants
public/                    Static assets served by Vercel
supabase/                  Migrations + seed data (see Supabase MCP)
```

## Environment

Copy `.env.example` to `.env` and fill in:

```
EXPO_PUBLIC_SUPABASE_URL=https://hvufqrkwyldyipvipmmi.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_17QMKTuaNLw_gocT9pEzJQ_SJJ6MwRu
```

The Supabase project (`csupplycloud`, ref `hvufqrkwyldyipvipmmi`) was provisioned via the
Supabase MCP server and ships with:

- Full schema (profiles, vendors, transporters, products, orders, payments, payouts, reviews)
- RLS policies (customer reads own; vendor/transporter scoped; admins read all; super_admin writes CMS)
- CMS schema (theme_config, content_blocks, media_library, feature_flags, notification_templates,
  routes registry, iconsets) wired to a Realtime channel — UI updates without restart
- SEO schema (route_metadata, crawler_permissions for GPTBot/ClaudeBot/Google-Extended/PerplexityBot/...)
- Geography (cities, zones, pincodes, vehicle_time_rules) and pricing rules
- Audit log + analytics rollups
- Seeded categories (10), brands (8), cities (10), and 12 demo products

## Running locally

```
npm install
npm start              # Expo dev server (mobile + web)
npm run web            # web only
npm run build:web      # production web export to dist/
```

## Deployment

- **Web**: `vercel deploy` reads `vercel.json` which builds the Expo web export and wires `/robots.txt`,
  `/sitemap.xml`, and `/llms.txt` to the serverless functions in `api/`.
- **iOS / Android**: `eas build --profile production` and `eas submit`.

## Roles

| Role | How they sign in | Surface |
|---|---|---|
| Customer | Phone OTP | `/customer/*` (bottom tabs) |
| Vendor | Phone OTP + 4-digit passcode | `/vendor/*` |
| Transporter | Phone OTP + 4-digit passcode | `/transporter/*` |
| Admin | Email + password + TOTP | `/admin/*` |
| Super Admin | Email + password + TOTP + WebAuthn (optional) | `/superadmin/*` |

## Demo allowlist

When `cms.feature_flags.demo_mode_enabled = true`, the following phone numbers accept OTP `123456`
and skip the SMS send step:

- `+91 90000 00001` — Demo Customer
- `+91 90000 00002` — Demo Vendor
- `+91 90000 00003` — Demo Transporter
- `+91 90000 00004` — Demo Admin
- `+91 90000 00005` — Demo Super Admin

## Theming

The Super Admin theme editor (`/superadmin/cms/theme`) writes to `cms.theme_config`. Every connected
client subscribes to the `cms.theme_config` Realtime channel — saving a theme broadcasts the new
tokens and every screen rebuilds without a reload.

## Programmatic SEO / GEO / AEO

- `/sitemap.xml` is regenerated on every request from live data.
- `/robots.txt` and `/llms.txt` are generated from the `seo.crawler_permissions` table — Super
  Admin can toggle GPTBot, ClaudeBot, Google-Extended, PerplexityBot, etc. with one click.
- `/category/[slug]`, `/product/[slug]`, and `/city/[slug]` are rendered with full metadata so
  AI assistants and search engines can index them.
- The `seo.route_metadata` table holds title, description, OG tags, JSON-LD per route. Super
  Admin edits via `/superadmin/seo/routes`.

## Provider abstractions

- `MapProvider` (`src/services/map/MapProvider.ts`) — OSM today; Google Maps drop-in tomorrow.
- `AuthProvider` (`src/services/auth/AuthProvider.tsx`) — Supabase phone OTP today; demo allowlist
  for pre-launch / sales demos. Toggle via `cms.feature_flags.demo_mode_enabled`.

## License

Proprietary — © C-Supply. All rights reserved.
