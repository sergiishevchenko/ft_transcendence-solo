import { useState } from 'react'

interface Player {
  id: string
  alias: string
}

interface Match {
  id: string
  player1: Player
  player2: Player
  score1?: number
  score2?: number
  status: 'pending' | 'in-progress' | 'completed'
}

export default function Tournament() {
  const [players, setPlayers] = useState<Player[]>([])
  const [newAlias, setNewAlias] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null)
  const [tournamentStarted, setTournamentStarted] = useState(false)

  const addPlayer = () => {
    if (newAlias.trim() && !tournamentStarted) {
      const player: Player = {
        id: Date.now().toString(),
        alias: newAlias.trim(),
      }
      setPlayers([...players, player])
      setNewAlias('')
    }
  }

  const startTournament = () => {
    if (players.length < 2) {
      alert('Need at least 2 players to start a tournament')
      return
    }

    setTournamentStarted(true)
    generateMatches()
  }

  const generateMatches = () => {
    const newMatches: Match[] = []
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        newMatches.push({
          id: `${i}-${j}`,
          player1: players[i],
          player2: players[j],
          status: 'pending',
        })
      }
    }
    setMatches(newMatches)
    if (newMatches.length > 0) {
      setCurrentMatch(newMatches[0])
    }
  }

  const completeMatch = (matchId: string, score1: number, score2: number) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? { ...m, score1, score2, status: 'completed' as const }
          : m
      )
    )

    const nextMatch = matches.find(
      (m) => m.id !== matchId && m.status === 'pending'
    )
    if (nextMatch) {
      setCurrentMatch(nextMatch)
    } else {
      setCurrentMatch(null)
    }
  }

  const resetTournament = () => {
    setPlayers([])
    setMatches([])
    setCurrentMatch(null)
    setTournamentStarted(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Tournament</h1>

      {!tournamentStarted ? (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Register Players</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
              placeholder="Enter player alias"
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded"
            />
            <button
              onClick={addPlayer}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Add Player
            </button>
          </div>
          <div className="mb-4">
            <h3 className="font-bold mb-2">Registered Players ({players.length}):</h3>
            <ul className="list-disc list-inside">
              {players.map((player) => (
                <li key={player.id}>{player.alias}</li>
              ))}
            </ul>
          </div>
          <button
            onClick={startTournament}
            disabled={players.length < 2}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Tournament
          </button>
        </div>
      ) : (
        <>
          {currentMatch && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Current Match</h2>
              <div className="text-center">
                <p className="text-2xl mb-4">
                  {currentMatch.player1.alias} vs {currentMatch.player2.alias}
                </p>
                <button
                  onClick={() => completeMatch(currentMatch.id, 5, 3)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded mr-2"
                >
                  {currentMatch.player1.alias} Wins
                </button>
                <button
                  onClick={() => completeMatch(currentMatch.id, 3, 5)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  {currentMatch.player2.alias} Wins
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Match Schedule</h2>
            <div className="space-y-2">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className={`p-3 rounded ${
                    match.status === 'completed'
                      ? 'bg-gray-700'
                      : match.status === 'in-progress'
                      ? 'bg-blue-900'
                      : 'bg-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>
                      {match.player1.alias} vs {match.player2.alias}
                    </span>
                    {match.status === 'completed' && (
                      <span className="text-sm">
                        {match.score1} - {match.score2}
                      </span>
                    )}
                    <span className="text-sm capitalize">{match.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={resetTournament}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            Reset Tournament
          </button>
        </>
      )}
    </div>
  )
}
