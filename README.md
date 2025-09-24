# Manga Maker

Manga Maker (UI label: **MangaMatic**) is a full-stack playground for building four-panel comics with Google Gemini 2.5. The app guides you from a short overview prompt to a finished page by chaining script generation, character reference creation, panel image synthesis, and final layout preview.

## Features
- Automated pipeline: generate a 4-panel script, optional characters, and panel art in one flow.
- Character builder: upload reference sketches or let Gemini sketch monochrome or color presets.
- Built-in canvas: rough out compositions, overwrite generated panels, and export PNGs with or without speech bubbles.
- Multilingual UI: toggle between English and Japanese copy via the in-app language switcher.
- Modern stack: React 19 + Vite 7 + Hono SSR, Tailwind CSS v4, and `@google/genai` (Gemini 2.5 Pro & Flash Image Preview models).
- Cloud-ready: respects `PORT`/`HOST` for Cloud Run and pulls secrets from environment variables or Google Secret Manager when available.

## Requirements
- Node.js 20+ (Node 22 LTS recommended) or Bun ≥ 1.2 if you prefer Bun workflows.
- A Google Gemini API key (AI Studio or Vertex AI). Export it as `GEMINI_API_KEY`, or supply `GOOGLE_API_KEY` / `GOOGLE_GENAI_API_KEY` if you use alternate naming.

## Quick Start (ローカル開発)
```bash
git clone https://github.com/kiyo-e/manga-maker.git
cd manga-maker
npm install              # または bun install
export GEMINI_API_KEY=your-key
npm run dev              # または bun run dev
```
Access the app at http://localhost:5173/. The Vite dev server (HMR) and Hono SSR/API share the same port via `@hono/vite-dev-server`. Set `VITE_HOST=0.0.0.0` when exposing the dev server on your LAN.

## Build & Run
- `npm run build` – Runs both `build:client` (Vite) and `build:server` (TypeScript → `dist/server`).
- `npm run start:prod` – Starts the compiled Node server (`dist/server/server/node.js`). Override `PORT`/`HOST` as needed, e.g. `PORT=8080 npm run start:prod`.
- `npm run preview` – Serves the built client bundle via `vite preview` (API routes not available; use `start:prod` for end-to-end testing).

### Script Reference
- `npm run build:client` – Client-only build (emits `dist/client` assets consumed by the SSR renderer).
- `npm run build:server` – Server build used by Cloud Run / Node runtime.

## Environment & Secrets
- Primary key: `GEMINI_API_KEY`.
- Alternates: `GOOGLE_API_KEY`, `GOOGLE_GENAI_API_KEY` (checked when the primary is missing).
- File fallbacks: point `GEMINI_API_KEY_FILE` (or corresponding GOOGLE_* vars) at a mounted file containing the key.
- Google Secret Manager: set `GEMINI_API_KEY_SECRET` (either a short name or a fully qualified resource). When deployed on Cloud Run with Workload Identity, the server attempts to resolve the secret automatically.
- Diagnostics: `GET /v1/debug/env` reports whether a key is resolved without exposing the value.

## API Overview
- `POST /v1/script/generate` – Returns 4-panel script JSON and suggested character metadata. Body includes `overall_desc`, `tone`, and `use_character_b`.
- `POST /v1/generate/character` – Produces a square character portrait (data URL). Accepts `name`, `style_preset`, `prompt`, and optional `ref_data_urls` (data URLs from uploads).
- `POST /v1/generate/panels` – Generates selected panels. Provide `indexes`, `panels`, `characters`, optional `options.style_tone`, and embedded canvas sketches via `canvas_data_url`.
- `GET /v1/debug/env` – Lightweight health endpoint for verifying Gemini key availability.

All endpoints expect/return JSON. Image responses are Base64 data URLs to simplify client-side compositing.

## UI Highlights
- Overview prompt presets: choose comedic beats (e.g., 起承転結, running gag).
- Shot guidance per panel: wide, close-up, over-the-shoulder, etc.
- Art style presets: halftone monochrome, gekiga, webtoon color, and more.
- Speech bubble composer: export clean art or layout with dialogue baked in.

## Docker
- **Development**: `docker compose up dev` mounts the repository, installs dependencies, and runs `bun run dev` on port 5173.
- **Custom images**: The provided `Dockerfile` is tuned for the dev workflow (Bun + Vite). For production, extend it with a build stage (`npm run build`) and run `node dist/server/server/node.js` in the final stage.

## Project Layout
- `src/index.tsx` – Hono app entry, SSR renderer hook-up, static asset serving in production.
- `src/api.ts` – REST API for scripts, characters, and panel generation plus environment resolution helpers.
- `src/gemini.ts` – Google Gemini client utilities (Gemini 2.5 Pro for text, Flash Image Preview for images).
- `src/renderer.tsx` – Server-side `<html>` shell using `@hono/react-renderer` and `vite-ssr-components`.
- `src/client/` – React UI (`App.tsx`), I18n provider, and bootstrap (`main.tsx`).
- `src/style.css` – Tailwind CSS import and global styles.
- `public/` – Static assets served by Vite/Hono (e.g., `favicon.ico`).
- `docker-compose.yml` – Dev and example app services for container workflows.

## Deployment Notes
- Works on Cloud Run and similar platforms: the server binds to `process.env.PORT || 5173` and respects `process.env.HOST`.
- Static assets under `dist/` are served directly when `NODE_ENV=production`.
- Ensure the runtime has outbound network access to Google Generative AI endpoints.

## License
MIT
