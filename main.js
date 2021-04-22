'use strict'

const Koa = require('koa')
const app = new Koa()
const http = require('http')
const { router } = require('./service/static.js')
const { log } = require('./service/socket.js')

// 错误捕获
app.on('error', async err => {
  console.log('\x1b[91m', `server error:${err}`)
})

// 启动路由
app.use(router.routes())
app.use(router.allowedMethods())

// 启动服务
const server = http.createServer(app.callback())
server.listen(3478, () => {
  console.log('\x1b[32m', `----  http://127.0.0.1:${3478}  ----`)
})


// 交换信令 server
const io = require('socket.io')(app, {
  cors: {
    origin: "http://127.0.0.1:3478",
  },
})
io.sockets.on('connection', socket => {
  console.log('connection')
  socket.on('message', message => {
    log('Got message:', message)
    // For a real app, would be room only (not broadcast)
    socket.broadcast.emit('message', message)
  })

  socket.on('create or join', (room) => {
    console.log(1)
    const numClients = io.sockets.clients(room).length

    log('Room ' + room + ' has ' + numClients + ' client(s)')
    log('Request to create or join room ' + room)

    if (numClients === 0){
      socket.join(room)
      socket.emit('created', room)
    } else if (numClients === 1) {
      io.sockets.in(room).emit('join', room)
      socket.join(room)
      socket.emit('joined', room)
    } else { // max two clients
      socket.emit('full', room)
    }
    socket.emit('emit(): client ' + socket.id +
      ' joined room ' + room)
    socket.broadcast.emit('broadcast(): client ' + socket.id +
      ' joined room ' + room)

  })
})
