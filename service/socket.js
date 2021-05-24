'use strict'

const socketServer = (app) => {
  const http = require('http').createServer()
  const io = require('socket.io')(http, {
    // cors: {
    //   origin: "*",
    //   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    //   allowedHeaders: ["accept", "authorization", "cache-control", "content-type", "dnt", "if-modified-since", "keep-alive", "origin", "user-agent", "x-requested-with", "token", "x-access-token"],
    //   credentials: true
    // },
  })
  http.listen(3479)
  // http.listen(3479, '0.0.0.0')
  console.log('\x1b[32m', `----  http://192.168.1.111:${3479}  ----`)

  const outputLog = (...args) => {
    io.emit(`Message from server >> ${args}`)
  }

  io.sockets.on('connection', socket => {
    const USERCOUNT = 3;

    socket.on('message', (room, data)=>{
      socket.to(room)
      io.emit('message',room, data);
    });
  
    // 这里应该加锁
    socket.on('join', (room)=>{
      console.log('join ---', room)
      socket.join(room);
      const myRoom = io.sockets.adapter.rooms.get(room);
      const users = myRoom? myRoom.size : 0;
      console.debug('the user number of room is: ' + users);
  
      // 控制房间人数 USERCOUNT
      if(users < USERCOUNT){
        io.emit('joined', room, socket.id); //发给除自己之外的房间内的所有人
        console.log('joined', room, socket.id)
        if(users === 1) {
          console.log('wait join')
          socket.to(room).emit('wait join', room, socket.id);
          io.emit('wait join', room, socket.id);
        }
      }else{
        socket.leave(room).emit('full', room, socket.id);
        io.emit('full', room, socket.id);
      }
      //socket.emit('joined', room, socket.id); //发给自己
      //socket.broadcast.emit('joined', room, socket.id); //发给除自己之外的这个节点上的所有人
      //io.in(room).emit('joined', room, socket.id); //发给房间内的所有人
    });
  
    socket.on('leave', (room)=>{
      const myRoom = io.sockets.adapter.rooms.get(room);
      const users = myRoom? myRoom.size : 0;
      console.debug('the user number of room is: ' + (users-1));
      //socket.emit('leaved', room, socket.id);
      //socket.broadcast.emit('leaved', room, socket.id);
      socket.to(room).emit('bye', room, socket.id);
      io.emit('bye', room, socket.id);
      io.emit('leaved', room, socket.id);
      console.debug('leaved', room, socket.id)
      //io.in(room).emit('leaved', room, socket.id);
    });
  })

  io.sockets.on('disconnect', socket => {
    console.log(socket, 'you have been disconnected')
    socket.disconnect()
    outputLog('you have been disconnected')
  })
}

module.exports = socketServer