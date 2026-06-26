import { FastifyInstance } from 'fastify'
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware'
import { GdprService } from '../services/gdpr.service'
import { AuthService } from '../services/auth.service'

export async function gdprRoutes(fastify: FastifyInstance) {
  fastify.get('/export', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const data = GdprService.exportUserData(request.user.id)
    reply.header('Content-Type', 'application/json')
    reply.header('Content-Disposition', `attachment; filename="user-data-${request.user.id}.json"`)
    return reply.send(data)
  })

  fastify.post('/anonymize', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const body = request.body as { password?: string }
    if (!body.password) {
      return reply.status(400).send({ error: 'Password confirmation required' })
    }

    try {
      const { user } = await AuthService.login(request.user.username, body.password)
      GdprService.anonymizeUser(user.id!)
      return reply.send({ message: 'Account anonymized successfully' })
    } catch {
      return reply.status(401).send({ error: 'Invalid password' })
    }
  })

  fastify.delete('/account', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const body = request.body as { password?: string; confirmation?: string }
    if (!body.password || body.confirmation !== 'DELETE') {
      return reply.status(400).send({ error: 'Password and confirmation "DELETE" required' })
    }

    try {
      await AuthService.login(request.user.username, body.password)
      GdprService.deleteUser(request.user.id)
      return reply.send({ message: 'Account deleted successfully' })
    } catch {
      return reply.status(401).send({ error: 'Invalid password' })
    }
  })
}
