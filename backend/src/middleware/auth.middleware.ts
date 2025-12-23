import { FastifyRequest, FastifyReply } from 'fastify'
import { AuthService } from '../services/auth.service'

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: number
    username: string
    email: string
  }
}

export async function authenticate(request: AuthenticatedRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const token = authHeader.substring(7)
  const decoded = AuthService.verifyToken(token)
  
  if (!decoded) {
    return reply.status(401).send({ error: 'Invalid token' })
  }

  request.user = decoded as any
}
