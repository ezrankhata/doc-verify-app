const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DocumentRegistry", function () {
  let registry;
  let owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
    registry = await DocumentRegistry.deploy();
    await registry.waitForDeployment();
  });

  it("Should register a document and emit event", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("test document"));
    await expect(registry.registerDocument(hash))
      .to.emit(registry, "DocumentRegistered")
      .withArgs(hash, owner.address, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
  });

  it("Should verify a registered document", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("test document"));
    await registry.registerDocument(hash);

    const [docOwner, timestamp] = await registry.verifyDocument(hash);
    expect(docOwner).to.equal(owner.address);
    expect(timestamp).to.be.gt(0);
  });

  it("Should revert when verifying an unregistered document", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("not registered"));
    await expect(registry.verifyDocument(hash))
      .to.be.revertedWith("Document not found");
  });

  it("Should prevent duplicate registration", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("duplicate"));
    await registry.registerDocument(hash);
    await expect(registry.registerDocument(hash))
      .to.be.revertedWith("Document already registered");
  });

  it("Should return all documents registered by an owner", async function () {
    const hash1 = ethers.keccak256(ethers.toUtf8Bytes("doc one"));
    const hash2 = ethers.keccak256(ethers.toUtf8Bytes("doc two"));

    await registry.registerDocument(hash1);
    await registry.registerDocument(hash2);

    const docs = await registry.getDocumentsByOwner(owner.address);
    expect(docs.length).to.equal(2);
    expect(docs[0]).to.equal(hash1);
    expect(docs[1]).to.equal(hash2);
  });

  it("Should isolate documents per wallet", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("wallet isolation"));
    await registry.connect(other).registerDocument(hash);

    const ownerDocs = await registry.getDocumentsByOwner(owner.address);
    const otherDocs = await registry.getDocumentsByOwner(other.address);

    expect(ownerDocs.length).to.equal(0);
    expect(otherDocs.length).to.equal(1);
  });
});
