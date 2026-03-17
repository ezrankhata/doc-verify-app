import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toHex } from "viem";

describe("DocumentRegistry", async function () {
  const { viem } = await network.connect();

  it("Should register and verify a document", async function () {
    const registry = await viem.deployContract("DocumentRegistry");

    const hash = keccak256(toHex("test document"));

    await registry.write.registerDocument([hash]);

    const [docOwner, timestamp] = await registry.read.verifyDocument([hash]) as [string, bigint];

    assert.notEqual(
      docOwner.toLowerCase(),
      "0x0000000000000000000000000000000000000000"
    );
    assert.ok(timestamp > 0n);
  });

  it("Should return documents registered by owner", async function () {
    const registry = await viem.deployContract("DocumentRegistry");
    const [walletClient] = await viem.getWalletClients();

    const hash1 = keccak256(toHex("document one"));
    const hash2 = keccak256(toHex("document two"));

    await registry.write.registerDocument([hash1]);
    await registry.write.registerDocument([hash2]);

    const docs = await registry.read.getDocumentsByOwner([walletClient.account.address]) as `0x${string}`[];

    assert.equal(docs.length, 2);
    assert.equal(docs[0], hash1);
    assert.equal(docs[1], hash2);
  });
});