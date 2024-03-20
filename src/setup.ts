import { pg } from './lib/postgres'

async function setup() {
  await pg`
    CREATE TABLE IF NOT EXISTS short_links (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE,
      original_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  await pg.end()

  console.log('Database setup completed!')
}

setup()
