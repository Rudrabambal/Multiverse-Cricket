import http from 'http';
import { URL } from 'url';

const rooms = {};
const sseClients = {}; // roomCode -> [ { playerId, res } ]

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function broadcast(roomCode, event, data) {
  const clients = sseClients[roomCode] || [];
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(c => {
    try {
      c.res.write(payload);
    } catch (e) {
      // Ignore write errors for disconnected clients
    }
  });
}

const server = http.createServer((req, res) => {
  // Global CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  // 1. Health Check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', activeRooms: Object.keys(rooms).length }));
    return;
  }

  // 2. Real-time Event Stream (Server-Sent Events)
  if (pathname === '/api/stream') {
    const roomCode = reqUrl.searchParams.get('roomCode')?.toUpperCase();
    const playerId = reqUrl.searchParams.get('playerId');

    if (!roomCode || !rooms[roomCode]) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Room not found' }));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('\n');

    if (!sseClients[roomCode]) sseClients[roomCode] = [];
    sseClients[roomCode].push({ playerId, res });

    console.log(`📡 Player ${playerId} connected to room stream: ${roomCode}`);

    req.on('close', () => {
      console.log(`🔌 Player ${playerId} disconnected from room stream: ${roomCode}`);
      if (sseClients[roomCode]) {
        sseClients[roomCode] = sseClients[roomCode].filter(c => c.playerId !== playerId);
        const room = rooms[roomCode];
        if (room) {
          room.players = room.players.filter(p => p.id !== playerId);
          if (room.players.length === 0) {
            delete rooms[roomCode];
            delete sseClients[roomCode];
          } else {
            broadcast(roomCode, 'opponentLeft', {
              message: 'Your opponent disconnected from the room.',
              remainingPlayers: room.players
            });
          }
        }
      }
    });
    return;
  }

  // Parse Body for REST Actions
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let data = {};
    try { if (body) data = JSON.parse(body); } catch (e) {}

    // Create Room
    if (pathname === '/api/createRoom' && req.method === 'POST') {
      let code = generateRoomCode();
      while (rooms[code]) code = generateRoomCode();

      const hostId = 'p_' + Math.random().toString(36).substring(2, 9);
      rooms[code] = {
        code,
        hostId,
        players: [{ id: hostId, name: data.playerName || 'Player 1', isHost: true }],
        config: data.config || { overs: 1, wickets: 1 },
        status: 'WAITING'
      };

      console.log(`🏠 Room Created: ${code} by ${data.playerName}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        roomCode: code,
        playerId: hostId,
        players: rooms[code].players,
        config: rooms[code].config
      }));
      return;
    }

    // Join Room
    if (pathname === '/api/joinRoom' && req.method === 'POST') {
      const code = data.roomCode?.toUpperCase();
      const room = rooms[code];

      if (!room) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Room not found. Please check code.' }));
        return;
      }

      if (room.players.length >= 2) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Room is full (max 2 players allowed).' }));
        return;
      }

      const joinerId = 'p_' + Math.random().toString(36).substring(2, 9);
      room.players.push({ id: joinerId, name: data.playerName || 'Player 2', isHost: false });

      console.log(`👤 ${data.playerName} joined room: ${code}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        roomCode: code,
        playerId: joinerId,
        players: room.players,
        config: room.config
      }));

      // Broadcast update & start game
      broadcast(code, 'roomUpdated', { players: room.players, status: 'READY' });
      broadcast(code, 'gameStart', { roomCode: code, players: room.players, config: room.config });
      return;
    }

    // Toss Call
    if (pathname === '/api/tossCall' && req.method === 'POST') {
      const room = rooms[data.roomCode?.toUpperCase()];
      if (room) {
        const coinFlip = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
        const p1 = room.players[0];
        const p2 = room.players[1];
        const winner = data.call === coinFlip ? p1 : p2;
        room.toss = { caller: p1.name, call: data.call, result: coinFlip, winnerId: winner.id, winnerName: winner.name };
        broadcast(room.code, 'tossResult', room.toss);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Toss Decision
    if (pathname === '/api/tossDecision' && req.method === 'POST') {
      const room = rooms[data.roomCode?.toUpperCase()];
      if (room && room.toss) {
        const winnerId = room.toss.winnerId;
        const p1 = room.players[0];
        const p2 = room.players[1];
        const loserId = p1.id === winnerId ? p2.id : p1.id;
        const battingFirstId = data.decision === 'BAT' ? winnerId : loserId;
        const bowlingFirstId = data.decision === 'BAT' ? loserId : winnerId;

        broadcast(room.code, 'tossCompleted', { toss: room.toss, battingFirstId, bowlingFirstId });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Start Match
    if (pathname === '/api/startMatch' && req.method === 'POST') {
      const room = rooms[data.roomCode?.toUpperCase()];
      if (room) {
        broadcast(room.code, 'matchStarted', data.tossData);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Play Move
    if (pathname === '/api/playMove' && req.method === 'POST') {
      const room = rooms[data.roomCode?.toUpperCase()];
      if (room) {
        broadcast(room.code, 'opponentMove', { move: data.move, playerId: data.playerId });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Sync State
    if (pathname === '/api/syncState' && req.method === 'POST') {
      const room = rooms[data.roomCode?.toUpperCase()];
      if (room) {
        broadcast(room.code, 'stateSynced', data.state);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 Multiverse Cricket Server running on port ${PORT}`);
  console.log(`⚡ Zero-Dependency Realtime SSE Server Active!`);
  console.log(`=================================`);
});
