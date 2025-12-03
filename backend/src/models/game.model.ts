import { getDatabase } from '../services/database.service'

export interface Game {
  id?: number
  player1_id?: number
  player2_id?: number
  player1_score: number
  player2_score: number
  status: 'pending' | 'in_progress' | 'finished'
  winner_id?: number
  started_at?: string
  finished_at?: string
  created_at?: string
}

export class GameModel {
  static create(game: Omit<Game, 'id' | 'created_at'>): Game {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO games (player1_id, player2_id, player1_score, player2_score, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const startedAt = game.started_at || new Date().toISOString()
    const result = stmt.run(
      game.player1_id || null,
      game.player2_id || null,
      game.player1_score || 0,
      game.player2_score || 0,
      game.status || 'pending',
      startedAt
    )
    return this.findById(result.lastInsertRowid as number)!
  }

  static findById(id: number): Game | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM games WHERE id = ?')
    return stmt.get(id) as Game | undefined
  }

  static update(id: number, updates: Partial<Game>): Game | undefined {
    const db = getDatabase()
    const fields: string[] = []
    const values: any[] = []

    if (updates.player1_score !== undefined) {
      fields.push('player1_score = ?')
      values.push(updates.player1_score)
    }
    if (updates.player2_score !== undefined) {
      fields.push('player2_score = ?')
      values.push(updates.player2_score)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.winner_id !== undefined) {
      fields.push('winner_id = ?')
      values.push(updates.winner_id)
    }
    if (updates.finished_at !== undefined) {
      fields.push('finished_at = ?')
      values.push(updates.finished_at)
    }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    const stmt = db.prepare(`UPDATE games SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)
    return this.findById(id)
  }

  static findByPlayer(playerId: number): Game[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM games 
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY created_at DESC
    `)
    return stmt.all(playerId, playerId) as Game[]
  }

  static findAll(): Game[] {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM games ORDER BY created_at DESC')
    return stmt.all() as Game[]
  }
}
