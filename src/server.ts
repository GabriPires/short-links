import fastify from 'fastify'
import { z } from 'zod'
import { pg } from './lib/postgres'
import postgres from 'postgres'
import { redis } from './lib/redis'

const app = fastify()

app.get('/:code', async (request, reply) => {
  const paramsSchema = z.object({
    code: z.string().min(3),
  })

  const { code } = paramsSchema.parse(request.params)

  const result = await pg`
    SELECT id, original_url
    FROM short_links
    WHERE short_links.code = ${code}
  `

  if (result.length === 0) {
    return reply.status(400).send({ message: 'Link not found.' })
  }

  const link = result[0]

  await redis.zIncrBy('metrics', 1, String(link.id))

  return reply.redirect(301, link.original_url)
})

app.get('/api/links', async () => {
  const result = pg`
    SELECT * 
    FROM short_links
    ORDER BY created_at DESC
  `

  return result
})

app.post('/api/links', async (request, reply) => {
  const bodySchema = z.object({
    code: z.string().min(3),
    url: z.string().url(),
  })

  const { code, url } = bodySchema.parse(request.body)

  try {
    const result = await pg`
    INSERT INTO short_links (code, original_url) 
    VALUES (${code}, ${url})
    RETURNING id
    `

    const link = result[0]

    reply.status(201).send({ shortLinkId: link.id })
  } catch (error) {
    if (error instanceof postgres.PostgresError) {
      if (error.code === '23505') {
        reply.status(400).send({ error: 'Duplicated code.' })
      }
    }

    console.error(error)

    return reply.status(500).send({ error: 'Internal error.' })
  }
})

app.get('/api/metrics', async () => {
  const result = await redis.zRangeByScoreWithScores('metrics', 0, 50)

  const metrics = result
    .sort((a, b) => b.score - a.score)
    .map((item) => ({
      shortLinkId: Number(item.value),
      clicks: item.score,
    }))

  return metrics
})

app
  .listen({
    port: 3333,
  })
  .then(() => {
    console.log('HTTP server is running!')
  })
