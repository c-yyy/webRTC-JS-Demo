'use strict'

function log(){
  const array = ['>>> Message from server: '];
  for (const i = 0; i < arguments.length; i++) {
    array.push(arguments[i]);
  }
    socket.emit('log', array);
}

module.exports = {
  log
}