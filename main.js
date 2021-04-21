const Koa = require('koa');
const fs = require('fs');
const path = require('path');
const serve = require('koa-static');
const app = new Koa();

app.on('error', async err => {
  console.log('\x1b[91m', `server error:${err}`);
})

const main = serve(path.join(__dirname));
app.use(main);

app.listen(10086, () => {
  console.log('\x1b[32m', `----  http://127.0.0.1:${10086}/html/index.html  ----`);
});