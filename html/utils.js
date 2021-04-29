'use strict'
/**
 * 工具包
 * 1.日志输出
 * 2.初始化
 * 3.错误监听
 */

// 日志输出
const log = document.querySelector('#textarea')
const inputLog = (text, color = '#606266') => {
  const time = new Date()
  const y = time.getFullYear()
  const m = time.getMonth() + 1
  const d = time.getDate()
  const h = time.getHours() < 10 ? '0' + time.getHours() : time.getHours()
  const f = time.getMinutes() < 10 ? '0' + time.getMinutes() : time.getMinutes()
  const s = time.getSeconds() < 10 ? '0' + time.getSeconds() : time.getSeconds()
  const now = `[&nbsp;${y}-${m}-${d} ${h}:${f}:${s}&nbsp;]`
  log.innerHTML += `<p><span>${now}<span>&nbsp;&nbsp;<span style="color:${color}">${text}</span></p>`

  // 异步控制滚动条位置，不阻塞主线程
  setTimeout(() => {
  const hScrollTop = log.scrollTop
  const hScrollHeight = log.scrollHeight
  const height = log.offsetHeight
  //滚动条已经到了容器底部
  if((height + hScrollTop) < hScrollHeight){
    const h = hScrollTop + height
    log.scrollTop = h
  }
  }, 0)
}