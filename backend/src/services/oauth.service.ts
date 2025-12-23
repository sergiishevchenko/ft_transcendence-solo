export interface OAuthProvider {
  name: string
  clientId: string
  clientSecret: string
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
}

export interface OAuthUserInfo {
  id: string
  email: string
  username: string
  displayName?: string
  avatarUrl?: string
}

export class OAuthService {
  static getGoogleProvider(): OAuthProvider {
    return {
      name: 'google',
      clientId: process.env.OAUTH_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || '',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
    }
  }

  static getGitHubProvider(): OAuthProvider {
    return {
      name: 'github',
      clientId: process.env.OAUTH_GITHUB_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET || '',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user'
    }
  }

  static getAuthorizationUrl(provider: OAuthProvider, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider.name === 'google' 
        ? 'openid email profile' 
        : 'user:email',
      state: state
    })
    return `${provider.authorizationUrl}?${params.toString()}`
  }

  static async exchangeCodeForToken(provider: OAuthProvider, code: string, redirectUri: string): Promise<string> {
    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const data = await response.json() as any
    return data.access_token
  }

  static async getUserInfo(provider: OAuthProvider, accessToken: string): Promise<OAuthUserInfo> {
    const response = await fetch(provider.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get user info')
    }

    const data = await response.json() as any

    if (provider.name === 'google') {
      return {
        id: data.sub || data.id,
        email: data.email,
        username: data.email.split('@')[0],
        displayName: data.name,
        avatarUrl: data.picture
      }
    } else {
      return {
        id: data.id.toString(),
        email: data.email || `${data.login}@github.local`,
        username: data.login,
        displayName: data.name || data.login,
        avatarUrl: data.avatar_url
      }
    }
  }
}

