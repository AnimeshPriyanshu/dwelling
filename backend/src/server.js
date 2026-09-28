import { createServer } from 'node:http'
import { Server } from 'socket.io'
import app from './app.js'
import { env } from './config/env.js'
import { connectCache } from './cache/index.js'
import { registerSocketHandlers } from './sockets/index.js'

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: env.clientOrigin },
})

registerSocketHandlers(io)
await connectCache()

httpServer.listen(env.port, () => {
  console.info(`Dwelling API listening on port ${env.port}`)
})