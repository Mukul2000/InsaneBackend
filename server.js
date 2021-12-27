const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', socket => {

  socket.on('join_game', async (msg) => {
    console.log("New user joining room", msg);

    const connectedSockets = io.sockets.adapter.rooms.get(msg.roomId);
    const socketRooms = Array.from(socket.rooms.values()).filter(room => room !== socket.id);

    // each socket can be in atmost one room upon connection, room can have atmost 2 people in it.
    if (socketRooms.length > 0 || connectedSockets && connectedSockets.size === 2) {
      socket.emit('room_join_error', { error: 'room is full!' });
    }
    else {
      await socket.join(msg.roomId);
      socket.emit('room_joined');

      if (io.sockets.adapter.rooms.get(msg.roomId).size === 2) {
        // if two players have joined the game
        socket.emit('start_game', { start: true, symbol: 1 });
        socket.to(msg.roomId).emit('start_game', { start: false, symbol: 2 });
      }
    }
  });


  socket.on('update_game', (board_data) => {
    console.log("Game received");
    const socketRooms = Array.from(socket.rooms.values()).filter(r => r !== socket.id); // remove socket id from rooms
    const gameRoom = socketRooms && socketRooms[0];
    socket.to(gameRoom).emit('on_game_update', board_data.board);
  });

  // winning client will emit game_status event, 
  socket.on('game_status', (data) => {
    const socketRooms = Array.from(socket.rooms.values()).filter(r => r !== socket.id); // remove socket id from rooms
    const gameRoom = socketRooms && socketRooms[0];
    if (data.result === "draw")
      socket.to(gameRoom).emit('game_status', { result: "draw" });
    else if (data.result === "win")
      socket.to(gameRoom).emit('game_status', { result: false });
  });

  // send disconnect notification to other sockets in the room.
  socket.on('disconnect', () => {
    const socketRooms = Array.from(socket.rooms.values()).filter(r => r !== socket.id); // remove socket id from rooms
    const gameRoom = socketRooms && socketRooms[0];
    socket.to(gameRoom).emit('player_left');
  });
});

server.listen(process.env.PORT || 8000, () => {
  console.log("Server started on port 8000");
});
