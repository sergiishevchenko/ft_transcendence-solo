import { AuthService } from '../services/auth.service'

export function LoginPage(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12'

  let errorMessage = ''

  const render = () => {
    div.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-8">
        <h1 class="text-3xl font-bold mb-6 text-center">Login</h1>
        ${errorMessage ? `<div class="bg-red-600 text-white p-3 rounded mb-4">${errorMessage}</div>` : ''}
        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Username or Email</label>
            <input type="text" id="username" required class="w-full px-4 py-2 bg-gray-700 text-white rounded">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Password</label>
            <input type="password" id="password" required class="w-full px-4 py-2 bg-gray-700 text-white rounded">
          </div>
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
            Login
          </button>
        </form>
        <div class="mt-6 text-center">
          <p class="text-gray-400 mb-4">Or login with:</p>
          <div class="flex gap-4 justify-center">
            <a href="${AuthService.getOAuthUrl('google')}" class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded">
              Google
            </a>
            <a href="${AuthService.getOAuthUrl('github')}" class="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded">
              GitHub
            </a>
          </div>
        </div>
        <div class="mt-6 text-center">
          <a href="/register" class="text-blue-400 hover:text-blue-300">Don't have an account? Register</a>
        </div>
      </div>
    `

    const form = div.querySelector('#login-form') as HTMLFormElement
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      errorMessage = ''

      const username = (div.querySelector('#username') as HTMLInputElement).value
      const password = (div.querySelector('#password') as HTMLInputElement).value

      try {
        await AuthService.login(username, password)
        window.history.pushState({}, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      } catch (error: any) {
        errorMessage = error.message
        render()
      }
    })

    div.querySelectorAll('a[href]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = (link as HTMLAnchorElement).getAttribute('href')
        if (href && href.startsWith('/')) {
          e.preventDefault()
          window.history.pushState({}, '', href)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
      })
    })
  }

  render()
  return div
}
