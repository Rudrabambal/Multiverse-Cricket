import React from 'react';
import { getStats, getMatchHistory } from '../utils/storage';
import { Trophy, Activity, Hash, ArrowLeft } from 'lucide-react';

const StatsScreen = ({ onBack }) => {
  const stats = getStats();
  const history = getMatchHistory();

  return (
    <div className="flex-1 flex flex-col items-center py-10 px-4 w-full max-w-4xl mx-auto animate-fade-in">
      <div className="w-full flex justify-between items-center mb-8">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white flex items-center gap-2 text-sm uppercase tracking-wider font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 uppercase tracking-widest">
          Global Stats
        </h2>
        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-10">
        <div className="glassmorphism p-5 rounded-2xl border border-slate-800 text-center hover:scale-105 transition-transform">
          <Hash className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1">Matches Played</p>
          <p className="text-3xl font-black text-slate-100">{stats.matchesPlayed}</p>
        </div>
        <div className="glassmorphism p-5 rounded-2xl border border-slate-800 text-center hover:scale-105 transition-transform">
          <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
          <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1">Decisive Wins</p>
          <p className="text-3xl font-black text-slate-100">{stats.matchesWon}</p>
        </div>
        <div className="glassmorphism p-5 rounded-2xl border border-slate-800 text-center hover:scale-105 transition-transform">
          <Activity className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
          <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1">Highest Score</p>
          <p className="text-3xl font-black text-slate-100">{stats.highestScore}</p>
        </div>
        <div className="glassmorphism p-5 rounded-2xl border border-slate-800 text-center hover:scale-105 transition-transform">
          <span className="text-2xl block mb-2">🏏</span>
          <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1">Total Runs Scored</p>
          <p className="text-3xl font-black text-slate-100">{stats.totalRuns}</p>
        </div>
      </div>

      <div className="w-full">
        <h3 className="text-lg font-bold uppercase tracking-widest text-slate-300 mb-4 border-b border-slate-800 pb-2">
          Recent Match History
        </h3>
        
        {history.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-800/50 text-slate-500 font-mono text-sm">
            No realities collapsed yet. Play a match!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((match) => (
              <div key={match.id} className="glassmorphism-card p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 border-slate-800">
                <div className="text-xs text-slate-500 font-mono whitespace-nowrap">
                  {match.date}
                </div>
                
                <div className="flex-1 flex items-center justify-center gap-4 w-full">
                  <div className={`flex-1 text-right truncate font-bold ${match.winner === match.player1 ? 'text-yellow-400' : 'text-slate-300'}`}>
                    {match.player1}
                  </div>
                  
                  <div className="px-4 py-1.5 bg-slate-950 rounded-lg text-sm font-black text-slate-200 tracking-wider">
                    {match.score1} <span className="text-slate-600 font-normal">v</span> {match.score2}
                  </div>
                  
                  <div className={`flex-1 text-left truncate font-bold ${match.winner === match.player2 ? 'text-yellow-400' : 'text-slate-300'}`}>
                    {match.player2}
                  </div>
                </div>
                
                <div className="w-24 text-right">
                  {match.isTie ? (
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-1 rounded">Tie</span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-950 bg-yellow-400 px-2 py-1 rounded-sm">
                      {match.winner} Won
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsScreen;
