import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { join } from 'path'
import { apiRoutes } from './routes/api'
import { authRoutes } from './routes/auth.routes'
import { userRoutes } from './routes/user.routes'
import { errorHandler } from './middleware/error.middleware'
import { getDatabase, closeDatabase } from './services/database.service'

const fastify = Fastify({
  logger: true,
})

fastify.register(cors, {
  origin: true,
  credentials: true
})

fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024
  }
})

fastify.register(staticFiles, {
  root: join(process.cwd(), 'uploads'),
  prefix: '/uploads/'
})

fastify.setErrorHandler(errorHandler)

fastify.get('/health', async (request, reply) => {
  return { status: 'ok' }
})

fastify.register(authRoutes, { prefix: '/api/auth' })
fastify.register(userRoutes, { prefix: '/api/users' })
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
