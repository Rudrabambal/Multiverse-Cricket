import { generateRoomCode } from './roomCode.js';

const rooms = {};

export function createRoom(hostSocketId, hostName, config = {}) {
  let roomCode = generateRoomCode();
  // Ensure uniqueness
  while (rooms[roomCode]) {
    roomCode = generateRoomCode();
  }

  rooms[roomCode] = {
    code: roomCode,
    hostId: hostSocketId,
    players: [
      {
        id: hostSocketId,
        name: hostName || 'Player 1',
        isHost: true,
        score: 0,
        wickets: 0,
        ready: false
      }
    ],
    config: {
      overs: config.overs || 1,
      wickets: config.wickets || 1
    },
    status: 'WAITING', // WAITING, TOSS, IN_GAME, FINISHED
    toss: null,
    gameState: null
  };

  return rooms[roomCode];
}

export function getRoom(roomCode) {
  return rooms[roomCode?.toUpperCase()] || null;
}

export function joinRoom(roomCode, socketId, playerName) {
  const code = roomCode?.toUpperCase();
  const room = rooms[code];

  if (!room) {
    return { error: 'Room not found. Please check the code.' };
  }

  if (room.players.length >= 2) {
    return { error: 'Room is full (max 2 players allowed).' };
  }

  const existingPlayer = room.players.find(p => p.id === socketId);
  if (!existingPlayer) {
    room.players.push({
      id: socketId,
      name: playerName || `Player ${room.players.length + 1}`,
      isHost: false,
      score: 0,
      wickets: 0,
      ready: false
    });
  }

  return { room };
}

export function leaveRoom(socketId) {
  const affected = [];

  for (const code in rooms) {
    const room = rooms[code];
    const playerIndex = room.players.findIndex(p => p.id === socketId);

    if (playerIndex !== -1) {
      const removedPlayer = room.players[playerIndex];
      room.players.splice(playerIndex, 1);

      if (room.players.length === 0) {
        delete rooms[code];
      } else {
        // Transfer host if host left
        if (removedPlayer.isHost && room.players.length > 0) {
          room.players[0].isHost = true;
          room.hostId = room.players[0].id;
        }
        affected.push({ roomCode: code, remainingRoom: room });
      }
    }
  }

  return affected;
}

export function deleteRoom(roomCode) {
  const code = roomCode?.toUpperCase();
  if (rooms[code]) {
    delete rooms[code];
  }
}

export function getRooms() {
  return rooms;
}
