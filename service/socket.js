'use strict'

const socketServer = (app) => {
  const http = require('http').createServer(app)
  const io = require('socket.io')(http, {
    cors: {
      origin: "http://127.0.0.1:3478",
    },
  })
  http.listen('3479', '127.0.0.1')
  console.log('\x1b[32m', `----  ws://127.0.0.1:${3479}  ----`)


  const outputLog = (...args) => {
    io.emit(`Message from server >> ${args}`)
  }

  io.sockets.on('connection', socket => {
    let roomNum
    console.log('\x1b[1m', '\x1b[30m', 'A user is connected')
  
    socket.on('create room', async room => {
      await socket.join(room)
      await io.emit('wait join room', room)
      outputLog('wait join room ' + room)
    })

    socket.on('join room', async room => {
      await socket.to(room)
      await io.emit('joined room', room)
      roomNum = room
      outputLog('join room', room)
    })

    socket.on('local stream desc', async desc => {
      socket.emit('got localPeerConnection desc', desc)
      outputLog('local stream desc', desc)
    })

    socket.on('remote stream desc', async desc => {
      socket.emit('got remotePeerConnection desc', desc)
      outputLog('remote stream desc', desc)
    })

    socket.on('local stream candidate', async candidate => {
      socket.emit('got remotePeerConnection candidate', candidate)
      outputLog('local stream candidate', candidate)
    })

    socket.on('remote stream candidate', async candidate => {
      socket.emit('got localPeerConnection candidate', candidate)
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