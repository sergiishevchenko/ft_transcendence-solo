import { FastifyInstance } from 'fastify'
import { UserModel } from '../models/user.model'
import { GameModel, Game } from '../models/game.model'
import { TournamentModel, TournamentParticipantModel, TournamentMatchModel } from '../models/tournament.model'

export async function apiRoutes(fastify: FastifyInstance) {
  fastify.get('/users', async (request, reply) => {
    const users = UserModel.findAll()
    return { users }
  })

  fastify.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = UserModel.findById(parseInt(id))
    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }
    return { user }
  })

  fastify.get('/games', async (request, reply) => {
    const games = GameModel.findAll()
    return { games }
  })

  fastify.get('/games/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const game = GameModel.findById(parseInt(id))
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' })
    }
    return { game }
  })

  fastify.post('/games', async (request, reply) => {
    const body = request.body as Partial<Game>
    const game = GameModel.create({
      player1_id: body.player1_id,
      player2_id: body.player2_id,
      player1_score: body.player1_score || 0,
      player2_score: body.player2_score || 0,
      status: body.status || 'pending'
    })
    return { game }
  })

  fastify.get('/tournaments', async (request, reply) => {
    const tournaments = TournamentModel.findAll()
    return { tournaments }
  })

  fastify.get('/tournaments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const tournament = TournamentModel.findById(parseInt(id))
    if (!tournament) {
      return reply.status(404).send({ error: 'Tournament not found' })
    }
    
    const participants = TournamentParticipantModel.findByTournament(parseInt(id))
    const matches = TournamentMatchModel.findByTournament(parseInt(id))
    
    return {
      tournament,
      participants,
      matches
    }
  })

  fastify.post('/tournaments', async (request, reply) => {
    const body = request.body as { name: string; type?: string }
    const tournament = TournamentModel.create({
      name: body.name,
      type: (body.type as any) || 'single_elimination',
      status: 'pending'
    })
    return { tournament }
  })

  fastify.post('/tournaments/:id/participants', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { alias: string; user_id?: number }
    
    const tournament = TournamentModel.findById(parseInt(id))
    if (!tournament) {
      return reply.status(404).send({ error: 'Tournament not found' })
    }

    const participant = TournamentParticipantModel.create({
      tournament_id: parseInt(id),
      alias: body.alias,
      user_id: body.user_id,
      eliminated: false
    })
    
    return { participant }
  })

  fastify.get('/tournaments/:id/matches', async (request, reply) => {
    const { id } = request.params as { id: string }
    const matches = TournamentMatchModel.findByTournament(parseInt(id))
    return { matches }
  })
}
