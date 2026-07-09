import React, { useState } from 'react';
import { ShieldAlert, User, Swords, Settings } from 'lucide-react';
import { playClickSound } from '../utils/audio';

const PlayerSetup = ({ onBack, onStartGame }) => {
  const [player1, setPlayer1] = useState('Player 1');
  const [player2, setPlayer2] = useState('Player 2');
  
  // Settings
  const [overs, setOvers] = useState(1);
  const [wickets, setWickets] = useState(1);
  
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    playClickSound();

    if (!player1.trim() || !player2.trim()) {
      setError('Both players must enter their galactic identities!');
      return;
    }
    if (player1.trim() === player2.trim()) {
      setError('Players must have unique quantum signatures (names cannot be identical)!');
      return;
    }
    setError('');
    onStartGame({
      player1Name: player1.trim(),
      player2Name: player2.trim(),
      overs,
      wickets
    });
  };

  const handleBack = () => {
    playClickSound();
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-6 px-4">
      <div className="w-full max-w-2xl glassmorphism rounded-3xl p-6 sm:p-8 border border-slate-800/80 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <h2 className="text-3xl font-extrabold text-center uppercase tracking-wider text-slate-100 mb-6">
          Match Setup
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Match Settings */}
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
            <h3 className="text-xs uppercase font-mono tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
              <Settings className="w-4 h-4" /> Match Rules
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase text-slate-300 font-semibold">Overs</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={overs}
                  onChange={(e) => setOvers(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-slate-100 text-center text-lg font-bold"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase text-slate-300 font-semibold">Wickets</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={wickets}
                  onChange={(e) => setWickets(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-slate-100 text-center text-lg font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 setup */}
            <div className="flex flex-col gap-4 bg-purple-950/20 p-6 rounded-2xl border border-purple-500/20">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase font-mono tracking-widest text-purple-300 font-semibold flex items-center gap-1.5">
                  <User className="w-4 h-4" /> Player 1 Name
                </label>
                <input
                  type="text"
                  value={player1}
                  onChange={(e) => setPlayer1(e.target.value)}
                  maxLength={15}
                  placeholder="Player 1"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none transition-all duration-300 font-medium"
                />
              </div>
            </div>

            {/* Player 2 setup */}
            <div className="flex flex-col gap-4 bg-cyan-950/20 p-6 rounded-2xl border border-cyan-500/20">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase font-mono tracking-widest text-cyan-300 font-semibold flex items-center gap-1.5">
                  <User className="w-4 h-4" /> Player 2 Name
                </label>
                <input
                  type="text"
                  value={player2}
                  onChange={(e) => setPlayer2(e.target.value)}
                  maxLength={15}
                  placeholder="Player 2"
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none transition-all duration-300 font-medium"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs bg-red-950/50 border border-red-500/30 text-red-400 p-3.5 rounded-xl font-medium">
              <ShieldAlert className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 px-6 py-3.5 rounded-2xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all duration-300 font-semibold text-center uppercase tracking-wider text-sm"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-[2] flex justify-center items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-95 uppercase tracking-wider text-sm"
            >
              <Swords className="w-4 h-4 text-white" /> Start Game
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayerSetup;
