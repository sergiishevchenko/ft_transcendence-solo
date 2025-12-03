import { PongGame } from '../game/PongGame'

export function GamePage(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
  div.innerHTML = `
    <h1 class="text-3xl font-bold mb-6 text-center">Pong Game</h1>
    <div class="flex justify-center" id="game-container"></div>
  `

  const container = div.querySelector('#game-container')
  if (container) {
    const game = PongGame()
    container.appendChild(game)
  }

  return div
}
