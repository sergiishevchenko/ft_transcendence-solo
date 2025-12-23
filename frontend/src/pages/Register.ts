import { AuthService } from '../services/auth.service'

export function RegisterPage(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12'

  let errorMessage = ''

  const render = () => {
    div.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-8">
        <h1 class="text-3xl font-bold mb-6 text-center">Register</h1>
        ${errorMessage ? `<div class="bg-red-600 text-white p-3 rounded mb-4">${errorMessage}</div>` : ''}
        <form id="register-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Username</label>
            <input type="text" id="username" required class="w-full px-4 py-2 bg-gray-700 text-white rounded">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <input type="email" id="email" required class="w-full px-4 py-2 bg-gray-700 text-white rounded">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Display Name</label>
            <input type="text" id="displayName" class="w-full px-4 py-2 bg-gray-700 text-white rounded">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Password</label>
            <input type="password" id="password" required minlength="6" class="w-full px-4 py-2 bg-gray-700 text-white rounded">
          </div>
          <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition">
            Register
          </button>
        </form>
        <div class="mt-6 text-center">
          <p class="text-gray-400 mb-4">Or register with:</p>
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
          <a href="/login" class="text-blue-400 hover:text-blue-300">Already have an account? Login</a>
        </div>
      </div>
    `

    const form = div.querySelector('#register-form') as HTMLFormElement
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      errorMessage = ''

      const username = (div.querySelector('#username') as HTMLInputElement).value
      const email = (div.querySelector('#email') as HTMLInputElement).value
      const displayName = (div.querySelector('#displayName') as HTMLInputElement).value
      const password = (div.querySelector('#password') as HTMLInputElement).value

      try {
        await AuthService.register(username, email, password, displayName || undefined)
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
