import { AuthService, User } from '../services/auth.service'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function ProfilePage(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'

  let user: User | null = null
  let stats: any = null
  let friends: any[] = []
  let errorMessage = ''

  const loadData = async () => {
    user = AuthService.getUser()
    if (!user) {
      window.history.pushState({}, '', '/login')
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }

    try {
      const [statsRes, friendsRes] = await Promise.all([
        fetch(`${API_URL}/api/users/${user.id}/stats`, {
          headers: AuthService.getAuthHeaders()
        }),
        fetch(`${API_URL}/api/users/friends/list`, {
          headers: AuthService.getAuthHeaders()
        })
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        stats = statsData.stats
      }

      if (friendsRes.ok) {
        const friendsData = await friendsRes.json()
        friends = friendsData.friends || []
      }
    } catch (error) {
      console.error('Failed to load profile data:', error)
    }

    render()
  }

  const render = () => {
    if (!user) {
      div.innerHTML = '<div class="text-center">Loading...</div>'
      return
    }

    div.innerHTML = `
      <h1 class="text-3xl font-bold mb-6 text-center">Profile</h1>
      ${errorMessage ? `<div class="bg-red-600 text-white p-3 rounded mb-4">${errorMessage}</div>` : ''}
      
      <div class="bg-gray-800 rounded-lg p-6 mb-6">
        <div class="flex items-center gap-6 mb-6">
          <div class="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
            ${user.avatar_url 
              ? `<img src="${API_URL}${user.avatar_url}" alt="${user.display_name || user.username}" class="w-full h-full object-cover">`
              : `<span class="text-3xl">${(user.display_name || user.username)[0].toUpperCase()}</span>`
            }
          </div>
          <div>
            <h2 class="text-2xl font-bold">${user.display_name || user.username}</h2>
            <p class="text-gray-400">@${user.username}</p>
            <p class="text-gray-400">${user.email}</p>
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Display Name</label>
          <input type="text" id="displayName" value="${user.display_name || ''}" class="w-full px-4 py-2 bg-gray-700 text-white rounded">
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Avatar</label>
          <input type="file" id="avatar" accept="image/*" class="w-full px-4 py-2 bg-gray-700 text-white rounded">
        </div>
        
        <button id="save-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
          Save Changes
        </button>
      </div>

      ${stats ? `
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 class="text-xl font-bold mb-4">Statistics</h2>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-3xl font-bold text-green-400">${stats.wins}</div>
              <div class="text-gray-400">Wins</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-red-400">${stats.losses}</div>
              <div class="text-gray-400">Losses</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-blue-400">${stats.winRate}%</div>
              <div class="text-gray-400">Win Rate</div>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="bg-gray-800 rounded-lg p-6">
        <h2 class="text-xl font-bold mb-4">Friends (${friends.length})</h2>
        ${friends.length > 0 
          ? `<div class="space-y-2">
              ${friends.map(f => `
                <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                      ${f.avatar_url 
                        ? `<img src="${API_URL}${f.avatar_url}" alt="${f.display_name || f.username}" class="w-full h-full object-cover rounded-full">`
                        : `<span>${(f.display_name || f.username)[0].toUpperCase()}</span>`
                      }
                    </div>
                    <div>
                      <div class="font-bold">${f.display_name || f.username}</div>
                      <div class="text-sm text-gray-400">@${f.username}</div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>`
          : '<p class="text-gray-400">No friends yet</p>'
        }
      </div>

      <div class="mt-6 text-center">
        <button id="logout-btn" class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded">
          Logout
        </button>
      </div>
    `

    const saveBtn = div.querySelector('#save-btn')
    saveBtn?.addEventListener('click', async () => {
      const displayName = (div.querySelector('#displayName') as HTMLInputElement).value
      const avatarFile = (div.querySelector('#avatar') as HTMLInputElement).files?.[0]

      try {
        if (displayName !== user?.display_name) {
          const response = await fetch(`${API_URL}/api/users/profile`, {
            method: 'PUT',
            headers: AuthService.getAuthHeaders(),
            body: JSON.stringify({ displayName })
          })
          if (response.ok) {
            const data = await response.json()
            AuthService.setUser(data.user)
            user = data.user
          }
        }

        if (avatarFile) {
          const formData = new FormData()
          formData.append('file', avatarFile)
          const response = await fetch(`${API_URL}/api/users/profile/avatar`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AuthService.getAccessToken()}`
            },
            body: formData
          })
          if (response.ok) {
            const data = await response.json()
            AuthService.setUser(data.user)
            user = data.user
          }
        }

        errorMessage = ''
        await loadData()
      } catch (error: any) {
        errorMessage = error.message || 'Failed to save changes'
        render()
      }
    })

    const logoutBtn = div.querySelector('#logout-btn')
    logoutBtn?.addEventListener('click', () => {
      AuthService.clearTokens()
      window.history.pushState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
  }

  loadData()
  return div
}
