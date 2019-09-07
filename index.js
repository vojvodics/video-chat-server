const path = require('path');
const express = require('express');
const uuid = require('uuidv4').default;

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const EVENTS = {
  INIT_ROOM: 'INIT_ROOM',
  ROOM_CREATED: 'ROOM_CREATED',
  INVALID_ROOM: 'INVALID_ROOM',
  JOIN_ROOM: 'JOIN_ROOM',
  UPDATE_PEERS: 'UPDATE_PEERS',
  LEAVE_ROOM: 'LEAVE_ROOM'
};

// the list of rooms
// just a placeholder for connected peers
const rooms = new Map();

io.on('connection', function(socket) {
  let user;
  let joinedRoom;

  socket.on(EVENTS.INIT_ROOM, function(u) {
    user = u;
    const room = uuid();

    rooms.set(room, []);

    socket.emit(EVENTS.ROOM_CREATED, room);
  });

  socket.on(EVENTS.JOIN_ROOM, function(room) {
    if (!rooms.has(room)) {
      return socket.emit(EVENTS.INVALID_ROOM);
    }

    // ignore if user is already a part of one rooms
    // handle it differently?
    if (joinedRoom) return;

    const peers = rooms.get(room);
    const newPeers = [...peers, user];
    rooms.set(room, newPeers);

    joinedRoom = room;

    // send only to new connected peer - that peer will make a call to others
    socket.emit(EVENTS.UPDATE_PEERS, newPeers);
  });

  socket.on(EVENTS.LEAVE_ROOM, () => {
    if (rooms.has(joinedRoom)) {
      const peers = rooms.get(joinedRoom);

      rooms.set(joinedRoom, peers.filter(p => p !== user));
      socket.emit(EVENTS.UPDATE_PEERS, rooms.get(joinedRoom));
    }
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

    joinedRoom = null;
  });
});

server.listen(process.env.PORT || 3001);
