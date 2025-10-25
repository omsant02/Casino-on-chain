import { useState, useEffect, useRef } from 'react';
import './App.css';
import { yellowService } from './yellowService';

const WS_URL = 'ws://localhost:8080';

function App() {
  // Yellow Network state
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [chips, setChips] = useState(0);
  
  // WebSocket state
  const [ws, setWs] = useState(null);
  const [availableGames, setAvailableGames] = useState([]);
  
  // Game state
  const [gameMode, setGameMode] = useState('lobby');
  const [currentGame, setCurrentGame] = useState(null);
  const [gameState, setGameState] = useState('choosing');
  const [myChoice, setMyChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Connect your wallet to start');
  
  const chipsRef = useRef(0);
  const chipsAtGameStartRef = useRef(0);
  
  useEffect(() => {
    chipsRef.current = chips;
  }, [chips]);

  // Yellow Network callbacks
  useEffect(() => {
    yellowService.onConnectionOpen = () => {
      setIsConnected(true);
      setStatusMessage('Connected! Authenticating...');
    };

    yellowService.onAuthSuccess = () => {
      setIsAuthenticated(true);
      setStatusMessage('✅ Authenticated!');
      checkBalance();
    };

    yellowService.onAuthFailure = (error) => {
      setStatusMessage(`Auth failed: ${error}`);
    };
  }, []);

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated && walletAddress && !ws) {
      connectToGameServer();
    }
  }, [isAuthenticated, walletAddress]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      setWalletAddress(accounts[0]);
      await yellowService.connectToClearNode();
      await yellowService.authenticate(accounts[0]);
    } catch (error) {
      console.error('Connection failed:', error);
      setStatusMessage(`Failed: ${error.message}`);
    }
  };

  const checkBalance = async () => {
    try {
      const response = await yellowService.getLedgerBalances();
      const balances = response.ledgerBalances || [];
      const usdcBalance = balances.find(b => b.asset?.toLowerCase() === 'usdc');
      
      if (usdcBalance) {
        const chipAmount = parseFloat(usdcBalance.amount);
        setChips(chipAmount);
        setStatusMessage(`💰 You have ${chipAmount} chips!`);
      } else {
        setChips(0);
        setStatusMessage('No chips - use demo button to add chips');
      }
    } catch (error) {
      console.error('Balance check failed:', error);
    }
  };

  // Connect to game server (WebSocket)
  const connectToGameServer = () => {
    console.log('🎮 Connecting to game server...');
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log('✅ Connected to game server');
      socket.send(JSON.stringify({ 
        type: 'connect', 
        wallet: walletAddress 
      }));
      setWs(socket);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Game server:', data);

        switch (data.type) {
          case 'connected':
            setStatusMessage('🎮 Ready to play!');
            break;
          
          case 'games_list':
            setAvailableGames(data.games);
            break;
          
          case 'game_created':
            setCurrentGame(data.game);
            setGameMode('waiting');
            setStatusMessage('⏳ Waiting for opponent...');
            break;
          
          case 'game_started':
            setCurrentGame(data.game);
            setGameMode('playing');
            setGameState('choosing');
            const opponentAddr = data.game.host === walletAddress ? data.game.guest : data.game.host;
            setStatusMessage(`🎮 Playing vs ${opponentAddr.slice(0,6)}...`);
            console.log('💰 Game started - chips saved:', chipsAtGameStartRef.current);
            break;
          
          case 'opponent_chose':
            setStatusMessage('⏳ Opponent chose! Waiting...');
            break;
          
          case 'game_result':
            handleGameResult(data.game);
            break;
          
          case 'error':
            alert(data.error);
            break;
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('🔥 WebSocket error:', error);
      setStatusMessage('❌ Game server connection failed');
    };

    socket.onclose = () => {
      console.log('❌ Disconnected from game server');
      setWs(null);
    };
  };

  // Create game
  const createGame = (bet) => {
    if (chips < bet) {
      alert('Not enough chips!');
      return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert('Not connected to game server!');
      return;
    }

    chipsAtGameStartRef.current = chipsRef.current;
    console.log('🎮 Creating game - Saving chips:', chipsRef.current);

    ws.send(JSON.stringify({
      type: 'create_game',
      bet
    }));
  };

  // Join game
  const joinGame = (game) => {
    if (chips < game.hostBet) {
      alert('Not enough chips!');
      return;
    }

    chipsAtGameStartRef.current = chipsRef.current;
    console.log('🎮 Joining game - Saving chips:', chipsRef.current);

    ws.send(JSON.stringify({
      type: 'join_game',
      gameId: game.id
    }));
  };

  const makeChoice = (choice) => {
    setMyChoice(choice);
    setGameState('waiting_opponent');
    setStatusMessage('⏳ Waiting for opponent...');

    ws.send(JSON.stringify({
      type: 'make_choice',
      gameId: currentGame.id,
      choice
    }));
  };

  const handleGameResult = (game) => {
    const coinFlip = game.result.coinFlip;
    const winner = game.result.winner;
    const iWon = winner === walletAddress;
    const isDraw = !winner;
    const bet = game.hostBet;

    const startChips = chipsAtGameStartRef.current;
    console.log('💰 Game result - Start chips:', startChips, 'Bet:', bet, 'Won:', iWon);

    setResult({
      coinFlip,
      winner,
      iWon,
      isDraw,
      bet: bet
    });

    let newChips = startChips;
    
    if (iWon) {
      newChips = startChips + bet;
      setStatusMessage('🎉 YOU WON! +' + bet + ' chips');
      console.log('💰 WIN:', startChips, '+', bet, '=', newChips);
    } else if (isDraw) {
      newChips = startChips;
      setStatusMessage('🤝 DRAW! No chips lost.');
      console.log('💰 DRAW:', startChips, '(no change)');
    } else {
      newChips = startChips - bet;
      setStatusMessage('😢 You lost! -' + bet + ' chips');
      console.log('💰 LOSS:', startChips, '-', bet, '=', newChips);
    }

    setChips(newChips);
    setGameState('result');

    setTimeout(() => {
      backToLobby();
    }, 3000);
  };

  const cashOut = async () => {
    if (chips === 0) {
      alert('No chips to cash out!');
      return;
    }

    setStatusMessage('💰 Cashing out...');
    
    await new Promise(r => setTimeout(r, 1500));
    
    alert(`✅ Successfully cashed out ${chips} chips!\n\nIn production, this would:\n1. Close Yellow channel\n2. Settle on-chain\n3. Transfer USDC to your wallet`);
    
    setChips(0);
    setStatusMessage('✅ Cash out complete! Deposit more to play.');
  };

  const cancelGame = () => {
    if (currentGame && ws) {
      ws.send(JSON.stringify({
        type: 'cancel_game',
        gameId: currentGame.id
      }));
      
      setChips(chips + currentGame.hostBet);
    }
    backToLobby();
  };

  const backToLobby = () => {
    setGameMode('lobby');
    setCurrentGame(null);
    setMyChoice(null);
    setResult(null);
    setGameState('choosing');
    setStatusMessage('💰 Ready to play!');
  };

  return (
    <div className="casino-container">
      <h1>🎰 Yellow Casino - Coin Flip PvP</h1>
      <p className="subtitle">Powered by Yellow Network (ERC-7824)</p>

      <div className="status-info">
        <p>📊 {statusMessage}</p>
      </div>

      {!isAuthenticated ? (
        <div className="connect-section">
          <button className="connect-btn" onClick={connectWallet}>
            {isConnected ? '⏳ Authenticating...' : '🔗 Connect Wallet'}
          </button>
        </div>
      ) : (
        <div className="game-section">
          <div className="wallet-info">
            <h3>💳 Wallet</h3>
            <p>Address: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
            <p>Chips: <strong>{chips} 🪙</strong></p>
            <p>Network: <span style={{color: '#4ade80'}}>🟢 Connected</span></p>
            <button onClick={checkBalance} className="refresh-btn">
              🔄 Refresh
            </button>
            {chips === 0 && (
              <button 
                onClick={() => setChips(10)} 
                className="refresh-btn"
                style={{marginTop: '10px', backgroundColor: '#fbbf24'}}
              >
                🎁 Demo: Add 10 Chips
              </button>
            )}
          </div>

          {gameMode === 'lobby' && (
            <div className="lobby">
              <h3>🎮 Game Lobby</h3>
              
              <div className="create-game">
                <h4>Create New Game:</h4>
                <div className="bet-buttons">
                  <button onClick={() => createGame(1)} disabled={chips < 1}>
                    Host 1 chip game
                  </button>
                  <button onClick={() => createGame(2)} disabled={chips < 2}>
                    Host 2 chip game
                  </button>
                </div>
              </div>

              <div className="available-games">
                <h4>Join Game:</h4>
                {availableGames.length === 0 ? (
                  <p>No games available. Create one!</p>
                ) : (
                  availableGames.map(game => (
                    <div key={game.id} className="game-card">
                      <p>Host: {game.host.slice(0, 6)}...{game.host.slice(-4)}</p>
                      <p>Bet: {game.hostBet} chips</p>
                      <button onClick={() => joinGame(game)}>
                        Join Game
                      </button>
                    </div>
                  ))
                )}
              </div>

              {chips > 0 && (
                <div className="cashout-section" style={{marginTop: '20px'}}>
                  <button 
                    onClick={cashOut}
                    className="cashout-btn"
                    style={{
                      padding: '15px 30px',
                      fontSize: '16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    💰 Cash Out ({chips} chips)
                  </button>
                  <p style={{fontSize: '12px', marginTop: '10px', color: '#888'}}>
                    Withdraw your chips back to Yellow Network
                  </p>
                </div>
              )}
            </div>
          )}

          {gameMode === 'waiting' && (
            <div className="waiting">
              <h3>⏳ Waiting for Opponent...</h3>
              <p>Bet: {currentGame?.hostBet} chips</p>
              <button onClick={cancelGame}>Cancel</button>
            </div>
          )}

          {gameMode === 'playing' && (
            <div className="playing">
              <h3>🎮 Game On!</h3>
              <p>Bet: {currentGame?.hostBet} chips each</p>

              {gameState === 'choosing' && (
                <div className="choice-buttons">
                  <h4>Choose:</h4>
                  <button onClick={() => makeChoice('heads')} className="bet-btn heads-btn">
                    🪙 HEADS
                  </button>
                  <button onClick={() => makeChoice('tails')} className="bet-btn tails-btn">
                    🪙 TAILS
                  </button>
                </div>
              )}

              {gameState === 'waiting_opponent' && (
                <div>
                  <p>Your choice: {myChoice?.toUpperCase()}</p>
                  <p>⏳ Waiting for opponent...</p>
                </div>
              )}

              {gameState === 'result' && result && (
                <div className={`result ${result.iWon ? 'won' : result.isDraw ? 'draw' : 'lost'}`}>
                  <h2>
                    {result.iWon ? '🎉 YOU WON!' : result.isDraw ? '🤝 DRAW!' : '😢 YOU LOST'}
                  </h2>
                  <p>Coin landed on: {result.coinFlip.toUpperCase()}</p>
                  <p>Your choice: {myChoice?.toUpperCase()}</p>
                  {!result.isDraw && (
                    <p>{result.iWon ? `+${result.bet}` : `-${result.bet}`} chips</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="info-box">
            <p><strong>ℹ️ How to Play:</strong></p>
            <p>1. Create a game or join an existing one</p>
            <p>2. Both players choose HEADS or TAILS</p>
            <p>3. Coin flip determines winner</p>
            <p>4. Winner takes all chips!</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;