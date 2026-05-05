export const CONTRACT_ADDRESS = "0xc73fdD462dA0Eb3B5d5A0648F7d0Cc171A337878";

export const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/qLzPGQ_Rij_D4bQuzKtXE";

// WARNING: For demo/personal use only — never share an app with a hardcoded private key
export const WALLET_PRIVATE_KEY = "0x7ed87eb46d1310bfa36090c0797a60973560d75f5b20ec7635f3dc1c3c61d1c0";

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
