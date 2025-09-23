import { serve } from '@hono/node-server'
import { serveStatic } from 'hono/serve-static'
import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const distDir = join(projectRoot, 'dist')

const findFirstExisting = (candidates) => candidates.find((p) => existsSync(p))

const serverEntry = findFirstExisting([
  join(distDir, 'manga_matic/index.js'),
  join(distDir, 'index.js'),
])

if (!serverEntry) {
  console.error('Build output not found. Run `npm run build` before starting Cloud Run server.')
  process.exit(1)
}

const serverModule = await import(pathToFileURL(serverEntry).href)
const app = serverModule?.default

if (!app || typeof app.fetch !== 'function') {
  console.error('Loaded server entry does not export a Hono app. Ensure the build step completed successfully.')
  process.exit(1)
}

const staticRoot = findFirstExisting([
  join(distDir, 'client'),
  distDir,
])

if (staticRoot) {
  const staticMiddleware = serveStatic({
    root: staticRoot,
    join,
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
  app.get('/favicon.ico', staticMiddleware)
  app.get('/robots.txt', staticMiddleware)
}

const port = Number(process.env.PORT || 8080)

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})

console.log(`🚀 manga-maker server listening on port ${port}`)
