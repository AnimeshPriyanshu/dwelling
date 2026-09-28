import express from 'express'
import { API_PREFIX } from '@dwelling/shared'

const app = express()

app.use(express.json())
app.get(`${API_PREFIX}/health`, (_request, response) => {
  response.json({ status: 'ok' })
})

export default app