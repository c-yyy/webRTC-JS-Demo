'use strict'

const router = require('koa-router')();
const fs = require('fs');

// 静态服务
router.get('/', async (ctx)=>{
  ctx.response.type = 'html';
  ctx.response.body = fs.createReadStream('./html/index.html');
});
router.get('/utils.js', async (ctx)=>{
  ctx.response.type = 'js';
  ctx.response.body = fs.createReadStream('./html/utils.js');
});
router.get('/index.js', async (ctx)=>{
  ctx.response.type = 'js';
  ctx.response.body = fs.createReadStream('./html/index.js');
});
router.get('/index.css', async (ctx)=>{
  ctx.response.type = 'css';
  ctx.response.body = fs.createReadStream('./html/index.css');
});

module.exports = {
  router
}