import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createAuthVerifyMessageWithJWT,
  parseAnyRPCResponse,
  RPCMethod,
} from '@erc7824/nitrolite';
import { BrowserProvider, getAddress, Wallet, id, getBytes } from 'ethers';

class YellowService {
  constructor() {
    this.ws = null;
    this.isAuthenticated = false;
    this.provider = null;
    this.signer = null;
    this.walletAddress = null;
    this.sessionWallet = null;
    this.authRequestData = null;
    
    this.onAuthSuccess = null;
    this.onAuthFailure = null;
    this.onConnectionOpen = null;
    this.onConnectionClose = null;
  }

  async connectToClearNode() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to Yellow ClearNode...');
        
        this.ws = new WebSocket('wss://clearnet.yellow.com/ws');

        this.ws.onopen = () => {
          console.log('✅ Connected to ClearNode!');
          if (this.onConnectionOpen) this.onConnectionOpen();
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from ClearNode');
          this.isAuthenticated = false;
          if (this.onConnectionClose) this.onConnectionClose();
        };

        this.ws.onmessage = async (event) => {
          await this.handleMessage(event);
        };

      } catch (error) {
        console.error('Failed to connect:', error);
        reject(error);
      }
    });
  }

  getOrCreateSessionWallet() {
    const storedKey = localStorage.getItem('yellow_session_key');
    
    if (storedKey) {
      console.log('📦 Using existing session key');
      return new Wallet(storedKey);
    }
    
    console.log('🔑 Creating new session key...');
    const sessionWallet = Wallet.createRandom();
    localStorage.setItem('yellow_session_key', sessionWallet.privateKey);
    console.log('💾 Session key saved');
    
    return sessionWallet;
  }

  async authenticate(walletAddress) {
    try {
      console.log('🔐 Starting authentication...');
      
      this.walletAddress = getAddress(walletAddress);
      console.log('✅ Main wallet:', this.walletAddress);
      
      this.sessionWallet = this.getOrCreateSessionWallet();
      console.log('✅ Session key:', this.sessionWallet.address);
      
      this.provider = new BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      const jwtToken = localStorage.getItem('clearnode_jwt');
      
      if (jwtToken) {
        console.log('🎫 Found stored JWT, attempting quick reconnect...');
        await this.reconnectWithJWT(jwtToken);
      } else {
        console.log('🆕 First time authentication...');
        await this.fullAuthentication();
      }

    } catch (error) {
      console.error('Authentication failed:', error);
      if (this.onAuthFailure) this.onAuthFailure(error);
      throw error;
    }
  }

  async fullAuthentication() {
    this.authRequestData = {
      address: this.walletAddress,
      session_key: this.sessionWallet.address,
      app_name: 'Yellow Casino',
      expire: (Math.floor(Date.now() / 1000) + 3600).toString(),
      scope: 'app.yellowcasino',
      application: '0x0000000000000000000000000000000000000000',
      allowances: [],
    };

    const authRequestMsg = await createAuthRequestMessage(this.authRequestData);
    
    console.log('📤 Sending auth request to ClearNode...');
    this.ws.send(authRequestMsg);
  }

  async reconnectWithJWT(jwtToken) {
    const authMsg = await createAuthVerifyMessageWithJWT(jwtToken);
    console.log('📤 Sending JWT for reconnection...');
    this.ws.send(authMsg);
  }

  async handleMessage(event) {
    try {
      const message = parseAnyRPCResponse(event.data);
      console.log('📨 Received message:', message.method);

      switch (message.method) {
        case RPCMethod.AuthChallenge:
          await this.handleAuthChallenge(message);
          break;

        case RPCMethod.AuthVerify:
          this.handleAuthVerify(message);
          break;

        case RPCMethod.Error:
          console.error('❌ Error from ClearNode:', message.params);
          // Only trigger auth failure for actual auth errors, not app session errors
          if (message.params.error && !message.params.error.includes('missing signature')) {
            if (this.onAuthFailure) this.onAuthFailure(message.params.error);
          }
          break;

        default:
          console.log('📦 Other message type:', message.method);
      }
    } catch (error) {
      console.warn('⚠️ Could not parse message:', error.message);
    }
  }

  async handleAuthChallenge(message) {
    console.log('🔐 Received auth challenge, signing with wallet...');

    try {
      const expireNumber = parseInt(this.authRequestData.expire);

      const walletClient = {
        account: { 
          address: this.walletAddress
        },
        signTypedData: async ({ domain, types, primaryType, message: msg }) => {
          const filteredTypes = { ...types };
          delete filteredTypes.EIP712Domain;
          const signature = await this.signer.signTypedData(domain, filteredTypes, msg);
          return signature;
        }
      };

      const { createEIP712AuthMessageSigner } = await import('@erc7824/nitrolite');
      
      const eip712MessageSigner = createEIP712AuthMessageSigner(
        walletClient,
        {
          scope: 'app.yellowcasino',
          application: this.authRequestData.application,
          participant: this.sessionWallet.address,
          expire: expireNumber,
          allowances: this.authRequestData.allowances,
        },
        { name: 'Yellow Casino' }
      );

      const authVerifyMsg = await createAuthVerifyMessage(eip712MessageSigner, message);
      console.log('📤 Sending signed challenge...');
      this.ws.send(authVerifyMsg);

    } catch (error) {
      console.error('❌ Failed to sign challenge:', error);
      if (error.code === 'ACTION_REJECTED') {
        if (this.onAuthFailure) this.onAuthFailure('User rejected signature');
      } else {
        if (this.onAuthFailure) this.onAuthFailure(error.message);
      }
    }
  }

  handleAuthVerify(message) {
    if (message.params.success) {
      console.log('✅ Authentication successful!');
      this.isAuthenticated = true;

      if (message.params.jwtToken) {
        localStorage.setItem('clearnode_jwt', message.params.jwtToken);
        console.log('💾 JWT token saved');
      }

      this.startKeepAlive();
      if (this.onAuthSuccess) this.onAuthSuccess();
    } else {
      console.error('❌ Authentication failed');
      if (this.onAuthFailure) this.onAuthFailure('Authentication denied');
    }
  }

  createMessageSigner() {
    return async (payload) => {
      const message = JSON.stringify(payload);
      const digestHex = id(message);
      const messageBytes = getBytes(digestHex);
      const signature = this.sessionWallet.signingKey.sign(messageBytes);
      return signature.serialized;
    };
  }

  async getLedgerBalances() {
    return new Promise(async (resolve, reject) => {
      try {
        const { createGetLedgerBalancesMessage } = await import('@erc7824/nitrolite');
        const messageSigner = this.createMessageSigner();
        
        const handleBalanceMessage = (event) => {
          try {
            const message = parseAnyRPCResponse(event.data);
            if (message.method === 'get_ledger_balances') {
              console.log('💰 Balance:', message.params);
              this.ws.removeEventListener('message', handleBalanceMessage);
              resolve(message.params);
            }
          } catch (error) {}
        };
        
        this.ws.addEventListener('message', handleBalanceMessage);
        const balanceMsg = await createGetLedgerBalancesMessage(messageSigner, this.sessionWallet.address);
        this.ws.send(balanceMsg);
        
        setTimeout(() => {
          this.ws.removeEventListener('message', handleBalanceMessage);
          reject(new Error('Timeout'));
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  startKeepAlive() {
    this.keepAliveInterval = setInterval(async () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated) {
        try {
          const { createPingMessage } = await import('@erc7824/nitrolite');
          const messageSigner = this.createMessageSigner();
          const pingMsg = await createPingMessage(messageSigner);
          this.ws.send(pingMsg);
        } catch (error) {}
      }
    }, 30000);
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
  }

  disconnect() {
    this.stopKeepAlive();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isAuthenticated = false;
  }

  async createAppSession(amount, houseAddress) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🎮 Creating app session...');
        const { createAppSessionMessage } = await import('@erc7824/nitrolite');
        const messageSigner = this.createMessageSigner();
        
        const appDefinition = {
          protocol: 'yellowcasino_usdc_v1',
          participants: [this.sessionWallet.address, houseAddress],
          weights: [100, 0],
          quorum: 100,
          challenge: 0,
          nonce: Date.now(),
        };

        const allocations = [
          {
            participant: this.sessionWallet.address,
            asset: 'usdc',
            amount: amount.toString(),
          },
          {
            participant: houseAddress,
            asset: 'usdc',
            amount: '0',
          },
        ];

        console.log('📋 Session allocations:', allocations);
        
        let resolved = false;
        const handleSessionMessage = (event) => {
          if (resolved) return;
          try {
            const message = JSON.parse(event.data);
            
            if (message.res && message.res[1] === 'create_app_session') {
              resolved = true;
              this.ws.removeEventListener('message', handleSessionMessage);
              const appSessionId = message.res[2]?.[0]?.app_session_id;
              if (appSessionId) {
                localStorage.setItem('app_session_id', appSessionId);
                console.log('✅ App session created:', appSessionId);
                resolve({ app_session_id: appSessionId });
              } else {
                reject(new Error('No session ID returned'));
              }
            }
            
            if (message.res && message.res[1] === 'error') {
              resolved = true;
              this.ws.removeEventListener('message', handleSessionMessage);
              const errorMsg = message.res[2]?.[0]?.error || message.res[2]?.error || 'Unknown error';
              console.error('❌ Session error:', errorMsg);
              reject(new Error(errorMsg));
            }
          } catch (error) {}
        };
        
        const sessionMsg = await createAppSessionMessage(messageSigner, [{
          definition: appDefinition,
          allocations: allocations
        }]);
        
        console.log('📤 Sending app session request...');
        this.ws.addEventListener('message', handleSessionMessage);
        this.ws.send(sessionMsg);
        
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            this.ws.removeEventListener('message', handleSessionMessage);
            reject(new Error('Session creation timeout'));
          }
        }, 15000);
      } catch (error) {
        reject(error);
      }
    });
  }

  async closeAppSession(playerAmount, houseAmount, houseAddress) {
    return new Promise(async (resolve, reject) => {
      try {
        const appSessionId = localStorage.getItem('app_session_id');
        if (!appSessionId) throw new Error('No active session');

        const { createCloseAppSessionMessage } = await import('@erc7824/nitrolite');
        const messageSigner = this.createMessageSigner();
        
        const allocations = [
          {
            participant: this.sessionWallet.address,
            asset: 'usdc',
            amount: playerAmount.toString(),
          },
          {
            participant: houseAddress,
            asset: 'usdc',
            amount: houseAmount.toString(),
          },
        ];

        let resolved = false;
        const handleCloseMessage = (event) => {
          if (resolved) return;
          try {
            const message = JSON.parse(event.data);
            if (message.res && message.res[1] === 'close_app_session') {
              resolved = true;
              this.ws.removeEventListener('message', handleCloseMessage);
              localStorage.removeItem('app_session_id');
              console.log('✅ Session closed');
              resolve(message.res[2]?.[0] || {});
            }
            if (message.res && message.res[1] === 'error') {
              resolved = true;
              this.ws.removeEventListener('message', handleCloseMessage);
              reject(new Error(message.res[2]?.[0]?.error || 'Close error'));
            }
          } catch (error) {}
        };
        
        this.ws.addEventListener('message', handleCloseMessage);
        const closeMsg = await createCloseAppSessionMessage(messageSigner, [{
          app_session_id: appSessionId,
          allocations: allocations
        }]);
        this.ws.send(closeMsg);
        
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            this.ws.removeEventListener('message', handleCloseMessage);
            reject(new Error('Close timeout'));
          }
        }, 15000);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getHouseAddress() {
    try {
      const { createGetConfigMessage } = await import('@erc7824/nitrolite');
      const messageSigner = this.createMessageSigner();
      const configMsg = await createGetConfigMessage(messageSigner);
      this.ws.send(configMsg);
      
      return new Promise((resolve, reject) => {
        const handleConfig = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.res && message.res[1] === 'get_config') {
              this.ws.removeEventListener('message', handleConfig);
              resolve(message.res[2].broker_address);
            }
          } catch (error) {}
        };
        this.ws.addEventListener('message', handleConfig);
        setTimeout(() => {
          this.ws.removeEventListener('message', handleConfig);
          reject(new Error('Config timeout'));
        }, 10000);
      });
    } catch (error) {
      throw error;
    }
  }
}

export const yellowService = new YellowService();