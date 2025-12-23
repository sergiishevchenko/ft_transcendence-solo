import { getDatabase } from './database.service'

export interface Friendship {
  id?: number
  user1_id: number
  user2_id: number
  status: 'pending' | 'accepted' | 'blocked'
  created_at?: string
}

export class FriendsService {
  static initialize() {
    const db = getDatabase()
    db.exec(`
      CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user1_id INTEGER NOT NULL,
        user2_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user1_id) REFERENCES users(id),
        FOREIGN KEY (user2_id) REFERENCES users(id),
        UNIQUE(user1_id, user2_id)
      );
      CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
      CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
    `)
  }

  static sendRequest(user1Id: number, user2Id: number): Friendship {
    if (user1Id === user2Id) {
      throw new Error('Cannot send friend request to yourself')
    }

    const db = getDatabase()
    const existing = db.prepare(`
      SELECT * FROM friendships 
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `).get(user1Id, user2Id, user2Id, user1Id) as Friendship | undefined

    if (existing) {
      throw new Error('Friendship already exists')
    }

    const stmt = db.prepare(`
      INSERT INTO friendships (user1_id, user2_id, status)
      VALUES (?, ?, 'pending')
    `)
    const result = stmt.run(user1Id, user2Id)
    return this.findById(result.lastInsertRowid as number)!
  }

  static acceptRequest(friendshipId: number, userId: number): Friendship | undefined {
    const db = getDatabase()
    const friendship = this.findById(friendshipId)
    
    if (!friendship || friendship.user2_id !== userId) {
      return undefined
    }

    const stmt = db.prepare('UPDATE friendships SET status = ? WHERE id = ?')
    stmt.run('accepted', friendshipId)
    return this.findById(friendshipId)
  }

  static getFriends(userId: number): any[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, f.status, f.created_at
      FROM friendships f
      JOIN users u ON (u.id = CASE WHEN f.user1_id = ? THEN f.user2_id ELSE f.user1_id END)
      WHERE (f.user1_id = ? OR f.user2_id = ?) AND f.status = 'accepted'
    `)
    return stmt.all(userId, userId, userId) as any[]
  }

  static findById(id: number): Friendship | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM friendships WHERE id = ?')
    return stmt.get(id) as Friendship | undefined
  }
}
