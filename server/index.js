import http from 'http';
import { URL } from 'url';

// ─── In-Memory State ───
const rooms = {};
const sseClients = {};

// ─── Game Logic (server-authoritative) ───
const OPTION_POOL = ['1 Run','2 Runs','3 Runs','4 Runs','6 Runs','Wide +1','No Ball +1','No Ball +2','No Ball +4','No Ball +6'];

function parseRuns(opt) {
  switch (opt) {
    case '1 Run': return 1;
    case '2 Runs': return 2;
    case '3 Runs': return 3;
    case '4 Runs': return 4;
    case '6 Runs': return 6;
    case 'Wide +1': return 1;
    case 'No Ball +1': return 2;
    case 'No Ball +2': return 3;
    case 'No Ball +4': return 5;
    case 'No Ball +6': return 7;
    default: return 0;
  }
}

function generateOptions() {
  const shuffled = [...OPTION_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 4);
}

function resolveBall({ batsmanChoice, bowlerChoices, batsmanPowerCard }) {
  let isWicket = bowlerChoices.includes(batsmanChoice);
  let runs = parseRuns(batsmanChoice);
  const specialMessages = [];

  if (isWicket && batsmanPowerCard === 'SAFE_REALITY') {
    isWicket = false;
    runs = 0;
    specialMessages.push('Safe Reality Activated: Wicket Prevented!');
  } else if (isWicket) {
    runs = 0; // Wicket: 0 runs awarded
  } else if (batsmanPowerCard === 'DOUBLE_REALITY') {
    runs *= 2;
    specialMessages.push('Double Reality: Runs Doubled!');
  }

  const outcome = isWicket ? 'W' : runs.toString();
  return { isWicket, runs, outcome, display: isWicket ? 'WICKET!' : `${runs} RUNS`, symbol: outcome, specialMessages };
}

// ─── Room Code Generator ───
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── SSE Broadcast ───
function broadcast(roomCode, event, data) {
  const clients = sseClients[roomCode] || [];
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(c => {
    try { c.res.write(payload); } catch (e) { /* ignore disconnected */ }
  });
}

function sendToPlayer(roomCode, playerId, event, data) {
  const clients = (sseClients[roomCode] || []).filter(c => c.playerId === playerId);
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(c => {
    try { c.res.write(payload); } catch (e) { /* ignore */ }
  });
}

// ─── Resolve Ball When Both Moves Are In ───
function tryResolveBall(room) {
  const gs = room.gameState;
  if (!gs || gs.phase !== 'WAITING_BOTH') return;
  if (gs.batsmanMove === undefined || gs.bowlerMove === undefined) return;

  const result = resolveBall({
    batsmanChoice: gs.batsmanMove.choice,
    bowlerChoices: gs.bowlerMove.choices,
    batsmanPowerCard: gs.batsmanMove.powerCard || null,
  });

  const innings = gs.innings;
  const score = gs.scores[innings];
  score.score += result.runs;
  if (result.isWicket) score.wickets += 1;
  score.balls += 1;

  score.ballHistory.push({ outcome: result.outcome, symbol: result.symbol });

  const maxWickets = room.config.wickets;
  const maxBalls = room.config.overs * 6;
  const target = innings === 2 ? gs.scores[1].score + 1 : null;
  const isAllOut = score.wickets >= maxWickets;
  const isOverComplete = score.balls >= maxBalls;
  const targetChased = innings === 2 && score.score >= target;

  let nextPhase = 'REVEAL';
  let inningsOver = false;
  let matchOver = false;

  if (innings === 1 && (isAllOut || isOverComplete)) {
    inningsOver = true;
  } else if (innings === 2 && (targetChased || isAllOut || isOverComplete)) {
    matchOver = true;
  }

  const fullResult = {
    ...result,
    batsmanChoice: gs.batsmanMove.choice,
    bowlerChoices: gs.bowlerMove.choices,
  };

  gs.lastResult = fullResult;
  gs.phase = 'REVEAL';
  gs.batsmanMove = undefined;
  gs.bowlerMove = undefined;

  broadcast(room.code, 'ballResult', {
    result: fullResult,
    scores: gs.scores,
    innings,
    inningsOver,
    matchOver,
    battingFirstId: gs.battingFirstId,
    bowlingFirstId: gs.bowlingFirstId,
  });
}

