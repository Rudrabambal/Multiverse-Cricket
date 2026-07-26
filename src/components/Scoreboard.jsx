import React from 'react';
import { formatOvers, getOutcomeBgColor } from '../utils/gameLogic';

const Scoreboard = ({
  innings,
  batsmanName,
  bowlerName,
  score,
  wickets,
  balls,
  target,
  firstInningsScore,
  battingFirst,
  ballHistory,
  maxOvers = 1,
}) => {

  const renderHistoryBadge = (entry, idx) => {
    const colorClass = getOutcomeBgColor(entry.outcome);
    const displaySymbol = entry.symbol;

    return (
      <div
        key={idx}
        className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold font-mono transition-all duration-300 flex-shrink-0 ${colorClass} ${
          entry.outcome === 'W' ? 'animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]' : ''
        } ${entry.outcome === '6' ? 'shadow-[0_0_10px_rgba(168,85,247,0.3)]' : ''} ${entry.outcome === '4' ? 'shadow-[0_0_10px_rgba(6,182,212,0.3)]' : ''}`}
      >
        {displaySymbol}
      </div>
    );
  };

  const getRemainingBalls = () => {
    return Math.max(0, (maxOvers * 6) - balls);
  };

  const getChaseMessage = () => {
    if (innings !== 2 || target === null) return null;
    const runsNeeded = target - score;
    const ballsLeft = getRemainingBalls();

    if (runsNeeded <= 0) {
      return (
        <span className="text-green-400 font-bold animate-pulse flex items-center gap-1.5 text-sm uppercase tracking-wider">
          🎉 Target Achieved!
        </span>
      );
    }

    return (
      <span className="text-slate-300 text-sm">
        Need <span className="text-cyan-400 font-bold text-base px-0.5">{runsNeeded}</span> from{' '}
        <span className="text-cyan-400 font-bold text-base px-0.5">{ballsLeft}</span> ball{ballsLeft !== 1 ? 's' : ''}
      </span>
    );
  };

  return (
    <div className="w-full glassmorphism rounded-2xl p-5 sm:p-6 border border-slate-800/80 flex flex-col gap-4 relative overflow-hidden">
      
      {/* Accent glow */}
      <div className="absolute -top-10 -right-10 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
      
      {/* Top Bar */}
      <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            Innings {innings}
          </span>
          {innings === 2 && target !== null && (
            <span className="text-xs text-slate-400">
              Target: <span className="text-amber-300 font-semibold">{target}</span>
            </span>
          )}
        </div>
        <span className="text-[10px] uppercase text-slate-500 font-mono tracking-widest">
          Over {formatOvers(balls)}
        </span>
      </div>

      {/* Main Score Area */}
      <div className="flex items-center justify-between gap-4">
        {/* Players */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-slate-500 tracking-wider font-mono w-8">BAT</span>
            <span className="text-base font-bold text-slate-100 truncate">{batsmanName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-slate-500 tracking-wider font-mono w-8">BWL</span>
            <span className="text-sm font-medium text-slate-400 truncate">{bowlerName}</span>
          </div>
        </div>

        {/* Score & Balls */}
        <div className="flex items-baseline gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight tabular-nums">
              {score}
            </span>
            <span className="text-xl text-slate-600">/</span>
            <span className="text-2xl font-bold text-slate-300">{wickets}</span>
          </div>
          <span className="text-xs font-mono text-purple-300/80 font-bold bg-purple-950/40 px-2 py-1 rounded-lg border border-purple-500/20">
            {balls}b
          </span>
        </div>
      </div>

      {/* Chase info & 1st Batsman Summary */}
      {innings === 2 && (
        <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row justify-between items-center gap-2">
          {firstInningsScore && (
            <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <span className="text-slate-500 uppercase">1st Innings ({battingFirst || '1st Batter'}):</span>
              <span className="text-purple-300 font-bold">{firstInningsScore.score}/{firstInningsScore.wickets}</span>
              <span className="text-slate-400">({firstInningsScore.balls} balls)</span>
            </div>
          )}
          {getChaseMessage()}
        </div>
      )}

      {/* Ball History */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase text-slate-500 tracking-wider font-mono">This Over</span>
        <div className="flex gap-2 items-center min-h-[36px] bg-slate-950/30 p-2 rounded-xl border border-slate-900/60 overflow-x-auto">
          {ballHistory.length === 0 ? (
            <span className="text-xs text-slate-600 italic font-mono">Waiting for first ball...</span>
          ) : (
            ballHistory.map((entry, idx) => renderHistoryBadge(entry, idx))
          )}
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
