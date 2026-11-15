# HANDOFF: picking the work back up

> Updated at the end of every phase. **Last updated: 2026-11-15, end of Faz 9 (MVP complete).**
> If you are opening this repo from another Claude account or session, read this file first, then `CLAUDE.md`, then
> `docs/DECISIONS.md`. Talk to the user in Turkish; code, variables and commit messages stay in English.

## 1. Where we are

| Faz | Status | What is in it |
|---|---|---|
| 0 | ✅ | pnpm monorepo, Next.js 16 web, FastAPI API, `packages/contracts` |
| 1 | ✅ | Design system (tokens, UI/data/chart components), `/styleguide` |
| 2 | ✅ | Real NASA POWER daily adapter, grid-cell cache (D-019) |
| 3 | ✅ | Supabase PostGIS schema + sample parcel, demo session, field CRUD, map (NASA GIBS + terra-draw), field overview, the user's Stitch design (D-020) |
| 4 | ✅ | `/fields/[id]/climate` NASA data center (90 days / 12 months / 3 years, CSV, "About this data") |
| 5 | ✅ | `/planning/water` FAO-56 water balance · `/planning/rotation` crop rotation comparison (D-025) |
| 6 | ✅ | `/twin` digital twin: observed season + 20 past seasons replayed, dry/normal/wet, A vs B crops (D-026) |
| 7 | ✅ | `/spray` AgriSpray concept: simulated sensors, synthetic spray-card measurement, Delta T + NASA wind (D-027) |
| 8 | ✅ | Cinematic landing: scroll-scrubbed frames from the user's video, 4 acts, real app preview at the end (D-028) |
| 9 | ✅ | `/summary` + demo flow + A4 print; `e2e/` Playwright + axe suite, 21 tests green (D-029) | `/summary` + QA (Playwright + axe, 390 px mobile check, prod smoke test) |

Every page is built; `ComingSoon` is no longer used. Specs: `docs/PRODUCT_SCOPE.md`, `docs/UI_UX_DESIGN.md`,
`docs/ANALYSIS_AI.md` (§3 digital twin, §4 AgriSpray), `apps/web/task.md`, `services/api/task.md`.

Deploy: the user connected Render (API, `render.yaml`) and Vercel (web, root `apps/web`). **Claude does not wire up
services or env values; the user does.**

## 2. Local setup (new machine)

```bash
git clone https://github.com/yunopo42/Sat2Soil.git && cd Sat2Soil
pnpm install                       # Node ≥ 24, pnpm 12
uv sync --directory services/api   # Python 3.13
cp services/api/.env.example services/api/.env
cp apps/web/.env.example apps/web/.env.local
```

`services/api/.env` needs values **from the user** (never in git, never typed back into chat):
- `DATABASE_URL`: the Supabase **session pooler** string (IPv4, `aws-0-eu-west-3.pooler.supabase.com:5432`), D-021.
- `DEMO_SESSION_SECRET`: generate locally: `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- Without `DATABASE_URL` the API still serves `/v1/nasa/power/daily`, but field endpoints return 503.

Run: `pnpm dev` (web :3000) and `pnpm api:dev` (API :8000, `/docs`). Database: `pnpm db:migrate --seed`.
Before every commit: `pnpm check` and `pnpm build`.

## 3. Things that will bite you

- **Next.js 16 differs from training data.** Read `apps/web/node_modules/next/dist/docs/` before writing Next code.
  `src/proxy.ts`, not middleware; root layout is `src/app/[locale]/layout.tsx`; locale via `next/root-params`.
- UI text lives **only** in `apps/web/messages/{en,tr}.json`; keep both files key-identical.
- Tailwind default palette is disabled; use tokens from `src/styles/globals.css` only.
- Windows: run the API with `--reload` (psycopg async needs the Selector loop). If uvicorn reload hangs, restart it.
- The Turkish `İ` in the local path breaks ESLint ignore globs → lint scans `src/` only.
- MapLibre worker is copied to `public/vendor` by a postinstall script; the map container needs `h-full w-full`.
- Every data view carries `SourceBadge` + `ProvenanceFooter`; missing value = `null` → "—", never 0.

## 4. Analysis engines in short

- Engines (pure, unit-tested): `services/api/app/engines/{crops,water,rotation,scenario,spray}.py`.
- Service: `services/api/app/services/agronomy.py` loads POWER per grid cell (760 days, or 22 years for the twin).
- Endpoints: `GET /v1/crops`, `GET /v1/fields/{id}/water-balance`, `GET /v1/fields/{id}/rotation`,
  `POST /v1/fields/{id}/rotation/compare`, `GET /v1/fields/{id}/twin?crop_a=&crop_b=`,
  `GET /v1/fields/{id}/agrispray`, `GET /v1/agrispray/spray-cards/example?variant=even|uneven|sparse`.
- Web: `apps/web/src/app/[locale]/(app)/fields/[id]/{planning/water,planning/rotation,twin,spray}/`.
- Landing hero: `src/components/landing/cinematic-hero.tsx` + frames in `public/landing/frames/{wide,tall}`.
  Regenerate frames from a new video with `python apps/web/scripts/extract-landing-frames.py video.mp4 --end <s>`
  (needs Pillow + imageio-ffmpeg). The final act shows real screenshots `public/images/app-preview-twin(-tr).webp`
  taken with headless Edge from the twin page; retake them if that page changes.
- QA: `pnpm e2e` runs `e2e/` (Python Playwright + pytest via uv, installed Edge, axe-core from node_modules).
  Needs `pnpm dev` and `pnpm api:dev` running. For production:
  `SAT2SOIL_E2E_BASE_URL=https://<vercel> SAT2SOIL_E2E_API_URL=https://<render> pnpm e2e`.

## 5. Open risks

- The DB password was shared in chat earlier: the user should reset it in Supabase and update `.env` + Render (D-021).
- POWER rainfall totals not yet compared with a ground station (D-019).
- Production verified 2026-11-15: e2e 21/21 green against https://sat2-soil.vercel.app and
  https://sat2soil-api.onrender.com. Render did **not** auto-deploy pushes: after a push, check the Render
  service's Events list and use Manual Deploy → Deploy latest commit if needed.
- Not yet done: 3-minute rehearsal on the live URL and a backup video (Q14).

## 6. Protocol at the end of each phase

1. `pnpm check` + `pnpm build` must pass.
2. Update `CLAUDE.md` §10, `docs/DECISIONS.md` (new D-xxx if anything was decided) and this file.
3. Commit (English, conventional) and **push** to `origin main`.
4. Give the user the resume prompt below (update the phase number).

### Resume prompt (copy into a new Claude Code session)

```text
Sat2Soil projesine devam ediyoruz (https://github.com/yunopo42/Sat2Soil, dal main).
Önce docs/HANDOFF.md, sonra CLAUDE.md ve docs/DECISIONS.md dosyalarını oku; kurallara aynen uy.
Faz 0–9 tamam (MVP), canlıda doğrulandı (e2e 21/21). Açık işler: sunum provası (Q14),
P1 fikirleri (apps/web/task.md "P1 sonra"). P1 işleri onayım olmadan başlamaz.
Kurulum eksikse HANDOFF §2'yi uygula; services/api/.env değerlerini bana sor, kendin uydurma.
Benimle Türkçe konuş. Her iş sonunda pnpm check + pnpm build (+ pnpm e2e), commit + push, HANDOFF.md'yi güncelle.
```
