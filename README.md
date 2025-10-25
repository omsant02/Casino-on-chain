# 🎰 Casino-on-Chain

**Bringing the entire casino experience to blockchain with instant, gas-free gameplay powered by Yellow Network's state channels.**

<img width="1656" height="776" alt="image" src="https://github.com/user-attachments/assets/ae1322af-01cc-43c8-aaa6-280e9abda285" />

<br/>
<br/>
<br/>

![Status](https://img.shields.io/badge/Status-MVP-success) ![Yellow Network](https://img.shields.io/badge/Built%20on-Yellow%20Network-yellow) ![License](https://img.shields.io/badge/License-MIT-blue)

## 🌟 Vision

Casino-on-Chain aims to revolutionize online gambling by bringing the complete casino experience on-chain. Using **Yellow Network's state channels** (ERC-7824), we enable instant, gas-free gameplay while maintaining blockchain security and transparency.

### The Future
Imagine a fully decentralized casino where:
- 🎲 Multiple casino games (Poker, Blackjack, Roulette, Slots)
- 🪙 Universal chip system across all games
- 💰 Instant deposits and withdrawals via state channels
- 🏆 Tournaments and leaderboards
- 🎁 NFT rewards and VIP programs
- 🌍 Global, permissionless access

### Current Implementation (MVP)
We've built our first game - **Multiplayer Coin Flip** - to prove the architecture works:
- ✅ Real-time multiplayer gameplay
- ✅ Yellow Network state channel integration
- ✅ Instant, gas-free transactions
- ✅ Fair randomness and settlement
- ✅ Beautiful casino UI

**Live Demo:** [Your Vercel URL]

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    CASINO-ON-CHAIN PLATFORM                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                Frontend (React + Vite)                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │   Game   │  │  Wallet  │  │  Casino  │  │  Chips   │  │  │
│  │  │   UI     │  │  Connect │  │  Lobby   │  │  System  │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                    │                                    │
│         │ WebSocket          │ RPC                                │
│         ▼                    ▼                                    │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │   Game Server       │  │   Yellow Network Service         │  │
│  │   (Node.js + WS)    │  │   (State Channel Client)         │  │
│  │                     │  │                                  │  │
│  │  • Game Logic       │  │  • Authentication                │  │
│  │  • State Sync       │  │  • Balance Management            │  │
│  │  • Random Fair      │  │  • Channel Operations            │  │
│  │  • Lobby System     │  │  • Signature Handling            │  │
│  └─────────────────────┘  └──────────────────────────────────┘  │
│                                      │                            │
└──────────────────────────────────────┼────────────────────────────┘
                                       │
                                       ▼
              ┌────────────────────────────────────────┐
              │      Yellow Network (ERC-7824)         │
              ├────────────────────────────────────────┤
              │  ┌──────────────┐  ┌──────────────┐  │
              │  │  ClearNode   │  │    State     │  │
              │  │  (Gateway)   │  │   Channels   │  │
              │  │              │  │  (Off-chain) │  │
              │  └──────────────┘  └──────────────┘  │
              │           │              │            │
              │           ▼              ▼            │
              │  ┌─────────────────────────────────┐ │
              │  │   Blockchain Settlement Layer   │ │
              │  │   (Ethereum + USDC)             │ │
              │  └─────────────────────────────────┘ │
              └────────────────────────────────────────┘
```

---

## 🎮 Current Game: Multiplayer Coin Flip

Our first game demonstrates the complete casino infrastructure:

### Game Flow
```
┌─────────────────────────────────────────────────────────┐
│ 1. CONNECT & AUTHENTICATE                               │
│    User → MetaMask → Yellow Network → Get Chip Balance │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. ENTER LOBBY                                          │
│    • See available games                                │
│    • Create new game (1 or 2 chip bet)                 │
│    • Join existing game                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. PLAY GAME (Real-time)                                │
│    Player A: Choose HEADS/TAILS                         │
│    Player B: Choose HEADS/TAILS                         │
│    → Both choices submitted → Coin flips → Result!     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. INSTANT SETTLEMENT (Gas-free)                        │
│    Winner: +chips (off-chain update)                    │
│    Loser: -chips (off-chain update)                     │
│    → Play again or cash out                             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. CASH OUT                                             │
│    Close Yellow channel → On-chain settlement           │
│    → USDC transferred to wallet                         │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Why State Channels?

Traditional on-chain gaming is broken:
- ❌ High gas fees ($10-50 per transaction)
- ❌ Slow confirmations (15 seconds - 2 minutes)
- ❌ Poor UX (signing every action)
- ❌ Not scalable (limited TPS)

**State Channels solve everything:**
- ✅ Zero gas fees during gameplay
- ✅ Instant confirmations (<100ms)
- ✅ Smooth UX (sign once to open channel)
- ✅ Infinite scalability (off-chain)
- ✅ Blockchain security (on-chain settlement)

**Perfect for casino gaming!**

---

## 🛠️ Tech Stack

- **React 19** - UI framework
- **WebSocket Client** - Real-time communication
- **Node.js** - Runtime environment  
- **ws Library** - WebSocket server
- **Yellow Network SDK** - State channel protocol
- **ERC-7824 Implementation** - State channel standard
- **Ethers.js** - Blockchain interaction

---

## 📦 Project Structure

```
casino-on-chain/
├── yellow-casino/          # Frontend React app
│   ├── src/
│   │   ├── App.jsx         # Main game component
│   │   ├── yellowService.js # Yellow Network client
│   │   ├── App.css         # Casino UI styling
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                # Game server
│   ├── server.js           # WebSocket server & game logic
│   ├── package.json
│   └── README.md
│
└── README.md              # This file
```

---

## 🚀 Getting Started

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/omsant02/Casino-on-chain.git
cd casino-on-chain
```

**2. Setup Backend**
```bash
cd backend
npm install
node server.js
```
✅ Server runs on `ws://localhost:8080`

**3. Setup Frontend**
```bash
cd yellow-casino
npm install
npm run dev
```
✅ App runs on `http://localhost:5173`

**4. Play!**
- Open `http://localhost:5173` in browser
- Connect MetaMask
- Authenticate with Yellow Network
- Start playing!

### Demo Mode (No Real Money)
1. Connect with empty wallet (0 USDC)
2. Click "Demo: Add 10 Chips"
3. Play with simulated chips
4. All features work identically!

---

## 🎯 How to Play

### Step 1: Get Chips
- **Real Mode:** Deposit USDC at [app.yellow.com](https://app.yellow.com)
- **Demo Mode:** Click "Demo: Add 10 Chips" button

### Step 2: Create or Join Game
- Click "Host 1 chip game" or "Host 2 chip game"
- Or join an existing game from the lobby

### Step 3: Play
- Choose HEADS or TAILS
- Wait for opponent's choice
- See instant result!

### Step 4: Keep Playing
- Winner gets chips, loser loses chips
- Play as many rounds as you want
- All transactions are gas-free!

### Step 5: Cash Out
- Click "Cash Out" when done
- Yellow channel closes and settles on-chain
- USDC sent to your wallet

---

## 🔐 Security & Fairness

### State Channel Security
- Cryptographically signed state updates
- Both parties must agree to each state change
- Dispute resolution via on-chain settlement
- Non-custodial (you always control your funds)

### Fair Randomness
- Current: Server-side random (trusted)
- Future: Chainlink VRF (verifiable randomness)
- Future: Commit-reveal scheme (fully decentralized)

### Audit Status
- ⚠️ Not audited (MVP/Demo)
- 📋 Planned before mainnet launch

---

## 🗺️ Roadmap

### ✅ Phase 1: MVP (Current)
- [x] Coin Flip game
- [x] Yellow Network integration
- [x] Real-time multiplayer
- [x] Demo mode

### 🚧 Phase 2: Expansion (Q2 2025)
- [ ] Blackjack game
- [ ] Poker game
- [ ] Dice game
- [ ] Universal chip system
- [ ] Enhanced UI/UX

### 🔮 Phase 3: Full Casino (Q3 2025)
- [ ] Roulette
- [ ] Slots
- [ ] Live dealer games
- [ ] Tournament system
- [ ] Leaderboards

### 🚀 Phase 4: Platform (Q4 2025)
- [ ] Multi-game chip portability
- [ ] NFT rewards & achievements  
- [ ] VIP tiers
- [ ] Referral system
- [ ] Mobile app
- [ ] SDK for game developers

---

## 🤝 Contributing

We welcome contributions! Whether it's:
- 🎮 New game implementations
- 🐛 Bug fixes
- 📚 Documentation improvements
- 💡 Feature suggestions

**How to contribute:**
1. Fork the repository
2. Create feature branch (`git checkout -b feature/NewGame`)
3. Commit changes (`git commit -m 'Add Blackjack game'`)
4. Push to branch (`git push origin feature/NewGame`)
5. Open Pull Request

---

## 📊 Game Mechanics (Coin Flip)

### Betting
- Create game with 1 or 2 chip bet
- Opponent must match the bet
- Chips held in Yellow state channels

### Gameplay
- Both players choose HEADS or TAILS simultaneously
- Server generates random coin flip (50/50)
- Winner determined by matching coin result

---

<div align="center">

**🎰 Built with Yellow Network State Channels 🎰**

*Bringing the casino to blockchain, one game at a time.*

[⭐ Star us on GitHub](https://github.com/yourusername/casino-on-chain) | [🚀 Try the Demo](your-demo-url) | [📖 Documentation](your-docs-url)

</div>
