// socket.js
let io;

const setIO = (socketIO) => {
  io = socketIO;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO instance is not set.');
  }
  return io;
};

module.exports = {
  setIO,
  getIO,
};
