import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Transcendence</h1>
        <p className="text-xl text-gray-300 mb-8">
          The ultimate Pong tournament experience
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            to="/game"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            Play Now
          </Link>
          <Link
            to="/tournament"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            Join Tournament
          </Link>
        </div>
      </div>
    </div>
  )
}
