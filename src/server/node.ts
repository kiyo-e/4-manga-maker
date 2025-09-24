import { serve } from '@hono/node-server'
import app from '../index.js'

const port = Number(process.env.PORT || 8080)
const hostname = process.env.HOST || '0.0.0.0'

serve({
  fetch: app.fetch,
  port,
  hostname,
}, (info) => {
  const urlHost = info.hostname === '0.0.0.0' ? 'localhost' : info.hostname
  console.log(`🚀 manga-maker server listening on http://${urlHost}:${info.port}`)
})
