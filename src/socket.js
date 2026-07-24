/**
 * Real-time Client Engine using Native EventSource & Fetch
 * (Zero NPM Dependencies Required!)
 */

class RealtimeSocket {
  constructor() {
    this.baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    this.eventSource = null;
    this.listeners = {};
    this.roomCode = null;
    this.playerId = null;
  }

  initStream(roomCode, playerId) {
    this.roomCode = roomCode;
    this.playerId = playerId;

    if (this.eventSource) {
      this.eventSource.close();
    }

    const url = `${this.baseUrl}/api/stream?roomCode=${encodeURIComponent(roomCode)}&playerId=${encodeURIComponent(playerId)}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('⚡ Connected to Realtime Stream');
    };

    this.eventSource.onerror = (err) => {
      console.warn('Realtime stream reconnecting...', err);
    };

    // All server-broadcast events
    const events = [
      'roomUpdated', 'gameStart', 'tossResult', 'tossCompleted',
      'matchStarted', 'batsmanMoved', 'ballResult',
      'nextBall', 'inningsChange', 'gameOver', 'gameState',
      'opponentLeft', 'errorMsg'
    ];
    events.forEach(evt => {
      this.eventSource.addEventListener(evt, (e) => {
        try {
          const data = JSON.parse(e.data);
          this.trigger(evt, data);
        } catch (err) {
          console.error('Error parsing SSE event data:', err);
        }
      });
    });
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  trigger(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  async emit(event, payload = {}) {
    try {
      if (event === 'createRoom') {
        const res = await fetch(`${this.baseUrl}/api/createRoom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          this.initStream(data.roomCode, data.playerId);
          this.trigger('roomCreated', data);
        } else {
          this.trigger('errorMsg', data.error || 'Failed to create room');
        }
        return;
      }

      if (event === 'joinRoom') {
        const res = await fetch(`${this.baseUrl}/api/joinRoom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          this.initStream(data.roomCode, data.playerId);
          this.trigger('joinedRoom', { ...data, yourId: data.playerId });
        } else {
          this.trigger('errorMsg', data.error || 'Failed to join room');
        }
        return;
      }

      // All other actions go to /api/<event>
      await fetch(`${this.baseUrl}/api/${event}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          playerId: this.playerId,
          roomCode: this.roomCode || payload.roomCode
        })
      });
    } catch (err) {
      console.error(`Error emitting ${event}:`, err);
      this.trigger('errorMsg', 'Network error. Make sure the backend server is running on port 3001.');
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.listeners = {};
    this.roomCode = null;
    this.playerId = null;
  }
}

export const socket = new RealtimeSocket();
