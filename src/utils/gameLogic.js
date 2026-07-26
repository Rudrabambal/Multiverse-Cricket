// ─────────────────────────────────────────────
// Multiverse Cricket — Reality Engine
// ─────────────────────────────────────────────

export const POWER_CARDS = {
  BATSMAN: [
    { id: 'DOUBLE_REALITY', name: 'Double Reality', description: 'Selected runs are doubled', icon: '2️⃣' },
    { id: 'SAFE_REALITY', name: 'Safe Reality', description: 'If out, score 0 runs instead (Not Out)', icon: '🛡️' },
  ],
  BOWLER: [
    { id: 'DOUBLE_GUESS', name: 'Double Guess', description: 'Select 2 numbers. If either matches, OUT!', icon: '🎯' },
    { id: 'REALITY_COLLAPSE', name: 'Reality Collapse', description: 'Removes one incorrect run option', icon: '💥' },
  ]
};

const OPTION_POOL = [
  '1 Run',
  '2 Runs',
  '3 Runs',
  '4 Runs',
  '6 Runs',
  'Wide +1',
  'No Ball +1',
  'No Ball +2',
  'No Ball +4',
  'No Ball +6'
];

export function parseRuns(optionString) {
  switch (optionString) {
    case '1 Run': return 1;
    case '2 Runs': return 2;
    case '3 Runs': return 3;
    case '4 Runs': return 4;
    case '6 Runs': return 6;
    case 'Wide +1': return 1;
    case 'No Ball +1': return 2;
    case 'No Ball +2': return 3;
    case 'No Ball +4': return 5;
    case 'No Ball +6': return 7;
    default: return 0;
  }
}

// Generate options for the ball
export function generateOptions() {
  const shuffled = [...OPTION_POOL].sort(() => 0.5 - Math.random());
  return { type: 'STANDARD', options: shuffled.slice(0, 4) }; // Return 4 options
}

// ─── RESOLVE BALL ───
export function resolveBall({
  batsmanChoice, // string e.g. "No Ball +4"
  bowlerChoices, // Array of strings
  batsmanPowerCard, // 'DOUBLE_REALITY' | 'SAFE_REALITY' | null
}) {
  
  let isWicket = bowlerChoices.includes(batsmanChoice);
  let baseRuns = parseRuns(batsmanChoice);
  let runs = baseRuns;
  let specialMessages = [];

  // 1. Check Safe Reality
  if (isWicket && batsmanPowerCard === 'SAFE_REALITY') {
    isWicket = false;
    runs = 0;
    specialMessages.push("Safe Reality Activated: Wicket Prevented!");
  }

  // 3. Double Reality Card
  if (!isWicket && batsmanPowerCard === 'DOUBLE_REALITY') {
    runs *= 2;
    specialMessages.push("Double Reality: Runs Doubled!");
  }

  const outcome = isWicket ? 'W' : runs.toString();

  return {
    isWicket,
    runs,
    outcome,
    display: isWicket ? 'WICKET!' : `${runs} RUNS`,
    symbol: outcome,
    specialMessages
  };
}

// ─── UTILITIES ───
export function formatOvers(balls) {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${overs}.${remainingBalls}`;
}

export function getOutcomeBgColor(outcome) {
  switch (outcome) {
    case 'W': return 'bg-red-500/20 border-red-500/40 text-red-400';
    case '6': case '14': case '12': case '10': case '9': case '8': case '7': return 'bg-purple-500/20 border-purple-500/40 text-purple-300';
    case '5': case '4': return 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300';
    case '3': return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
    case '2': return 'bg-green-500/20 border-green-500/40 text-green-300';
    case '1': return 'bg-slate-800 border-slate-700 text-slate-200';
    case '0': return 'bg-slate-900 border-slate-800 text-slate-500';
    default: return 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300';
  }
}

export function getOutcomeColor(outcome) {
  switch (outcome) {
    case '14': case '12': case '10': case '9': case '8': case '7': return 'text-amber-400';
    case '6': case '5': return 'text-purple-400';
    case '4': return 'text-cyan-400';
    case '3': return 'text-emerald-400';
    case '2': return 'text-green-400';
    case '1': return 'text-slate-300';
    case '0': return 'text-slate-500';
    case 'W': return 'text-red-400';
    default: return 'text-slate-400';
  }
}
