export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.emit('server:ready')
  })
}