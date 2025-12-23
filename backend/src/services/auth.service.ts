import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { User, UserModel } from '../models/user.model'

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
    const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })

    return { accessToken, refreshToken }
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return null
    }
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

  static async login(usernameOrEmail: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const user = UserModel.findByUsername(usernameOrEmail) || UserModel.findByEmail(usernameOrEmail)
    if (!user || !user.password_hash) {
      throw new Error('Invalid credentials')
    }

    const isValid = await this.verifyPassword(password, user.password_hash)
    if (!isValid) {
      throw new Error('Invalid credentials')
    }

    const tokens = this.generateTokens(user)
    return { user, tokens }
  }
}

