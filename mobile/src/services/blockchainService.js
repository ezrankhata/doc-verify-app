import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, RPC_URL, WALLET_PRIVATE_KEY } from '../constants/contractConfig';

// Provider — read-only connection to Sepolia
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Signer wallet — hardcoded for demo use
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

// Read-only contract (for verify and getDocuments)
const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

// Write contract (for register)
const writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

/**
 * Register a document hash on the blockchain.
 * Returns { success, txHash } or throws an error.
 */
export const registerDocument = async (hash) => {
  try {
    const tx = await writeContract.registerDocument(hash);
    await tx.wait(1);
    return { success: true, txHash: tx.hash };
  } catch (err) {
    const msg = err?.reason || err?.message || 'Transaction failed';
    if (msg.includes('already registered') || msg.includes('Document already')) {
      throw new Error('This document is already registered on the blockchain.');
    }
    throw new Error(msg);
  }
};

/**
 * Verify a document hash on the blockchain.
 * Returns { found, owner, registeredAt } or { found: false }
 */
export const verifyDocument = async (hash) => {
  try {
    const [owner, rawTimestamp] = await readContract.verifyDocument(hash);
    const ZERO = '0x0000000000000000000000000000000000000000';
    if (owner === ZERO) {
      return { found: false };
    }
    return {
      found: true,
      owner,
      registeredAt: new Date(Number(rawTimestamp) * 1000).toLocaleString(),
    };
  } catch (err) {
    return { found: false };
  }
};

/**
 * Get all document hashes registered by the hardcoded wallet.
 */
export const getMyDocuments = async () => {
  try {
    const hashes = await readContract.getDocumentsByOwner(wallet.address);
    return Array.from(hashes);
  } catch (err) {
    return [];
  }
};

/**
 * Returns the wallet address being used.
 */
export const getWalletAddress = () => wallet.address;
