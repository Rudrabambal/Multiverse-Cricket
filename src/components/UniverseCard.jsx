import React from 'react';
import { Shield, Flame, Sparkles, AlertTriangle } from 'lucide-react';

const UniverseCard = ({ card, onSelect, isSelected, isDisabled, showOutcome = true }) => {
  const { type, riskLevel, outcome, runs, isWicket, isExtra, flavorText, color } = card;

  // Icon mapping
  const getIcon = () => {
    switch (type) {
      case 'Safe':
        return <Shield className="w-8 h-8 text-green-400" />;
      case 'Aggressive':
        return <Flame className="w-8 h-8 text-orange-400" />;
      case 'Chaos':
        return <Sparkles className="w-8 h-8 text-fuchsia-400" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-slate-400" />;
    }
  };

  // Border and glow mapping based on type
  const getGlowClass = () => {
    if (isSelected) {
      switch (type) {
        case 'Safe': return 'border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] ring-2 ring-green-500/50 scale-105';
        case 'Aggressive': return 'border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.4)] ring-2 ring-orange-500/50 scale-105';
        case 'Chaos': return 'border-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.4)] ring-2 ring-fuchsia-500/50 scale-105';
        default: return '';
      }
    }
    return 'hover:scale-[1.02] hover:border-slate-400';
  };

  const formatOutcome = () => {
    if (!showOutcome) return '???';
    
    switch (outcome) {
      case 'runs_1': return '1 Run';
      case 'runs_2': return '2 Runs';
      case 'runs_4': return '4 Runs';
      case 'runs_6': return '6 Runs';
      case 'wicket': return 'Wicket!';
      case 'run_out': return 'Run Out!';
      case 'wide': return 'Wide (+1 Run)';
      case 'no-ball': return 'No-Ball (+1 Run)';
      case 'dot': return 'Dot Ball';
      default: return outcome;
    }
  };

  const getOutcomeBadgeColor = () => {
    if (isWicket || outcome === 'run_out') return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (isExtra) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (runs > 0) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  return (
    <button
      onClick={() => !isDisabled && onSelect(card.id)}
      disabled={isDisabled}
      className={`relative w-full text-left rounded-2xl p-6 glassmorphism-card bg-gradient-to-br ${color} border flex flex-col justify-between min-h-[220px] transition-all duration-300 focus:outline-none ${getGlowClass()} ${isDisabled && !isSelected ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {/* Top Section */}
      <div className="flex justify-between items-start w-full">
        <div>
          <span className="text-xs uppercase tracking-widest text-slate-400">Universe {card.id}</span>
          <h4 className="text-xl font-bold mt-1 text-slate-100">{type}</h4>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          {getIcon()}
        </div>
      </div>

      {/* Middle Section: Outcome representation */}
      <div className="my-4">
        {showOutcome ? (
          <div className="flex flex-col gap-2">
            <span className={`inline-self-start self-start px-3 py-1 rounded-full text-xs font-semibold border ${getOutcomeBadgeColor()}`}>
              {formatOutcome()}
            </span>
            <p className="text-sm text-slate-300 italic mt-1 leading-relaxed">
              "{flavorText}"
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-4 items-center justify-center border border-dashed border-slate-700/50 rounded-xl bg-slate-950/20">
            <span className="text-slate-500 text-sm tracking-widest uppercase font-mono">Dimension Secret</span>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="flex justify-between items-center w-full mt-auto pt-2 border-t border-slate-800/50 text-xs">
        <span className="text-slate-400">Risk Level:</span>
        <span className={`font-semibold ${
          riskLevel === 'Low' ? 'text-green-400' :
          riskLevel === 'Medium' ? 'text-orange-400' : 'text-fuchsia-400'
        }`}>{riskLevel}</span>
      </div>

      {/* Selected Indicator Glow ring */}
      {isSelected && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
        </span>
      )}
    </button>
  );
};

export default UniverseCard;
