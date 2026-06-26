import { AuthService } from '../services/auth.service'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function PrivacyPage(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'

  const isAuthenticated = AuthService.isAuthenticated()
  let errorMessage = ''
  let successMessage = ''

  const render = () => {
    div.innerHTML = `
      <h1 class="text-3xl font-bold mb-8 text-center">Privacy & Data Management</h1>
      ${errorMessage ? `<div class="bg-red-600 text-white p-3 rounded mb-4">${errorMessage}</div>` : ''}
      ${successMessage ? `<div class="bg-green-600 text-white p-3 rounded mb-4">${successMessage}</div>` : ''}

      <div class="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 class="text-xl font-bold mb-4">Privacy Policy</h2>
        <div class="text-gray-400 space-y-3 text-sm">
          <p><strong class="text-white">Data Collection:</strong> We collect your username, email, display name, and avatar
          for account management. Game statistics and chat messages are stored for service functionality.</p>
          <p><strong class="text-white">Data Usage:</strong> Your data is used solely for providing the Transcendence gaming
          platform services, including authentication, game matchmaking, and social features.</p>
          <p><strong class="text-white">Data Storage:</strong> All data is stored locally in our SQLite database. We do not
          share your data with third parties.</p>
          <p><strong class="text-white">Your Rights:</strong> Under GDPR, you have the right to access, export, rectify,
          and delete your personal data. Use the tools below to exercise these rights.</p>
          <p><strong class="text-white">Cookies:</strong> We use localStorage tokens for authentication. No tracking cookies
          are used.</p>
          <p><strong class="text-white">Contact:</strong> For privacy-related inquiries, contact the system administrator.</p>
        </div>
      </div>

      ${isAuthenticated ? renderDataManagement() : `
        <div class="bg-gray-800 rounded-lg p-6 text-center">
          <p class="text-gray-400">Please <a href="/login" class="text-blue-400 hover:text-blue-300">log in</a> to manage your data.</p>
        </div>
      `}
    `
    bindEvents()
  }

  const renderDataManagement = (): string => `
    <div class="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 class="text-xl font-bold mb-4">Export Your Data</h2>
      <p class="text-gray-400 mb-4 text-sm">Download a complete copy of all your personal data, including profile
      information, game history, chat messages, and friend connections.</p>
      <button id="export-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition">
        Download My Data
      </button>
    </div>

    <div class="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 class="text-xl font-bold mb-4 text-yellow-400">Anonymize Account</h2>
      <p class="text-gray-400 mb-4 text-sm">Replace your personal information with anonymous data. Your game history
      will be preserved but will no longer be linked to your identity. This action cannot be undone.</p>
      <form id="anonymize-form" class="space-y-3">
        <input type="password" id="anonymize-password" required placeholder="Enter password to confirm"
          class="w-full px-4 py-2 bg-gray-700 text-white rounded">
        <button type="submit" class="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded transition">
          Anonymize My Account
        </button>
      </form>
    </div>

    <div class="bg-gray-800 rounded-lg p-6 border border-red-800">
      <h2 class="text-xl font-bold mb-4 text-red-400">Delete Account</h2>
      <p class="text-gray-400 mb-4 text-sm">Permanently delete your account and all associated data, including game
      history, messages, friends, and profile. This action is irreversible.</p>
      <form id="delete-form" class="space-y-3">
        <input type="password" id="delete-password" required placeholder="Enter password"
          class="w-full px-4 py-2 bg-gray-700 text-white rounded">
        <input type="text" id="delete-confirmation" required placeholder='Type "DELETE" to confirm'
          class="w-full px-4 py-2 bg-gray-700 text-white rounded">
        <button type="submit" class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded transition">
          Delete My Account
        </button>
      </form>
    </div>
  `

  const bindEvents = () => {
    div.querySelector('#export-btn')?.addEventListener('click', async () => {
      try {
        const response = await fetch(`${API_URL}/api/gdpr/export`, {
          headers: AuthService.getAuthHeaders()
        })
        if (!response.ok) throw new Error('Export failed')
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'my-data.json'
        a.click()
        URL.revokeObjectURL(url)
        successMessage = 'Data exported successfully'
        render()
      } catch (error: any) {
        errorMessage = error.message
        render()
      }
    })

    const anonymizeForm = div.querySelector('#anonymize-form') as HTMLFormElement
    anonymizeForm?.addEventListener('submit', async (e) => {
      e.preventDefault()
      errorMessage = ''
      const password = (div.querySelector('#anonymize-password') as HTMLInputElement).value

      if (!confirm('Are you sure? This will replace all your personal data with anonymous information. This cannot be undone.')) {
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/gdpr/anonymize`, {
          method: 'POST',
          headers: AuthService.getAuthHeaders(),
          body: JSON.stringify({ password })
        })
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Anonymization failed')
        }
        AuthService.clearTokens()
        window.history.pushState({}, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      } catch (error: any) {
        errorMessage = error.message
        render()
      }
    })

    const deleteForm = div.querySelector('#delete-form') as HTMLFormElement
    deleteForm?.addEventListener('submit', async (e) => {
      e.preventDefault()
      errorMessage = ''
      const password = (div.querySelector('#delete-password') as HTMLInputElement).value
      const confirmation = (div.querySelector('#delete-confirmation') as HTMLInputElement).value

      if (confirmation !== 'DELETE') {
        errorMessage = 'Please type "DELETE" to confirm'
        render()
        return
      }

      if (!confirm('Are you absolutely sure? ALL your data will be permanently deleted. This cannot be undone.')) {
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/gdpr/account`, {
          method: 'DELETE',
          headers: AuthService.getAuthHeaders(),
          body: JSON.stringify({ password, confirmation })
        })
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Deletion failed')
        }
        AuthService.clearTokens()
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
