'use strict'

const socketServer = (app) => {
  const http = require('http').createServer(app)
  const io = require('socket.io')(http, {
    cors: {
      origin: "*",
    },
  })
  http.listen(3479, '0.0.0.0')
  console.log('\x1b[32m', `----  ws://192.168.1.111:${3479}  ----`)

  const outputLog = (...args) => {
    io.emit(`Message from server >> ${args}`)
  }

  io.sockets.on('connection', socket => {
    let roomLen = 0
    console.log(new Date().toString(), '「 A user is connected! 」')
  
    socket.on('create room', async room => {
      ++roomLen
      await socket.join(room)
      await io.emit('wait join room', room)
      outputLog('wait join room ' + room)
    })

    socket.on('join room', async room => {
      ++roomLen
      if (roomLen > 2) {
        await io.emit('full')
      } else {
        await io.to(room).emit('joined room', room)
        // await io.emit('joined room', room)
        outputLog('join room', room)
      }
      console.log('roomLen', roomLen)
    })

    socket.on('local stream desc', async desc => {
      await io.emit('got localPeerConnection desc', desc)
      outputLog('local stream desc', desc)
    })

    socket.on('remote stream desc', async desc => {
      await io.emit('got remotePeerConnection desc', desc)
      outputLog('remote stream desc', desc)
    })

    socket.on('local stream candidate', async candidate => {
      await io.emit('got remotePeerConnection candidate', candidate)
      outputLog('local stream candidate', candidate)
    })

    socket.on('remote stream candidate', async candidate => {
      await io.emit('got localPeerConnection candidate', candidate)
      outputLog('remote stream candidate', candidate)
    })
  })

  io.sockets.on('disconnect', socket => {
    console.log(socket, 'you have been disconnected')
    socket.disconnect()
    outputLog('you have been disconnected')
  })
}

module.exports = socketServer