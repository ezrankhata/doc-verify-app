/**
 * useWallet.js
 * Student 2 — Task 4.9 (hook for Student 4) | builds on 4.1, 4.2
 *
 * Manages MetaMask wallet connection state inside React.
 * Exposes everything Student 4 needs to render wallet UI.
 *
 * Usage (Student 4):
 *   import { useWallet } from "../hooks/useWallet";
 *   const { address, chainName, isConnected, isConnecting,
 *           connect, disconnect, error } = useWallet();
 */

import { useState, useEffect, useCallback } from "react";
import {
  connectWallet,
  getConnectedAccount,
  subscribeToWalletEvents,
  WalletError,
} from "../services/blockchainService";

/**
 * @typedef {Object} WalletState
 * @property {string|null}  address       - Connected wallet address (or null)
 * @property {number|null}  chainId       - Current network chain ID
 * @property {string|null}  chainName     - Human-readable network name
 * @property {boolean}      isConnected   - True when a wallet is connected
 * @property {boolean}      isConnecting  - True while the connection is in progress
 * @property {boolean}      isSupported   - True if the active network is supported
 * @property {boolean}      hasMetaMask   - True if MetaMask extension is detected
 * @property {string|null}  error         - Last error message (or null)
 * @property {import("ethers").Signer|null} signer - ethers Signer (pass to service fns)
 * @property {Function}     connect       - () => Promise<void>  — trigger wallet connect
 * @property {Function}     disconnect    - () => void           — clear local state
 */

/**
 * @returns {WalletState}
 */
const useWallet = () => {
  const [address,      setAddress]      = useState(null);
  const [signer,       setSigner]       = useState(null);
  const [chainId,      setChainId]      = useState(null);
  const [chainName,    setChainName]    = useState(null);
  const [isSupported,  setIsSupported]  = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error,        setError]        = useState(null);

  const hasMetaMask = typeof window !== "undefined" && Boolean(window.ethereum);

  // ── Attempt to silently restore session on mount ────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const saved = await getConnectedAccount();
      if (saved) {
        // Silently reconnect without opening the MetaMask popup
        try {
          const result = await connectWallet();
          applyWalletResult(result);
        } catch {
          // Silent failure — user will click Connect manually
        }
      }
    };
    restoreSession();
  }, []);

  // ── Subscribe to MetaMask events ─────────────────────────────────────────────
  useEffect(() => {
    const cleanup = subscribeToWalletEvents({
      onAccountsChanged: (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAddress(accounts[0]);
        }
      },
      onChainChanged: () => {
        // MetaMask recommends a full page reload on chain change
        window.location.reload();
      },
    });
    return cleanup;
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const applyWalletResult = ({ address, signer, chainId, chainName, isSupported }) => {
    setAddress(address);
    setSigner(signer);
    setChainId(chainId);
    setChainName(chainName);
    setIsSupported(isSupported);
    setError(null);
  };

  // ── Public actions ───────────────────────────────────────────────────────────

  /** Trigger MetaMask connection popup */
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const result = await connectWallet();
      applyWalletResult(result);
    } catch (err) {
      setError(err instanceof WalletError ? err.message : "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /** Clear wallet state (does NOT lock MetaMask — that's intentional) */
  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setChainId(null);
    setChainName(null);
    setIsSupported(false);
    setError(null);
  }, []);

  return {
    address,
    signer,
    chainId,
    chainName,
    isConnected:  Boolean(address),
    isConnecting,
    isSupported,
    hasMetaMask,
    error,
    connect,
    disconnect,
  };
};

export default useWallet;
