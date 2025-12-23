import './index.css'
import { Router } from './router'
import { HomePage } from './pages/Home'
import { GamePage } from './pages/Game'
import { TournamentPage } from './pages/Tournament'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { ProfilePage } from './pages/Profile'
import { Layout } from './components/Layout'
import { AuthService } from './services/auth.service'

const router = new Router()

router.addRoute('/', () => {
  const content = HomePage()
  Layout(content)
})

router.addRoute('/game', () => {
  const content = GamePage()
  Layout(content)
})

router.addRoute('/tournament', () => {
  const content = TournamentPage()
  Layout(content)
})

router.addRoute('/login', () => {
  const content = LoginPage()
  Layout(content)
})

router.addRoute('/register', () => {
  const content = RegisterPage()
  Layout(content)
})

router.addRoute('/profile', () => {
  const content = ProfilePage()
  Layout(content)
})

router.addRoute('/auth/callback', () => {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const refresh = params.get('refresh')
  
  if (token && refresh) {
    AuthService.setTokens({ accessToken: token, refreshToken: refresh })
    AuthService.getCurrentUser().then(() => {
      window.history.pushState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
  } else {
    window.history.pushState({}, '', '/login')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
})

router.setNotFound(() => {
  router.navigate('/')
})

router.init()
