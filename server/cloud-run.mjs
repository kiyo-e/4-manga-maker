import { serve } from '@hono/node-server'
import { serveStatic } from 'hono/serve-static'
let app
try {
  const mod = await import('../dist/manga_matic/index.js')
  app = mod?.default
  if (!app) {
    throw new Error('Default export missing')
  }
} catch (err) {
  console.error('Failed to load built app. Run `npm run build` before starting Cloud Run server.')
  throw err
}
import { join } from 'node:path'
import { readFile, stat } from 'node:fs/promises'

const port = Number(process.env.PORT || 8080)
const assetsRoot = join(process.cwd(), 'dist/client')

const staticMiddleware = serveStatic({
  root: assetsRoot,
  rewriteRequestPath: (path) => {
    if (path.startsWith('/assets/')) return path.slice(1)
    if (path.startsWith('/.vite/')) return path.slice(1)
    return path.replace(/^\//, '')
  },
  isDir: async (filePath) => {
    try {
      return (await stat(filePath)).isDirectory()
    } catch {
      return undefined
    }
  },
  getContent: async (filePath) => {
    try {
      return await readFile(filePath)
    } catch {
      return null
    }
  },
})

app.use('/assets/*', staticMiddleware)
app.use('/.vite/*', staticMiddleware)
app.use('/favicon.ico', staticMiddleware)

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})

console.log(`🚀 manga-maker server listening on port ${port}`)
