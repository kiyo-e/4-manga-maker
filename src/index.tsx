import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { renderer } from './renderer'
import api from './api'

const app = new Hono()

app.route('/v1', api)

app.use(renderer)

// In production, serve built static assets (client CSS/JS) so SSR HTML can load them.
// Cloud Run runs the server from project root; built assets live under `dist/`.
if (import.meta.env?.PROD) {
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
