import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'
import tailwindcss from '@tailwindcss/vite'
import devServer from "@hono/vite-dev-server"

export default defineConfig({
  plugins: [ssrPlugin(), tailwindcss(),
    devServer({
      entry: "./src/index.tsx",
      exclude: [
        /^\/@.+$/,
        /.*\.(ts|tsx|vue)($|\?)/,
        /.*\.(s?css|less)($|\?)/,
        /^\/favicon\.ico$/,
        /.*\.(svg|png)($|\?)/,
        /^\/(public|assets|static)\/.+/,
        /^\/node_modules\/.*/
      ]
    })
  ]
})
