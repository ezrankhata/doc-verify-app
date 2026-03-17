/**
 * blockchainService.js
 *  - MetaMask detection & wallet connection  
 *  - registerDocument() write transaction    
 *  - verifyDocument() read call              
 *  - getDocumentsByOwner() read call        
 *  - Transaction state tracking             
 *  - Blockchain error normalisation         
 * Depends on: ethers ^6.x  (npm install ethers)
 */

import { BrowserProvider, Contract, isAddress } from "ethers";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  SUPPORTED_CHAIN_IDS,
  CHAIN_NAMES,
} from "../constants/contractConfig";

// ─── Transaction States ──────────────────────────────────────────────
export const TX_STATE = Object.freeze({
  IDLE:      "idle",
  PENDING:   "pending",    // user asked to sign / tx submitted to mempool
  CONFIRMED: "confirmed",  // tx mined successfully
  FAILED:    "failed",     // tx reverted or user rejected
});

// ─── Custom Error Types ──────────────────────────────────────────────
export class WalletError extends Error {
  constructor(message, code) {
    super(message);
    this.name  = "WalletError";
    this.code  = code;
  }
}

export class ContractError extends Error {
  constructor(message, reason) {
    super(message);
    this.name   = "ContractError";
    this.reason = reason ?? null;
  }
}

// ─── Internal helpers ────────────────────────────────────────────────────────────

/**
 * Returns a BrowserProvider wrapping window.ethereum.
 * Throws WalletError if MetaMask is not installed.
 */
const getProvider = () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new WalletError(
      "MetaMask is not installed. Please install the MetaMask browser extension.",
      "NO_METAMASK"
    );
  }
  return new BrowserProvider(window.ethereum);
};

/**
 * Returns a Contract instance connected to the current signer.
 * @param {import("ethers").Signer} signer
 */
const getContract = (signer) => {
  if (!CONTRACT_ADDRESS) {
    throw new ContractError(
      "Contract address is not set. Ask Student 3 for the deployed address " +
      "and add it to your .env as VITE_CONTRACT_ADDRESS.",
      "NO_CONTRACT_ADDRESS"
    );
  }
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};

/**
 * Translates raw ethers/MetaMask errors into friendly ContractError or WalletError.
 * Handles the most common cases so Student 4 can display meaningful messages.
 *
 * @param {unknown} err - The raw error thrown by ethers or MetaMask
 * @returns {ContractError | WalletError}
 */
export const normaliseBlockchainError = (err) => {
  // User clicked "Reject" in MetaMask
  if (err?.code === 4001 || err?.code === "ACTION_REJECTED") {
    return new WalletError("Transaction rejected by user.", "USER_REJECTED");
  }

  // Contract reverted with a custom reason string
  const revertReason =
    err?.reason ||
    err?.data?.message ||
    err?.error?.message ||
    "";

  if (revertReason.includes("already registered") || revertReason.includes("duplicate")) {
    return new ContractError(
      "This document has already been registered on-chain.",
      "DUPLICATE_HASH"
    );
  }

  if (revertReason.includes("not found") || revertReason.includes("not registered")) {
    return new ContractError(
      "No on-chain record found for this document.",
      "NOT_FOUND"
    );
  }

  if (err?.code === "INSUFFICIENT_FUNDS") {
    return new WalletError(
      "Insufficient ETH balance to pay gas. Top up your wallet and try again.",
      "INSUFFICIENT_FUNDS"
    );
  }

  if (err?.code === "NETWORK_ERROR" || err?.code === "UNKNOWN_ERROR") {
    return new WalletError(
      "Network error. Check that your local blockchain node is running.",
      "NETWORK_ERROR"
    );
  }

  // Fallback
  return new ContractError(
    err?.message || "An unexpected blockchain error occurred.",
    "UNKNOWN"
  );
};

// ─── Public API ──────────────────────────────────────────────────────────────────

/**
 * connectWallet()
 *
 * Requests MetaMask account access, validates the active network, and returns
 * the connected wallet address plus a signer.
 *
 * @returns {Promise<{ address: string, signer: import("ethers").Signer,
 *                     chainId: number, chainName: string }>}
 */
export const connectWallet = async () => {
  const provider = getProvider();

  // Prompt the user to unlock MetaMask and grant access
  let accounts;
  try {
    accounts = await provider.send("eth_requestAccounts", []);
  } catch (err) {
    throw normaliseBlockchainError(err);
  }

  if (!accounts || accounts.length === 0) {
    throw new WalletError("No accounts returned by MetaMask.", "NO_ACCOUNTS");
  }

  const signer  = await provider.getSigner();
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  // Warn (but don't block) if the user is on an unexpected network
  const chainName = CHAIN_NAMES[chainId] ?? `Unknown Network (chainId: ${chainId})`;

  return {
    address: await signer.getAddress(),
    signer,
    chainId,
    chainName,
    isSupported: Object.values(SUPPORTED_CHAIN_IDS).includes(chainId),
  };
};

