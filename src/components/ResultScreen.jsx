import React, { useEffect, useState } from 'react';
import { formatOvers } from '../utils/gameLogic';
import { saveMatchResult } from '../utils/storage';
import { playRevealSound } from '../utils/audio';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use'; // Note: might need this, or just hardcode if missing

const ResultScreen = ({
  player1Name,
  player2Name,
  matchData,
  onRestart,
  onViewStats,
}) => {
  const { innings1, innings2, battingFirst, bowlingFirst } = matchData;

  const p1Total = innings1.score;
  const p2Total = innings2.score;

  let winner = '';
  let subtext = '';
  let isTie = false;

  if (p1Total > p2Total) {
    winner = battingFirst;
    const margin = p1Total - p2Total;
    subtext = `Won by ${margin} run${margin > 1 ? 's' : ''}`;
  } else if (p2Total > p1Total) {
    winner = bowlingFirst;
    const wicketsRemaining = 1 - innings2.wickets;
    if (wicketsRemaining > 0) {
      subtext = `Chased successfully in ${formatOvers(innings2.balls)} overs`;
    } else {
      subtext = `Won on higher score`;
    }
  } else {
    winner = 'TIE';
    isTie = true;
    subtext = `Both scored ${p1Total} runs!`;
  }

  // Save result on mount
  useEffect(() => {
    saveMatchResult({
      ...matchData,
      winner,
      isTie
    });
    playRevealSound();
  }, []);

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderBallSummary = (ballHistory) => {
    return ballHistory.map((entry, idx) => {
      let color = 'text-slate-500';
      if (entry.outcome === 'W') color = 'text-red-400';
      else if (['10','12','8','6'].includes(entry.outcome)) color = 'text-purple-400';
      else if (entry.outcome === '4') color = 'text-cyan-400';
      else if (entry.outcome === '2' || entry.outcome === '3') color = 'text-green-400';
      else if (entry.outcome === '1') color = 'text-slate-300';
      else if (entry.outcome === '0') color = 'text-slate-500';

      return (
        <span key={idx} className={`${color} font-mono font-bold text-sm`}>
          {entry.symbol}
        </span>
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-8 px-4 animate-fade-in z-10">
      
      {!isTie && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <Confetti 
            width={windowSize.width} 
            height={windowSize.height} 
            recycle={false} 
            numberOfPieces={400} 
            gravity={0.15}
            colors={['#a855f7', '#06b6d4', '#eab308', '#3b82f6']}
          />
        </div>
      )}

      <div className="w-full max-w-2xl glassmorphism rounded-3xl p-8 border border-slate-800/80 relative overflow-hidden text-center z-10">
        <div className="absolute top-0 left-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)] animate-bounce-slow">
          <span className="text-4xl">{isTie ? '🤝' : '🏆'}</span>
        </div>

        <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold flex items-center justify-center gap-1.5 mb-2">
          ✨ Match Result ✨
        </span>

        <h2 className={`text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r uppercase tracking-wide ${isTie ? "from-slate-300 via-indigo-200 to-slate-300" : "from-yellow-400 via-amber-300 to-orange-400"}`}>
          {isTie ? "It's a Tie!" : `${winner} Wins!`}
        </h2>

        <p className="text-slate-300 text-sm mt-3 max-w-md mx-auto">{subtext}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-5 text-left relative">
            <span className="absolute top-3 right-3 text-[10px] uppercase font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              1st Innings
            </span>
            <span className="text-[10px] uppercase text-slate-500 font-mono tracking-wider">Batting</span>
            <h4 className="text-lg font-bold text-slate-100 truncate mt-0.5">{battingFirst}</h4>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-extrabold text-purple-400">{innings1.score}</span>
              <span className="text-lg text-slate-600">/</span>
              <span className="text-xl font-bold text-slate-400">{innings1.wickets}</span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Overs: {formatOvers(innings1.balls)}
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {renderBallSummary(innings1.ballHistory)}
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-5 text-left relative">
            <span className="absolute top-3 right-3 text-[10px] uppercase font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              2nd Innings
            </span>
            <span className="text-[10px] uppercase text-slate-500 font-mono tracking-wider">Chasing</span>
            <h4 className="text-lg font-bold text-slate-100 truncate mt-0.5">{bowlingFirst}</h4>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-extrabold text-cyan-400">{innings2.score}</span>
              <span className="text-lg text-slate-600">/</span>
              <span className="text-xl font-bold text-slate-400">{innings2.wickets}</span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Overs: {formatOvers(innings2.balls)} {innings2.wickets >= 1 ? '(Out)' : ''}
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {renderBallSummary(innings2.ballHistory)}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
          <button
            onClick={onRestart}
            className="group px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all hover:scale-105"
          >
            🔄 Play Again
          </button>
          <button
            onClick={onViewStats}
            className="px-8 py-3.5 rounded-2xl border border-slate-700 bg-slate-900 text-slate-300 font-bold text-sm uppercase tracking-wider transition-all hover:bg-slate-800 hover:text-white"
          >
            📊 View Stats
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;
