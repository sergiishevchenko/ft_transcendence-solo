import Fastify from 'fastify'
import cors from '@fastify/cors'
import { apiRoutes } from './routes/api'
import { errorHandler } from './middleware/error.middleware'
import { getDatabase, closeDatabase } from './services/database.service'

const fastify = Fastify({
  logger: true,
})

fastify.register(cors, {
  origin: true,
  credentials: true
})

fastify.setErrorHandler(errorHandler)

fastify.get('/health', async (request, reply) => {
  return { status: 'ok' }
})

fastify.register(apiRoutes, { prefix: '/api' })

const start = async () => {
  try {
    getDatabase()
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Server listening on port 3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

process.on('SIGINT', async () => {
  await fastify.close()
  closeDatabase()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await fastify.close()
  closeDatabase()
  process.exit(0)
})

start()
