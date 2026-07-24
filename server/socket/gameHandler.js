import { createRoom, getRoom, joinRoom, leaveRoom } from './roomManager.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);

    // Create Room
    socket.on('createRoom', ({ playerName, config }) => {
      const room = createRoom(socket.id, playerName, config);
      socket.join(room.code);
      
      console.log(`🏠 Room created: ${room.code} by ${playerName}`);
      socket.emit('roomCreated', {
        roomCode: room.code,
        players: room.players,
        config: room.config
      });
    });

    // Join Room
    socket.on('joinRoom', ({ roomCode, playerName }) => {
      const code = roomCode?.toUpperCase();
      const result = joinRoom(code, socket.id, playerName);

      if (result.error) {
        socket.emit('errorMsg', result.error);
        return;
      }

      const room = result.room;
      socket.join(room.code);
      console.log(`👤 ${playerName} joined room: ${room.code}`);

      // Notify player who joined
      socket.emit('joinedRoom', {
        roomCode: room.code,
        players: room.players,
        config: room.config,
        yourId: socket.id
      });

      // Notify all players in room that match is ready to start toss
      io.to(room.code).emit('roomUpdated', {
        players: room.players,
        status: 'READY'
      });

      // Automatically trigger game start if 2 players present
      if (room.players.length === 2) {
        room.status = 'TOSS';
        io.to(room.code).emit('gameStart', {
          roomCode: room.code,
          players: room.players,
          config: room.config
        });
      }
    });

    // Toss Events
    socket.on('tossCall', ({ roomCode, call }) => {
      const room = getRoom(roomCode);
      if (!room) return;

      const coinFlip = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
      const p1 = room.players[0];
      const p2 = room.players[1];
      const winner = call === coinFlip ? p1 : p2;

      room.toss = {
        caller: p1.name,
        call,
        result: coinFlip,
        winnerId: winner.id,
        winnerName: winner.name
      };

      io.to(room.code).emit('tossResult', room.toss);
    });

    socket.on('tossDecision', ({ roomCode, decision }) => {
      const room = getRoom(roomCode);
      if (!room || !room.toss) return;

      const winnerId = room.toss.winnerId;
      const p1 = room.players[0];
      const p2 = room.players[1];
      const loserId = p1.id === winnerId ? p2.id : p1.id;

      let battingFirstId, bowlingFirstId;

      if (decision === 'BAT') {
        battingFirstId = winnerId;
        bowlingFirstId = loserId;
      } else {
        battingFirstId = loserId;
        bowlingFirstId = winnerId;
      }

      room.toss.decision = decision;
      room.toss.battingFirstId = battingFirstId;
      room.toss.bowlingFirstId = bowlingFirstId;
      room.status = 'IN_GAME';

      io.to(room.code).emit('tossCompleted', {
        toss: room.toss,
        battingFirstId,
        bowlingFirstId
      });
    });

    // Move Submission & Synchronization
    socket.on('playMove', ({ roomCode, move }) => {
      const room = getRoom(roomCode);
      if (!room) return;

      // Broadcast move to opponent
      socket.to(room.code).emit('opponentMove', { move, playerSocketId: socket.id });
    });

    // Sync Game State
    socket.on('syncState', ({ roomCode, state }) => {
      const room = getRoom(roomCode);
      if (!room) return;

      socket.to(room.code).emit('stateSynced', state);
    });

    // Rematch Request
    socket.on('requestRematch', ({ roomCode }) => {
      const room = getRoom(roomCode);
      if (!room) return;

      socket.to(room.code).emit('rematchRequested', { fromId: socket.id });
    });

    socket.on('acceptRematch', ({ roomCode }) => {
      const room = getRoom(roomCode);
      if (!room) return;

      room.status = 'TOSS';
      room.toss = null;
      io.to(room.code).emit('rematchStarted');
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Player disconnected: ${socket.id}`);
      const affectedRooms = leaveRoom(socket.id);

      for (const { roomCode, remainingRoom } of affectedRooms) {
        io.to(roomCode).emit('opponentLeft', {
          message: 'Your opponent disconnected from the match.',
          remainingPlayers: remainingRoom.players
        });
      }
    });
  });
}
