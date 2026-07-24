import React, { useState, useEffect } from 'react';
import Scoreboard from './Scoreboard';
import {
  generateOptions,
  resolveBall,
  getOutcomeColor,
  parseRuns,
  POWER_CARDS
} from '../utils/gameLogic';
import { 
  initAudio, 
  playClickSound, 
  playLockSound, 
  playRevealSound, 
  playWicketSound, 
  playBoundarySound 
} from '../utils/audio';

const GameScreen = ({
  player1Name,
  player2Name,
  battingFirst,
  bowlingFirst,
  overs,
  wickets,
  roomData,
  onGameEnd,
  onBackToSetup,
  onExitToHome,
}) => {
  useEffect(() => { initAudio(); }, []);

  const [showExitModal, setShowExitModal] = useState(false);
  const [innings, setInnings] = useState(1);
  const [scores, setScores] = useState({
    1: { score: 0, wickets: 0, balls: 0, ballHistory: [] },
    2: { score: 0, wickets: 0, balls: 0, ballHistory: [] },
  });

  const batsmanName = innings === 1 ? battingFirst : bowlingFirst;
  const bowlerName = innings === 1 ? bowlingFirst : battingFirst;

  const isMultiplayer = Boolean(roomData?.socket);
  const myPlayerName = roomData?.players.find(p => p.id === roomData.myId)?.name || player1Name;
  const isMyTurnToBat = isMultiplayer ? myPlayerName === batsmanName : true;
  const isMyTurnToBowl = isMultiplayer ? myPlayerName === bowlerName : true;

  const [batsmanCards, setBatsmanCards] = useState({ DOUBLE_REALITY: 1, SAFE_REALITY: 1 });
  const [bowlerCards, setBowlerCards] = useState({ DOUBLE_GUESS: 1, REALITY_COLLAPSE: 1 });

  useEffect(() => {
    setBatsmanCards({ DOUBLE_REALITY: 1, SAFE_REALITY: 1 });
    setBowlerCards({
      DOUBLE_GUESS: 1,
      REALITY_COLLAPSE: 1
    });
  }, [innings]);

  const [step, setStep] = useState('BATSMAN_SELECT');
  const [ballData, setBallData] = useState(null);
  const [battingChoice, setBattingChoice] = useState(null);
  const [bowlingChoices, setBowlingChoices] = useState([]);
  const [batsmanActiveCard, setBatsmanActiveCard] = useState(null);
  const [bowlerActiveCard, setBowlerActiveCard] = useState(null);
  const [ballResult, setBallResult] = useState(null);
  const [collapsedOptions, setCollapsedOptions] = useState([]);
  const [waitingOpponent, setWaitingOpponent] = useState(false);

  useEffect(() => {
    if (step === 'BATSMAN_SELECT') {
      const data = generateOptions();
      setBallData(data);
      setCollapsedOptions(data.options);
    }
  }, [step]);

  // Online Multiplayer Socket Event Listeners
  useEffect(() => {
    if (!isMultiplayer) return;
    const { socket, roomCode } = roomData;

    const handleOpponentMove = ({ move }) => {
      // Batsman submitted move -> Bowler can now select
      setBattingChoice(move.battingChoice);
      if (move.batsmanActiveCard) {
        setBatsmanActiveCard(move.batsmanActiveCard);
      }
      setCollapsedOptions(move.ballDataOptions || []);
      setBallData({ options: move.ballDataOptions });
      setWaitingOpponent(false);
      setStep('BOWLER_SELECT');
    };

    const handleStateSynced = (syncedState) => {
      if (syncedState.scores) setScores(syncedState.scores);
      if (syncedState.ballResult) setBallResult(syncedState.ballResult);
      if (syncedState.step) setStep(syncedState.step);
      if (syncedState.innings) setInnings(syncedState.innings);
      setWaitingOpponent(false);
    };

    socket.on('opponentMove', handleOpponentMove);
    socket.on('stateSynced', handleStateSynced);

    return () => {
      socket.off('opponentMove', handleOpponentMove);
      socket.off('stateSynced', handleStateSynced);
    };
  }, [isMultiplayer, roomData]);

  const toggleBatsmanCard = (cardId) => {
    if (batsmanCards[cardId] <= 0) return;
    playClickSound();
    setBatsmanActiveCard(prev => prev === cardId ? null : cardId);
  };

  const confirmBatsmanChoice = () => {
    if (battingChoice !== null) {
      playLockSound();
      if (batsmanActiveCard) {
        setBatsmanCards(prev => ({ ...prev, [batsmanActiveCard]: prev[batsmanActiveCard] - 1 }));
      }

      if (isMultiplayer) {
        setWaitingOpponent(true);
        roomData.socket.emit('playMove', {
          roomCode: roomData.roomCode,
          move: {
            battingChoice,
            batsmanActiveCard,
            ballDataOptions: ballData.options
          }
        });
        setStep('WAITING_BOWLER');
      } else {
        setStep('PASS_DEVICE');
      }
    }
  };

  const startBowlerSelect = () => {
    playClickSound();
    setCollapsedOptions(ballData.options);
    setStep('BOWLER_SELECT');
  };

  const toggleBowlerCard = (cardId) => {
    if (bowlerCards[cardId] <= 0) return;
    playClickSound();
    
    if (cardId === 'REALITY_COLLAPSE' && bowlerActiveCard !== 'REALITY_COLLAPSE') {
      const incorrectOpts = ballData.options.filter(o => o !== battingChoice);
      const shuffledIncorrect = incorrectOpts.sort(() => 0.5 - Math.random());
      // Keep batsman's choice and 2 random incorrect options (leaving 3 out of 4)
      const newOpts = [battingChoice, shuffledIncorrect[0], shuffledIncorrect[1]].sort();
      setCollapsedOptions(newOpts);
      setBowlingChoices([]);
    } else if (bowlerActiveCard === 'REALITY_COLLAPSE' && cardId !== 'REALITY_COLLAPSE') {
      setCollapsedOptions(ballData.options);
      setBowlingChoices([]);
    }

    if (cardId === 'DOUBLE_GUESS' && bowlerActiveCard !== 'DOUBLE_GUESS') {
      setBowlingChoices([]);
    }

    setBowlerActiveCard(prev => prev === cardId ? null : cardId);
  };

  const handleBowlingSelect = (value) => {
    playClickSound();
    if (bowlerActiveCard === 'DOUBLE_GUESS') {
      if (bowlingChoices.includes(value)) {
        setBowlingChoices(prev => prev.filter(v => v !== value));
      } else if (bowlingChoices.length < 2) {
        setBowlingChoices(prev => [...prev, value]);
      }
    } else {
      setBowlingChoices([value]);
    }
  };

  const confirmBowlerChoice = () => {
    if (bowlingChoices.length === 0) return;
    playLockSound();

    if (bowlerActiveCard) {
      setBowlerCards(prev => ({ ...prev, [bowlerActiveCard]: prev[bowlerActiveCard] - 1 }));
    }

    const result = resolveBall({
      batsmanChoice: battingChoice,
      bowlerChoices: bowlingChoices,
      batsmanPowerCard: batsmanActiveCard,
    });

    setBallResult(result);

    setTimeout(() => {
      if (result.isWicket) playWicketSound();
      else if (result.runs >= 4) playBoundarySound();
      else playRevealSound();
    }, 400);

    const nextScore = scores[innings].score + result.runs;
    const nextWickets = scores[innings].wickets + (result.isWicket ? 1 : 0);
    const nextBalls = scores[innings].balls + 1;
    const nextHistory = [...scores[innings].ballHistory, { outcome: result.outcome, symbol: result.symbol }];

    const updatedScores = {
      ...scores,
      [innings]: {
        ...scores[innings],
        score: nextScore,
        wickets: nextWickets,
        balls: nextBalls,
        ballHistory: nextHistory
      }
    };

    setScores(updatedScores);
    setStep('REVEAL');

    if (isMultiplayer) {
      roomData.socket.emit('syncState', {
        roomCode: roomData.roomCode,
        state: {
          scores: updatedScores,
          ballResult: result,
          step: 'REVEAL'
        }
      });
    }
  };

  const handleNextBall = () => {
    playClickSound();
    const currentData = scores[innings];
    const isOverComplete = currentData.balls >= (overs * 6);
    const isAllOut = currentData.wickets >= wickets;
    const target = innings === 2 ? scores[1].score + 1 : null;
    const targetChased = innings === 2 && currentData.score >= target;

    if (innings === 1) {
      if (isOverComplete || isAllOut) {
        setStep('INNINGS_BREAK');
        if (isMultiplayer) {
          roomData.socket.emit('syncState', {
            roomCode: roomData.roomCode,
            state: { step: 'INNINGS_BREAK' }
          });
        }
      } else {
        resetBall();
      }
    } else {
      if (targetChased || isOverComplete || isAllOut) {
        onGameEnd({ innings1: scores[1], innings2: scores[2], battingFirst, bowlingFirst });
      } else {
        resetBall();
      }
    }
  };

  const resetBall = () => {
    setBattingChoice(null);
    setBowlingChoices([]);
    setBatsmanActiveCard(null);
    setBowlerActiveCard(null);
    setBallResult(null);
    setStep('BATSMAN_SELECT');

    if (isMultiplayer) {
      roomData.socket.emit('syncState', {
        roomCode: roomData.roomCode,
        state: { step: 'BATSMAN_SELECT' }
      });
    }
  };

  const startInnings2 = () => {
    playClickSound();
    setInnings(2);
    resetBall();
  };

  const renderOptionCard = (opt, isSelected, onClick) => {
    const totalRuns = parseRuns(opt);
    const hasExtras = opt.includes('Wide') || opt.includes('No Ball');
    
    return (
      <button 
        onClick={onClick}
        className={`flex-1 w-full max-w-[140px] min-h-[140px] rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center p-3 gap-2
          ${isSelected 
            ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-purple-400 ring-2 ring-purple-500/50 scale-105' 
            : 'glassmorphism-card border-slate-700 hover:scale-105'}`}
      >
        <span className={`text-xl md:text-2xl font-black text-center leading-tight ${isSelected ? 'text-purple-300' : 'text-slate-200'}`}>
          {opt}
        </span>
        {hasExtras && (
          <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-black/40 ${isSelected ? 'text-purple-400' : 'text-slate-400'}`}>
            Total: {totalRuns} {totalRuns === 1 ? 'Run' : 'Runs'}
          </span>
        )}
        {!hasExtras && (
          <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-black/40 ${isSelected ? 'text-purple-400' : 'text-slate-400'}`}>
            Total: {totalRuns} {totalRuns === 1 ? 'Run' : 'Runs'}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col gap-5 py-4 px-4 relative">
      {/* Exit Match Button */}
      <div className="self-start">
        <button 
          onClick={() => { playClickSound(); setShowExitModal(true); }}
          className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-red-400 transition-colors py-1.5 px-3 rounded-lg border border-slate-800/80 bg-slate-950/40 hover:bg-slate-900/60"
        >
          ← Exit Match
        </button>
      </div>
      {step !== 'INNINGS_BREAK' && (
        <Scoreboard 
          innings={innings} batsmanName={batsmanName} bowlerName={bowlerName} score={scores[innings].score} wickets={scores[innings].wickets} balls={scores[innings].balls} target={innings === 2 ? scores[1].score + 1 : null} ballHistory={scores[innings].ballHistory} maxOvers={overs} maxWickets={wickets}
        />
      )}

      {step === 'INNINGS_BREAK' && (
        <div className="flex-1 flex flex-col justify-center items-center py-10 animate-scale-in">
          <div className="w-full max-w-lg glassmorphism rounded-3xl p-8 text-center relative">
            <h3 className="text-3xl font-extrabold text-slate-100 uppercase mb-4">Target Set</h3>
            <div className="py-6 px-4 bg-slate-950/50 rounded-2xl mb-8">
              <p className="text-slate-400 font-mono tracking-widest">{battingFirst}</p>
              <h4 className="text-5xl font-black text-purple-400 mt-2">{scores[1].score} <span className="text-xl text-slate-500">/ {scores[1].wickets}</span></h4>
            </div>
            <button onClick={startInnings2} className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold uppercase text-sm hover:scale-105 transition-all">Start Innings 2 →</button>
          </div>
        </div>
      )}

      {step === 'BATSMAN_SELECT' && ballData && (
        !isMyTurnToBat ? (
          <div className="flex-1 flex flex-col justify-center items-center py-12 animate-fade-in text-center">
            <div className="w-full max-w-md glassmorphism rounded-3xl p-8 border border-slate-800">
              <div className="w-12 h-12 rounded-full bg-purple-950 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto mb-4 animate-spin">
                🏏
              </div>
              <h3 className="text-xl font-bold uppercase text-slate-100 mb-2">Opponent's Turn to Bat</h3>
              <p className="text-slate-400 text-sm">
                Waiting for <strong className="text-purple-300">{batsmanName}</strong> to select their shot...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-5 animate-slide-up">
            <div className="text-center">
              <h3 className="text-xl font-bold uppercase text-purple-300 mt-2">Choose your scoring reality</h3>
              <p className="text-sm text-slate-400 mt-1"><span className="text-purple-400 font-bold">{batsmanName}</span> (YOU)</p>
            </div>

            <div className="grid grid-cols-2 md:flex md:flex-row justify-center gap-4">
              {ballData.options.map((opt, idx) => (
                <React.Fragment key={`bat-${idx}`}>
                  {renderOptionCard(opt, battingChoice === opt, () => { playClickSound(); setBattingChoice(opt); })}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 text-center">Power Cards (Batsman)</h4>
              <div className="flex gap-3 justify-center">
                {POWER_CARDS.BATSMAN.map(card => {
                  const count = batsmanCards[card.id];
                  const isActive = batsmanActiveCard === card.id;
                  return (
                    <button key={card.id} onClick={() => toggleBatsmanCard(card.id)} disabled={count <= 0 && !isActive} className={`flex-1 max-w-[150px] p-2 border rounded-xl flex flex-col items-center justify-center text-center transition-all ${isActive ? 'bg-purple-600/30 border-purple-400 ring-1 ring-purple-500' : count <= 0 ? 'bg-slate-900 border-slate-800 opacity-50 grayscale' : 'glassmorphism hover:border-slate-500'}`}>
                      <span className="text-lg">{card.icon}</span><span className="text-[10px] font-bold text-slate-200 uppercase leading-tight mt-1">{card.name}</span><span className="text-[9px] text-purple-300 font-mono mt-1">{count} Left</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center mt-2 mb-8">
              <button onClick={confirmBatsmanChoice} disabled={battingChoice === null} className={`px-8 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-sm transition-all ${battingChoice !== null ? 'bg-purple-600 text-white hover:scale-105' : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'}`}>
                {isMultiplayer ? '🔒 Lock Choice & Submit' : '🔒 Lock Choice & Pass Device'}
              </button>
            </div>
          </div>
        )
      )}

      {step === 'WAITING_BOWLER' && (
        <div className="flex-1 flex flex-col justify-center items-center py-12 animate-fade-in text-center">
          <div className="w-full max-w-md glassmorphism rounded-3xl p-8 border border-slate-800">
            <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
              🎯
            </div>
            <h3 className="text-xl font-bold uppercase text-slate-100 mb-2">Choice Locked!</h3>
            <p className="text-slate-400 text-sm">
              Waiting for <strong className="text-cyan-300">{bowlerName}</strong> to predict options...
            </p>
          </div>
        </div>
      )}

      {step === 'BOWLER_SELECT' && (
        !isMyTurnToBowl ? (
          <div className="flex-1 flex flex-col justify-center items-center py-12 animate-fade-in text-center">
            <div className="w-full max-w-md glassmorphism rounded-3xl p-8 border border-slate-800">
              <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-4 animate-spin">
                🎯
              </div>
              <h3 className="text-xl font-bold uppercase text-slate-100 mb-2">Bowler's Turn to Predict</h3>
              <p className="text-slate-400 text-sm">
                Waiting for <strong className="text-cyan-300">{bowlerName}</strong> to predict your shot...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-5 animate-slide-up">
            <div className="text-center">
              <h3 className="text-xl font-bold uppercase text-cyan-300 mt-2">Predict the batsman's reality</h3>
              <p className="text-sm text-slate-400 mt-1"><span className="text-cyan-400 font-bold">{bowlerName}</span> (YOU)</p>
            </div>

            <div className="grid grid-cols-2 md:flex md:flex-row justify-center gap-4">
              {collapsedOptions.map((opt, idx) => (
                <React.Fragment key={`bowl-${idx}`}>
                  {renderOptionCard(opt, bowlingChoices.includes(opt), () => handleBowlingSelect(opt))}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 text-center">Power Cards (Bowler)</h4>
              <div className="flex gap-3 justify-center">
                {POWER_CARDS.BOWLER.map(card => {
                  const count = bowlerCards[card.id];
                  const isActive = bowlerActiveCard === card.id;
                  return (
                    <button key={card.id} onClick={() => toggleBowlerCard(card.id)} disabled={count <= 0 && !isActive} className={`flex-1 max-w-[150px] p-2 border rounded-xl flex flex-col items-center justify-center text-center transition-all ${isActive ? 'bg-cyan-600/30 border-cyan-400 ring-1 ring-cyan-500' : count <= 0 ? 'bg-slate-900 border-slate-800 opacity-50 grayscale' : 'glassmorphism hover:border-slate-500'}`}>
                      <span className="text-lg">{card.icon}</span><span className="text-[10px] font-bold text-slate-200 uppercase leading-tight mt-1">{card.name}</span><span className="text-[9px] text-cyan-300 font-mono mt-1">{count} Left</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center mt-2 mb-8">
              <button 
                onClick={confirmBowlerChoice} 
                disabled={bowlingChoices.length === 0 || (bowlerActiveCard === 'DOUBLE_GUESS' && bowlingChoices.length !== 2)} 
                className={`px-8 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-sm transition-all ${bowlingChoices.length > 0 && !(bowlerActiveCard === 'DOUBLE_GUESS' && bowlingChoices.length !== 2) ? 'bg-cyan-600 text-white hover:scale-105' : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'}`}
              >
                ⚡ Reveal Result
              </button>
            </div>
          </div>
        )
      )}

      {step === 'REVEAL' && ballResult && (
        <div className="flex-1 flex flex-col gap-5 animate-fade-in text-center mt-2">
          <h3 className="text-xl font-extrabold uppercase tracking-widest shimmer-text">⚡ Result ⚡</h3>
          
          <div className="glassmorphism rounded-2xl p-6 border border-slate-800/80 max-w-xl mx-auto w-full animate-reveal-glow">
            <div className="grid grid-cols-2 gap-4 items-stretch text-center">
              <div className="p-4 bg-purple-950/30 border border-purple-500/20 rounded-xl flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase text-purple-400 font-mono tracking-wider block mb-2">Batsman Chose</span>
                <span className="text-lg md:text-xl font-black text-purple-300">{battingChoice}</span>
              </div>
              <div className="p-4 bg-cyan-950/30 border border-cyan-500/20 rounded-xl flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase text-cyan-400 font-mono tracking-wider block mb-2">Bowler Predicted</span>
                <span className="text-lg md:text-xl font-black text-cyan-300">{bowlingChoices.join(' & ')}</span>
              </div>
            </div>
          </div>

          {ballResult.specialMessages.length > 0 && (
            <div className="max-w-xl mx-auto w-full flex flex-col gap-2">
              {ballResult.specialMessages.map((msg, i) => (
                <div key={i} className="bg-amber-500/20 text-amber-300 border border-amber-500/30 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider animate-pulse">
                  ✨ {msg}
                </div>
              ))}
            </div>
          )}

          <div className="py-6 px-4 bg-slate-950/50 border border-slate-800 rounded-2xl max-w-xl mx-auto w-full">
            <span className="text-[10px] uppercase text-slate-500 tracking-widest font-mono block mb-2">Outcome</span>
            <h3 className={`text-4xl sm:text-5xl font-black uppercase tracking-wider ${ballResult.isWicket ? 'text-red-400' : getOutcomeColor(ballResult.outcome)}`}>{ballResult.isWicket ? 'OUT' : `${ballResult.runs} RUNS`}</h3>
          </div>

          <div className="flex justify-center mt-2 mb-4">
            <button onClick={handleNextBall} className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold uppercase tracking-wider text-sm hover:scale-105 transition-all">Next Ball →</button>
          </div>
        </div>
      )}
      {/* Leave Match Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md glassmorphism rounded-3xl p-8 border border-slate-800/80 text-center animate-scale-in relative">
            <h3 className="text-2xl font-extrabold text-slate-100 uppercase mb-3 tracking-wider">Leave Match?</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Your current match progress will be lost.
            </p>
            
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={() => { playClickSound(); setShowExitModal(false); }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold uppercase tracking-wider text-xs transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                Continue Match
              </button>
              <button
                onClick={() => { playClickSound(); onBackToSetup(); }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold uppercase tracking-wider text-xs transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(147,51,234,0.2)]"
              >
                Back to Setup
              </button>
              <button
                onClick={() => { playClickSound(); onExitToHome(); }}
                className="w-full py-3.5 rounded-xl border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 font-bold uppercase tracking-wider text-xs transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                Exit to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
