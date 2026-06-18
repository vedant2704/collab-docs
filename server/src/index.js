import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { connectDB } from './config/db.js'
import { getRedis } from './config/redis.js'
import authRoutes from './routes/auth.js'
import docRoutes from './routes/docs.js'
import { setupWsServer } from './wsServer.js'

const app = express()
const httpServer = createServer(app)

// Socket.io (used for presence notifications in Phase 5)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/docs', docRoutes)

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' })
})

const PORT = process.env.PORT || 4000

const start = async () => {
  await connectDB()
  await getRedis().connect().catch(() => {})

  // Attach Yjs WebSocket server to the same HTTP server
  setupWsServer(httpServer)

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    console.log(`Yjs WS ready on ws://localhost:${PORT}/yjs`)
  })
}

start()

export { io }
