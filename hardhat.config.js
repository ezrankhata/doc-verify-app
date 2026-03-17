require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // Run: npx hardhat node  (starts on port 8545, chainId 31337)
    localhost: {
      url: "http://127.0.0.1:8546",
    },
    // Allows teammates on the same WiFi to connect
    hardhatLAN: {
      url: "http://0.0.0.0:8545",
    },
    // Ganache GUI: port 7545 | CLI: port 8545
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
    },
    // Sepolia testnet
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.SEPOLIA_PRIVATE_KEY
        ? [process.env.SEPOLIA_PRIVATE_KEY]
        : [],
    },
  },
};
