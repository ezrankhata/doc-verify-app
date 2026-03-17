import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DocumentRegistryModule = buildModule("DocumentRegistryModule", (m) => {
  const registry = m.contract("DocumentRegistry");
  return { registry };
});

export default DocumentRegistryModule;
