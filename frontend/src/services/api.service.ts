const API_URL = import.meta.env.VITE_API_URL || 'https://localhost/api'

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export const api = {
  async getUsers() {
    return request<{ users: any[] }>('/users')
  },

  async getUser(id: number) {
    return request<{ user: any }>(`/users/${id}`)
  },

  async getGames() {
    return request<{ games: any[] }>('/games')
  },

  async getGame(id: number) {
    return request<{ game: any }>(`/games/${id}`)
  },

  async createGame(game: { player1_id?: number; player2_id?: number; status?: string }) {
    return request<{ game: any }>('/games', {
      method: 'POST',
      body: JSON.stringify(game),
    })
  },

  async getTournaments() {
    return request<{ tournaments: any[] }>('/tournaments')
  },

  async getTournament(id: number) {
    return request<{ tournament: any; participants: any[]; matches: any[] }>(`/tournaments/${id}`)
  },

  async createTournament(tournament: { name: string; type?: string }) {
    return request<{ tournament: any }>('/tournaments', {
      method: 'POST',
      body: JSON.stringify(tournament),
    })
  },

  async addTournamentParticipant(tournamentId: number, participant: { alias: string; user_id?: number }) {
    return request<{ participant: any }>(`/tournaments/${tournamentId}/participants`, {
      method: 'POST',
      body: JSON.stringify(participant),
    })
  },

  async getTournamentMatches(tournamentId: number) {
    return request<{ matches: any[] }>(`/tournaments/${tournamentId}/matches`)
  },
}
