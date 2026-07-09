import React, { useState } from 'react';
import { TRAITS } from '../utils/gameLogic';

const TraitSelection = ({ player1Name, player2Name, onTraitsSelected }) => {
  const [step, setStep] = useState(1); // 1 = Player 1 picks, 2 = Player 2 picks
  const [player1Trait, setPlayer1Trait] = useState(null);
  const [player2Trait, setPlayer2Trait] = useState(null);

  const currentPlayer = step === 1 ? player1Name : player2Name;
  const selectedTrait = step === 1 ? player1Trait : player2Trait;
  const setTrait = step === 1 ? setPlayer1Trait : setPlayer2Trait;

  const handleConfirm = () => {
    if (step === 1 && player1Trait) {
      setStep(2);
    } else if (step === 2 && player2Trait) {
      onTraitsSelected(player1Trait, player2Trait);
    }
  };

  // Player 2 can't pick the same trait as Player 1
  const isDisabled = (traitId) => {
    if (step === 2) return traitId === player1Trait;
    return false;
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-8 px-4 animate-fade-in">
      <div className="w-full max-w-2xl text-center mb-8">
        <span className="text-xs uppercase font-mono tracking-widest text-purple-400 font-bold mb-2 block">
          Step {step} of 2
        </span>
        <h2 className="text-3xl font-extrabold uppercase tracking-wider text-slate-100 mb-2">
          Choose Your Trait
        </h2>
        <p className="text-slate-400">
          <span className={`font-bold ${step === 1 ? 'text-purple-400' : 'text-cyan-400'}`}>{currentPlayer}</span>, pick one trait to shape your strategy
        </p>
      </div>

      {/* Trait Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-2xl mb-8">
        {TRAITS.map((trait) => {
          const disabled = isDisabled(trait.id);
          const selected = selectedTrait === trait.id;

          return (
            <button
              key={trait.id}
              onClick={() => !disabled && setTrait(trait.id)}
              disabled={disabled}
              id={`trait-${trait.id}`}
              className={`trait-card rounded-2xl p-5 border text-left transition-all duration-300 
                ${disabled ? 'opacity-30 cursor-not-allowed border-slate-800 bg-slate-900/30' : 'cursor-pointer'}
                ${selected 
                  ? `bg-gradient-to-br ${trait.color} ${trait.border} ${trait.glowColor} selected ring-2 ring-offset-2 ring-offset-slate-950 ${trait.border.replace('border-', 'ring-')}` 
                  : !disabled ? `glassmorphism-card border-slate-800 hover:${trait.border}` : ''
                }
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{trait.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-bold text-sm uppercase tracking-wider ${selected ? trait.textColor : 'text-slate-200'}`}>
                    {trait.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {trait.description}
                  </p>
                </div>
              </div>

              {/* Selected indicator */}
              {selected && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-indigo-500 items-center justify-center text-[10px] font-bold text-white">✓</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        disabled={!selectedTrait}
        id="btn-confirm-trait"
        className={`px-8 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-sm transition-all duration-300 ${
          selectedTrait
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:scale-105 active:scale-95'
            : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
        }`}
      >
        {step === 1 ? `Lock Trait → ${player2Name}'s Turn` : 'Confirm & Start Match ⚡'}
      </button>

      {/* Player 1's confirmed trait indicator (during step 2) */}
      {step === 2 && player1Trait && (
        <div className="mt-6 px-5 py-3 rounded-2xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
          <span className="text-lg">{TRAITS.find(t => t.id === player1Trait)?.emoji}</span>
          <span>
            <span className="text-purple-400 font-bold">{player1Name}</span> chose{' '}
            <span className="text-slate-200 font-semibold">{TRAITS.find(t => t.id === player1Trait)?.name}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default TraitSelection;
