import { getDatabase } from '../services/database.service'

export interface User {
  id?: number
  username: string
  email: string
  password_hash?: string
  display_name?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export class UserModel {
  static create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, display_name, avatar_url)
      VALUES (?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      user.username,
      user.email,
      user.password_hash || null,
      user.display_name || null,
      user.avatar_url || null
    )
    return this.findById(result.lastInsertRowid as number)!
  }

  static findById(id: number): User | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
    return stmt.get(id) as User | undefined
  }

  static findByUsername(username: string): User | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?')
    return stmt.get(username) as User | undefined
  }

  static findByEmail(email: string): User | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?')
    return stmt.get(email) as User | undefined
  }

  static update(id: number, updates: Partial<User>): User | undefined {
    const db = getDatabase()
    const fields: string[] = []
    const values: any[] = []

    if (updates.display_name !== undefined) {
      fields.push('display_name = ?')
      values.push(updates.display_name)
    }
    if (updates.avatar_url !== undefined) {
      fields.push('avatar_url = ?')
      values.push(updates.avatar_url)
    }
    if (updates.password_hash !== undefined) {
      fields.push('password_hash = ?')
      values.push(updates.password_hash)
    }

    if (fields.length === 0) return this.findById(id)

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)
    return this.findById(id)
  }

  static findAll(): User[] {
    const db = getDatabase()
    const stmt = db.prepare('SELECT id, username, email, display_name, avatar_url, created_at FROM users')
    return stmt.all() as User[]
  }
}
