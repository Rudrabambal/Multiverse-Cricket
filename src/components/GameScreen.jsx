import React, { useState, useEffect, useRef } from 'react';
import Scoreboard from './Scoreboard';
import { getOutcomeColor, parseRuns, POWER_CARDS } from '../utils/gameLogic';
import { 
  initAudio, playClickSound, playLockSound, 
  playRevealSound, playWicketSound, playBoundarySound 
} from '../utils/audio';

// ─── Render a single option card ───
const OptionCard = ({ opt, isSelected, onClick }) => {
  const runs = parseRuns(opt);
  const hasExtras = opt.includes('Wide') || opt.includes('No Ball');
  return (
    <button 
      onClick={onClick}
      className={`flex-1 w-full max-w-[140px] min-h-[130px] rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center p-3 gap-2
        ${isSelected 
          ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-purple-400 ring-2 ring-purple-500/50 scale-105' 
          : 'glassmorphism-card border-slate-700 hover:scale-105'}`}
    >
      <span className={`text-xl md:text-2xl font-black text-center leading-tight ${isSelected ? 'text-purple-300' : 'text-slate-200'}`}>
        {opt}
      </span>
      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-black/40 ${isSelected ? 'text-purple-400' : 'text-slate-400'}`}>
        {hasExtras ? `Total: ${runs}` : `${runs} Run${runs !== 1 ? 's' : ''}`}
      </span>
    </button>
  );
};

// ─── Waiting Spinner ───
const WaitingPanel = ({ emoji, name, label }) => (
  <div className="flex-1 flex flex-col justify-center items-center py-12 animate-fade-in text-center">
    <div className="w-full max-w-md glassmorphism rounded-3xl p-8 border border-slate-800">
      <div className="w-12 h-12 rounded-full bg-purple-950 border border-purple-500/30 flex items-center justify-center mx-auto mb-4 animate-spin text-2xl">
        {emoji}
      </div>
      <h3 className="text-xl font-bold uppercase text-slate-100 mb-2">{label}</h3>
      <p className="text-slate-400 text-sm">
        Waiting for <strong className="text-purple-300">{name}</strong>...
      </p>
    </div>
  </div>
);

// ─── Main GameScreen Component ───
const GameScreen = ({
  player1Name, player2Name,
  battingFirst, bowlingFirst,
  overs, wickets,
  roomData,
  onGameEnd, onBackToSetup, onExitToHome,
}) => {
  useEffect(() => { initAudio(); }, []);

  const isMultiplayer = Boolean(roomData?.socket);

  // ─── Resolve who is batsman / bowler this innings ───
  const [innings, setInnings] = useState(1);
  const [scores, setScores] = useState({
    1: { score: 0, wickets: 0, balls: 0, ballHistory: [] },
    2: { score: 0, wickets: 0, balls: 0, ballHistory: [] },
  });
  const [batsmanId, setBatsmanId] = useState(isMultiplayer ? roomData.battingFirstId : null);
  const [bowlerId, setBowlerId] = useState(isMultiplayer ? roomData.bowlingFirstId : null);

  const [batsmanNameState, setBatsmanNameState] = useState(battingFirst);
  const [bowlerNameState, setBowlerNameState] = useState(bowlingFirst);

  const getPlayerNameById = (id, fallback) => {
    if (!isMultiplayer || !roomData?.players) return fallback;
    const p = roomData.players.find(pl => pl.id === id);
    return p ? p.name : fallback;
  };

  const batsmanName = isMultiplayer ? getPlayerNameById(batsmanId, batsmanNameState) : batsmanNameState;
  const bowlerName = isMultiplayer ? getPlayerNameById(bowlerId, bowlerNameState) : bowlerNameState;

  // Multiplayer: figure out this device's role using unique IDs
  const isMyTurnToBat = isMultiplayer ? roomData.myId === batsmanId : true;
  const isMyTurnToBowl = isMultiplayer ? roomData.myId === bowlerId : true;

  // ─── Ball State ───
  const [step, setStep] = useState('BATSMAN_SELECT');
  const [currentOptions, setCurrentOptions] = useState([]);
  const [collapsedOptions, setCollapsedOptions] = useState([]);
  const [battingChoice, setBattingChoice] = useState(null);
  const [bowlingChoices, setBowlingChoices] = useState([]);
  const [ballResult, setBallResult] = useState(null);

  // Power cards: 1 of each per innings
  const [batsmanCards, setBatsmanCards] = useState({ DOUBLE_REALITY: 1, SAFE_REALITY: 1 });
  const [bowlerCards, setBowlerCards] = useState({ DOUBLE_GUESS: 1, REALITY_COLLAPSE: 1 });
  const [batsmanActiveCard, setBatsmanActiveCard] = useState(null);
  const [bowlerActiveCard, setBowlerActiveCard] = useState(null);

  const [showExitModal, setShowExitModal] = useState(false);

  // ─── Single-device: local options generation ───
  useEffect(() => {
    if (!isMultiplayer && step === 'BATSMAN_SELECT') {
      // Local: generate options client-side
      const OPTION_POOL = ['1 Run','2 Runs','3 Runs','4 Runs','6 Runs','Wide +1','No Ball +1','No Ball +2','No Ball +4','No Ball +6'];
      const shuffled = [...OPTION_POOL].sort(() => 0.5 - Math.random());
      const opts = shuffled.slice(0, 4);
      setCurrentOptions(opts);
      setCollapsedOptions(opts);
    }
  }, [step, isMultiplayer]);

  // ─── Multiplayer: attach server event listeners ───
  useEffect(() => {
    if (!isMultiplayer) return;
    const { socket } = roomData;

    // Server sends us initial options when match starts (already handled in PrivateRoom/TossScreen)
    // and after each ball reset

    const handleBatsmanMoved = ({ currentOptions: opts }) => {
      // Bowler can now see the options and pick
      setCurrentOptions(opts);
      setCollapsedOptions(opts);
      setBattingChoice(null); // We don't reveal batsman choice to bowler
      setStep('BOWLER_SELECT');
    };

    const handleBallResult = ({ result, scores: newScores, innings: newInnings, inningsOver, matchOver, battingFirstId, bowlingFirstId }) => {
      setBallResult(result);
      setScores(newScores);

      setTimeout(() => {
        if (result.isWicket) playWicketSound();
        else if (result.runs >= 4) playBoundarySound();
        else playRevealSound();
      }, 300);

      setStep('REVEAL');

      if (inningsOver) {
        setTimeout(() => setStep('INNINGS_BREAK'), 1800);
      }
      if (matchOver) {
        setTimeout(() => {
          onGameEnd({ innings1: newScores[1], innings2: newScores[2], battingFirst, bowlingFirst, maxWickets: wickets, maxOvers: overs });
        }, 2500);
      }
    };

    const handleNextBall = ({ scores: newScores, innings: newInnings, currentOptions: opts }) => {
      setScores(newScores);
      setInnings(newInnings);
      setCurrentOptions(opts);
      setCollapsedOptions(opts);
      resetBallState();
      setStep('BATSMAN_SELECT');
    };

    const handleInningsChange = ({ innings: newInnings, scores: newScores, currentOptions: opts, battingFirstId, bowlingFirstId }) => {
      setScores(newScores);
      setInnings(newInnings);
      setBatsmanId(battingFirstId);
      setBowlerId(bowlingFirstId);
      setCurrentOptions(opts);
      setCollapsedOptions(opts);
      setBatsmanCards({ DOUBLE_REALITY: 1, SAFE_REALITY: 1 });
      setBowlerCards({ DOUBLE_GUESS: 1, REALITY_COLLAPSE: 1 });
      resetBallState();
      setStep('BATSMAN_SELECT');
    };

    const handleGameOver = ({ scores: newScores }) => {
      onGameEnd({ innings1: newScores[1], innings2: newScores[2], battingFirst, bowlingFirst, maxWickets: wickets, maxOvers: overs });
    };

    // Receive options on match start / reconnect
    const handleGameState = ({ scores: s, innings: i, currentOptions: opts, battingFirstId, bowlingFirstId }) => {
      if (s) setScores(s);
      if (i) setInnings(i);
      if (opts) { setCurrentOptions(opts); setCollapsedOptions(opts); }
      if (battingFirstId) setBatsmanId(battingFirstId);
      if (bowlingFirstId) setBowlerId(bowlingFirstId);
    };

    const handleOpponentLeft = ({ message }) => {
      alert(message || 'Your opponent disconnected from the match.');
      onExitToHome();
    };

    socket.on('batsmanMoved', handleBatsmanMoved);
    socket.on('ballResult', handleBallResult);
    socket.on('nextBall', handleNextBall);
    socket.on('inningsChange', handleInningsChange);
    socket.on('gameOver', handleGameOver);
    socket.on('gameState', handleGameState);
    socket.on('opponentLeft', handleOpponentLeft);

    return () => {
      socket.off('batsmanMoved', handleBatsmanMoved);
      socket.off('ballResult', handleBallResult);
      socket.off('nextBall', handleNextBall);
      socket.off('inningsChange', handleInningsChange);
      socket.off('gameOver', handleGameOver);
      socket.off('gameState', handleGameState);
      socket.off('opponentLeft', handleOpponentLeft);
    };
  }, [isMultiplayer, roomData, batsmanName, bowlerName, battingFirst, bowlingFirst, onGameEnd, onExitToHome, wickets, overs]);

  // Set initial options from roomData (passed in from matchStarted event)
  useEffect(() => {
    if (isMultiplayer && roomData?.currentOptions) {
      setCurrentOptions(roomData.currentOptions);
      setCollapsedOptions(roomData.currentOptions);
    }
  }, [isMultiplayer, roomData]);

  const resetBallState = () => {
    setBattingChoice(null);
    setBowlingChoices([]);
    setBatsmanActiveCard(null);
    setBowlerActiveCard(null);
    setBallResult(null);
  };

  // ─── Power Card Handlers ───
  const toggleBatsmanCard = (cardId) => {
    if (batsmanCards[cardId] <= 0) return;
    playClickSound();
    setBatsmanActiveCard(prev => prev === cardId ? null : cardId);
  };

  const toggleBowlerCard = (cardId) => {
    if (bowlerCards[cardId] <= 0) return;
    playClickSound();
    if (cardId === 'REALITY_COLLAPSE' && bowlerActiveCard !== 'REALITY_COLLAPSE') {
      // Remove one incorrect option (in local mode, ensure it does not remove batsman's secret choice)
      let incorrectOpts = currentOptions;
      if (!isMultiplayer && battingChoice) {
        incorrectOpts = currentOptions.filter(opt => opt !== battingChoice);
      }
      const optionToRemove = incorrectOpts.length > 0 
        ? incorrectOpts[Math.floor(Math.random() * incorrectOpts.length)]
        : currentOptions[Math.floor(Math.random() * currentOptions.length)];

      const newOpts = currentOptions.filter(opt => opt !== optionToRemove);
      setCollapsedOptions(newOpts);
      setBowlingChoices([]);
    } else if (bowlerActiveCard === 'REALITY_COLLAPSE') {
      setCollapsedOptions(currentOptions);
      setBowlingChoices([]);
    }
    if (cardId === 'DOUBLE_GUESS' && bowlerActiveCard !== 'DOUBLE_GUESS') {
      setBowlingChoices([]);
    }
    setBowlerActiveCard(prev => prev === cardId ? null : cardId);
  };

  // ─── Batsman Confirm ───
  const confirmBatsmanChoice = () => {
    if (battingChoice === null) return;
    playLockSound();
    if (batsmanActiveCard) {
      setBatsmanCards(prev => ({ ...prev, [batsmanActiveCard]: prev[batsmanActiveCard] - 1 }));
    }

    if (isMultiplayer) {
      roomData.socket.emit('batsmanMove', {
        choice: battingChoice,
        powerCard: batsmanActiveCard,
      });
      setStep('WAITING_BOWLER');
    } else {
      // Local: go straight to bowler
      setCollapsedOptions(currentOptions);
      setStep('BOWLER_SELECT');
    }
  };

  // ─── Bowler Select ───
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

  // ─── Bowler Confirm ───
  const confirmBowlerChoice = () => {
    if (bowlingChoices.length === 0) return;
    if (bowlerActiveCard === 'DOUBLE_GUESS' && bowlingChoices.length !== 2) return;
    playLockSound();
    if (bowlerActiveCard) {
      setBowlerCards(prev => ({ ...prev, [bowlerActiveCard]: prev[bowlerActiveCard] - 1 }));
    }

    if (isMultiplayer) {
      // Send to server — server resolves and broadcasts to both
      roomData.socket.emit('bowlerMove', {
        choices: bowlingChoices,
        powerCard: bowlerActiveCard,
      });
      setStep('WAITING_RESULT'); // Waiting for server to broadcast ballResult
    } else {
      // Local: resolve locally
      const localResolveBall = (batsmanChoice, bowlerChoices, batsmanPowerCard) => {
        let isWicket = bowlerChoices.includes(batsmanChoice);
        let runs = parseRuns(batsmanChoice);
        const specialMessages = [];
        if (isWicket && batsmanPowerCard === 'SAFE_REALITY') {
          isWicket = false; runs = 0;
          specialMessages.push('Safe Reality Activated: Wicket Prevented!');
        } else if (isWicket) {
          runs = 0; // Wicket: 0 runs awarded
        } else if (batsmanPowerCard === 'DOUBLE_REALITY') {
          runs *= 2;
          specialMessages.push('Double Reality: Runs Doubled!');
        }
        const outcome = isWicket ? 'W' : runs.toString();
        return { isWicket, runs, outcome, display: isWicket ? 'WICKET!' : `${runs} RUNS`, symbol: outcome, specialMessages };
      };

      const result = localResolveBall(battingChoice, bowlingChoices, batsmanActiveCard);
      setBallResult(result);

      setTimeout(() => {
        if (result.isWicket) playWicketSound();
        else if (result.runs >= 4) playBoundarySound();
        else playRevealSound();
      }, 400);

      const newScores = {
        ...scores,
        [innings]: {
          ...scores[innings],
          score: scores[innings].score + result.runs,
          wickets: scores[innings].wickets + (result.isWicket ? 1 : 0),
          balls: scores[innings].balls + 1,
          ballHistory: [...scores[innings].ballHistory, { outcome: result.outcome, symbol: result.symbol }],
        }
      };
      setScores(newScores);
      setStep('REVEAL');
    }
  };

  // ─── Next Ball ───
  const handleNextBall = () => {
    playClickSound();
    const score = scores[innings];
    const maxBalls = overs * 6;
    const maxWickets = wickets;
    const isAllOut = score.wickets >= maxWickets;
    const isOverComplete = score.balls >= maxBalls;
    const target = innings === 2 ? scores[1].score + 1 : null;
    const targetChased = innings === 2 && score.score >= target;

    if (isMultiplayer) {
      // Let server manage state transition
      roomData.socket.emit('nextBall', { battingFirst, bowlingFirst });
      return;
    }

    // Local
    if (innings === 1 && (isAllOut || isOverComplete)) {
      setStep('INNINGS_BREAK');
    } else if (innings === 2 && (targetChased || isAllOut || isOverComplete)) {
      onGameEnd({ innings1: scores[1], innings2: scores[2], battingFirst, bowlingFirst, maxWickets: wickets, maxOvers: overs });
    } else {
      const OPTION_POOL = ['1 Run','2 Runs','3 Runs','4 Runs','6 Runs','Wide +1','No Ball +1','No Ball +2','No Ball +4','No Ball +6'];
      const opts = [...OPTION_POOL].sort(() => 0.5 - Math.random()).slice(0, 4);
      setCurrentOptions(opts);
      setCollapsedOptions(opts);
      resetBallState();
      setStep('BATSMAN_SELECT');
    }
  };

  const startInnings2 = () => {
    playClickSound();
    if (isMultiplayer) {
      // Server already handles this via nextBall -> inningsChange
      return;
    }
    setInnings(2);
    setBatsmanNameState(bowlingFirst);
    setBowlerNameState(battingFirst);
    setBatsmanCards({ DOUBLE_REALITY: 1, SAFE_REALITY: 1 });
    setBowlerCards({ DOUBLE_GUESS: 1, REALITY_COLLAPSE: 1 });
    const OPTION_POOL = ['1 Run','2 Runs','3 Runs','4 Runs','6 Runs','Wide +1','No Ball +1','No Ball +2','No Ball +4','No Ball +6'];
    const opts = [...OPTION_POOL].sort(() => 0.5 - Math.random()).slice(0, 4);
    setCurrentOptions(opts);
    setCollapsedOptions(opts);
    resetBallState();
    setStep('BATSMAN_SELECT');
  };

  const curScore = scores[innings];

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col gap-5 py-4 px-4 relative">
      {/* Exit button */}
      <div className="self-start">
        <button 
          onClick={() => { playClickSound(); setShowExitModal(true); }}
          className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-red-400 transition-colors py-1.5 px-3 rounded-lg border border-slate-800/80 bg-slate-950/40 hover:bg-slate-900/60"
        >
          ← Exit Match
        </button>
      </div>

      {/* Scoreboard */}
      {step !== 'INNINGS_BREAK' && (
        <Scoreboard 
          innings={innings}
          batsmanName={batsmanName}
          bowlerName={bowlerName}
          score={curScore.score}
          wickets={curScore.wickets}
          balls={curScore.balls}
          target={innings === 2 ? scores[1].score + 1 : null}
          firstInningsScore={scores[1]}
          battingFirst={battingFirst}
          ballHistory={curScore.ballHistory}
          maxOvers={overs}
          maxWickets={wickets}
        />
      )}

      {/* ─── INNINGS BREAK ─── */}
      {step === 'INNINGS_BREAK' && (
        <div className="flex-1 flex flex-col justify-center items-center py-10 animate-scale-in">
          <div className="w-full max-w-lg glassmorphism rounded-3xl p-8 text-center relative">
            <h3 className="text-3xl font-extrabold text-slate-100 uppercase mb-4">Target Set</h3>
            <div className="py-6 px-4 bg-slate-950/50 rounded-2xl mb-8">
              <p className="text-slate-400 font-mono tracking-widest">{battingFirst} scored</p>
              <h4 className="text-5xl font-black text-purple-400 mt-2">{scores[1].score} <span className="text-xl text-slate-500">/ {scores[1].wickets}w</span></h4>
            </div>
            <button onClick={isMultiplayer ? handleNextBall : startInnings2} className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold uppercase text-sm hover:scale-105 transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)]">
              Start Innings 2 →
            </button>
          </div>
        </div>
      )}

      {/* ─── BATSMAN SELECT ─── */}
      {step === 'BATSMAN_SELECT' && currentOptions.length > 0 && (
        !isMyTurnToBat ? (
          <WaitingPanel emoji="🏏" name={batsmanName} label="Opponent's Turn to Bat" />
        ) : (
          <div className="flex-1 flex flex-col gap-5 animate-slide-up">
            <div className="text-center">
              <h3 className="text-xl font-bold uppercase text-purple-300 mt-2">Choose your scoring reality</h3>
              <p className="text-sm text-slate-400 mt-1"><span className="text-purple-400 font-bold">{batsmanName}</span> (YOU)</p>
            </div>
            <div className="grid grid-cols-2 md:flex md:flex-row justify-center gap-4">
              {currentOptions.map((opt, i) => (
                <OptionCard key={i} opt={opt} isSelected={battingChoice === opt} onClick={() => { playClickSound(); setBattingChoice(opt); }} />
              ))}
            </div>
            {/* Batsman Power Cards */}
            <div className="mt-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 text-center">Power Cards (Batsman)</h4>
              <div className="flex gap-3 justify-center">
                {POWER_CARDS.BATSMAN.map(card => {
                  const count = batsmanCards[card.id];
                  const isActive = batsmanActiveCard === card.id;
                  return (
                    <button key={card.id} onClick={() => toggleBatsmanCard(card.id)} disabled={count <= 0 && !isActive} className={`flex-1 max-w-[150px] p-2 border rounded-xl flex flex-col items-center text-center transition-all ${isActive ? 'bg-purple-600/30 border-purple-400 ring-1 ring-purple-500' : count <= 0 ? 'bg-slate-900 border-slate-800 opacity-50 grayscale' : 'glassmorphism hover:border-slate-500'}`}>
                      <span className="text-lg">{card.icon}</span>
                      <span className="text-[10px] font-bold text-slate-200 uppercase leading-tight mt-1">{card.name}</span>
                      <span className="text-[9px] text-purple-300 font-mono mt-1">{count} Left</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-center mt-2 mb-8">
              <button onClick={confirmBatsmanChoice} disabled={battingChoice === null} className={`px-8 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-sm transition-all ${battingChoice !== null ? 'bg-purple-600 text-white hover:scale-105' : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'}`}>
                {isMultiplayer ? '🔒 Lock & Submit' : '🔒 Lock & Pass Device'}
              </button>
            </div>
          </div>
        )
      )}

      {/* ─── WAITING BOWLER ─── */}
      {step === 'WAITING_BOWLER' && (
        <WaitingPanel emoji="🎯" name={bowlerName} label="Choice Locked! Waiting for Bowler..." />
      )}

      {/* ─── WAITING RESULT (multiplayer only) ─── */}
      {step === 'WAITING_RESULT' && (
        <WaitingPanel emoji="⚡" name="Server" label="Calculating Result..." />
      )}

      {/* ─── BOWLER SELECT ─── */}
      {step === 'BOWLER_SELECT' && currentOptions.length > 0 && (
        !isMyTurnToBowl ? (
          <WaitingPanel emoji="🎯" name={bowlerName} label="Bowler's Turn to Predict" />
        ) : (
          <div className="flex-1 flex flex-col gap-5 animate-slide-up">
            <div className="text-center">
              <h3 className="text-xl font-bold uppercase text-cyan-300 mt-2">Predict the batsman's reality</h3>
              <p className="text-sm text-slate-400 mt-1"><span className="text-cyan-400 font-bold">{bowlerName}</span> (YOU)</p>
            </div>
            <div className="grid grid-cols-2 md:flex md:flex-row justify-center gap-4">
              {collapsedOptions.map((opt, i) => (
                <OptionCard key={i} opt={opt} isSelected={bowlingChoices.includes(opt)} onClick={() => handleBowlingSelect(opt)} />
              ))}
            </div>
            {/* Bowler Power Cards */}
            <div className="mt-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 text-center">Power Cards (Bowler)</h4>
              <div className="flex gap-3 justify-center">
                {POWER_CARDS.BOWLER.map(card => {
                  const count = bowlerCards[card.id];
                  const isActive = bowlerActiveCard === card.id;
                  return (
                    <button key={card.id} onClick={() => toggleBowlerCard(card.id)} disabled={count <= 0 && !isActive} className={`flex-1 max-w-[150px] p-2 border rounded-xl flex flex-col items-center text-center transition-all ${isActive ? 'bg-cyan-600/30 border-cyan-400 ring-1 ring-cyan-500' : count <= 0 ? 'bg-slate-900 border-slate-800 opacity-50 grayscale' : 'glassmorphism hover:border-slate-500'}`}>
                      <span className="text-lg">{card.icon}</span>
                      <span className="text-[10px] font-bold text-slate-200 uppercase leading-tight mt-1">{card.name}</span>
                      <span className="text-[9px] text-cyan-300 font-mono mt-1">{count} Left</span>
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
                ⚡ {isMultiplayer ? 'Submit Prediction' : 'Reveal Result'}
              </button>
            </div>
          </div>
        )
      )}

      {/* ─── REVEAL ─── */}
      {step === 'REVEAL' && ballResult && (
        <div className="flex-1 flex flex-col gap-5 animate-fade-in text-center mt-2">
          <h3 className="text-xl font-extrabold uppercase tracking-widest shimmer-text">⚡ Result ⚡</h3>
          
          <div className="glassmorphism rounded-2xl p-6 border border-slate-800/80 max-w-xl mx-auto w-full animate-reveal-glow">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-purple-950/30 border border-purple-500/20 rounded-xl flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase text-purple-400 font-mono tracking-wider block mb-2">Batsman Chose</span>
                <span className="text-lg font-black text-purple-300">{ballResult.batsmanChoice || battingChoice || '—'}</span>
              </div>
              <div className="p-4 bg-cyan-950/30 border border-cyan-500/20 rounded-xl flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase text-cyan-400 font-mono tracking-wider block mb-2">Bowler Predicted</span>
                <span className="text-lg font-black text-cyan-300">{(ballResult.bowlerChoices || bowlingChoices || []).join(' & ')}</span>
              </div>
            </div>
          </div>

          {ballResult.specialMessages?.length > 0 && (
            <div className="max-w-xl mx-auto w-full flex flex-col gap-2">
              {ballResult.specialMessages.map((msg, i) => (
                <div key={i} className="bg-amber-500/20 text-amber-300 border border-amber-500/30 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider animate-pulse">✨ {msg}</div>
              ))}
            </div>
          )}

          <div className="py-6 px-4 bg-slate-950/50 border border-slate-800 rounded-2xl max-w-xl mx-auto w-full">
            <span className="text-[10px] uppercase text-slate-500 tracking-widest font-mono block mb-2">Outcome</span>
            <h3 className={`text-4xl sm:text-5xl font-black uppercase tracking-wider ${ballResult.isWicket ? 'text-red-400' : getOutcomeColor(ballResult.outcome)}`}>
              {ballResult.isWicket ? 'OUT' : `${ballResult.runs} RUNS`}
            </h3>
          </div>

          {/* Only one player triggers Next Ball; other waits */}
          {(!isMultiplayer || isMyTurnToBat || isMyTurnToBowl) && (
            (!isMultiplayer || isMyTurnToBat) && (
              <div className="flex justify-center mt-2 mb-4">
                <button onClick={handleNextBall} className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold uppercase tracking-wider text-sm hover:scale-105 transition-all">
                  Next Ball →
                </button>
              </div>
            )
          )}
          {isMultiplayer && !isMyTurnToBat && (
            <p className="text-slate-400 text-sm animate-pulse">Waiting for {batsmanName} to continue...</p>
          )}
        </div>
      )}

      {/* ─── EXIT MODAL ─── */}
      {showExitModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md glassmorphism rounded-3xl p-8 border border-slate-800/80 text-center animate-scale-in">
            <h3 className="text-2xl font-extrabold text-slate-100 uppercase mb-3 tracking-wider">Leave Match?</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">Your current match progress will be lost.</p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button onClick={() => { playClickSound(); setShowExitModal(false); }} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold uppercase tracking-wider text-xs transition-all hover:scale-[1.02] active:scale-95">Continue Match</button>
              <button onClick={() => { playClickSound(); onBackToSetup(); }} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold uppercase tracking-wider text-xs transition-all hover:scale-[1.02] active:scale-95">Back to Setup</button>
              <button onClick={() => { playClickSound(); onExitToHome(); }} className="w-full py-3.5 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-300 font-bold uppercase tracking-wider text-xs transition-all hover:scale-[1.02] active:scale-95">Exit to Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
