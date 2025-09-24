# Manga Maker

Manga Maker is a hackathon prototype that lets users generate short comic strips with the help of Google Gemini.  The app collects a simple prompt, creates a four‑panel script, and renders manga‑style images for each panel.

## Architecture
- **Edge runtime + Hono** – serverless API and server‑side rendering.
- **React + Vite** – client UI with fast local development and SSR hydration.
- **Tailwind CSS** – utility‑first styling for the React components.
- **Google Gemini** – text and image generation for scripts, characters, and panels.

## Getting Started
```bash
npm install   # または bun install
npm run dev   # または bun run dev
```
SSR (Hono) と Vite(HMR) を同一ポートで提供する開発サーバが起動します。

- ブラウザ: http://localhost:5173/
- ネットワーク公開が必要なら `VITE_HOST=0.0.0.0` を指定してください。

## Building and Previewing
```bash
npm run build
npm run preview
```
`build` outputs the client bundle and worker script under `dist/`, while `preview` serves the built app locally.

## Docker / Docker Compose

Production (build image and run Node server):
```bash
docker compose up --build app
# open http://localhost:8080/
```

Development (SSR + Vite in one process on port 5173):
```bash
docker compose up dev
# open http://localhost:5173/
```

Notes:
- The container reads `GEMINI_API_KEY` if set.
- The production container runs `server/cloud-run.mjs` which serves static assets from `dist` and mounts the Hono app.

## Deployment
```bash
npm run deploy
```
The command above builds the project and deploys the worker.

## Environment Variables
Set your Gemini API key before running the worker. For example, export it in your shell or add it to an `.env` file:
```bash
export GEMINI_API_KEY="your-key"
```

Use the generated bindings type when creating your Hono app.

## Project Structure
- `src/api.ts` – `/v1` API endpoints for script, character, and panel generation.
- `src/gemini.ts` – helpers that call the Google Gemini models.
- `src/client/` – React UI entry (`main.tsx`) and application shell (`App.tsx`).
- `public/` – static assets.

## License
MIT
