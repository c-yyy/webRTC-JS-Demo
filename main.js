'use strict'

const Koa = require('koa')
const app = new Koa()
const routerServer = require('./service/static.js')
const socketServer = require('./service/socket.js')
// 错误捕获
app.on('error', async err => {
  console.error('\x1b[91m', `server error:${err}`)
})

// 启动路由
app.use(routerServer.routes())
app.use(routerServer.allowedMethods())

// 启动服务
app.listen(3478, () => {
  console.log('\x1b[32m', `----  http://127.0.0.1:${3478}  ----`)
})

// 交换信令 server
socketServer(app)
