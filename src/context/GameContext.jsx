import React, { createContext, useContext, useState } from 'react';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children }) => {
  const [room, setRoom] = useState(null);

  return (
    <GameContext.Provider value={{ room, setRoom }}>
      {children}
    </GameContext.Provider>
  );
};
