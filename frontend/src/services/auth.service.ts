const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface User {
  id: number
  username: string
  email: string
  display_name?: string
  avatar_url?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export class AuthService {
  private static getStorageKey(key: string): string {
    return `transcendence_${key}`
  }

  static setTokens(tokens: AuthTokens) {
    localStorage.setItem(this.getStorageKey('accessToken'), tokens.accessToken)
    localStorage.setItem(this.getStorageKey('refreshToken'), tokens.refreshToken)
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(this.getStorageKey('accessToken'))
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.getStorageKey('refreshToken'))
  }

  static clearTokens() {
    localStorage.removeItem(this.getStorageKey('accessToken'))
    localStorage.removeItem(this.getStorageKey('refreshToken'))
    localStorage.removeItem(this.getStorageKey('user'))
  }

  static setUser(user: User) {
    localStorage.setItem(this.getStorageKey('user'), JSON.stringify(user))
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem(this.getStorageKey('user'))
    return userStr ? JSON.parse(userStr) : null
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }

  static async register(username: string, email: string, password: string, displayName?: string): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, displayName })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Registration failed')
    }

    const data = await response.json()
    this.setTokens(data.tokens)
    this.setUser(data.user)
    return data
  }

  static async login(usernameOrEmail: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()
    this.setTokens(data.tokens)
    this.setUser(data.user)
    return data
  }

  static async getCurrentUser(): Promise<User | null> {
    const token = this.getAccessToken()
    if (!token) return null

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        this.clearTokens()
        return null
      }

      const data = await response.json()
      this.setUser(data.user)
      return data.user
    } catch {
      this.clearTokens()
      return null
    }
  }

  static getAuthHeaders(): HeadersInit {
    const token = this.getAccessToken()
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  }

  static getOAuthUrl(provider: 'google' | 'github'): string {
    return `${API_URL}/api/auth/oauth/${provider}/authorize?redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}`
  }
}
