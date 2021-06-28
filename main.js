'use strict'

const Koa = require('koa')
const app = new Koa()
// const routerServer = require('./service/static.js')
const socketServer = require('./service/socket.js')
app.use((req, res, next) => {
  //判断路径
    if(req.path !== '/' && !req.path.includes('.')){
      res.set({
        'Access-Control-Allow-Credentials': true, //允许后端发送cookie
        'Access-Control-Allow-Origin': req.headers.origin || '*', //任意域名都可以访问,或者基于我请求头里面的域
        'Access-Control-Allow-Headers': 'X-Requested-With,Content-Type', //设置请求头格式和类型
        'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS',//允许支持的请求方式
        'Content-Type': 'application/json; charset=utf-8'//默认与允许的文本格式json和编码格式
      })
    }
    req.method === 'OPTIONS' ? res.status(204).end() : next()
  })

// // 错误捕获
// app.on('error', async err => {
//   console.error('\x1b[91m', `server error:${err}`)
// })

// // 启动路由
// app.use(routerServer.routes())
// app.use(routerServer.allowedMethods())

// // 启动服务
// app.listen(3478, () => {
//   console.log('\x1b[32m', `----  http://127.0.0.1:${3478}  ----`)
// })

// 交换信令 server
socketServer(app)
