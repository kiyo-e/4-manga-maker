import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'
// Tailwind v4: optional Vite plugin improves class detection & DX
import tailwindcss from '@tailwindcss/vite'
import build from '@hono/vite-build/node'

export default defineConfig({
  plugins: [ssrPlugin(), tailwindcss(),
    build({
      // Defaults are `src/index.ts`,`./src/index.tsx`,`./app/server.ts`
      entry: './src/index.tsx',
      // port option is only for Node.js adapter. Default is 3000
      port: 8080
    }),

  ]
  ,
  // Ensure dev server binds to IPv4 and a predictable port.
  // This avoids environments that disallow ::1 (IPv6) binding.
  server: {
    host: (process.env.VITE_HOST as any) || '0.0.0.0',
    port: Number(process.env.VITE_PORT || 5173),
    strictPort: true,
  },
  // Make `vite preview` reachable from outside (e.g., containers)
  preview: {
    host: (process.env.PREVIEW_HOST as any) || '0.0.0.0',
    port: Number(process.env.PREVIEW_PORT || 8080),
    strictPort: false,
  }
})
