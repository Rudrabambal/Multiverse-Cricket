// ─────────────────────────────────────────────
// Multiverse Cricket — LocalStorage Management
// ─────────────────────────────────────────────

const STATS_KEY = 'multiverse_cricket_stats';
const HISTORY_KEY = 'multiverse_cricket_history';

// Get Global Stats
export function getStats() {
  const defaultStats = {
    matchesPlayed: 0,
    matchesWon: 0,
    highestScore: 0,
    totalRuns: 0,
  };
  
  try {
    const data = localStorage.getItem(STATS_KEY);
    return data ? JSON.parse(data) : defaultStats;
  } catch (e) {
    return defaultStats;
  }
}

// Get Match History
export function getMatchHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

// Save Match Result
export function saveMatchResult(matchData) {
  const { innings1, innings2, battingFirst, bowlingFirst, winner, isTie } = matchData;

  const matchRecord = {
    id: Date.now(),
    date: new Date().toLocaleDateString(),
    player1: battingFirst,
    player2: bowlingFirst,
    score1: innings1.score,
    score2: innings2.score,
    winner,
    isTie
  };

  // 1. Update History
  const history = getMatchHistory();
  const newHistory = [matchRecord, ...history].slice(0, 10); // Keep last 10 matches
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));

  // 2. Update Global Stats
  const stats = getStats();
  stats.matchesPlayed += 1;
  
  // We'll consider a match "won" if someone won, to track global wins across all players playing on this device.
  // Alternatively, tracking specific player stats is harder without login, so we just track generic "Matches Played/Won" for the device.
  if (!isTie) {
    stats.matchesWon += 1;
  }

  const maxScore = Math.max(innings1.score, innings2.score);
  if (maxScore > stats.highestScore) {
    stats.highestScore = maxScore;
  }

  stats.totalRuns += (innings1.score + innings2.score);

  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}
