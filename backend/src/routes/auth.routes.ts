import { FastifyInstance } from 'fastify'
import { AuthService } from '../services/auth.service'
import { UserModel } from '../models/user.model'
import { OAuthService } from '../services/oauth.service'
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware'

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    try {
      const body = request.body as {
        username: string
        email: string
        password: string
        displayName?: string
      }

      if (!body.username || !body.email || !body.password) {
        return reply.status(400).send({ error: 'Missing required fields' })
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return reply.status(400).send({ error: 'Invalid email format' })
      }

      if (body.password.length < 6) {
        return reply.status(400).send({ error: 'Password must be at least 6 characters' })
      }

      const { user, tokens } = await AuthService.register(
        body.username,
        body.email,
        body.password,
        body.displayName
      )

      const { password_hash, ...userWithoutPassword } = user
      return reply.status(201).send({
        user: userWithoutPassword,
        tokens
      })
    } catch (error: any) {
      return reply.status(400).send({ error: error.message })
    }
  })

  fastify.post('/login', async (request, reply) => {
    try {
      const body = request.body as {
        usernameOrEmail: string
        password: string
      }

      if (!body.usernameOrEmail || !body.password) {
        return reply.status(400).send({ error: 'Missing credentials' })
      }

      const { user, tokens } = await AuthService.login(
        body.usernameOrEmail,
        body.password
      )

      const { password_hash, ...userWithoutPassword } = user
      return reply.send({
        user: userWithoutPassword,
        tokens
      })
    } catch (error: any) {
      return reply.status(401).send({ error: error.message })
    }
  })

  fastify.get('/me', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const user = UserModel.findById(request.user.id)
    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    const { password_hash, ...userWithoutPassword } = user
    return reply.send({ user: userWithoutPassword })
  })

  fastify.get('/oauth/:provider/authorize', async (request, reply) => {
    const { provider } = request.params as { provider: string }
    const { redirect_uri, state } = request.query as { redirect_uri?: string; state?: string }

    let oauthProvider
    if (provider === 'google') {
      oauthProvider = OAuthService.getGoogleProvider()
    } else if (provider === 'github') {
      oauthProvider = OAuthService.getGitHubProvider()
    } else {
      return reply.status(400).send({ error: 'Invalid OAuth provider' })
    }

    if (!oauthProvider.clientId) {
      return reply.status(500).send({ error: 'OAuth not configured' })
    }

    const redirectUri = redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`
    const authState = state || Math.random().toString(36).substring(7)
    
    const authUrl = OAuthService.getAuthorizationUrl(oauthProvider, redirectUri, authState)
    return reply.redirect(authUrl)
  })

  fastify.get('/oauth/:provider/callback', async (request, reply) => {
    try {
      const { provider } = request.params as { provider: string }
      const { code, state, redirect_uri } = request.query as {
        code?: string
        state?: string
        redirect_uri?: string
      }

      if (!code) {
        return reply.status(400).send({ error: 'Missing authorization code' })
      }

      let oauthProvider
      if (provider === 'google') {
        oauthProvider = OAuthService.getGoogleProvider()
      } else if (provider === 'github') {
        oauthProvider = OAuthService.getGitHubProvider()
      } else {
        return reply.status(400).send({ error: 'Invalid OAuth provider' })
      }

      const redirectUri = redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`
      const accessToken = await OAuthService.exchangeCodeForToken(oauthProvider, code, redirectUri)
      const oauthUserInfo = await OAuthService.getUserInfo(oauthProvider, accessToken)

      let user = UserModel.findByEmail(oauthUserInfo.email)
      
      if (!user) {
        let username = oauthUserInfo.username
        let counter = 1
        while (UserModel.findByUsername(username)) {
          username = `${oauthUserInfo.username}${counter}`
          counter++
        }

        user = UserModel.create({
          username,
          email: oauthUserInfo.email,
          password_hash: undefined,
          display_name: oauthUserInfo.displayName || oauthUserInfo.username,
          avatar_url: oauthUserInfo.avatarUrl || undefined
        })
      } else if (!user.avatar_url && oauthUserInfo.avatarUrl) {
        user = UserModel.update(user.id!, { avatar_url: oauthUserInfo.avatarUrl })
      }

      const tokens = AuthService.generateTokens(user!)

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
      return reply.redirect(`${frontendUrl}/auth/success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`)
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })
}
