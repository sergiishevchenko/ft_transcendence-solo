import { getDatabase } from './database.service'

export interface UserStats {
  wins: number
  losses: number
  totalGames: number
  winRate: number
  matchHistory: any[]
}

export class StatsService {
  static getUserStats(userId: number): UserStats {
    const db = getDatabase()
    
    const winsStmt = db.prepare(`
      SELECT COUNT(*) as count FROM games 
      WHERE winner_id = ? AND status = 'completed'
    `)
    const wins = (winsStmt.get(userId) as any).count

    const lossesStmt = db.prepare(`
      SELECT COUNT(*) as count FROM games 
      WHERE (player1_id = ? OR player2_id = ?) 
      AND winner_id != ? 
      AND winner_id IS NOT NULL 
      AND status = 'completed'
    `)
    const losses = (lossesStmt.get(userId, userId, userId) as any).count

    const totalGames = wins + losses
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0

    const historyStmt = db.prepare(`
      SELECT g.*, 
        u1.username as player1_username,
        u2.username as player2_username
      FROM games g
      LEFT JOIN users u1 ON g.player1_id = u1.id
      LEFT JOIN users u2 ON g.player2_id = u2.id
      WHERE (g.player1_id = ? OR g.player2_id = ?) 
      AND g.status = 'completed'
      ORDER BY g.finished_at DESC
      LIMIT 20
    `)
    const matchHistory = historyStmt.all(userId, userId) as any[]

    return {
      wins,
      losses,
      totalGames,
      winRate: Math.round(winRate * 100) / 100,
      matchHistory
    }
  }
}
