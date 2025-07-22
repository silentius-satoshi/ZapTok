// React hook for managing Cashu eCash wallets
import { useState, useCallback, useRef } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CashuClient, parseCashuToken, serializeCashuToken, calculateProofsAmount, isValidMintUrl } from '@/lib/cashu-client';
import { 
  CashuMint, 
  Proof, 
  CASHU_MINTS 
} from '@/lib/cashu-types';

export interface CashuWalletConnection {
  id: string;
  mint: CashuMint;
  alias: string;
  proofs: Proof[];
  balance: number;
  isConnected: boolean;
  lastSeen?: number;
}

export function useCashu() {
  const [wallets, setWallets] = useLocalStorage<CashuWalletConnection[]>('cashu-wallets', []);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [activeWallet, setActiveWallet] = useLocalStorage<string | null>('cashu-active-wallet', null);
  
  const clientsRef = useRef<Map<string, CashuClient>>(new Map());

  // Get Cashu client for a wallet
  const getClient = useCallback((walletId: string): CashuClient | null => {
    if (clientsRef.current.has(walletId)) {
      return clientsRef.current.get(walletId)!;
    }

    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) return null;

    const client = new CashuClient(wallet.mint);
    clientsRef.current.set(walletId, client);
    return client;
  }, [wallets]);

  // Add a new mint/wallet
  const addMint = useCallback(async (mintUrl: string, alias?: string): Promise<string> => {
    if (!isValidMintUrl(mintUrl)) {
      throw new Error('Invalid mint URL');
    }

    setIsConnecting('new');
    
    try {
      const mint: CashuMint = {
        url: mintUrl,
        alias: alias || mintUrl,
      };

      const client = new CashuClient(mint);
      
      // Test connection and get mint info
      const mintInfo = await client.getMintInfo();
      mint.info = mintInfo;

      const id = Date.now().toString();
      const wallet: CashuWalletConnection = {
        id,
        mint,
        alias: alias || mintInfo.name || 'Cashu Wallet',
        proofs: [],
        balance: 0,
        isConnected: true,
        lastSeen: Date.now(),
      };

      setWallets(prev => [...prev, wallet]);
      
      // Store client
      clientsRef.current.set(id, client);
      
      // Set as active if it's the first wallet
      if (wallets.length === 0) {
        setActiveWallet(id);
      }

      return id;
    } catch (error) {
      console.error('Failed to add Cashu mint:', error);
      throw error;
    } finally {
      setIsConnecting(null);
    }
  }, [wallets, setWallets, setActiveWallet]);

  // Add a well-known mint
  const addWellKnownMint = useCallback(async (mintKey: keyof typeof CASHU_MINTS): Promise<string> => {
    const mintUrl = CASHU_MINTS[mintKey];
    let alias: string;
    
    switch (mintKey) {
      case 'MINIBITS':
        alias = 'Minibits';
        break;
      case 'LNBITS_LEGEND':
        alias = 'LNbits Legend';
        break;
      case 'CASHU_ME':
        alias = 'Cashu.me';
        break;
      default:
        alias = 'Cashu Mint';
    }

    return addMint(mintUrl, alias);
  }, [addMint]);

  // Create a new wallet with NIP-60 integration
  const createWallet = useCallback(async (params: { 
    name: string; 
    mintUrl: string; 
  }): Promise<string> => {
    if (!isValidMintUrl(params.mintUrl)) {
      throw new Error('Invalid mint URL');
    }

    setIsConnecting('new');
    
    try {
      const mint: CashuMint = {
        url: params.mintUrl,
        alias: params.name,
      };

      const client = new CashuClient(mint);
      
      // Test connection and get mint info
      const mintInfo = await client.getMintInfo();
      mint.info = mintInfo;

      const id = crypto.randomUUID();
      const wallet: CashuWalletConnection = {
        id,
        mint,
        alias: params.name,
        proofs: [],
        balance: 0,
        isConnected: true,
        lastSeen: Date.now(),
      };

      setWallets(prev => [...prev, wallet]);
      
      // Store client
      clientsRef.current.set(id, client);
      
      // Set as active if it's the first wallet
      if (wallets.length === 0) {
        setActiveWallet(id);
      }

      // TODO: Create NIP-60 encrypted event for wallet backup
      // This would require useCurrentUser and useNostrPublish integration
      
      return id;
    } catch (error) {
      console.error('Failed to create Cashu wallet:', error);
      throw error;
    } finally {
      setIsConnecting(null);
    }
  }, [wallets, setWallets, setActiveWallet]);

  // Remove a wallet
  const removeWallet = useCallback((walletId: string) => {
    setWallets(prev => prev.filter(w => w.id !== walletId));
    clientsRef.current.delete(walletId);
    
    // Reset active wallet if removed
    if (activeWallet === walletId) {
      const remaining = wallets.filter(w => w.id !== walletId);
      setActiveWallet(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [wallets, activeWallet, setWallets, setActiveWallet]);

  // Test connection status
  const testConnection = useCallback(async (walletId: string): Promise<boolean> => {
    const client = getClient(walletId);
    if (!client) return false;

    try {
      const isConnected = await client.testConnection();
      
      // Update connection status
      setWallets(prev => prev.map(w => 
        w.id === walletId 
          ? { ...w, isConnected, lastSeen: Date.now() }
          : w
      ));

      return isConnected;
    } catch (error) {
      console.error('Connection test failed:', error);
      
      // Mark as disconnected
      setWallets(prev => prev.map(w => 
        w.id === walletId 
          ? { ...w, isConnected: false }
          : w
      ));

      return false;
    }
  }, [getClient, setWallets]);

  // Receive Cashu tokens
  const receiveTokens = useCallback(async (tokenString: string): Promise<void> => {
    if (!activeWallet) {
      throw new Error('No active Cashu wallet');
    }

    try {
      const token = parseCashuToken(tokenString);
      
      // Find or create wallet for each mint in the token
      for (const tokenMint of token.token) {
        let wallet = wallets.find(w => w.mint.url === tokenMint.mint);
        
        if (!wallet) {
          // Create new wallet for this mint
          const walletId = await addMint(tokenMint.mint, `Received from ${tokenMint.mint}`);
          wallet = wallets.find(w => w.id === walletId)!;
        }

        // Add proofs to the wallet
        const newProofs = [...wallet.proofs, ...tokenMint.proofs];
        const newBalance = calculateProofsAmount(newProofs);

        setWallets(prev => prev.map(w => 
          w.id === wallet!.id 
            ? { ...w, proofs: newProofs, balance: newBalance }
            : w
        ));
      }
    } catch (error) {
      console.error('Failed to receive tokens:', error);
      throw error;
    }
  }, [activeWallet, wallets, addMint, setWallets]);

  // Send Cashu tokens
  const sendTokens = useCallback(async (amount: number, memo?: string): Promise<string> => {
    if (!activeWallet) {
      throw new Error('No active Cashu wallet');
    }

    const wallet = wallets.find(w => w.id === activeWallet);
    if (!wallet) {
      throw new Error('Active wallet not found');
    }

    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const client = getClient(activeWallet);
    if (!client) {
      throw new Error('Cashu client not available');
    }

    try {
      // Select proofs to spend (simple selection - in production, use more sophisticated algorithm)
      const selectedProofs: Proof[] = [];
      let selectedAmount = 0;

      for (const proof of wallet.proofs) {
        selectedProofs.push(proof);
        selectedAmount += proof.amount;
        
        if (selectedAmount >= amount) {
          break;
        }
      }

      if (selectedAmount < amount) {
        throw new Error('Not enough proofs available');
      }

      // If we need change, create outputs for change
      const _changeAmount = selectedAmount - amount;
      const _outputs = []; // In production, create blinded outputs for change and send amount

      // For now, just create a token with the selected proofs
      const token = {
        token: [{
          mint: wallet.mint.url,
          proofs: selectedProofs.slice(0, Math.ceil(selectedProofs.length * (amount / selectedAmount))),
        }],
        memo,
      };

      // Remove spent proofs from wallet (simplified)
      const remainingProofs = wallet.proofs.filter(p => 
        !token.token[0].proofs.some(tp => tp.secret === p.secret)
      );

      setWallets(prev => prev.map(w => 
        w.id === activeWallet 
          ? { 
              ...w, 
              proofs: remainingProofs, 
              balance: calculateProofsAmount(remainingProofs)
            }
          : w
      ));

      return serializeCashuToken(token);
    } catch (error) {
      console.error('Failed to send tokens:', error);
      throw error;
    }
  }, [activeWallet, wallets, getClient, setWallets]);

  // Pay Lightning invoice with Cashu
  const payInvoice = useCallback(async (invoice: string): Promise<{ success: boolean; preimage?: string }> => {
    if (!activeWallet) {
      throw new Error('No active Cashu wallet');
    }

    const wallet = wallets.find(w => w.id === activeWallet);
    if (!wallet) {
      throw new Error('Active wallet not found');
    }

    const client = getClient(activeWallet);
    if (!client) {
      throw new Error('Cashu client not available');
    }

    try {
      // Request melt quote
      const quote = await client.requestMeltQuote(invoice);
      
      if (wallet.balance < quote.amount + quote.fee_reserve) {
        throw new Error('Insufficient balance for payment');
      }

      // Select proofs to spend
      const selectedProofs: Proof[] = [];
      let selectedAmount = 0;
      const requiredAmount = quote.amount + quote.fee_reserve;

      for (const proof of wallet.proofs) {
        selectedProofs.push(proof);
        selectedAmount += proof.amount;
        
        if (selectedAmount >= requiredAmount) {
          break;
        }
      }

      // Melt the tokens
      const result = await client.meltTokens(quote.quote, selectedProofs);

      // Update wallet balance (remove spent proofs)
      const spentSecrets = selectedProofs.map(p => p.secret);
      const remainingProofs = wallet.proofs.filter(p => !spentSecrets.includes(p.secret));

      setWallets(prev => prev.map(w => 
        w.id === activeWallet 
          ? { 
              ...w, 
              proofs: remainingProofs, 
              balance: calculateProofsAmount(remainingProofs)
            }
          : w
      ));

      return {
        success: true,
        preimage: result.payment_preimage,
      };
    } catch (error) {
      console.error('Failed to pay invoice:', error);
      throw error;
    }
  }, [activeWallet, wallets, getClient, setWallets]);

  // Create Lightning invoice (mint tokens)
  const createInvoice = useCallback(async (amount: number): Promise<{ invoice: string; quote: string }> => {
    if (!activeWallet) {
      throw new Error('No active Cashu wallet');
    }

    const client = getClient(activeWallet);
    if (!client) {
      throw new Error('Cashu client not available');
    }

    try {
      const quote = await client.requestMintQuote(amount);
      
      return {
        invoice: quote.request,
        quote: quote.quote,
      };
    } catch (error) {
      console.error('Failed to create invoice:', error);
      throw error;
    }
  }, [activeWallet, getClient]);

  // Check if invoice is paid and mint tokens
  const checkAndMintTokens = useCallback(async (quote: string): Promise<boolean> => {
    if (!activeWallet) {
      throw new Error('No active Cashu wallet');
    }

    const client = getClient(activeWallet);
    if (!client) {
      throw new Error('Cashu client not available');
    }

    try {
      const quoteStatus = await client.checkMintQuote(quote);
      
      if (quoteStatus.paid) {
        // TODO: Implement actual minting with blind signatures
        // For now, just mark as successful
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to check and mint tokens:', error);
      throw error;
    }
  }, [activeWallet, getClient]);

  // Refresh wallet balance
  const refreshWallet = useCallback(async (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) return;

    const client = getClient(walletId);
    if (!client) return;

    try {
      // Check which proofs are still valid
      const secrets = wallet.proofs.map(p => p.secret);
      const spentCheck = await client.checkSpentTokens(secrets);
      
      const validProofs = wallet.proofs.filter((proof, index) => !spentCheck.spent[index]);
      const newBalance = calculateProofsAmount(validProofs);

      setWallets(prev => prev.map(w => 
        w.id === walletId 
          ? { 
              ...w, 
              proofs: validProofs, 
              balance: newBalance,
              isConnected: true,
              lastSeen: Date.now()
            }
          : w
      ));
    } catch (error) {
      console.error('Failed to refresh wallet:', error);
      
      setWallets(prev => prev.map(w => 
        w.id === walletId 
          ? { ...w, isConnected: false }
          : w
      ));
    }
  }, [wallets, getClient, setWallets]);

  // Get current wallet info
  const currentWallet = wallets.find(w => w.id === activeWallet) || null;
  const currentBalance = currentWallet?.balance || 0;
  const isConnected = currentWallet?.isConnected || false;

  return {
    // Wallet management
    wallets,
    activeWallet,
    currentWallet,
    setActiveWallet,
    addMint,
    addWellKnownMint,
    createWallet,
    removeWallet,
    testConnection,
    refreshWallet,
    
    // Token operations
    receiveTokens,
    sendTokens,
    
    // Lightning operations
    payInvoice,
    createInvoice,
    checkAndMintTokens,
    
    // State
    isConnecting,
    currentBalance,
    isConnected,
  };
}
