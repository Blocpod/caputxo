import assert from "node:assert/strict";
import test from "node:test";
import { domainHash, signReceipt, verifyProtocolObject } from "../server/protocol.mjs";

function evaluateAccess({ asset, policy, requester }) {
  const ok = asset.owner === requester && asset.status === "Active" && policy.state === "Active";
  return {
    ok,
    reason: ok ? "Current owner matches capability state." : "Requester, policy, or asset status is not eligible.",
  };
}

function finalizeTransfer(asset, transfer) {
  return {
    ...asset,
    owner: transfer.to,
    ownerKey: transfer.to === "Bob" ? "02bb...2222" : "03aa...1111",
    epoch: asset.epoch + 1,
    outpoint: `${domainHash("CapUTXO.transferOutpoint.v1", { id: transfer.id, epoch: asset.epoch + 1 }).slice(0, 12)}...:1`,
  };
}

test("signed receipts verify and tampering fails", async () => {
  const receipt = await signReceipt({
    kind: "Access Granted",
    assetId: "asset-design-spec",
    subject: "Bob",
    ok: true,
    policy: "CONTROLLED_VIEWER_MVP",
    trace: "owner=current, epoch=1",
  });

  assert.equal(verifyProtocolObject(receipt).ok, true);
  assert.equal(verifyProtocolObject({ ...receipt, payload: { ...receipt.payload, subject: "Alice" } }).reason, "hash_mismatch");
  assert.equal(verifyProtocolObject({ ...receipt, signatureHex: "00".repeat(64) }).reason, "bad_signature");
});

test("stale owner is denied after transfer finalization", () => {
  const asset0 = { owner: "Alice", ownerKey: "03aa...1111", epoch: 0, status: "Active" };
  const asset1 = finalizeTransfer(asset0, { id: "xfer_test", to: "Bob" });
  const policy = { state: "Active" };

  assert.equal(asset1.owner, "Bob");
  assert.equal(asset1.epoch, 1);
  assert.equal(evaluateAccess({ asset: asset1, policy, requester: "Alice" }).ok, false);
  assert.equal(evaluateAccess({ asset: asset1, policy, requester: "Bob" }).ok, true);
});

test("frozen assets and paused policies deny access", () => {
  const activeAsset = { owner: "Bob", status: "Active" };
  const frozenAsset = { owner: "Bob", status: "Frozen" };
  const activePolicy = { state: "Active" };
  const pausedPolicy = { state: "Paused" };

  assert.equal(evaluateAccess({ asset: activeAsset, policy: activePolicy, requester: "Bob" }).ok, true);
  assert.equal(evaluateAccess({ asset: frozenAsset, policy: activePolicy, requester: "Bob" }).ok, false);
  assert.equal(evaluateAccess({ asset: activeAsset, policy: pausedPolicy, requester: "Bob" }).ok, false);
});

test("currentness validation rejects incomplete outpoint requests", async () => {
  const { fetchUtxoCurrentness } = await import("../server/bsv.mjs");
  assert.deepEqual(await fetchUtxoCurrentness({ txid: "", vout: 0 }), { ok: false, reason: "txid_and_vout_required" });
  assert.deepEqual(await fetchUtxoCurrentness({ txid: "abc", vout: 1.1 }), { ok: false, reason: "txid_and_vout_required" });
});
