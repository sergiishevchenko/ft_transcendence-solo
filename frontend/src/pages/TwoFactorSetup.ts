import { AuthService } from '../services/auth.service'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function TwoFactorSetupPage(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8'

  let status: 'loading' | 'disabled' | 'setup' | 'enabled' = 'loading'
  let qrCode = ''
  let secret = ''
  let backupCodes: string[] = []
  let errorMessage = ''
  let successMessage = ''

  const checkStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/2fa/status`, {
        headers: AuthService.getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        status = data.enabled ? 'enabled' : 'disabled'
      }
    } catch {
      status = 'disabled'
    }
    render()
  }

  const startSetup = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        qrCode = data.qrCode
        secret = data.secret
        status = 'setup'
      }
    } catch (error: any) {
      errorMessage = error.message
    }
    render()
  }

  const render = () => {
    div.innerHTML = `
      <h1 class="text-3xl font-bold mb-6 text-center">Two-Factor Authentication</h1>
      ${errorMessage ? `<div class="bg-red-600 text-white p-3 rounded mb-4">${errorMessage}</div>` : ''}
      ${successMessage ? `<div class="bg-green-600 text-white p-3 rounded mb-4">${successMessage}</div>` : ''}
      ${renderContent()}
    `
    bindEvents()
  }

  const renderContent = (): string => {
    if (status === 'loading') {
      return '<div class="text-center text-gray-400">Loading...</div>'
    }

    if (status === 'enabled') {
      return `
        <div class="bg-gray-800 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-3 h-3 bg-green-400 rounded-full"></div>
            <span class="text-green-400 font-bold text-lg">2FA is enabled</span>
          </div>
          <p class="text-gray-400 mb-6">Your account is protected with two-factor authentication.</p>
          <div class="border-t border-gray-700 pt-6">
            <h3 class="text-lg font-bold mb-4 text-red-400">Disable 2FA</h3>
            <form id="disable-form" class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">Enter your authenticator code to confirm</label>
                <input type="text" id="disable-code" required maxlength="6"
                  class="w-full px-4 py-2 bg-gray-700 text-white rounded text-center text-xl tracking-widest"
                  placeholder="000000">
              </div>
              <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition">
                Disable 2FA
              </button>
            </form>
          </div>
        </div>
      `
    }

    if (status === 'setup') {
      return `
        <div class="bg-gray-800 rounded-lg p-6">
          <div class="space-y-6">
            <div>
              <h2 class="text-lg font-bold mb-2">Step 1: Scan QR Code</h2>
              <p class="text-gray-400 text-sm mb-4">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
              <div class="flex justify-center bg-white rounded-lg p-4">
                <img src="${qrCode}" alt="QR Code" class="w-48 h-48">
              </div>
            </div>
            <div>
              <h2 class="text-lg font-bold mb-2">Manual entry</h2>
              <p class="text-gray-400 text-sm mb-2">If you can't scan the QR code, enter this key manually:</p>
              <code class="block bg-gray-700 text-green-400 p-3 rounded text-center text-sm break-all select-all">${secret}</code>
            </div>
            <div>
              <h2 class="text-lg font-bold mb-2">Step 2: Verify</h2>
              <p class="text-gray-400 text-sm mb-4">Enter the 6-digit code from your authenticator app to confirm setup.</p>
              <form id="verify-form" class="space-y-4">
                <input type="text" id="verify-code" required maxlength="6"
                  class="w-full px-4 py-2 bg-gray-700 text-white rounded text-center text-2xl tracking-widest"
                  placeholder="000000">
                <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded transition">
                  Enable 2FA
                </button>
              </form>
            </div>
          </div>
        </div>
      `
    }

    if (backupCodes.length > 0) {
      return `
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-lg font-bold mb-2 text-green-400">2FA Enabled Successfully!</h2>
          <p class="text-gray-400 text-sm mb-4">Save these backup codes in a safe place. Each code can only be used once.</p>
          <div class="bg-gray-900 rounded-lg p-4 mb-4">
            <div class="grid grid-cols-2 gap-2">
              ${backupCodes.map(code => `
                <code class="bg-gray-700 text-yellow-400 p-2 rounded text-center font-mono">${code}</code>
              `).join('')}
            </div>
          </div>
          <button id="done-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition">
            Done
          </button>
        </div>
      `
    }

    return `
      <div class="bg-gray-800 rounded-lg p-6">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-3 h-3 bg-gray-500 rounded-full"></div>
          <span class="text-gray-400 font-bold text-lg">2FA is disabled</span>
        </div>
        <p class="text-gray-400 mb-6">
          Add an extra layer of security to your account. When enabled, you'll need to enter a code
          from your authenticator app in addition to your password when logging in.
        </p>
        <button id="setup-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition">
          Set up 2FA
        </button>
      </div>
    `
  }

  const bindEvents = () => {
    div.querySelector('#setup-btn')?.addEventListener('click', startSetup)

    div.querySelector('#done-btn')?.addEventListener('click', () => {
      backupCodes = []
      status = 'enabled'
      render()
    })

    const verifyForm = div.querySelector('#verify-form') as HTMLFormElement
    verifyForm?.addEventListener('submit', async (e) => {
      e.preventDefault()
      errorMessage = ''

      const code = (div.querySelector('#verify-code') as HTMLInputElement).value.trim()
      try {
        const response = await fetch(`${API_URL}/api/auth/2fa/enable`, {
          method: 'POST',
          headers: AuthService.getAuthHeaders(),
          body: JSON.stringify({ code })
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Verification failed')
        }

        const data = await response.json()
        backupCodes = data.backupCodes
        status = 'disabled'
        render()
      } catch (error: any) {
        errorMessage = error.message
        render()
      }
    })

    const disableForm = div.querySelector('#disable-form') as HTMLFormElement
    disableForm?.addEventListener('submit', async (e) => {
      e.preventDefault()
      errorMessage = ''

      const code = (div.querySelector('#disable-code') as HTMLInputElement).value.trim()
      try {
        const response = await fetch(`${API_URL}/api/auth/2fa/disable`, {
          method: 'POST',
          headers: AuthService.getAuthHeaders(),
          body: JSON.stringify({ code })
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Verification failed')
        }

        status = 'disabled'
        successMessage = '2FA has been disabled'
        render()
      } catch (error: any) {
        errorMessage = error.message
        render()
      }
    })
  }

  checkStatus()
  return div
}
