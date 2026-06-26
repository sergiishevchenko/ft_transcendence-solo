import { FastifyInstance } from 'fastify'
import { ChatService } from '../services/chat.service'
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware'

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.get('/conversations', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const conversations = ChatService.getConversationList(request.user.id)
    return reply.send({ conversations })
  })

  fastify.get('/messages/:userId', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const { userId } = request.params as { userId: string }
    const { limit, offset } = request.query as { limit?: string; offset?: string }

    const messages = ChatService.getConversation(
      request.user.id,
      parseInt(userId),
      parseInt(limit || '50'),
      parseInt(offset || '0')
    )

    ChatService.markAsRead(parseInt(userId), request.user.id)
    return reply.send({ messages: messages.reverse() })
  })

  fastify.post('/block/:userId', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const { userId } = request.params as { userId: string }
    ChatService.blockUser(request.user.id, parseInt(userId))
    return reply.send({ success: true })
  })

  fastify.delete('/block/:userId', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const { userId } = request.params as { userId: string }
    ChatService.unblockUser(request.user.id, parseInt(userId))
    return reply.send({ success: true })
  })

  fastify.get('/blocked', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const blockedUserIds = ChatService.getBlockedUsers(request.user.id)
    return reply.send({ blockedUserIds })
  })

  fastify.get('/unread', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const count = ChatService.getUnreadCount(request.user.id)
    return reply.send({ count })
  })
}
