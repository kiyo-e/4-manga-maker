import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { renderer } from './renderer.js'
import api from './api.js'

const app = new Hono()

app.route('/v1', api)

app.use(renderer)

// In production, serve built static assets (client CSS/JS) so SSR HTML can load them.
// When running on Cloud Run we rely on NODE_ENV=production rather than Vite injected globals.
const isProd =
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.PROD)
if (isProd) {
  // Client assets emitted by Vite live under dist/ (assets, .vite)
  app.use('/assets/*', serveStatic({ root: './dist' }))
  app.use('/.vite/*', serveStatic({ root: './dist' }))
  // Common single files in dist/
  const serveDist = serveStatic({ root: './dist' })
  app.get('/favicon.ico', serveDist)
  app.get('/robots.txt', serveDist)
  // Some builds emit an extra client entry like /index2.js at dist/index2.js
  app.get('/index2.js', serveDist)
}

app.get('/', (c) => c.render(<div id="root"></div>))

export default app
