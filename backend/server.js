import { WebSocketServer } from 'ws';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

const games = new Map(); 
const clients = new Map(); 

console.log(`🎮 Yellow Casino WebSocket Server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('✅ New client connected');
  
  clients.set(ws, { wallet: null, games: [] });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 Received:', data);

      switch (data.type) {
        case 'connect':
          handleConnect(ws, data);
          break;
        case 'create_game':
          handleCreateGame(ws, data);
          break;
        case 'join_game':
          handleJoinGame(ws, data);
          break;
        case 'make_choice':
          handleMakeChoice(ws, data);
          break;
        case 'cancel_game':
          handleCancelGame(ws, data);
          break;
        case 'get_games':
          handleGetGames(ws);
          break;
        default:
          console.log('⚠️ Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
    handleDisconnect(ws);
  });

  ws.on('error', (error) => {
    console.error('🔥 WebSocket error:', error);
  });
});

function handleConnect(ws, data) {
  const client = clients.get(ws);
  client.wallet = data.wallet;
  console.log(`🔗 Client connected with wallet: ${data.wallet}`);
  
  ws.send(JSON.stringify({ 
    type: 'connected', 
    wallet: data.wallet 
  }));
  
  handleGetGames(ws);
}

function handleCreateGame(ws, data) {
  const client = clients.get(ws);
  const gameId = Date.now().toString();
  
  const game = {
    id: gameId,
    host: client.wallet,
    hostBet: data.bet,
    guest: null,
    status: 'waiting',
    hostChoice: null,
    guestChoice: null,
    result: null,
    timestamp: Date.now()
  };
  
  games.set(gameId, game);
  client.games.push(gameId);
  
  console.log(`🎮 Game created: ${gameId} by ${client.wallet}`);
  
  ws.send(JSON.stringify({ 
    type: 'game_created', 
    game 
  }));
  
  broadcastGames();
}

function handleJoinGame(ws, data) {
  const client = clients.get(ws);
  const game = games.get(data.gameId);
  
  if (!game) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      error: 'Game not found' 
    }));
    return;
  }
  
  if (game.status !== 'waiting') {
    ws.send(JSON.stringify({ 
      type: 'error', 
      error: 'Game already started' 
    }));
    return;
  }
  
  game.guest = client.wallet;
  game.status = 'playing';
  client.games.push(data.gameId);
  
  console.log(`🎮 ${client.wallet} joined game ${data.gameId}`);
  
  notifyGamePlayers(game, { 
    type: 'game_started', 
    game 
  });
  
  broadcastGames();
}

function handleMakeChoice(ws, data) {
  const client = clients.get(ws);
  const game = games.get(data.gameId);
  
  if (!game) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      error: 'Game not found' 
    }));
    return;
  }
  
  if (client.wallet === game.host) {
    game.hostChoice = data.choice;
  } else if (client.wallet === game.guest) {
    game.guestChoice = data.choice;
  }
  
  console.log(`🎯 ${client.wallet} chose ${data.choice}`);
  
  notifyGamePlayers(game, {
    type: 'opponent_chose',
    gameId: game.id
  });
  
  if (game.hostChoice && game.guestChoice) {
    resolveGame(game);
  }
}

function resolveGame(game) {
  const coinFlip = Math.random() < 0.5 ? 'heads' : 'tails';
  
  const hostWon = game.hostChoice === coinFlip;
  const guestWon = game.guestChoice === coinFlip;
  
  let winner = null;
  if (hostWon && !guestWon) winner = game.host;
  else if (guestWon && !hostWon) winner = game.guest;
  
  game.result = {
    coinFlip,
    winner,
    isDraw: !winner
  };
  game.status = 'finished';
  
  console.log(`🎲 Game ${game.id} resolved: ${coinFlip}, winner: ${winner || 'draw'}`);
  
  notifyGamePlayers(game, {
    type: 'game_result',
    game
  });
  
  setTimeout(() => {
    games.delete(game.id);
    broadcastGames();
  }, 5000);
}

function handleCancelGame(ws, data) {
  const client = clients.get(ws);
  const game = games.get(data.gameId);
  
  if (!game) return;
  
  if (game.host === client.wallet && game.status === 'waiting') {
    games.delete(data.gameId);
    console.log(`❌ Game ${data.gameId} cancelled by host`);
    broadcastGames();
  }
}

function handleGetGames(ws) {
  const availableGames = Array.from(games.values())
    .filter(g => g.status === 'waiting');
  
  ws.send(JSON.stringify({ 
    type: 'games_list', 
    games: availableGames 
  }));
}

function handleDisconnect(ws) {
  const client = clients.get(ws);
  if (!client) return;
  
  client.games.forEach(gameId => {
    const game = games.get(gameId);
    if (game && game.host === client.wallet && game.status === 'waiting') {
      games.delete(gameId);
    }
  });
  
  clients.delete(ws);
  broadcastGames();
}

function broadcastGames() {
  const availableGames = Array.from(games.values())
    .filter(g => g.status === 'waiting');
  
  const message = JSON.stringify({ 
    type: 'games_list', 
    games: availableGames 
  });
  
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function notifyGamePlayers(game, message) {
  wss.clients.forEach((client) => {
    const clientData = clients.get(client);
    if (clientData && 
        (clientData.wallet === game.host || clientData.wallet === game.guest) &&
        client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
}

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  games.forEach((game, gameId) => {
    if (now - game.timestamp > 5 * 60 * 1000) {
      games.delete(gameId);
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} old games`);
    broadcastGames();
  }
}, 60000);

console.log('✅ Server ready for connections!');