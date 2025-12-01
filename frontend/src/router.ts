export class Router {
  private routes: Map<string, () => void> = new Map()
  private notFoundHandler?: () => void

  addRoute(path: string, handler: () => void) {
    this.routes.set(path, handler)
  }

  setNotFound(handler: () => void) {
    this.notFoundHandler = handler
  }

  navigate(path: string) {
    window.history.pushState({}, '', path)
    this.handleRoute()
  }

  private handleRoute() {
    const path = window.location.pathname
    const handler = this.routes.get(path)

    if (handler) {
      handler()
    } else if (this.notFoundHandler) {
      this.notFoundHandler()
    }
  }

  init() {
    window.addEventListener('popstate', () => {
      this.handleRoute()
    })

    this.handleRoute()
  }
}

