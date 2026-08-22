/// <reference types="node" />
import { getRequestListener } from '@hono/node-server'
import app from '../server/index.js'

export const config = {
  runtime: 'nodejs'
}

export default getRequestListener(app.fetch)
