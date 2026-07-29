# 🌌 Multiverse Cricket

> **A quantum-powered, real-time 2-player hand-cricket game where every ball creates a new reality.**

Multiverse Cricket blends the timeless fun of hand-cricket with a cosmically themed card-selection UI, real-time multiplayer over SSE, and special power cards that can bend the laws of the game.

---

## ✨ Features

| Feature | Details |
|---|---|
| **1v1 Multiplayer** | Play online with a friend using a 6-character Room Code |
| **Local Hotseat** | Pass-and-play on the same device |
| **Universe Cards** | Choose from 4 randomised "universe" options per ball |
| **Power Cards** | `Double Reality`, `Safe Reality`, `Double Guess`, `Reality Collapse` |
| **Extras** | Wide (+2), No Ball (+1/+2/+4/+6) correctly scored |
| **Custom Match Config** | Set overs and wickets per match |
| **Stats Tracking** | Persistent local stats — wins, highest score, total runs |
| **Sound FX** | Boundary, wicket, click & reveal sounds |
| **Responsive UI** | Works on mobile and desktop |
| **Standalone Mode** | Single HTML file — no server needed |

---

## 🧑‍💻 Tech Stack

- **Frontend:** React 18 + Vite 5
- **Styling:** Tailwind CSS 3
- **Backend:** Node.js (HTTP + SSE) — zero external runtime dependencies
- **Realtime:** Server-Sent Events (SSE) for multiplayer sync
- **Icons:** Lucide React
- **Animations:** react-confetti

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18

### Install & Run (Development)

```bash
# Clone the repo
git clone https://github.com/your-username/multiverse-cricket.git
cd multiverse-cricket

# Install dependencies
npm install

# Start Vite dev server (frontend only / hotseat mode)
npm run dev

# In a separate terminal, start the backend (for multiplayer)
npm run server
```

The frontend will be at `http://localhost:5173` and the backend at `http://localhost:3001`.

### Build for Production

```bash
npm run build
npm start          # Serves the built frontend + backend on one port
```

---

## 🎮 How to Play

### Local (Hotseat)
1. Open the app — click **Play Local**.
2. Enter both player names and set overs/wickets.
3. Do the toss, then take turns selecting your universe card each ball.
4. The batting player picks a run option; the bowling player picks what they think the batsman will pick — if they match, it's a **WICKET!**

### Online Multiplayer
1. Player 1 opens the app — **Create Room** — shares the 6-char code.
2. Player 2 opens the app — **Join Room** — enters the code.
3. Toss happens automatically; the game begins.
4. Each player makes their selection on their own device — results are revealed simultaneously.

---

## 🃏 Power Cards

Power cards can be used **once per innings**.

### Batsman Cards
| Card | Effect |
|---|---|
| **Double Reality** | Your chosen runs are doubled this ball |
| **Safe Reality** | If you're out this ball, score 0 instead (no wicket) |

### Bowler Cards
| Card | Effect |
|---|---|
| **Double Guess** | Pick 2 options — if the batsman picks either, OUT! |
| **Reality Collapse** | Remove one option from the batsman's choices |

---

## 📊 Scoring Rules

| Delivery | Runs Awarded | Ball Counts |
|---|---|---|
| 1 / 2 / 3 / 4 / 6 Runs | Face value | ✅ Yes |
| **Wide +2** | **2 runs** (1 wide penalty + 1 extra) | ❌ No (free ball) |
| No Ball +1 | 2 runs | ❌ No (free ball) |
| No Ball +2 | 3 runs | ❌ No (free ball) |
| No Ball +4 | 5 runs | ❌ No (free ball) |
| No Ball +6 | 7 runs | ❌ No (free ball) |
| Wicket | 0 runs, -1 wicket | ✅ Yes |

---

## 🗂️ Project Structure

```
multiverse-cricket/
├── server/
│   ├── index.js               # Node.js HTTP + SSE server
│   └── socket/
│       ├── gameHandler.js     # Socket event handlers
│       └── roomManager.js     # In-memory room state
├── src/
│   ├── components/
│   │   ├── GameScreen.jsx     # Main gameplay UI
│   │   ├── Home.jsx           # Landing page
│   │   ├── PlayerSetup.jsx    # Match configuration
│   │   ├── PrivateRoom.jsx    # Multiplayer room lobby
│   │   ├── ResultScreen.jsx   # Match result + summary
│   │   ├── Scoreboard.jsx     # Live scoreboard
│   │   ├── StatsScreen.jsx    # Historical stats
│   │   ├── TossScreen.jsx     # Coin toss UI
│   │   ├── TraitSelection.jsx # Power card selection
│   │   └── UniverseCard.jsx   # Option card component
│   ├── utils/
│   │   ├── gameLogic.js       # Core scoring & resolution engine
│   │   └── audio.js           # Sound FX helpers
│   ├── App.jsx                # Root component + routing state
│   └── main.jsx               # React entry point
├── multiverse_cricket_standalone.html  # Self-contained single-file version
├── DEPLOYMENT.md              # Deployment guide (Render / Vercel)
├── README.md                  # This file
├── LICENSE                    # MIT License
├── render.yaml                # Render deploy config
├── vercel.json                # Vercel deploy config
└── vite.config.js             # Vite build config
```

---

## ☁️ Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions on:

- **Option A:** Single-service on [Render](https://render.com) (recommended — free tier)
- **Option B:** Decoupled — frontend on [Vercel](https://vercel.com) + backend on Render

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.

---

<div align="center">
  <sub>Simulated in quantum space-time. Every ball creates a new reality. 🌌</sub>
</div>
