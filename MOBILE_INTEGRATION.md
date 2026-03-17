# DocVerify — React Native Integration Guide

## Overview
The smart contract is deployed on the Ethereum Sepolia testnet.
Your React Native app talks directly to the blockchain using **ethers.js** — no custom backend server needed.

---

## Contract Details

| Item | Value |
|------|-------|
| Contract Address | `0xc73fdD462dA0Eb3B5d5A0648F7d0Cc171A337878` |
| Network | Ethereum Sepolia Testnet |
| Chain ID | `11155111` |
| RPC URL | `https://eth-sepolia.g.alchemy.com/v2/qLzPGQ_Rij_D4bQuzKtXE` |
| Block Explorer | https://sepolia.etherscan.io/address/0xc73fdD462dA0Eb3B5d5A0648F7d0Cc171A337878 |

---

## Install Dependencies

```bash
npm install ethers
npm install react-native-get-random-values
npm install @ethersproject/shims
```

Add this at the very top of your `index.js` (before anything else):

```js
import 'react-native-get-random-values';
import '@ethersproject/shims';
```

---

## Contract ABI

Copy this exactly into your project (e.g. `src/constants/contractABI.js`):

```js
export const CONTRACT_ADDRESS = "0xc73fdD462dA0Eb3B5d5A0648F7d0Cc171A337878";

export const CONTRACT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "bytes32", name: "hash",      type: "bytes32" },
      { indexed: true,  internalType: "address", name: "owner",     type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "DocumentRegistered",
    type: "event",
  },
  {
    inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
    name: "registerDocument",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
    name: "verifyDocument",
    outputs: [
      { internalType: "address", name: "owner",     type: "address" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "getDocumentsByOwner",
    outputs: [{ internalType: "bytes32[]", name: "", type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
];
```

---

## Setting Up the Provider

```js
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contractABI";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/qLzPGQ_Rij_D4bQuzKtXE";

// Read-only provider (for verify — no wallet needed)
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Read-only contract instance
const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
```

---

## Hashing a Document (SHA-256)

The hash must be computed from the file bytes before registering or verifying.

```js
import * as Crypto from 'expo-crypto'; // if using Expo
// OR use react-native-sha256 if not using Expo

// Using Expo:
const hashDocument = async (fileBytes) => {
  const hashHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    fileBytes,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return "0x" + hashHex; // must be 0x-prefixed
};
```

---

## Verifying a Document (Read — No Wallet Needed)

```js
const verifyDocument = async (hash) => {
  try {
    const [owner, rawTimestamp] = await readContract.verifyDocument(hash);

    if (owner === "0x0000000000000000000000000000000000000000") {
      return { found: false };
    }

    return {
      found: true,
      owner,
      registeredAt: new Date(Number(rawTimestamp) * 1000).toLocaleString(),
    };
  } catch (err) {
    return { found: false, error: err.message };
  }
};
```

---

## Registering a Document (Write — Wallet Required)

The user must have a wallet with Sepolia ETH to pay gas.

```js
const registerDocument = async (hash, privateKey) => {
  const wallet = new ethers.Wallet(privateKey, provider);
  const writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  try {
    const tx = await writeContract.registerDocument(hash);
    await tx.wait(1); // wait for 1 confirmation
    return { success: true, txHash: tx.hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
};
```

> **Note on wallets in mobile:** For production, integrate WalletConnect so users connect their own wallet (MetaMask Mobile, Trust Wallet, etc.) instead of storing a private key in the app.

---

## Getting All Documents by Owner

```js
const getMyDocuments = async (walletAddress) => {
  const hashes = await readContract.getDocumentsByOwner(walletAddress);
  return Array.from(hashes); // array of 0x-prefixed bytes32 strings
};
```

---

## QR Code Integration

The web app stamps a QR code on registered PDFs. The QR encodes a URL in this format:

```
https://YOUR_FRONTEND_URL/?hash=0xABC123...
```

In your mobile app, when you scan a QR code, extract the `hash` parameter and call `verifyDocument(hash)` directly.

```js
const handleQRScan = async (qrText) => {
  try {
    const url = new URL(qrText);
    const hash = url.searchParams.get("hash");
    if (hash) {
      const result = await verifyDocument(hash);
      // show result to user
    }
  } catch {
    // not a valid DocVerify QR code
  }
};
```

---

## Testing on Sepolia

1. Switch MetaMask to **Sepolia Testnet** (Chain ID: 11155111)
2. Get free Sepolia ETH from: `cloud.google.com/application/web3/faucet/ethereum/sepolia`
3. The contract is already deployed — no redeployment needed
4. Every registration and verification is visible at:
   `https://sepolia.etherscan.io/address/0xc73fdD462dA0Eb3B5d5A0648F7d0Cc171A337878`

---

## Summary of Contract Functions

| Function | Type | Gas Cost | Description |
|----------|------|----------|-------------|
| `registerDocument(bytes32 hash)` | Write | ~50,000 gas | Register a document hash on-chain |
| `verifyDocument(bytes32 hash)` | Read | Free | Returns owner address + timestamp |
| `getDocumentsByOwner(address owner)` | Read | Free | Returns all hashes registered by a wallet |

---

*Contract deployed by Ezra Nkhata — Student 3, Cryptography Assignment*
*Network: Ethereum Sepolia Testnet*
*Deployed: March 2026*
