import postgres from 'postgres'

export const pg = postgres('postgres://docker:docker@localhost:5432/shortlinks')
