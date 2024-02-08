import express from 'express'
import { toursRouter } from './routes/tours-routes.js'
import { userRouter } from './routes/user-routes.js'
import morgan from 'morgan'
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

export const app = express()
app.disable('x-powered-by')

//! MIDDLEWARES

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

app.use(express.json())
app.use(express.static('public'))

app.use((req, res, next) => {
  console.log('Hello from the middleware 👌')
  next()
})

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString()

  next()
})

// ! ROUTES

app.use('/api/v1/tours', toursRouter)
app.use('/api/v1/users', userRouter)
