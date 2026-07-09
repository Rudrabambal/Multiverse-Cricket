import React, { useState } from 'react';

const HowToPlay = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
    <div className="w-full max-w-lg glassmorphism rounded-3xl p-8 border border-slate-800 relative animate-scale-in max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 text-xl transition-colors">✕</button>
      
      <h3 className="text-2xl font-bold text-slate-100 uppercase tracking-wider mb-6">How To Play</h3>
      
      <div className="space-y-5 text-sm">
        <div className="flex gap-3">
          <span className="text-2xl">🪙</span>
          <div>
            <h4 className="font-bold text-slate-200">1. Toss</h4>
            <p className="text-slate-400">Player 1 calls Heads or Tails. Winner decides to Bat or Bowl first.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <span className="text-2xl">🎲</span>
          <div>
            <h4 className="font-bold text-slate-200">2. Generate Options</h4>
            <p className="text-slate-400">Every ball generates 3 random unique run options from 0, 1, 2, 3, 4, 6.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <span className="text-2xl">🤫</span>
          <div>
            <h4 className="font-bold text-slate-200">3. Secret Selection</h4>
            <p className="text-slate-400">The Batsman secretly selects one of the 3 options and hides their choice.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <h4 className="font-bold text-slate-200">4. Bowler Predicts</h4>
            <p className="text-slate-400">The Bowler tries to predict the Batsman's choice. If they match, the Batsman is OUT! If they don't, the Batsman gets their runs.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <h4 className="font-bold text-slate-200">5. Win the Match</h4>
            <p className="text-slate-400">6 balls per innings, 1 wicket only. Set a target, then chase. Highest score wins!</p>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full mt-8 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold uppercase tracking-wider text-sm hover:from-purple-500 hover:to-indigo-500 transition-all duration-300"
      >
        Got It!
      </button>
    </div>
  </div>
);

const Home = ({ onStart }) => {
  const [showHowTo, setShowHowTo] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-10 px-4 text-center">
      
      {/* Title Area */}
      <div className="relative mb-14">
        {/* Glowing backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/15 rounded-full blur-[80px] animate-pulse-slow pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 bg-purple-500/20 rounded-full blur-[60px] animate-pulse pointer-events-none"></div>

        <div className="relative">
          <span className="text-6xl mb-4 block animate-float">🏏</span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-wider shimmer-text drop-shadow-2xl leading-tight">
            Multiverse
            <br />
            Cricket
          </h1>
          <p className="text-sm sm:text-base text-cyan-300/80 font-mono tracking-[0.25em] uppercase mt-5 animate-pulse">
            Every Ball Creates a New Reality
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-16">
        <button
          onClick={onStart}
          id="btn-start-match"
          className="group relative px-10 py-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg uppercase tracking-wider shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(147,51,234,0.7)] hover:scale-105 active:scale-95"
        >
          <span className="flex items-center gap-3">
            <span className="text-xl">▶</span> Start Match
          </span>
          <div className="absolute inset-0 rounded-full border border-purple-400/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>

        <button
          onClick={() => setShowHowTo(true)}
          id="btn-how-to-play"
          className="px-10 py-4 rounded-full border border-slate-700 text-slate-300 font-semibold text-lg uppercase tracking-wider transition-all duration-300 hover:border-slate-500 hover:text-white hover:bg-slate-900/50 active:scale-95"
        >
          <span className="flex items-center gap-3">
            <span className="text-xl">❓</span> Rules
          </span>
        </button>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-3 max-w-md">
        {['🧠 Mind Games', '🎯 Prediction', '🪙 Toss', '🌌 Multiverse'].map((tag) => (
          <span key={tag} className="px-4 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400 tracking-wider">
            {tag}
          </span>
        ))}
      </div>

      {/* Collapsible Quick Rules */}
      <div className="w-full max-w-md mt-10">
        <button
          onClick={() => setIsRulesOpen(!isRulesOpen)}
          className="w-full py-3 px-6 rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-300 font-semibold tracking-wider flex items-center justify-between hover:border-slate-700 hover:text-white transition-all duration-300"
        >
          <span className="flex items-center gap-2">📖 Quick Rules</span>
          <span className={`transform transition-transform duration-300 ${isRulesOpen ? 'rotate-180' : 'rotate-0'}`}>
            ▼
          </span>
        </button>
        
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isRulesOpen ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="glassmorphism rounded-2xl p-6 border border-slate-800 text-left text-xs space-y-4">
            <div className="flex gap-3 items-start">
              <span className="text-xl shrink-0">🏏</span>
              <p className="text-slate-300">Players take turns batting and bowling.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-xl shrink-0">🎯</span>
              <p className="text-slate-300">On every ball, 4 random options appear.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-xl shrink-0">🤫</span>
              <p className="text-slate-300">Both players secretly select one option.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-xl shrink-0">💥</span>
              <div>
                <p className="text-slate-300 font-medium">If both select the SAME option:</p>
                <p className="text-cyan-400 font-bold text-xs mt-0.5">→ Wicket</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-xl shrink-0">⚡</span>
              <div>
                <p className="text-slate-300 font-medium">If selections are DIFFERENT:</p>
                <p className="text-purple-400 font-bold text-xs mt-0.5">→ Batter scores the chosen runs.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-xl shrink-0">🔄</span>
              <p className="text-slate-300">Match length depends on the selected Overs and Wickets settings.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-xl shrink-0">🏆</span>
              <p className="text-slate-300 font-bold text-amber-400">Highest score wins.</p>
            </div>
          </div>
        </div>
      </div>

      {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}
    </div>
  );
};

export default Home;
