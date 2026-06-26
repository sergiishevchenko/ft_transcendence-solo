import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { User, UserModel } from '../models/user.model'
import { TotpService } from './totp.service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const SALT_ROUNDS = 10

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  static generateTokens(user: User): AuthTokens {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email
    }

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    TotpService.storeRefreshToken(user.id!, tokenHash, expiresAt)

    return { accessToken, refreshToken }
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET)
    } catch {
      return null
    }
  }

  static refreshAccessToken(refreshToken: string): AuthTokens | null {
    const payload = this.verifyToken(refreshToken)
    if (!payload || payload.type !== 'refresh') return null

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const stored = TotpService.validateRefreshToken(tokenHash)
    if (!stored) return null

    const user = UserModel.findById(stored.userId)
    if (!user) return null

    TotpService.revokeRefreshToken(tokenHash)
    return this.generateTokens(user)
  }

  static revokeRefreshToken(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    TotpService.revokeRefreshToken(tokenHash)
  }

  static async register(username: string, email: string, password: string, displayName?: string): Promise<{ user: User; tokens: AuthTokens }> {
    if (UserModel.findByUsername(username)) {
      throw new Error('Username already exists')
    }
    if (UserModel.findByEmail(email)) {
      throw new Error('Email already exists')
    }

    const passwordHash = await this.hashPassword(password)
    const user = UserModel.create({
      username,
      email,
      password_hash: passwordHash,
      display_name: displayName || username,
      avatar_url: undefined
    })

    const tokens = this.generateTokens(user)
    return { user, tokens }
  }

  static async login(usernameOrEmail: string, password: string): Promise<{ user: User; tokens: AuthTokens; requires2FA?: boolean; tempToken?: string }> {
    const user = UserModel.findByUsername(usernameOrEmail) || UserModel.findByEmail(usernameOrEmail)
    if (!user || !user.password_hash) {
      throw new Error('Invalid credentials')
    }

    const isValid = await this.verifyPassword(password, user.password_hash)
    if (!isValid) {
      throw new Error('Invalid credentials')
    }

    if (TotpService.isTotpEnabled(user.id!)) {
      const tempToken = jwt.sign(
        { id: user.id, purpose: '2fa_verification' },
        JWT_SECRET,
        { expiresIn: '5m' }
      )
      return {
        user,
        tokens: { accessToken: '', refreshToken: '' },
        requires2FA: true,
        tempToken
      }
    }

    const tokens = this.generateTokens(user)
    return { user, tokens }
  }

  static verify2FA(tempToken: string, code: string): { user: User; tokens: AuthTokens } | null {
    const payload = this.verifyToken(tempToken)
    if (!payload || payload.purpose !== '2fa_verification') return null

    if (!TotpService.verifyTotp(payload.id, code)) return null

    const user = UserModel.findById(payload.id)
    if (!user) return null

    const tokens = this.generateTokens(user)
    return { user, tokens }
  }
}

