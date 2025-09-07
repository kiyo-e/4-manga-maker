import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'
// Tailwind v4: optional Vite plugin improves class detection & DX
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [cloudflare(), ssrPlugin(), tailwindcss()]
})
