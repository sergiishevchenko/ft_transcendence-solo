export function HomePage(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'
  div.innerHTML = `
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-4">Welcome to Transcendence</h1>
      <p class="text-xl text-gray-300 mb-8">
        The ultimate Pong tournament experience
      </p>
      <div class="flex justify-center space-x-4">
        <a href="/game" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">Play Now</a>
        <a href="/tournament" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition">Join Tournament</a>
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