/**
 * Requests the currently connected accounts WITHOUT prompting MetaMask.
 * Useful for silently restoring a session on page load.
 *
 * @returns {Promise<string | null>} wallet address or null if not connected
 */
export const getConnectedAccount = async () => {
  if (!window.ethereum) return null;
  try {
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []);
    return accounts.length > 0 ? accounts[0] : null;
  } catch {
    return null;
  }
};

/**
 * registerDocument()
 *
 * Sends a state-changing transaction to DocumentRegistry.registerDocument().
 * Calls onStateChange(TX_STATE.*) at each lifecycle stage so Student 4 can update the UI in real time.

 * @param {string}   hash            - "0x"-prefixed SHA-256 bytes32 hash
 * @param {import("ethers").Signer} signer
 * @param {Function} [onStateChange] - optional callback (txState: string) => void
 * @returns {Promise<import("ethers").TransactionReceipt>}
 */
export const registerDocument = async (hash, signer, onStateChange = () => {}) => {
  if (!hash) throw new ContractError("Document hash is required.", "MISSING_HASH");

  const contract = getContract(signer);

  try {
    // 1. Ask user to sign & submit transaction
    onStateChange(TX_STATE.PENDING);
    const tx = await contract.registerDocument(hash);

    // 2. Wait for the tx to be mined (1 confirmation)
    const receipt = await tx.wait(1);

    onStateChange(TX_STATE.CONFIRMED);
    return receipt;
  } catch (err) {
    onStateChange(TX_STATE.FAILED);
    throw normaliseBlockchainError(err);
  }
};

/**
 * verifyDocument()
 *
 * Calls DocumentRegistry.verifyDocument() as a read (no gas cost).
 * Returns the owner address and registration timestamp, or throws
 * ContractError with reason "NOT_FOUND" if unregistered.
 *
 * @param {string}   hash    - "0x"-prefixed bytes32 hash
 * @param {import("ethers").Provider | import("ethers").Signer} providerOrSigner
 * @returns {Promise<{ owner: string, timestamp: Date, rawTimestamp: bigint }>}
 */
export const verifyDocument = async (hash, providerOrSigner) => {
  if (!hash) throw new ContractError("Document hash is required.", "MISSING_HASH");

  // Read calls can use a provider (no signer needed)
  const provider = getProvider();
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  try {
    const [owner, rawTimestamp] = await contract.verifyDocument(hash);

    // Zero address means "not found" in many contract implementations
    if (owner === "0x0000000000000000000000000000000000000000" || owner === "") {
      throw new ContractError(
        "No on-chain record found for this document.",
        "NOT_FOUND"
      );
    }

    return {
      owner,
      timestamp:    new Date(Number(rawTimestamp) * 1000), // Unix → JS Date
      rawTimestamp,
    };
  } catch (err) {
    if (err instanceof ContractError) throw err;
    throw normaliseBlockchainError(err);
  }
};

/**
 * getDocumentsByOwner()
 *
 * Fetches all document hashes registered by a given wallet address.
 * Returns an array of "0x"-prefixed bytes32 hex strings.
 *
 * @param {string} ownerAddress - Ethereum wallet address
 * @returns {Promise<string[]>}
 */
export const getDocumentsByOwner = async (ownerAddress) => {
  if (!isAddress(ownerAddress)) {
    throw new WalletError("Invalid Ethereum address.", "INVALID_ADDRESS");
  }

  const provider = getProvider();
  const contract  = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  try {
    const hashes = await contract.getDocumentsByOwner(ownerAddress);
    // ethers v6 returns an array of bytes32 strings already hex-encoded
    return Array.from(hashes);
  } catch (err) {
    throw normaliseBlockchainError(err);
  }
};

/**
 * Registers listeners for MetaMask account and chain changes.
 * Student 4 should call this once and use the returned cleanup function.
 *
 * @param {{ onAccountsChanged: (accounts: string[]) => void,
 *            onChainChanged:    (chainId: string)   => void }} callbacks
 * @returns {Function} cleanup — call on component unmount
 */
export const subscribeToWalletEvents = ({ onAccountsChanged, onChainChanged }) => {
  if (!window.ethereum) return () => {};

  window.ethereum.on("accountsChanged", onAccountsChanged);
  window.ethereum.on("chainChanged",    onChainChanged);

  return () => {
    window.ethereum.removeListener("accountsChanged", onAccountsChanged);
    window.ethereum.removeListener("chainChanged",    onChainChanged);
  };
};
