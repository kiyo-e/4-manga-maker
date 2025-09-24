import { serve } from '@hono/node-server'
import type { AddressInfo } from 'node:net'
import app from '../index.js'

const port = Number(process.env.PORT || 8080)
const hostname = process.env.HOST || '0.0.0.0'

serve({
  fetch: app.fetch,
  port,
  hostname,
}, (info: AddressInfo) => {
  const addr = info.address
  const urlHost = addr === '0.0.0.0' || addr === '::' ? 'localhost' : addr
  console.log(`🚀 manga-maker server listening on http://${urlHost}:${info.port}`)
})
