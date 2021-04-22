const Koa = require('koa');
const router = require('koa-router')();
const fs = require('fs');
const app = new Koa();

// 错误捕获
app.on('error', async err => {
  console.log('\x1b[91m', `server error:${err}`);
})

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

// 启动路由
app.use(router.routes());
app.use(router.allowedMethods());

// 启动服务
app.listen(3478, () => {
  console.log('\x1b[32m', `----  http://127.0.0.1:${3478}  ----`);
});