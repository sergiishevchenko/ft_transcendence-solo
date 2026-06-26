import { AuthService } from '../services/auth.service'

export function LoginPage(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12'

  let errorMessage = ''
  let tempToken = ''
  let show2FA = false

  const render = () => {
    if (show2FA) {
      render2FA()
      return
    }

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
        const result = await AuthService.login(username, password)

        if (result.requires2FA && result.tempToken) {
          tempToken = result.tempToken
          show2FA = true
          render()
          return
        }

        window.history.pushState({}, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      } catch (error: any) {
        errorMessage = error.message
        render()
      }
    })

    bindLinks()
  }

  const render2FA = () => {
    div.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-8">
        <h1 class="text-3xl font-bold mb-2 text-center">Two-Factor Authentication</h1>
        <p class="text-gray-400 text-center mb-6">Enter the code from your authenticator app</p>
        ${errorMessage ? `<div class="bg-red-600 text-white p-3 rounded mb-4">${errorMessage}</div>` : ''}
        <form id="2fa-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Verification Code</label>
            <input type="text" id="totp-code" required maxlength="8" autocomplete="one-time-code"
              class="w-full px-4 py-2 bg-gray-700 text-white rounded text-center text-2xl tracking-widest"
              placeholder="000000">
          </div>
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
            Verify
          </button>
        </form>
        <p class="text-gray-500 text-sm text-center mt-4">You can also use a backup code</p>
        <div class="mt-4 text-center">
          <button id="back-btn" class="text-gray-400 hover:text-white text-sm">Back to login</button>
        </div>
      </div>
    `

    const form = div.querySelector('#2fa-form') as HTMLFormElement
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      errorMessage = ''

      const code = (div.querySelector('#totp-code') as HTMLInputElement).value.trim()

      try {
        await AuthService.verify2FA(tempToken, code)
        window.history.pushState({}, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      } catch (error: any) {
        errorMessage = error.message
        render2FA()
      }
    })

    div.querySelector('#back-btn')?.addEventListener('click', () => {
      show2FA = false
      tempToken = ''
      errorMessage = ''
      render()
    })

    const codeInput = div.querySelector('#totp-code') as HTMLInputElement
    codeInput?.focus()
  }

  const bindLinks = () => {
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
