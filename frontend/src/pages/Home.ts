export function HomePage(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'
  div.innerHTML = `
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-4">Welcome to Transcendence</h1>
      <p class="text-xl text-gray-300 mb-8">
        The ultimate Pong tournament experience
      </p>
      <div class="flex flex-wrap justify-center gap-4 mb-12">
        <a href="/game" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">Play Now</a>
        <a href="/game?mode=ai" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition">Play vs AI</a>
        <a href="/tournament" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition">Join Tournament</a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        <div class="bg-gray-800 rounded-lg p-6">
          <h3 class="text-lg font-bold mb-2">Online Multiplayer</h3>
          <p class="text-gray-400 text-sm">Play 1v1 or 4-player battles against opponents from around the world via WebSocket</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-6">
          <h3 class="text-lg font-bold mb-2">AI Opponent</h3>
          <p class="text-gray-400 text-sm">Challenge our AI with three difficulty levels: Easy, Medium, and Hard</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-6">
          <h3 class="text-lg font-bold mb-2">Live Chat</h3>
          <p class="text-gray-400 text-sm">Chat with other players, invite them to games, and track online status</p>
        </div>
      </div>
    </div>
  `

  div.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const href = (link as HTMLAnchorElement).getAttribute('href')
      if (href) {
        window.history.pushState({}, '', href)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    })
  })

  return div
}
