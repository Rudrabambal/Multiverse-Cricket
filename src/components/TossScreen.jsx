import React, { useState } from 'react';
import { playClickSound, playLockSound, playRevealSound } from '../utils/audio';

const TossScreen = ({ player1Name, player2Name, overs, wickets, roomData, onTossComplete, onBack }) => {
  const [step, setStep] = useState('CALL'); // CALL → FLIPPING → RESULT → SUMMARY
  const [predictionCall, setPredictionCall] = useState(null); // 'HEADS' | 'TAILS'
  const [coinResult, setCoinResult] = useState(null); // 'HEADS' | 'TAILS'
  const [tossWinner, setTossWinner] = useState(null);
  const [choice, setChoice] = useState(null); // 'bat' | 'bowl'
  const [battingFirst, setBattingFirst] = useState(null);
  const [bowlingFirst, setBowlingFirst] = useState(null);

  // Sync multiplayer socket toss events
  React.useEffect(() => {
    if (!roomData?.socket) return;
    const { socket } = roomData;

    const handleTossResult = (resultData) => {
      setStep('FLIPPING');
      setCoinResult(resultData.result);
      setTossWinner(resultData.winnerName);
      setTimeout(() => {
        playRevealSound();
        setStep('RESULT');
      }, 2500);
    };

    const handleTossCompleted = ({ battingFirstId, bowlingFirstId }) => {
      const p1 = roomData.players[0];
      const p2 = roomData.players[1];
      const bat = p1.id === battingFirstId ? p1.name : p2.name;
      const bowl = p1.id === bowlingFirstId ? p1.name : p2.name;

      setBattingFirst(bat);
      setBowlingFirst(bowl);
      setStep('SUMMARY');
    };

    socket.on('tossResult', handleTossResult);
    socket.on('tossCompleted', handleTossCompleted);

    return () => {
      socket.off('tossResult', handleTossResult);
      socket.off('tossCompleted', handleTossCompleted);
    };
  }, [roomData]);

  const handlePredict = (value) => {
    playClickSound();
    setPredictionCall(value);
  };

  const handleFlipClick = () => {
    if (!predictionCall) return;
    playClickSound();

    if (roomData?.socket) {
      roomData.socket.emit('tossCall', {
        roomCode: roomData.roomCode,
        call: predictionCall
      });
      return;
    }

    setStep('FLIPPING');
    
    // Determine toss result randomly
    const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    // If result matches prediction call, Player 1 wins. Otherwise Player 2 wins.
    const winner = result === predictionCall ? player1Name : player2Name;
    
    setCoinResult(result);
    setTossWinner(winner);

    // Coin flip animation takes 2.5 seconds
    setTimeout(() => {
      playRevealSound();
      setStep('RESULT');
    }, 2500);
  };

  const handleChoiceClick = (chosen) => {
    playLockSound();

    if (roomData?.socket) {
      roomData.socket.emit('tossDecision', {
        roomCode: roomData.roomCode,
        decision: chosen === 'bat' ? 'BAT' : 'BOWL'
      });
      return;
    }

    const tossLoser = tossWinner === player1Name ? player2Name : player1Name;
    
    let batting, bowling;
    if (chosen === 'bat') {
      batting = tossWinner;
      bowling = tossLoser;
    } else {
      batting = tossLoser;
      bowling = tossWinner;
    }

    setChoice(chosen);
    setBattingFirst(batting);
    setBowlingFirst(bowling);
    setStep('SUMMARY');
  };

  const handleStartMatch = () => {
    playRevealSound();
    onTossComplete({
      tossWinner,
      coinResult,
      choice,
      battingFirst,
      bowlingFirst
    });
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-10 px-4 animate-fade-in">
      <div className="w-full max-w-lg glassmorphism rounded-3xl p-8 border border-slate-800/80 relative overflow-hidden text-center">
        
        {/* Persistent Back Button to Setup */}
        {step === 'CALL' && (
          <button 
            onClick={() => { playClickSound(); onBack(); }}
            className="absolute top-6 left-6 text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1 z-20"
          >
            ← Back
          </button>
        )}

        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-60 bg-amber-500/8 rounded-full blur-[60px] pointer-events-none"></div>

        <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold mb-3 block">
          🪙 The Toss
        </span>
        <h2 className="text-3xl font-extrabold uppercase tracking-wider text-slate-100 mb-2">
          🏏 Match Toss
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Winner decides who bats first.
        </p>

        {/* ─── 3D COIN ELEMENT ─── */}
        <div className="coin w-36 h-36 mx-auto my-10 relative">
          <div 
            className={`coin-inner w-full h-full relative ${
              step === 'FLIPPING' 
                ? (coinResult === 'HEADS' ? 'animate-coin-heads' : 'animate-coin-tails') 
                : ''
            }`}
            style={
              step === 'RESULT' || step === 'SUMMARY'
                ? { transform: coinResult === 'HEADS' ? 'rotateY(0deg)' : 'rotateY(180deg)' }
                : {}
            }
          >
            {/* Heads (front) */}
            <div className="coin-face w-full h-full rounded-full bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600 border-4 border-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.6)] flex flex-col items-center justify-center">
              <span className="text-5xl drop-shadow-md">👑</span>
              <span className="text-xs font-black uppercase tracking-widest text-amber-100 font-mono mt-1 drop-shadow-md">HEADS</span>
            </div>
            {/* Tails (back) */}
            <div className="coin-face coin-back w-full h-full rounded-full bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600 border-4 border-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.6)] flex flex-col items-center justify-center">
              <span className="text-5xl drop-shadow-md">🌟</span>
              <span className="text-xs font-black uppercase tracking-widest text-amber-100 font-mono mt-1 drop-shadow-md">TAILS</span>
            </div>
          </div>
        </div>

        {/* ─── STEP 1: CALL ─── */}
        {step === 'CALL' && (
          <div className="mt-8 animate-slide-up">
            <p className="text-slate-300 mb-6 text-sm">
              <span className="text-purple-400 font-bold">{player1Name}</span>, predict heads or tails:
            </p>

            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => handlePredict('HEADS')}
                className={`w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
                  predictionCall === 'HEADS'
                    ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-110'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:scale-105'
                }`}
              >
                <span className="text-2xl">👑</span>
                <span className={`text-xs font-bold uppercase tracking-wider ${predictionCall === 'HEADS' ? 'text-amber-300' : 'text-slate-400'}`}>
                  Heads
                </span>
              </button>

              <button
                onClick={() => handlePredict('TAILS')}
                className={`w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
                  predictionCall === 'TAILS'
                    ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-110'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:scale-105'
                }`}
              >
                <span className="text-2xl">🌟</span>
                <span className={`text-xs font-bold uppercase tracking-wider ${predictionCall === 'TAILS' ? 'text-amber-300' : 'text-slate-400'}`}>
                  Tails
                </span>
              </button>
            </div>

            <button
              onClick={handleFlipClick}
              disabled={!predictionCall}
              id="btn-flip-coin"
              className={`px-8 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-sm transition-all duration-300 ${
                predictionCall
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:from-amber-400 hover:to-orange-400 hover:scale-105 active:scale-95'
                  : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              🪙 Flip Coin
            </button>
          </div>
        )}

        {/* ─── STEP 2: FLIPPING ─── */}
        {step === 'FLIPPING' && (
          <div className="mt-8 animate-fade-in">
            <p className="text-sm text-amber-400 font-mono tracking-widest uppercase animate-pulse">
              Flipping Coin...
            </p>
          </div>
        )}

        {/* ─── STEP 3: RESULT ─── */}
        {step === 'RESULT' && (
          <div className="mt-6 animate-scale-in">
            <div className="mb-4">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-1">Coin Result</p>
              <span className="text-3xl font-black text-amber-400 tracking-wider font-mono drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                {coinResult}
              </span>
            </div>

            <div className="bg-slate-950/50 border border-purple-500/20 rounded-2xl p-5 mb-8 max-w-sm mx-auto">
              <h3 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 uppercase">
                🎉 {tossWinner} won the toss!
              </h3>
            </div>

            <p className="text-slate-400 mb-6 text-sm">
              <span className="text-amber-300 font-bold">{tossWinner}</span>, choose your starting role:
            </p>

            <div className="flex gap-4 max-w-sm mx-auto">
              <button
                onClick={() => handleChoiceClick('bat')}
                id="btn-bat-first"
                className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all duration-300 hover:scale-[1.03] active:scale-95"
              >
                🏏 Bat First
              </button>
              <button
                onClick={() => handleChoiceClick('bowl')}
                id="btn-bowl-first"
                className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300 hover:scale-[1.03] active:scale-95"
              >
                🎯 Bowl First
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: SUMMARY CARD ─── */}
        {step === 'SUMMARY' && (
          <div className="mt-6 animate-scale-in">
            <div className="max-w-sm mx-auto bg-slate-950/60 border border-slate-800 rounded-2xl p-6 text-left mb-8">
              <h4 className="text-xs uppercase font-mono tracking-widest text-slate-500 mb-4 text-center border-b border-slate-900 pb-2">
                Match Ready
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-medium">Bat First:</span>
                  <span className="font-bold text-purple-300">{battingFirst}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-medium">Bowl First:</span>
                  <span className="font-bold text-cyan-300">{bowlingFirst}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-900 pt-3">
                  <span className="text-slate-400 font-medium">Overs:</span>
                  <span className="font-bold text-slate-200">{overs} {overs === 1 ? 'Over' : 'Overs'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-medium">Wickets:</span>
                  <span className="font-bold text-slate-200">{wickets} {wickets === 1 ? 'Wicket' : 'Wickets'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartMatch}
              id="btn-start-match"
              className="w-full max-w-sm mx-auto px-8 py-4 rounded-2xl font-bold uppercase tracking-wider text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:from-emerald-400 hover:to-teal-400 hover:scale-[1.02] active:scale-95 transition-all duration-300 block text-center"
            >
              ▶ Start Match
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default TossScreen;
