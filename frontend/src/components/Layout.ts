import { AuthService } from '../services/auth.service'

export function Layout(content: HTMLElement) {
  const root = document.getElementById('root')
  if (!root) return

  const currentPath = window.location.pathname
  const isAuthenticated = AuthService.isAuthenticated()
  const user = AuthService.getUser()

  root.innerHTML = `
    <div class="min-h-screen bg-gray-900 text-white">
      <nav class="bg-gray-800 border-b border-gray-700">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center">
              <a href="/" class="text-xl font-bold text-blue-400">Transcendence</a>
            </div>
            <div class="flex items-center space-x-4">
              <a href="/" class="px-3 py-2 rounded-md text-sm font-medium ${currentPath === '/' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">Home</a>
              <a href="/game" class="px-3 py-2 rounded-md text-sm font-medium ${currentPath === '/game' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">Play</a>
              <a href="/tournament" class="px-3 py-2 rounded-md text-sm font-medium ${currentPath === '/tournament' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">Tournament</a>
              ${isAuthenticated 
                ? `<a href="/profile" class="px-3 py-2 rounded-md text-sm font-medium ${currentPath === '/profile' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">${user?.display_name || user?.username || 'Profile'}</a>`
                : `<a href="/login" class="px-3 py-2 rounded-md text-sm font-medium ${currentPath === '/login' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">Login</a>`
              }
            </div>
          </div>
        </div>
      </nav>
      <main></main>
    </div>
  `

  const main = root.querySelector('main')
  if (main) {
    main.appendChild(content)
  }

  root.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const href = (link as HTMLAnchorElement).getAttribute('href')
      if (href) {
        window.history.pushState({}, '', href)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    })
  })
}
