import './index.css'
import { Router } from './router'
import { HomePage } from './pages/Home'
import { GamePage } from './pages/Game'
import { TournamentPage } from './pages/Tournament'
import { Layout } from './components/Layout'

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

router.setNotFound(() => {
  router.navigate('/')
})

router.init()
