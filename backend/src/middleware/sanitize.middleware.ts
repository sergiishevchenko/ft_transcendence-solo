import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
]

function containsXSS(value: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(value))
}

function sanitizeString(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  return obj
}

export function sanitizeInput(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
  if (request.body && typeof request.body === 'object') {
    const bodyStr = JSON.stringify(request.body)
    if (containsXSS(bodyStr)) {
      request.body = sanitizeObject(request.body)
    }
  }

  if (request.query && typeof request.query === 'object') {
    for (const value of Object.values(request.query as Record<string, string>)) {
      if (typeof value === 'string' && containsXSS(value)) {
        return reply.status(400).send({ error: 'Potentially dangerous input detected' })
      }
    }
  }

  done()
}
