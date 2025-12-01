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

export function TournamentPage(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'

  let players: Player[] = []
  let matches: Match[] = []
  let currentMatch: Match | null = null
  let tournamentStarted = false

  const render = () => {
    div.innerHTML = `
      <h1 class="text-3xl font-bold mb-6 text-center">Tournament</h1>
      <div id="tournament-content"></div>
    `

    const content = div.querySelector('#tournament-content')
    if (!content) return

    if (!tournamentStarted) {
      content.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 class="text-xl font-bold mb-4">Register Players</h2>
          <div class="flex gap-2 mb-4">
            <input type="text" id="alias-input" placeholder="Enter player alias" class="flex-1 px-4 py-2 bg-gray-700 text-white rounded">
            <button id="add-player-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">Add Player</button>
          </div>
          <div class="mb-4">
            <h3 class="font-bold mb-2">Registered Players (${players.length}):</h3>
            <ul class="list-disc list-inside" id="players-list"></ul>
          </div>
          <button id="start-tournament-btn" class="px-6 py-2 bg-green-600 hover:bg-green-700 rounded ${players.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}" ${players.length < 2 ? 'disabled' : ''}>Start Tournament</button>
        </div>
      `

      const input = content.querySelector('#alias-input') as HTMLInputElement
      const addBtn = content.querySelector('#add-player-btn')
      const startBtn = content.querySelector('#start-tournament-btn')
      const playersList = content.querySelector('#players-list')

      if (playersList) {
        playersList.innerHTML = players.map(p => `<li>${p.alias}</li>`).join('')
      }

      addBtn?.addEventListener('click', () => {
        if (input && input.value.trim()) {
          players.push({
            id: Date.now().toString(),
            alias: input.value.trim()
          })
          input.value = ''
          render()
        }
      })

      input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          players.push({
            id: Date.now().toString(),
            alias: input.value.trim()
          })
          input.value = ''
          render()
        }
      })

      startBtn?.addEventListener('click', () => {
        if (players.length >= 2) {
          tournamentStarted = true
          generateMatches()
          render()
        } else {
          alert('Need at least 2 players to start a tournament')
        }
      })
    } else {
      let html = ''
      if (currentMatch) {
        html += `
          <div class="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-bold mb-4">Current Match</h2>
            <div class="text-center">
              <p class="text-2xl mb-4">${currentMatch.player1.alias} vs ${currentMatch.player2.alias}</p>
              <button data-match-id="${currentMatch.id}" data-winner="1" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded mr-2">${currentMatch.player1.alias} Wins</button>
              <button data-match-id="${currentMatch.id}" data-winner="2" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded">${currentMatch.player2.alias} Wins</button>
            </div>
          </div>
        `
      }

      html += `
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 class="text-xl font-bold mb-4">Match Schedule</h2>
          <div class="space-y-2" id="matches-list"></div>
        </div>
        <button id="reset-btn" class="px-6 py-2 bg-red-600 hover:bg-red-700 rounded">Reset Tournament</button>
      `

      content.innerHTML = html

      const matchesList = content.querySelector('#matches-list')
      if (matchesList) {
        matchesList.innerHTML = matches.map(m => `
          <div class="p-3 rounded ${m.status === 'completed' ? 'bg-gray-700' : m.status === 'in-progress' ? 'bg-blue-900' : 'bg-gray-600'}">
            <div class="flex justify-between items-center">
              <span>${m.player1.alias} vs ${m.player2.alias}</span>
              ${m.status === 'completed' ? `<span class="text-sm">${m.score1} - ${m.score2}</span>` : ''}
              <span class="text-sm capitalize">${m.status}</span>
            </div>
          </div>
        `).join('')
      }

      content.querySelectorAll('[data-match-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const matchId = btn.getAttribute('data-match-id')
          const winner = btn.getAttribute('data-winner')
          if (matchId && winner) {
            completeMatch(matchId, winner === '1' ? 5 : 3, winner === '2' ? 5 : 3)
            render()
          }
        })
      })

      content.querySelector('#reset-btn')?.addEventListener('click', () => {
        players = []
        matches = []
        currentMatch = null
        tournamentStarted = false
        render()
      })
    }
  }

  const generateMatches = () => {
    matches = []
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        matches.push({
          id: `${i}-${j}`,
          player1: players[i],
          player2: players[j],
          status: 'pending',
        })
      }
    }
    if (matches.length > 0) {
      currentMatch = matches[0]
    }
  }

  const completeMatch = (matchId: string, score1: number, score2: number) => {
    matches = matches.map(m =>
      m.id === matchId ? { ...m, score1, score2, status: 'completed' as const } : m
    )

    const nextMatch = matches.find(m => m.id !== matchId && m.status === 'pending')
    currentMatch = nextMatch || null
  }

  render()
  return div
}

