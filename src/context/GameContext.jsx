import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDatabase, ref, set, onValue, update, remove, onDisconnect } from 'firebase/database';
import { firebaseConfig } from '../firebaseConfig';
import { initializeApp } from 'firebase/app';

// Initialize Firebase app (if not already initialized elsewhere)
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

// Helper to generate 6-character alphanumeric room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const GameProvider = ({ children }) => {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  // Create a new room and write initial structure
  const createRoom = async (playerName) => {
    setLoading(true);
    const code = generateRoomCode();
    const roomRef = ref(db, `rooms/${code}`);
    const initialRoom = {
      roomCode: code,
      players: {
        player1: { name: playerName, role: null },
        player2: null
      },
      gamePhase: 'waiting',
      // other fields can be added later
    };
    await set(roomRef, initialRoom);
    // Ensure cleanup if creator disconnects before player2 joins
    const disconnectRef = ref(db, `rooms/${code}`);
    onDisconnect(disconnectRef).remove();
    setRoom(initialRoom);
    setLoading(false);
    return code;
  };

  // Join an existing room
  const joinRoom = async (code, playerName) => {
    setLoading(true);
    const roomRef = ref(db, `rooms/${code}`);
    const snapshot = await new Promise((resolve, reject) => {
      const unsub = onValue(roomRef, (snap) => {
        unsub();
        resolve(snap);
      }, { onlyOnce: true });
    });
    if (!snapshot.exists()) {
      setLoading(false);
      throw new Error('Room not found');
    }
    const data = snapshot.val();
    if (data.players.player2) {
      setLoading(false);
      throw new Error('Room already full');
    }
    // Write player2 data
    await update(roomRef, {
      'players/player2': { name: playerName, role: null }
    });
    // Remove cleanup for creator (now both players present)
    const creatorDisconnect = ref(db, `rooms/${code}`);
    onDisconnect(creatorDisconnect).cancel();
    setRoom({ ...data, players: { ...data.players, player2: { name: playerName, role: null } } });
    setLoading(false);
    return data;
  };

  // Listen to realtime updates for the current room
  const listenToRoom = (code, callback) => {
    const roomRef = ref(db, `rooms/${code}`);
    const unsubscribe = onValue(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setRoom(data);
        if (callback) callback(data);
      }
    });
    return unsubscribe;
  };

  // Generic helper to update any field in the room
  const updateRoom = async (code, updates) => {
    const roomRef = ref(db, `rooms/${code}`);
    await update(roomRef, updates);
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // No-op – individual components handle onDisconnect when needed
    };
  }, []);

  return (
    <GameContext.Provider value={{ room, createRoom, joinRoom, listenToRoom, updateRoom, loading }}>
      {children}
    </GameContext.Provider>
  );
};
