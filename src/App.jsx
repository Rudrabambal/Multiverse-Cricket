import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import PlayerSetup from './components/PlayerSetup';
import PrivateRoom from './components/PrivateRoom';
import TossScreen from './components/TossScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import StatsScreen from './components/StatsScreen';
import { Star } from 'lucide-react';
import { initAudio, playClickSound } from './utils/audio';

const App = () => {
  const [screen, setScreen] = useState('HOME'); // HOME, SETUP, PRIVATE_ROOM, TOSS, PLAY, RESULT, STATS
  
  // Game Settings
  const [matchConfig, setMatchConfig] = useState({
    player1Name: 'Player 1',
    player2Name: 'Player 2',
    overs: 1,
    wickets: 1
  });
  
  // Online Private Room State
  const [roomData, setRoomData] = useState(null);

  // Toss State
  const [tossData, setTossData] = useState(null);
  
  // Final Match Data
  const [matchData, setMatchData] = useState(null);

  // Init Audio on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
      window.removeEventListener('click', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  const handleStartSetup = () => {
    playClickSound();
    setRoomData(null);
    setScreen('SETUP');
  };

  const handleStartPrivateRoom = () => {
    playClickSound();
    setRoomData(null);
    setScreen('PRIVATE_ROOM');
  };

  const handleRoomReady = (data) => {
    setRoomData(data);
    setMatchConfig({
      player1Name: data.players[0].name,
      player2Name: data.players[1].name,
      overs: data.config.overs || 1,
      wickets: data.config.wickets || 1
    });
    setScreen('TOSS');
  };

  const handleStartGame = (config) => {
    setMatchConfig(config);
    setScreen('TOSS');
  };

  const handleTossComplete = (data) => {
    setTossData(data);
    // If currentOptions came from the server (multiplayer), store in roomData
    if (data.currentOptions && roomData) {
      setRoomData(prev => prev ? { ...prev, currentOptions: data.currentOptions } : prev);
    }
    setScreen('PLAY');
  };

  const handleGameEnd = (finalData) => {
    setMatchData(finalData);
    setScreen('RESULT');
  };

  const handleRestart = () => {
    playClickSound();
    setTossData(null);
    setMatchData(null);
    setScreen('HOME');
  };

  const handleViewStats = () => {
    playClickSound();
    setScreen('STATS');
  };

  const handleBackToHome = () => {
    setScreen('HOME');
  };

  return (
    <div className="cosmic-bg min-h-screen flex flex-col justify-between text-slate-100 relative">
      
      {/* Top Navbar */}
      <header className="w-full max-w-5xl mx-auto px-6 py-4 flex items-center justify-between border-b border-slate-900/60 z-10">
        <button 
          onClick={handleRestart}
          className="text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 hover:opacity-80 transition-opacity"
        >
          🌌 MULTIVERSE CRICKET
        </button>
        <div className="flex gap-4 items-center">
          <button onClick={handleViewStats} className="text-xs uppercase font-bold text-slate-400 hover:text-white transition-colors">
            Stats
          </button>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Star className="w-3 h-3 text-purple-400 animate-spin" /> V2.0.0
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto z-10 relative">
        {screen === 'HOME' && (
          <Home onStart={handleStartSetup} onStartPrivateRoom={handleStartPrivateRoom} />
        )}
        
        {screen === 'SETUP' && (
          <PlayerSetup 
            onBack={handleBackToHome} 
            onStartGame={handleStartGame} 
          />
        )}

        {screen === 'PRIVATE_ROOM' && (
          <PrivateRoom 
            onBack={handleBackToHome}
            onRoomReady={handleRoomReady}
          />
        )}
        
        {screen === 'TOSS' && (
          <TossScreen 
            player1Name={matchConfig.player1Name} 
            player2Name={matchConfig.player2Name} 
            overs={matchConfig.overs}
            wickets={matchConfig.wickets}
            roomData={roomData}
            onTossComplete={handleTossComplete} 
            onBack={() => setScreen(roomData ? 'PRIVATE_ROOM' : 'SETUP')}
          />
        )}
        
        {screen === 'PLAY' && tossData && (
          <GameScreen 
            player1Name={matchConfig.player1Name} 
            player2Name={matchConfig.player2Name}
            battingFirst={tossData.battingFirst}
            bowlingFirst={tossData.bowlingFirst}
            overs={matchConfig.overs}
            wickets={matchConfig.wickets}
            roomData={roomData}
            onGameEnd={handleGameEnd} 
            onBackToSetup={() => setScreen(roomData ? 'PRIVATE_ROOM' : 'SETUP')}
            onExitToHome={handleRestart}
          />
        )}
        
        {screen === 'RESULT' && matchData && (
          <ResultScreen 
            player1Name={matchConfig.player1Name} 
            player2Name={matchConfig.player2Name} 
            matchData={matchData}
            onRestart={handleRestart}
            onViewStats={handleViewStats}
          />
        )}

        {screen === 'STATS' && (
          <StatsScreen onBack={handleBackToHome} />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 border-t border-slate-900/60 text-[10px] font-mono text-slate-600 tracking-wider z-10">
        Simulated in quantum space-time. Every ball creates a new reality.
      </footer>
    </div>
  );
};

export default App;
