# Battery Lab · Catcher Dashboard

Video rep review and catcher tracking for Battery Lab × 5 Tool Performance.

| Screen | What it does |
|---|---|
| **Rep Review** | Upload drill clips, step frame by frame, draw (pen / arrow / circle / angle), pin timed feedback, score the rep, measure pop time from video, and **record a coach review** (screen + drawings + voice) as a new clip. |
| **Zone Game** | Log each pitch's location and call; framing points, rounds of 20, heat map, TrackMan CSV import. |
| **Blocking Map** | 3×3 dirt map, 10-ball gauntlet scoring, block rate by spot. |
| **Catcher Page** | Pop time, exchange, block rate, edge strike rate, this week's work, latest notes. |
| **Strike/Ball Model** | Plan and progress toward a model that calls pitches from video. |

The original single-file mockup is in [`mockup/catcher-lab.html`](mockup/catcher-lab.html).

## Run it locally

Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. With no Supabase keys it runs in **demo mode**: sample data, and anything you upload or log stays in that browser tab until you reload.

**Recording a coach review** uses the microphone, which browsers only allow on `localhost` or `https://` sites.

## Stack

- **React + TypeScript + Vite**: the web app (`src/`)
- **Cloudflare Workers** (static assets): hosting
- **Supabase**: logins, Postgres database, access rules (`supabase/schema.sql`)
- **Cloudflare Stream**: video storage, conversion of phone video, and playback

## Deploy to Cloudflare

Hosted as a Cloudflare Worker serving static files (config in `wrangler.jsonc`).

1. Push this folder to a GitHub repository.
2. Cloudflare dashboard → Workers & Pages → Create → Import a repository.
3. Build command `npm run build`, deploy command `npx wrangler deploy`.
4. Add the environment variables from `.env.example` as **build** variables (once Supabase exists).

Single-page routes (`/zone`, `/review?clip=…`) fall back to `index.html` via `not_found_handling` in `wrangler.jsonc`.

## Set up Supabase

1. Create a project at supabase.com.
2. SQL Editor → paste and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key.

## Project layout

```
src/
  domain/   scoring and rules: zone, blocking, timing, rubrics, types
  review/   video engine: playback, drawing layer, review recording, demo scene
  data/     app state (in memory for now) and sample data
  pages/    one file per screen
supabase/   database schema with row-level security
mockup/     original clickable mockup
```

## Roadmap

- [x] Starter app with all mockup screens, real coach review recording
- [ ] Supabase login, organizations and roles (admin, coach, catcher, parent)
- [ ] Upload to Cloudflare Stream (Pages Function that issues a direct upload URL)
- [ ] Save notes, drawings, scores, pitches and block reps to Supabase
- [ ] Per-catcher pages from real data; coach view across catchers
- [ ] Pilot with 5 Tool catchers
- [ ] TrackMan CSV ↔ clip matching for strike/ball model training data
