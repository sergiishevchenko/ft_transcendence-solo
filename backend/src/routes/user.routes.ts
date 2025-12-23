import { FastifyInstance, FastifyRequest } from 'fastify'
import { UserModel } from '../models/user.model'
import { FriendsService } from '../services/friends.service'
import { StatsService } from '../services/stats.service'
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware'
import { AuthService } from '../services/auth.service'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = UserModel.findById(parseInt(id))
    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }
    const { password_hash, ...userWithoutPassword } = user
    return reply.send({ user: userWithoutPassword })
  })

  fastify.get('/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string }
    const stats = StatsService.getUserStats(parseInt(id))
    return reply.send({ stats })
  })

  fastify.put('/profile', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const body = request.body as { displayName?: string }
    const user = UserModel.update(request.user.id, {
      display_name: body.displayName
    })

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    const { password_hash, ...userWithoutPassword } = user
    return reply.send({ user: userWithoutPassword })
  })

  fastify.post('/profile/avatar', { preHandler: authenticate }, async (request: FastifyRequest & AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const data = await (request as any).file()
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' })
    }

    const uploadsDir = join(process.cwd(), 'uploads', 'avatars')
    await mkdir(uploadsDir, { recursive: true })

    const filename = `${request.user.id}-${Date.now()}.${data.filename.split('.').pop()}`
    const filepath = join(uploadsDir, filename)
    const buffer = await data.toBuffer()
    await writeFile(filepath, buffer)

    const avatarUrl = `/uploads/avatars/${filename}`
    const user = UserModel.update(request.user.id, { avatar_url: avatarUrl })

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    const { password_hash, ...userWithoutPassword } = user
    return reply.send({ user: userWithoutPassword })
  })

  fastify.post('/friends/request', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const body = request.body as { userId: number }
    try {
      const friendship = FriendsService.sendRequest(request.user.id, body.userId)
      return reply.status(201).send({ friendship })
    } catch (error: any) {
      return reply.status(400).send({ error: error.message })
    }
  })

  fastify.post('/friends/accept/:id', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const { id } = request.params as { id: string }
    const friendship = FriendsService.acceptRequest(parseInt(id), request.user.id)
    
    if (!friendship) {
      return reply.status(404).send({ error: 'Friendship not found' })
    }

    return reply.send({ friendship })
  })

  fastify.get('/friends/list', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const friends = FriendsService.getFriends(request.user.id)
    return reply.send({ friends })
  })

  fastify.get('/search', async (request, reply) => {
    const { q } = request.query as { q?: string }
    if (!q) {
      return reply.send({ users: [] })
    }

    const allUsers = UserModel.findAll()
    const filtered = allUsers.filter(u => 
      u.username.toLowerCase().includes(q.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 10)

    return reply.send({ users: filtered })
  })
}
