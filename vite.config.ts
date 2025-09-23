import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'
// Tailwind v4: optional Vite plugin improves class detection & DX
import tailwindcss from '@tailwindcss/vite'
import build from '@hono/vite-build/bun'

export default defineConfig({
  plugins: [ssrPlugin(), tailwindcss(),
    build({
      // Defaults are `src/index.ts`,`./src/index.tsx`,`./app/server.ts`
      entry: './src/index.tsx',
      // port option is only for Node.js adapter. Default is 3000
    }),

  ]
})
