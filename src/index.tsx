import { Hono } from 'hono'
import { renderer } from './renderer'
import api from './api'

const app = new Hono()

app.route('/v1', api)

app.use(renderer)

app.get('/', (c) => c.render(<div id="root"></div>))

export default app
