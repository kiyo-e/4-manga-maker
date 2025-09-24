import { createServer } from 'node:http'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createServer as createViteServer } from 'vite'
import { readFileSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const host = process.env.VITE_HOST || '0.0.0.0'
const port = Number(process.env.VITE_PORT || 5173)

async function bootstrap() {
  // Load local .dev.vars (KEY=VALUE) if present to ease local development
  const devVarsPath = resolve(projectRoot, '.dev.vars')
  if (existsSync(devVarsPath)) {
    try {
      const text = readFileSync(devVarsPath, 'utf-8')
      for (const line of text.split(/\r?\n/)) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
        if (!m) continue
        const key = m[1]
        const val = m[2].replace(/^"|"$/g, '')
        if (!process.env[key]) process.env[key] = val
      }
    } catch {}
  }
  // Start Vite in middleware mode so it doesn't open its own HTTP server
  const vite = await createViteServer({
    root: projectRoot,
    configFile: resolve(projectRoot, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
  })

  const server = createServer(async (req, res) => {
    // First, give Vite a chance to handle HMR and source files
    vite.middlewares(req, res, async (err) => {
      if (err) {
        res.statusCode = 500
        res.end(err?.stack || String(err))
        return
      }

      try {
        // Load the Hono app via Vite's SSR loader (enables server hot-reload)
        const mod = await vite.ssrLoadModule('/src/index.tsx')
        const app = mod?.default
        if (!app || typeof app.fetch !== 'function') {
          res.statusCode = 500
          res.end('Hono app not found from /src/index.tsx')
          return
        }

        // Convert Node req to Fetch Request for Hono
        const origin = `http://${req.headers.host || `localhost:${port}`}`
        const url = new URL(req.url || '/', origin)
        const headers = new Headers()
        for (const [k, v] of Object.entries(req.headers)) {
          if (v === undefined) continue
          if (Array.isArray(v)) {
            for (const vv of v) headers.append(k, vv)
          } else {
            headers.set(k, v)
          }
        }

        const method = req.method || 'GET'
        let body = null
        if (method !== 'GET' && method !== 'HEAD') {
          // Use the Node stream as the Request body
          body = req
        }
        const requestInit = body
          ? { method, headers, body, duplex: 'half' }
          : { method, headers }
        const request = new Request(url, requestInit)

        const response = await app.fetch(request)

        // Write status and headers
        res.statusCode = response.status
        response.headers.forEach((value, key) => {
          res.setHeader(key, value)
        })

        // Stream body
        if (response.body) {
          const nodeStream = (await import('node:stream')).Readable.fromWeb(response.body)
          nodeStream.pipe(res)
        } else {
          res.end()
        }
      } catch (e) {
        vite.ssrFixStacktrace?.(e)
        res.statusCode = 500
        res.end((e && e.stack) || String(e))
      }
    })
  })

  server.listen(port, host, () => {
    console.log(`
Dev server ready
  ➜ Local:   http://localhost:${port}
  ➜ Network: http://${host === '0.0.0.0' ? 'your-ip' : host}:${port}
`)
  })
}

bootstrap().catch((e) => {
  console.error(e)
  process.exit(1)
})
