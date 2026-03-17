/**
 * BlockchainContext.jsx
 * Combines useWallet + useDocument into a single React Context so that
 * Student 4 can access wallet state and document operations anywhere in the component tree without prop drilling.
 *
 * Setup (Student 4 adds this once in main.jsx / App.jsx) 
 *
 *   import { BlockchainProvider } from "./context/BlockchainContext";
 *
 *   <BlockchainProvider>
 *     <App />
 *   </BlockchainProvider>
 *
 * Consuming (Student 4 uses this in any component) 
 *
 *   import { useBlockchain } from "./context/BlockchainContext";
 *
 *   const {
 *     // Wallet
 *     address, isConnected, isConnecting, chainName, isSupported,
 *     hasMetaMask, connect, disconnect, walletError,
 *
 *     // Document
 *     selectedFile, hash, isHashing, selectFile, clearFile,
 *     txState, txReceipt, register, TX_STATE,
 *     verifyResult, isVerifying, verified, verify,
 *     ownerDocs, isFetching, fetchOwnerDocs,
 *     docError, clearDocError,
 *   } = useBlockchain();
 */

import { createContext, useContext, useEffect } from "react";
import useWallet   from "../hooks/useWallet";
import useDocument from "../hooks/useDocument";

// Context 
const BlockchainContext = createContext(null);

//  Provider 
export const BlockchainProvider = ({ children }) => {
  const wallet   = useWallet();
  const document = useDocument(wallet.signer);

  // Automatically refresh the owner's document list after a successful registration
  useEffect(() => {
    if (
      wallet.isConnected &&
      wallet.address &&
      document.txState === document.TX_STATE.CONFIRMED
    ) {
      document.fetchOwnerDocs(wallet.address);
    }
  }, [document.txState, wallet.address, wallet.isConnected]);

  const value = {
    // ── Wallet (from useWallet) 
    address:      wallet.address,
    signer:       wallet.signer,
    chainId:      wallet.chainId,
    chainName:    wallet.chainName,
    isConnected:  wallet.isConnected,
    isConnecting: wallet.isConnecting,
    isSupported:  wallet.isSupported,
    hasMetaMask:  wallet.hasMetaMask,
    connect:      wallet.connect,
    disconnect:   wallet.disconnect,
    walletError:  wallet.error,

    // ── Document (from useDocument) 
    selectedFile:  document.selectedFile,
    hash:          document.hash,
    isHashing:     document.isHashing,
    selectFile:    document.selectFile,
    clearFile:     document.clearFile,

    txState:       document.txState,
    txReceipt:     document.txReceipt,
    register:      document.register,
    TX_STATE:      document.TX_STATE,

    verifyResult:  document.verifyResult,
    isVerifying:   document.isVerifying,
    verified:      document.verified,
    verify:        document.verify,

    ownerDocs:     document.ownerDocs,
    isFetching:    document.isFetching,
    fetchOwnerDocs: document.fetchOwnerDocs,

    docError:      document.error,
    clearDocError: document.clearError,
  };

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
};

// Consumer hook 
export const useBlockchain = () => {
  const ctx = useContext(BlockchainContext);
  if (!ctx) {
    throw new Error(
      "useBlockchain must be used inside <BlockchainProvider>. " +
      "Wrap your App (or main.jsx) with <BlockchainProvider>."
    );
  }
  return ctx;
};

export default BlockchainContext;
