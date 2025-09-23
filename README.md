# Manga Maker

Manga Maker is a hackathon prototype that lets users generate short comic strips with the help of Google Gemini.  The app collects a simple prompt, creates a four‑panel script, and renders manga‑style images for each panel.

## Architecture
- **Edge runtime + Hono** – serverless API and server‑side rendering.
- **React + Vite** – client UI with fast local development and SSR hydration.
- **Tailwind CSS** – utility‑first styling for the React components.
- **Google Gemini** – text and image generation for scripts, characters, and panels.

## Getting Started
```bash
npm install
npm run dev
```
This starts the Vite dev server for local development.

## Building and Previewing
```bash
npm run build
npm run preview
```
`build` outputs the client bundle and worker script under `dist/`, while `preview` serves the built app locally.

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
