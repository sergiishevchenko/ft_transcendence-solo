import vault from 'node-vault'

const VAULT_ADDR = process.env.VAULT_ADDR || 'http://vault:8200'
const VAULT_TOKEN = process.env.VAULT_TOKEN || 'transcendence-dev-token'
const VAULT_ENABLED = process.env.VAULT_ENABLED === 'true'

let client: any = null

export class VaultService {
  static async initialize(): Promise<boolean> {
    if (!VAULT_ENABLED) {
      console.log('Vault disabled, using environment variables')
      return false
    }

    try {
      client = vault({
        apiVersion: 'v1',
        endpoint: VAULT_ADDR,
        token: VAULT_TOKEN,
      })

      const health = await client.health()
      console.log('Vault connected, status:', health.initialized ? 'initialized' : 'not initialized')

      await this.seedSecrets()
      return true
    } catch (error) {
      console.error('Vault connection failed, falling back to env vars:', (error as Error).message)
      client = null
      return false
    }
  }

  private static async seedSecrets() {
    if (!client) return

    try {
      await client.write('secret/data/transcendence', {
        data: {
          jwt_secret: process.env.JWT_SECRET || 'change-me-in-production',
          session_secret: process.env.SESSION_SECRET || 'change-me-in-production',
          oauth_google_client_id: process.env.OAUTH_GOOGLE_CLIENT_ID || '',
          oauth_google_client_secret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || '',
          oauth_github_client_id: process.env.OAUTH_GITHUB_CLIENT_ID || '',
          oauth_github_client_secret: process.env.OAUTH_GITHUB_CLIENT_SECRET || '',
        },
      })
    } catch {
      // Secrets may already exist
    }
  }

  static async getSecret(key: string): Promise<string | undefined> {
    if (!client) return undefined

    try {
      const result = await client.read('secret/data/transcendence')
      return result?.data?.data?.[key]
    } catch {
      return undefined
    }
  }

  static async getJwtSecret(): Promise<string> {
    const fromVault = await this.getSecret('jwt_secret')
    return fromVault || process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  }

  static async getOAuthCredentials(provider: string): Promise<{ clientId: string; clientSecret: string }> {
    const clientId = await this.getSecret(`oauth_${provider}_client_id`) || process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_ID`] || ''
    const clientSecret = await this.getSecret(`oauth_${provider}_client_secret`) || process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_SECRET`] || ''
    return { clientId, clientSecret }
  }

  static isEnabled(): boolean {
    return client !== null
  }
}
