import express from 'express'
import databaseService from './services/database.services'
import { usersRouter } from './routes/users.routes'
import { defaultErrorHanddler } from './middlewares/error.middleware'
import { initFoder } from './utils/file'
import { mediasRouter } from './routes/medias.routes'
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from './constants/dir'
import staticRouter from './routes/statics.routes'
import tweetRouter from './routes/tweets.routes'
import { bookmarksRouter } from './routes/bookmarks.routes'
import { likesRouter } from './routes/likes.routes'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'
import { da } from '@faker-js/faker'
import Conversation from './models/schemas/Conversasations'
import { conversationsRouter } from './routes/conversations.routes'
import { ObjectId } from 'mongodb'
import { commentRouter } from '~/routes/comment.routes'
//import '~/utils/fake'
const app = express()

app.use(
  cors({
    origin: 'http://localhost:3000', // Cho phép truy cập từ frontend
    credentials: true // Cho phép gửi cookie
  })
)

const httpServer = createServer(app)
const port = 4000
databaseService.conect().then(() => {
  // databaseService.indexUsers()
  // databaseService.indexRefreshToken()
  // databaseService.indexFollowers()
})
initFoder()
app.use(express.json())
app.use('/users', usersRouter)
app.use('/medias', mediasRouter)
//app.use('/static', staticRouter)
app.use('/tweets', tweetRouter)
app.use('/bookmarks', bookmarksRouter)
app.use('/likes', likesRouter)
app.use('/comments', commentRouter)
app.use('/conversations', conversationsRouter)

app.use('/medias', express.static(UPLOAD_IMAGE_DIR))
app.use('/static/video', express.static(UPLOAD_VIDEO_DIR))

app.use(defaultErrorHanddler)
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000', // Cho phép truy cập từ frontend
    credentials: true // Cho phép gửi cookie
  }
})

const users: {
  [key: string]: {
    socket_id: string
  }
} = {}
io.on('connection', (socket: Socket) => {
  console.log(`user ${socket.id} connect`)
  const user_id = socket.handshake.auth._id
  console.log('user_id', user_id)
  users[user_id] = {
    socket_id: socket.id
  }
  console.log(users)

  socket.on('private_message', async (data) => {
    const socket_reciver_id = users[data.to]?.socket_id
    if (!socket_reciver_id) {
      return
    }
    await databaseService.conversations.insertOne(
      new Conversation({
        sender_id: new ObjectId(data.from),
        receiver_id: new ObjectId(data.to),
        content: data.content
      })
    )
    socket.to(socket_reciver_id).emit('reciver_message', {
      content: data.content,
      from: user_id
    })
  })
  socket.on('disconnect', () => {
    delete users[user_id]
    console.log(`user ${socket.id} disconnect`)
    console.log(users)
  })
})
httpServer.listen(port, () => {
  console.log(`Dang Chay tren Port ${port}`)
})
