import { getDatabase } from './database.service'
import crypto from 'crypto'

export interface UserDataExport {
  profile: {
    id: number
    username: string
    email: string
    display_name: string | null
    avatar: string | null
    created_at: string
  }
  games: any[]
  messages: any[]
  tournaments: any[]
  friends: any[]
}

export class GdprService {
  static exportUserData(userId: number): UserDataExport {
    const db = getDatabase()

    const profile = db.prepare(`
      SELECT id, username, email, display_name, avatar, created_at
      FROM users WHERE id = ?
    `).get(userId) as any

    const games = db.prepare(`
      SELECT * FROM games
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY played_at DESC
    `).all(userId, userId) as any[]

    let messages: any[] = []
    try {
      messages = db.prepare(`
        SELECT id, sender_id, receiver_id, content, created_at
        FROM chat_messages
        WHERE sender_id = ? OR receiver_id = ?
        ORDER BY created_at DESC
      `).all(userId, userId) as any[]
    } catch { /* table may not exist */ }

    let tournaments: any[] = []
    try {
      tournaments = db.prepare(`
        SELECT t.* FROM tournaments t
        JOIN tournament_participants tp ON tp.tournament_id = t.id
        WHERE tp.user_id = ?
      `).all(userId) as any[]
    } catch { /* table may not exist */ }

    let friends: any[] = []
    try {
      friends = db.prepare(`
        SELECT f.*, u.username as friend_name FROM friends f
        JOIN users u ON (u.id = CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END)
        WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
      `).all(userId, userId, userId) as any[]
    } catch { /* table may not exist */ }

    return { profile, games, messages, tournaments, friends }
  }

  static anonymizeUser(userId: number) {
    const db = getDatabase()
    const anonId = crypto.randomBytes(8).toString('hex')

    db.prepare(`
      UPDATE users SET
        username = ?,
        email = ?,
        display_name = NULL,
        avatar = NULL,
        password = NULL,
        oauth_provider = NULL,
        oauth_id = NULL,
        is_active = 0
      WHERE id = ?
    `).run(`deleted_${anonId}`, `deleted_${anonId}@anonymous.local`, userId)

    try {
      db.prepare('DELETE FROM user_totp WHERE user_id = ?').run(userId)
    } catch { /* table may not exist */ }

    try {
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId)
    } catch { /* table may not exist */ }

    try {
      db.prepare('DELETE FROM friends WHERE user_id = ? OR friend_id = ?').run(userId, userId)
    } catch { /* table may not exist */ }

    try {
      db.prepare('DELETE FROM blocked_users WHERE blocker_id = ? OR blocked_id = ?').run(userId, userId)
    } catch { /* table may not exist */ }

    try {
      db.prepare(`
        UPDATE chat_messages SET content = '[deleted]'
        WHERE sender_id = ?
      `).run(userId)
    } catch { /* table may not exist */ }
  }

  static deleteUser(userId: number) {
    const db = getDatabase()

    const tables = [
      { sql: 'DELETE FROM user_totp WHERE user_id = ?', params: [userId] },
      { sql: 'DELETE FROM refresh_tokens WHERE user_id = ?', params: [userId] },
      { sql: 'DELETE FROM friends WHERE user_id = ? OR friend_id = ?', params: [userId, userId] },
      { sql: 'DELETE FROM blocked_users WHERE blocker_id = ? OR blocked_id = ?', params: [userId, userId] },
      { sql: 'DELETE FROM chat_messages WHERE sender_id = ? OR receiver_id = ?', params: [userId, userId] },
      { sql: 'DELETE FROM games WHERE player1_id = ? OR player2_id = ?', params: [userId, userId] },
      { sql: 'DELETE FROM users WHERE id = ?', params: [userId] },
    ]

    const deleteAll = db.transaction(() => {
      for (const { sql, params } of tables) {
        try {
          db.prepare(sql).run(...params)
        } catch { /* table may not exist */ }
      }
    })

    deleteAll()
  }
}
