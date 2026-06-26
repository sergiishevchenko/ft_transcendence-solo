import { getDatabase } from './database.service'

export interface ChatMessage {
  id?: number
  sender_id: number
  receiver_id: number
  content: string
  type: 'text' | 'game_invite' | 'tournament_notification'
  game_room_id?: string
  read: boolean
  created_at?: string
}

export interface BlockedUser {
  id?: number
  blocker_id: number
  blocked_id: number
  created_at?: string
}

export class ChatService {
  static initialize() {
    const db = getDatabase()
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        game_room_id TEXT,
        read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS blocked_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blocker_id INTEGER NOT NULL,
        blocked_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (blocker_id) REFERENCES users(id),
        FOREIGN KEY (blocked_id) REFERENCES users(id),
        UNIQUE(blocker_id, blocked_id)
      );

      CREATE INDEX IF NOT EXISTS idx_chat_sender ON chat_messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_chat_receiver ON chat_messages(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users(blocker_id);
    `)
  }

  static saveMessage(message: Omit<ChatMessage, 'id' | 'created_at'>): ChatMessage {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO chat_messages (sender_id, receiver_id, content, type, game_room_id, read)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      message.sender_id,
      message.receiver_id,
      message.content,
      message.type || 'text',
      message.game_room_id || null,
      message.read ? 1 : 0
    )
    return this.findById(result.lastInsertRowid as number)!
  }

  static findById(id: number): ChatMessage | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM chat_messages WHERE id = ?')
    return stmt.get(id) as ChatMessage | undefined
  }

  static getConversation(userId1: number, userId2: number, limit = 50, offset = 0): ChatMessage[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT cm.*, 
        u1.username as sender_username, u1.display_name as sender_display_name,
        u2.username as receiver_username, u2.display_name as receiver_display_name
      FROM chat_messages cm
      LEFT JOIN users u1 ON cm.sender_id = u1.id
      LEFT JOIN users u2 ON cm.receiver_id = u2.id
      WHERE (cm.sender_id = ? AND cm.receiver_id = ?)
        OR (cm.sender_id = ? AND cm.receiver_id = ?)
      ORDER BY cm.created_at DESC
      LIMIT ? OFFSET ?
    `)
    return stmt.all(userId1, userId2, userId2, userId1, limit, offset) as ChatMessage[]
  }

  static getConversationList(userId: number): any[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT DISTINCT 
        CASE WHEN cm.sender_id = ? THEN cm.receiver_id ELSE cm.sender_id END as other_user_id,
        u.username, u.display_name, u.avatar_url,
        (SELECT content FROM chat_messages cm2 
         WHERE (cm2.sender_id = ? AND cm2.receiver_id = u.id)
           OR (cm2.sender_id = u.id AND cm2.receiver_id = ?)
         ORDER BY cm2.created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages cm3
         WHERE (cm3.sender_id = ? AND cm3.receiver_id = u.id)
           OR (cm3.sender_id = u.id AND cm3.receiver_id = ?)
         ORDER BY cm3.created_at DESC LIMIT 1) as last_message_at,
        (SELECT COUNT(*) FROM chat_messages cm4
         WHERE cm4.sender_id = u.id AND cm4.receiver_id = ? AND cm4.read = 0) as unread_count
      FROM chat_messages cm
      JOIN users u ON u.id = CASE WHEN cm.sender_id = ? THEN cm.receiver_id ELSE cm.sender_id END
      WHERE cm.sender_id = ? OR cm.receiver_id = ?
      GROUP BY other_user_id
      ORDER BY last_message_at DESC
    `)
    return stmt.all(userId, userId, userId, userId, userId, userId, userId, userId, userId) as any[]
  }

  static markAsRead(senderId: number, receiverId: number) {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE chat_messages SET read = 1
      WHERE sender_id = ? AND receiver_id = ? AND read = 0
    `)
    stmt.run(senderId, receiverId)
  }

  static blockUser(blockerId: number, blockedId: number): BlockedUser {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id)
      VALUES (?, ?)
    `)
    stmt.run(blockerId, blockedId)
    return { blocker_id: blockerId, blocked_id: blockedId }
  }

  static unblockUser(blockerId: number, blockedId: number) {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?')
    stmt.run(blockerId, blockedId)
  }

  static isBlocked(userId1: number, userId2: number): boolean {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM blocked_users
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
    `)
    const result = stmt.get(userId1, userId2, userId2, userId1) as any
    return result.count > 0
  }

  static getBlockedUsers(userId: number): number[] {
    const db = getDatabase()
    const stmt = db.prepare('SELECT blocked_id FROM blocked_users WHERE blocker_id = ?')
    return (stmt.all(userId) as any[]).map(r => r.blocked_id)
  }

  static getUnreadCount(userId: number): number {
    const db = getDatabase()
    const stmt = db.prepare('SELECT COUNT(*) as count FROM chat_messages WHERE receiver_id = ? AND read = 0')
    return (stmt.get(userId) as any).count
  }
}
