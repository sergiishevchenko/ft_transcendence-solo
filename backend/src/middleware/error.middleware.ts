import { FastifyRequest, FastifyReply } from 'fastify'

export async function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error)
  
  const statusCode = (error as any).statusCode || 500
  const message = statusCode === 500 ? 'Internal Server Error' : error.message

  reply.status(statusCode).send({
    error: true,
    message,
    statusCode
  })
}
