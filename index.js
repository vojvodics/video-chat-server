const path = require('path');
const express = require('express');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

function generateUUID() {
  var d = new Date().getTime(); //Timestamp
  var d2 = (performance && performance.now && performance.now() * 1000) || 0; //Time in microseconds since page-load or 0 if unsupported
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16; //random number between 0 and 16
    if (d > 0) {
      //Use timestamp until depleted
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      //Use microseconds since page-load if supported
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const EVENTS = {
  INIT_ROOM: 'INIT_ROOM',
  ROOM_CREATED: 'ROOM_CREATED',
  INVALID_ROOM: 'INVALID_ROOM',
  JOIN_ROOM: 'JOIN_ROOM',
  UPDATE_PEERS: 'UPDATE_PEERS'
};

// the list of rooms
// just a placeholder for connected peers
const rooms = new Map();

io.on('connection', function(socket) {
  let user;
  let joinedRoom;

  socket.on(EVENTS.INIT_ROOM, function(user) {
    user = user;
    const room = generateUUID();

    rooms.set(room, [user]);

    joinedRoom = room;

    socket.emit(EVENTS.ROOM_CREATED, room);
  });

  socket.on(EVENTS.JOIN_ROOM, function(room) {
    if (!rooms.has(room)) {
      return socket.emit(EVENTS.INVALID_ROOM);
    }

    // ignore if user is already a part of one rooms
    if (joinedRoom) return;

    const peers = rooms.get(room);
    const newPeers = [...peers, user];
    rooms.set(room, newPeers);

    // send only the new connected peer
    socket.emit(EVENTS.UPDATE_PEERS, newPeers);
  });

  socket.on('disconnect', () => {
    if (rooms.has(joinedRoom)) {
      const peers = rooms.get(joinedRoom);

      if (peers.length === 1) {
        rooms.delete(joinedRoom);
      } else {
        rooms.set(joinedRoom, peers.filter(p => p !== user));
      }
    }
  });
});

server.listen(process.env.PORT || 3001);
