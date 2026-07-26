import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { Copy, Check, Users, ShieldAlert, KeyRound, Play, ArrowLeft, Settings, Loader2, Sparkles } from 'lucide-react';
import { playClickSound } from '../utils/audio';

const PrivateRoom = ({ onBack, onRoomReady }) => {
  const [tab, setTab] = useState('CREATE'); // 'CREATE' | 'JOIN'
  const [playerName, setPlayerName] = useState('Player 1');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  
  // Game Settings for host
  const [overs, setOvers] = useState(1);
  const [wickets, setWickets] = useState(1);

  // Active Room State
  const [roomState, setRoomState] = useState(null); // { roomCode, players, config, isHost }
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Socket Listeners
    const handleRoomCreated = ({ roomCode, playerId, players, config }) => {
      setConnecting(false);
      setRoomState({
        roomCode,
        players,
        config,
        isHost: true,
        myId: playerId,
      });
      setError('');
    };

    const handleJoinedRoom = ({ roomCode, players, config, yourId }) => {
      setConnecting(false);
      setRoomState({
        roomCode,
        players,
        config,
        isHost: false,
        myId: yourId
      });
      setError('');
    };

    const handleRoomUpdated = ({ players, status }) => {
      setRoomState(prev => prev ? { ...prev, players, status } : null);
    };

    const handleGameStart = ({ roomCode, players, config }) => {
      const myId = socket.playerId;
      onRoomReady({
        roomCode,
        players,
        config,
        socket,
        myId,
        isHost: myId === players[0]?.id
      });
    };

    const handleErrorMsg = (msg) => {
      setConnecting(false);
      setError(msg);
    };

    const handleOpponentLeft = ({ message, remainingPlayers }) => {
      setError(message);
      setRoomState((prev) => prev ? { ...prev, players: remainingPlayers } : null);
    };

    socket.on('roomCreated', handleRoomCreated);
    socket.on('joinedRoom', handleJoinedRoom);
    socket.on('roomUpdated', handleRoomUpdated);
    socket.on('gameStart', handleGameStart);
    socket.on('errorMsg', handleErrorMsg);
    socket.on('opponentLeft', handleOpponentLeft);

    return () => {
      socket.off('roomCreated', handleRoomCreated);
      socket.off('joinedRoom', handleJoinedRoom);
      socket.off('roomUpdated', handleRoomUpdated);
      socket.off('gameStart', handleGameStart);
      socket.off('errorMsg', handleErrorMsg);
      socket.off('opponentLeft', handleOpponentLeft);
    };
  }, [onRoomReady]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    playClickSound();
    if (!playerName.trim()) {
      setError('Please enter your player name!');
      return;
    }
    setError('');
    setConnecting(true);
    socket.emit('createRoom', {
      playerName: playerName.trim(),
      config: { overs, wickets }
    });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    playClickSound();
    if (!playerName.trim()) {
      setError('Please enter your player name!');
      return;
    }
    if (!roomCodeInput.trim() || roomCodeInput.trim().length !== 6) {
      setError('Please enter a valid 6-character room code!');
      return;
    }
    setError('');
    setConnecting(true);
    socket.emit('joinRoom', {
      roomCode: roomCodeInput.trim().toUpperCase(),
      playerName: playerName.trim()
    });
  };

  const handleCopyCode = () => {
    if (!roomState?.roomCode) return;
    playClickSound();
    navigator.clipboard.writeText(roomState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    playClickSound();
    socket.disconnect();
    setRoomState(null);
    setError('');
  };

  const handleStartGame = () => {
    playClickSound();
    socket.emit('startGame', { roomCode: roomState.roomCode });
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-6 px-4">
      <div className="w-full max-w-xl glassmorphism rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {!roomState ? (
          <>
            <div className="flex items-center justify-between mb-6 border-b border-slate-800/80 pb-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-xs uppercase font-mono text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </button>
              <h2 className="text-xl font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-400" /> Private Room
              </h2>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-950/60 rounded-2xl border border-slate-800 mb-6">
              <button
                onClick={() => { playClickSound(); setTab('CREATE'); setError(''); }}
                className={`py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                  tab === 'CREATE'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Room
              </button>
              <button
                onClick={() => { playClickSound(); setTab('JOIN'); setError(''); }}
                className={`py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                  tab === 'JOIN'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Join Room
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 flex items-center gap-2 text-xs bg-red-950/50 border border-red-500/30 text-red-400 p-3.5 rounded-xl font-medium animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {tab === 'CREATE' ? (
              <form onSubmit={handleCreateRoom} className="space-y-5">
                <div>
                  <label className="block text-xs uppercase font-mono text-slate-300 mb-2 font-semibold">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={15}
                    placeholder="Enter your name"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-3 text-slate-100 focus:outline-none transition-colors"
                  />
                </div>

                {/* Match Rules Settings */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                  <h3 className="text-xs uppercase font-mono tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-purple-400" /> Room Game Settings
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase text-slate-400 font-semibold mb-1 block">Overs</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={overs}
                        onChange={(e) => setOvers(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2 text-center text-slate-100 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-slate-400 font-semibold mb-1 block">Wickets</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={wickets}
                        onChange={(e) => setWickets(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2 text-center text-slate-100 font-bold"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={connecting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold uppercase tracking-wider text-sm shadow-lg shadow-purple-600/25 flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating Room Code...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Create Private Room
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinRoom} className="space-y-5">
                <div>
                  <label className="block text-xs uppercase font-mono text-slate-300 mb-2 font-semibold">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={15}
                    placeholder="Enter your name"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-100 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-mono text-cyan-400 mb-2 font-semibold">
                    Enter Room Code
                  </label>
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="e.g. AB9KQ2"
                    className="w-full bg-slate-950/80 border border-cyan-500/50 focus:border-cyan-400 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.3em] font-black text-cyan-300 uppercase placeholder-slate-700 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={connecting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold uppercase tracking-wider text-sm shadow-lg shadow-cyan-600/25 flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Joining Room...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Join Private Room
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        ) : (
          /* Waiting Lobby UI */
          <div className="space-y-6 text-center animate-fade-in">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block mb-1">
                Private Room Lobby
              </span>
              <h2 className="text-2xl font-black tracking-wider text-slate-100">
                Match Code
              </h2>
            </div>

            {/* Room Code Card */}
            <div className="bg-slate-950/80 border-2 border-purple-500/40 rounded-2xl p-6 relative group flex flex-col items-center">
              <span className="text-xs uppercase font-mono text-purple-400 mb-2">Share this code with your friend</span>
              <div className="text-4xl sm:text-5xl font-mono font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 my-2">
                {roomState.roomCode}
              </div>

              <button
                onClick={handleCopyCode}
                className="mt-3 px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-purple-500 text-slate-200 hover:text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 transition-all duration-300"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" /> Code Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-purple-400" /> Copy Code
                  </>
                )}
              </button>
            </div>

            {/* Players List */}
            <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 p-5 text-left">
              <div className="flex items-center justify-between mb-3 text-xs uppercase font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" /> Players Connected
                </span>
                <span>{(roomState.players || []).length} / 2</span>
              </div>

              <div className="space-y-3">
                {(roomState.players || []).map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="flex items-center justify-between bg-slate-900/80 border border-slate-800 px-4 py-3 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-purple-950 border border-purple-500/40 text-purple-300 flex items-center justify-center font-bold text-xs">
                        P{idx + 1}
                      </span>
                      <span className="font-bold text-slate-100">{p.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.isHost && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-700/50">
                          HOST
                        </span>
                      )}
                      {p.id === roomState.myId && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-900/50 text-cyan-300 border border-cyan-700/50">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {(roomState.players || []).length < 2 && (
                  <div className="flex items-center gap-3 bg-slate-950/40 border border-dashed border-slate-800 px-4 py-3 rounded-xl text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                    <span>Waiting for Player 2 to join...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Room Info */}
            <div className="flex justify-around text-xs font-mono text-slate-400 bg-slate-950/30 py-3 rounded-xl border border-slate-800/50 mb-4">
              <span>Overs: <strong className="text-slate-200">{roomState.config?.overs || 1}</strong></span>
              <span>Wickets: <strong className="text-slate-200">{roomState.config?.wickets || 1}</strong></span>
            </div>

            {roomState.isHost && (roomState.players || []).length === 2 && (
              <button
                onClick={handleStartGame}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold uppercase tracking-wider text-sm shadow-lg shadow-emerald-600/25 flex justify-center items-center gap-2 transition-all active:scale-95 mb-3"
              >
                <Play className="w-4.5 h-4.5" /> Start Game
              </button>
            )}

            <button
              onClick={handleLeaveRoom}
              className="w-full py-3 rounded-xl border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-950 hover:bg-red-950/20 font-semibold text-xs uppercase tracking-wider transition-all"
            >
              Leave Room
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivateRoom;
