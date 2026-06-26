import { TOTP, Secret } from 'otpauth'
import QRCode from 'qrcode'
import crypto from 'crypto'
import { getDatabase } from './database.service'

const APP_NAME = 'Transcendence'
const BACKUP_CODE_COUNT = 8

export class TotpService {
  static initialize() {
    const db = getDatabase()
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_totp (
        user_id INTEGER PRIMARY KEY,
        secret TEXT NOT NULL,
        enabled INTEGER DEFAULT 0,
        backup_codes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        revoked INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
    `)
  }

  static generateSecret(): string {
    const secret = new Secret({ size: 20 })
    return secret.base32
  }

  static async generateQRCode(username: string, secret: string): Promise<string> {
    const totp = new TOTP({
      issuer: APP_NAME,
      label: username,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    })

    const uri = totp.toString()
    return QRCode.toDataURL(uri)
  }

  static verifyCode(secret: string, code: string): boolean {
    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    })

    const delta = totp.validate({ token: code, window: 1 })
    return delta !== null
  }

  static generateBackupCodes(): string[] {
    const codes: string[] = []
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
    }
    return codes
  }

  static hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex')
  }

  static setupTotp(userId: number): { secret: string } {
    const db = getDatabase()
    const secret = this.generateSecret()

    const existing = db.prepare('SELECT * FROM user_totp WHERE user_id = ?').get(userId)
    if (existing) {
      db.prepare('UPDATE user_totp SET secret = ?, enabled = 0, backup_codes = NULL WHERE user_id = ?')
        .run(secret, userId)
    } else {
      db.prepare('INSERT INTO user_totp (user_id, secret, enabled) VALUES (?, ?, 0)')
        .run(userId, secret)
    }

    return { secret }
  }

  static enableTotp(userId: number, code: string): { backupCodes: string[] } | null {
    const db = getDatabase()
    const row = db.prepare('SELECT secret FROM user_totp WHERE user_id = ?').get(userId) as any
    if (!row) return null

    if (!this.verifyCode(row.secret, code)) return null

    const backupCodes = this.generateBackupCodes()
    const hashedCodes = backupCodes.map(c => this.hashBackupCode(c))

    db.prepare('UPDATE user_totp SET enabled = 1, backup_codes = ? WHERE user_id = ?')
      .run(JSON.stringify(hashedCodes), userId)

    return { backupCodes }
  }

  static disableTotp(userId: number) {
    const db = getDatabase()
    db.prepare('DELETE FROM user_totp WHERE user_id = ?').run(userId)
  }

  static isTotpEnabled(userId: number): boolean {
    const db = getDatabase()
    const row = db.prepare('SELECT enabled FROM user_totp WHERE user_id = ?').get(userId) as any
    return row?.enabled === 1
  }

  static verifyTotp(userId: number, code: string): boolean {
    const db = getDatabase()
    const row = db.prepare('SELECT secret, backup_codes FROM user_totp WHERE user_id = ? AND enabled = 1')
      .get(userId) as any
    if (!row) return false

    if (this.verifyCode(row.secret, code)) return true

    if (row.backup_codes) {
      const hashedCodes: string[] = JSON.parse(row.backup_codes)
      const inputHash = this.hashBackupCode(code)
      const index = hashedCodes.indexOf(inputHash)
      if (index !== -1) {
        hashedCodes.splice(index, 1)
        db.prepare('UPDATE user_totp SET backup_codes = ? WHERE user_id = ?')
          .run(JSON.stringify(hashedCodes), userId)
        return true
      }
    }

    return false
  }

  static storeRefreshToken(userId: number, tokenHash: string, expiresAt: Date) {
    const db = getDatabase()
    db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
      .run(userId, tokenHash, expiresAt.toISOString())
  }

  static validateRefreshToken(tokenHash: string): { userId: number } | null {
    const db = getDatabase()
    const row = db.prepare(`
      SELECT user_id FROM refresh_tokens
      WHERE token_hash = ? AND revoked = 0 AND expires_at > datetime('now')
    `).get(tokenHash) as any
    return row ? { userId: row.user_id } : null
  }

  static revokeRefreshToken(tokenHash: string) {
    const db = getDatabase()
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(tokenHash)
  }

  static revokeAllUserTokens(userId: number) {
    const db = getDatabase()
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(userId)
  }

  static cleanupExpiredTokens() {
    const db = getDatabase()
    db.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now') OR revoked = 1").run()
  }
}
