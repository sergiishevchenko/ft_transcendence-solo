import { getDatabase } from '../services/database.service'

export interface Tournament {
  id?: number
  name: string
  status: 'pending' | 'in_progress' | 'finished'
  type: 'single_elimination' | 'double_elimination' | 'round_robin'
  created_at?: string
  started_at?: string
  finished_at?: string
}

export interface TournamentParticipant {
  id?: number
  tournament_id: number
  user_id?: number
  alias: string
  position?: number
  eliminated: boolean
  created_at?: string
}

export interface TournamentMatch {
  id?: number
  tournament_id: number
  game_id?: number
  round: number
  match_number: number
  player1_id?: number
  player2_id?: number
  winner_id?: number
  status: 'pending' | 'in_progress' | 'finished'
  created_at?: string
}

export class TournamentModel {
  static create(tournament: Omit<Tournament, 'id' | 'created_at'>): Tournament {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO tournaments (name, status, type)
      VALUES (?, ?, ?)
    `)
    const result = stmt.run(
      tournament.name,
      tournament.status || 'pending',
      tournament.type || 'single_elimination'
    )
    return this.findById(result.lastInsertRowid as number)!
  }

  static findById(id: number): Tournament | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM tournaments WHERE id = ?')
    return stmt.get(id) as Tournament | undefined
  }

  static findAll(): Tournament[] {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC')
    return stmt.all() as Tournament[]
  }

  static update(id: number, updates: Partial<Tournament>): Tournament | undefined {
    const db = getDatabase()
    const fields: string[] = []
    const values: any[] = []

    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.started_at !== undefined) {
      fields.push('started_at = ?')
      values.push(updates.started_at)
    }
    if (updates.finished_at !== undefined) {
      fields.push('finished_at = ?')
      values.push(updates.finished_at)
    }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    const stmt = db.prepare(`UPDATE tournaments SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)
    return this.findById(id)
  }
}

export class TournamentParticipantModel {
  static create(participant: Omit<TournamentParticipant, 'id' | 'created_at'>): TournamentParticipant {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO tournament_participants (tournament_id, user_id, alias, position, eliminated)
      VALUES (?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      participant.tournament_id,
      participant.user_id || null,
      participant.alias,
      participant.position || null,
      participant.eliminated || false
    )
    return this.findById(result.lastInsertRowid as number)!
  }

  static findById(id: number): TournamentParticipant | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM tournament_participants WHERE id = ?')
    return stmt.get(id) as TournamentParticipant | undefined
  }

  static findByTournament(tournamentId: number): TournamentParticipant[] {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM tournament_participants WHERE tournament_id = ? ORDER BY position')
    return stmt.all(tournamentId) as TournamentParticipant[]
  }

  static update(id: number, updates: Partial<TournamentParticipant>): TournamentParticipant | undefined {
    const db = getDatabase()
    const fields: string[] = []
    const values: any[] = []

    if (updates.eliminated !== undefined) {
      fields.push('eliminated = ?')
      values.push(updates.eliminated)
    }
    if (updates.position !== undefined) {
      fields.push('position = ?')
      values.push(updates.position)
    }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    const stmt = db.prepare(`UPDATE tournament_participants SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)
    return this.findById(id)
  }

  static deleteByTournament(tournamentId: number) {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM tournament_participants WHERE tournament_id = ?')
    stmt.run(tournamentId)
  }
}

export class TournamentMatchModel {
  static create(match: Omit<TournamentMatch, 'id' | 'created_at'>): TournamentMatch {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO tournament_matches (tournament_id, game_id, round, match_number, player1_id, player2_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      match.tournament_id,
      match.game_id || null,
      match.round,
      match.match_number,
      match.player1_id || null,
      match.player2_id || null,
      match.status || 'pending'
    )
    return this.findById(result.lastInsertRowid as number)!
  }

  static findById(id: number): TournamentMatch | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM tournament_matches WHERE id = ?')
    return stmt.get(id) as TournamentMatch | undefined
  }

  static findByTournament(tournamentId: number): TournamentMatch[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tournament_matches 
      WHERE tournament_id = ? 
      ORDER BY round, match_number
    `)
    return stmt.all(tournamentId) as TournamentMatch[]
  }

  static update(id: number, updates: Partial<TournamentMatch>): TournamentMatch | undefined {
    const db = getDatabase()
    const fields: string[] = []
    const values: any[] = []

    if (updates.game_id !== undefined) {
      fields.push('game_id = ?')
      values.push(updates.game_id)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.winner_id !== undefined) {
      fields.push('winner_id = ?')
      values.push(updates.winner_id)
    }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    const stmt = db.prepare(`UPDATE tournament_matches SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)
    return this.findById(id)
  }
}
