const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Network:", hre.network.name);

  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const registry = await DocumentRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();

  console.log("─────────────────────────────────────────────");
  console.log("DocumentRegistry deployed to:", address);
  console.log("Network:                      ", hre.network.name);
  console.log("─────────────────────────────────────────────");

  // Write address to frontend/.env automatically
  const envPath = path.join(__dirname, "../frontend/.env");
  const envLine = `VITE_CONTRACT_ADDRESS=${address}\n`;

  if (fs.existsSync(envPath)) {
    let content = fs.readFileSync(envPath, "utf8");
    if (content.includes("VITE_CONTRACT_ADDRESS=")) {
      content = content.replace(/VITE_CONTRACT_ADDRESS=.*/g, `VITE_CONTRACT_ADDRESS=${address}`);
    } else {
      content += envLine;
    }
    fs.writeFileSync(envPath, content);
  } else {
    fs.writeFileSync(envPath, envLine);
  }

  console.log(`Contract address written to frontend/.env`);
  console.log("You can now start the frontend: cd frontend && npm run dev");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
