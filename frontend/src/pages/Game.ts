import { PongGame } from '../game/PongGame'
import { RemotePongGame } from '../game/RemotePongGame'

type GameMode = 'menu' | 'local' | 'remote_1v1' | 'remote_4p' | 'ai'

export function GamePage(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'

  const params = new URLSearchParams(window.location.search)
  const urlMode = params.get('mode')
  let currentMode: GameMode = 'menu'

  if (urlMode === 'remote') currentMode = 'remote_1v1'
  else if (urlMode === 'local') currentMode = 'local'
  else if (urlMode === 'ai') currentMode = 'ai'
  else if (urlMode === '4player') currentMode = 'remote_4p'

  const renderMenu = () => {
    div.innerHTML = `
      <h1 class="text-3xl font-bold mb-8 text-center">Pong Game</h1>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 cursor-pointer transition border-2 border-transparent hover:border-blue-500" id="mode-local">
          <h2 class="text-xl font-bold mb-2">Local Game</h2>
          <p class="text-gray-400 text-sm">Play with a friend on the same keyboard</p>
          <p class="text-gray-500 text-xs mt-2">Player 1: W/S | Player 2: Arrow Keys</p>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 cursor-pointer transition border-2 border-transparent hover:border-green-500" id="mode-remote">
          <h2 class="text-xl font-bold mb-2">Online 1v1</h2>
          <p class="text-gray-400 text-sm">Play against another player online</p>
          <p class="text-gray-500 text-xs mt-2">Quick matchmaking via WebSocket</p>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 cursor-pointer transition border-2 border-transparent hover:border-purple-500" id="mode-4p">
          <h2 class="text-xl font-bold mb-2">4-Player Battle</h2>
          <p class="text-gray-400 text-sm">Battle with 4 players on a square field</p>
          <p class="text-gray-500 text-xs mt-2">Each player guards one wall</p>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 cursor-pointer transition border-2 border-transparent hover:border-yellow-500" id="mode-ai">
          <h2 class="text-xl font-bold mb-2">vs AI</h2>
          <p class="text-gray-400 text-sm">Challenge the computer opponent</p>
          <div class="flex gap-2 mt-3">
            <button class="ai-difficulty px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-xs" data-difficulty="easy">Easy</button>
            <button class="ai-difficulty px-3 py-1 bg-yellow-700 hover:bg-yellow-600 rounded text-xs" data-difficulty="medium">Medium</button>
            <button class="ai-difficulty px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-xs" data-difficulty="hard">Hard</button>
          </div>
        </div>
      </div>
    `

    div.querySelector('#mode-local')?.addEventListener('click', () => startGame('local'))
    div.querySelector('#mode-remote')?.addEventListener('click', () => startGame('remote_1v1'))
    div.querySelector('#mode-4p')?.addEventListener('click', () => startGame('remote_4p'))

    div.querySelectorAll('.ai-difficulty').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const difficulty = (btn as HTMLElement).dataset.difficulty || 'medium'
        startGame('ai', difficulty)
      })
    })

    div.querySelector('#mode-ai')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('ai-difficulty')) return
      startGame('ai', 'medium')
    })
  }

  const startGame = (mode: GameMode, aiDifficulty?: string) => {
    currentMode = mode
    div.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <button id="back-btn" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">Back to Menu</button>
        <h1 class="text-2xl font-bold text-center flex-1">${getTitle(mode)}</h1>
        <div class="w-24"></div>
      </div>
      <div class="flex justify-center" id="game-container"></div>
    `

    div.querySelector('#back-btn')?.addEventListener('click', () => {
      currentMode = 'menu'
      renderMenu()
    })

    const container = div.querySelector('#game-container')
    if (!container) return

    let game: HTMLElement

    if (mode === 'local') {
      game = PongGame()
    } else if (mode === 'remote_1v1') {
      game = RemotePongGame('1v1', 'quick_match')
    } else if (mode === 'remote_4p') {
      game = RemotePongGame('4player', 'quick_match')
    } else {
      game = RemotePongGame('1v1', 'play_ai', aiDifficulty)
    }

    game.addEventListener('game-exit', () => {
      currentMode = 'menu'
      renderMenu()
    })

    container.appendChild(game)
  }

  const getTitle = (mode: GameMode): string => {
    switch (mode) {
      case 'local': return 'Local Game'
      case 'remote_1v1': return 'Online 1v1'
      case 'remote_4p': return '4-Player Battle'
      case 'ai': return 'vs AI'
      default: return 'Pong Game'
    }
  }

  if (currentMode === 'menu') {
    renderMenu()
  } else {
    startGame(currentMode)
  }

  return div
}