// ─── HTTP Server ───
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  // Health Check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', activeRooms: Object.keys(rooms).length }));
    return;
  }

  // SSE Stream
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
    console.log(`📡 Player ${playerId} connected/reconnected to room: ${roomCode}`);

    // ─── Catch-up: replay missed phase-transition events for reconnecting clients ───
    const room = rooms[roomCode];
    if (room) {
      const status = room.status || 'WAITING';

      // Phase 1: Game was started by host → get client off the lobby screen
      if (status === 'TOSS' || status === 'IN_GAME') {
        res.write(`event: gameStart\ndata: ${JSON.stringify({
          roomCode: room.code,
          players: room.players,
          config: room.config,
        })}\n\n`);
      }

      // Phase 2: Toss decision was made → show the SUMMARY card in TossScreen
      // Delayed 300ms so TossScreen has time to mount after the gameStart above
      if ((status === 'TOSS' || status === 'IN_GAME') && room.toss && room.toss.battingFirstId) {
        setTimeout(() => {
          if (!res.destroyed) {
            res.write(`event: tossCompleted\ndata: ${JSON.stringify({
              toss: room.toss,
              battingFirstId: room.toss.battingFirstId,
              bowlingFirstId: room.toss.bowlingFirstId,
            })}\n\n`);
          }
        }, 300);
      }

      // Phase 3: Match is in progress → transition client into GameScreen
      // Delayed 700ms so TossScreen's listener is registered before matchStarted arrives
      if (status === 'IN_GAME' && room.gameState) {
        const gs = room.gameState;
        setTimeout(() => {
          if (!res.destroyed) {
            res.write(`event: matchStarted\ndata: ${JSON.stringify({
              tossData: room.toss,
              battingFirstId: gs.battingFirstId,
              bowlingFirstId: gs.bowlingFirstId,
              currentOptions: gs.currentOptions,
              scores: gs.scores,
              innings: gs.innings,
            })}\n\n`);
          }
        }, 700);

        // Phase 3b: Also resync game state after client is on GameScreen
        setTimeout(() => {
          if (!res.destroyed) {
            res.write(`event: gameState\ndata: ${JSON.stringify({
              scores: gs.scores,
              innings: gs.innings,
              phase: gs.phase,
              battingFirstId: gs.battingFirstId,
              bowlingFirstId: gs.bowlingFirstId,
              currentOptions: gs.currentOptions,
            })}\n\n`);
          }
        }, 1200);
      }
    }

    // ─── FIX: filter by 'res' reference, NOT by playerId ───
    // Filtering by playerId was the root bug: when EventSource auto-reconnects,
    // the new connection gets added first, then the old close fires and wipes BOTH.
    req.on('close', () => {
      console.log(`🔌 Player ${playerId} SSE connection closed for room: ${roomCode}`);
      if (sseClients[roomCode]) {
        // Remove only this specific closed connection object, not all for this player
        sseClients[roomCode] = sseClients[roomCode].filter(c => c.res !== res);

        if (sseClients[roomCode].length === 0) {
          // All clients gone — clean up after delay to allow page refresh / reconnect
          setTimeout(() => {
            if ((sseClients[roomCode] || []).length === 0) {
              delete rooms[roomCode];
              delete sseClients[roomCode];
              console.log(`🗑️  Room ${roomCode} cleaned up after inactivity`);
            }
          }, 30000);
        } else {
          // Wait 10s before telling the opponent — EventSource usually reconnects within 3s.
          // If the player is back within that window, we skip the opponentLeft message.
          setTimeout(() => {
            const playerStillGone = !(sseClients[roomCode] || []).some(c => c.playerId === playerId);
            if (playerStillGone) {
              broadcast(roomCode, 'opponentLeft', { message: 'Your opponent disconnected.' });
            }
          }, 10000);
        }
      }
    });
    return;
  }

  // Parse body for POST
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let data = {};
    try { data = JSON.parse(body); } catch (e) { /* ignore */ }

    // Create Room
    if (pathname === '/api/createRoom' && req.method === 'POST') {
      let code;
      do { code = generateRoomCode(); } while (rooms[code]);
      const hostId = 'p_' + Math.random().toString(36).substring(2, 9);
      rooms[code] = {
        code,
        players: [{ id: hostId, name: data.playerName || 'Player 1', isHost: true }],
        config: { overs: data.overs || 1, wickets: data.wickets || 1 },
        status: 'WAITING', // WAITING | TOSS | IN_GAME | FINISHED
        toss: null,
        gameState: null,
      };
      console.log(`🏠 Room created: ${code} by ${data.playerName}`);
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
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Room not found' }));
        return;
      }
      if (room.players.length >= 2) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Room is full' }));
        return;
      }
      const joinerId = 'p_' + Math.random().toString(36).substring(2, 9);
      room.players.push({ id: joinerId, name: data.playerName || 'Player 2', isHost: false });
      console.log(`👤 ${data.playerName} joined room: ${code}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ roomCode: code, playerId: joinerId, players: room.players, config: room.config }));
      broadcast(code, 'roomUpdated', { players: room.players, status: 'READY' });
      return;
    }

    // Start Game (triggered by host)
    if (pathname === '/api/startGame' && req.method === 'POST') {
      const room = rooms[data.roomCode?.toUpperCase()];
      if (room) {
        room.status = 'TOSS';
        broadcast(room.code, 'gameStart', { roomCode: room.code, players: room.players, config: room.config });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
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
        room.toss.battingFirstId = battingFirstId;
        room.toss.bowlingFirstId = bowlingFirstId;
        broadcast(room.code, 'tossCompleted', { toss: room.toss, battingFirstId, bowlingFirstId });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Start Match
    if (pathname === '/api/startMatch' && req.method === 'POST') {
      const room = rooms[data.roomCode?.toUpperCase()];
      if (room && room.toss) {
        const options = generateOptions();
        room.status = 'IN_GAME';
        room.gameState = {
          innings: 1,
          phase: 'BATSMAN_SELECT', // BATSMAN_SELECT | BOWLER_SELECT | WAITING_BOTH | REVEAL | INNINGS_BREAK | GAME_OVER
          battingFirstId: room.toss.battingFirstId,
          bowlingFirstId: room.toss.bowlingFirstId,
          currentOptions: options,
          batsmanMove: undefined,
          bowlerMove: undefined,
          lastResult: null,
          scores: {
            1: { score: 0, wickets: 0, balls: 0, ballHistory: [] },
            2: { score: 0, wickets: 0, balls: 0, ballHistory: [] },
          }
        };
        broadcast(room.code, 'matchStarted', {
          tossData: data.tossData,
          battingFirstId: room.toss.battingFirstId,
          bowlingFirstId: room.toss.bowlingFirstId,
          currentOptions: options,
          scores: room.gameState.scores,
          innings: 1,
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Submit Batsman Move
    if (pathname === '/api/batsmanMove' && req.method === 'POST') {
      const room = rooms[data.roomCode?.toUpperCase()];
      if (room && room.gameState) {
        const gs = room.gameState;
        gs.batsmanMove = { choice: data.choice, powerCard: data.powerCard || null };
        gs.phase = 'BOWLER_SELECT';

        // Notify bowler to select (send the options)
        broadcast(room.code, 'batsmanMoved', {
          phase: 'BOWLER_SELECT',
          currentOptions: gs.currentOptions,
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Submit Bowler Move
    if (pathname === '/api/bowlerMove' && req.method === 'POST') {
      const room = rooms[data.roomCode?.toUpperCase()];
      if (room && room.gameState) {
        const gs = room.gameState;
        gs.bowlerMove = { choices: data.choices, powerCard: data.powerCard || null };
        gs.phase = 'WAITING_BOTH';
        tryResolveBall(room);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Next Ball
    if (pathname === '/api/nextBall' && req.method === 'POST') {
      const room = rooms[data.roomCode?.toUpperCase()];
      if (room && room.gameState) {
        const gs = room.gameState;
        const score = gs.scores[gs.innings];
        const maxBalls = room.config.overs * 6;
        const maxWickets = room.config.wickets;
        const target = gs.innings === 2 ? gs.scores[1].score + 1 : null;

        const isAllOut = score.wickets >= maxWickets;
        const isOverComplete = score.balls >= maxBalls;
        const targetChased = gs.innings === 2 && score.score >= target;

        if (gs.innings === 1 && (isAllOut || isOverComplete)) {
          // Switch innings
          gs.innings = 2;
          gs.phase = 'BATSMAN_SELECT';
          const options = generateOptions();
          gs.currentOptions = options;
          gs.batsmanMove = undefined;
          gs.bowlerMove = undefined;
          broadcast(room.code, 'inningsChange', {
            innings: 2,
            scores: gs.scores,
            currentOptions: options,
            battingFirstId: gs.bowlingFirstId, // swap
            bowlingFirstId: gs.battingFirstId,
          });
        } else if (gs.innings === 2 && (targetChased || isAllOut || isOverComplete)) {
          gs.phase = 'GAME_OVER';
          room.status = 'FINISHED';
          broadcast(room.code, 'gameOver', {
            scores: gs.scores,
            battingFirst: data.battingFirst,
            bowlingFirst: data.bowlingFirst,
          });
        } else {
          const options = generateOptions();
          gs.currentOptions = options;
          gs.batsmanMove = undefined;
          gs.bowlerMove = undefined;
          gs.phase = 'BATSMAN_SELECT';
          broadcast(room.code, 'nextBall', {
            scores: gs.scores,
            innings: gs.innings,
            currentOptions: options,
          });
        }
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
  console.log(`⚡ Authoritative Real-Time SSE Game Server`);
  console.log(`=================================`);
});
