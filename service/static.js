'use strict'

const routerServer = require('koa-router')()
const fs = require('fs')

// 静态服务
routerServer.get('/', async (ctx)=>{
  ctx.response.type = 'html'
  ctx.response.body = fs.createReadStream('./html/index.html')
})
routerServer.get('/utils.js', async (ctx)=>{
  ctx.response.type = 'js'
  ctx.response.body = fs.createReadStream('./html/utils.js')
})
routerServer.get('/index.js', async (ctx)=>{
  ctx.response.type = 'js'
  ctx.response.body = fs.createReadStream('./html/index.js')
})
routerServer.get('/index.css', async (ctx)=>{
  ctx.response.type = 'css'
  ctx.response.body = fs.createReadStream('./html/index.css')
})

module.exports = routerServer