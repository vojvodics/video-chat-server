const express = require('express');
const uuid = require('uuidv4').default;

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const { ExpressPeerServer } = require('peer');

const PORT = process.env.PORT || 3001;

const peerserver = ExpressPeerServer(server, { port: PORT, path: '/peerjs' });

app.use('/peerjs', peerserver);

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
  let currentUser;
  let currentRoom;

  socket.on(EVENTS.INIT_ROOM, function() {
    const room = uuid();

    rooms.set(room, []);

    socket.emit(EVENTS.ROOM_CREATED, room);
  });

  socket.on(EVENTS.JOIN_ROOM, function(room, user) {
    if (!rooms.has(room)) {
      return socket.emit(EVENTS.INVALID_ROOM);
    }

    const peers = rooms.get(room);
    const newPeers = [...peers, user];
    rooms.set(room, newPeers);

    currentUser = user;
    currentRoom = room;

    // send only to new connected peer - that peer will make a call to others
    socket.emit(EVENTS.UPDATE_PEERS, newPeers);
  });

  socket.on(EVENTS.LEAVE_ROOM, (roomId, user) => {
    if (rooms.has(roomId)) {
      const peers = rooms.get(roomId);

      rooms.set(roomId, peers.filter(p => p !== user));
    }
  });

  socket.on('disconnect', () => {
    console.log(currentUser, 'disconnected from', currentRoom);
    if (rooms.has(currentRoom)) {
      const peers = rooms.get(currentRoom);
      rooms.set(currentRoom, peers.filter(p => p !== currentUser));

      // TODO: delete empty rooms?
      // if (peers.length === 1) {
      //   // rooms.delete(joinedRoom);
      // } else {
      // }
    }

    currentUser = null;
    currentRoom = null;
  });
});

server.listen(PORT);
