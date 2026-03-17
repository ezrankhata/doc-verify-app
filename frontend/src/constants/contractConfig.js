// Contract address — set after deployment (Student 3 provides this)
// For local Hardhat node: run `npm run deploy:local` from the project root
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xc73fdD462dA0Eb3B5d5A0648F7d0Cc171A337878";

export const SUPPORTED_CHAIN_IDS = {
  SEPOLIA_TESTNET: 11155111,
};

export const CHAIN_NAMES = {
  [11155111]: "Sepolia",
};

// ABI generated from contracts/DocumentRegistry.sol
export const CONTRACT_ABI = [
  // Event
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "bytes32",  name: "hash",      type: "bytes32"  },
      { indexed: true,  internalType: "address",  name: "owner",     type: "address"  },
      { indexed: false, internalType: "uint256",  name: "timestamp", type: "uint256"  },
    ],
    name: "DocumentRegistered",
    type: "event",
  },
  // registerDocument(bytes32 hash)
  {
    inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
    name: "registerDocument",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // verifyDocument(bytes32 hash)
  {
    inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
    name: "verifyDocument",
    outputs: [
      { internalType: "address", name: "owner",     type: "address"  },
      { internalType: "uint256", name: "timestamp", type: "uint256"  },
    ],
    stateMutability: "view",
    type: "function",
  },
  // getDocumentsByOwner(address owner)
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "getDocumentsByOwner",
    outputs: [{ internalType: "bytes32[]", name: "", type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
];
