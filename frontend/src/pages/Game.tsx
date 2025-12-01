import { useEffect, useRef } from 'react'

import PongGame from '../game/PongGame'

export default function Game() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Pong Game</h1>
      <div className="flex justify-center">
        <PongGame />
      </div>
    </div>
  )
}
