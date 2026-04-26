import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { broadcastRawTransaction, fetchAddressUtxos, fetchUtxoCurrentness } from "./bsv.mjs";
import {
  controllerPublicKey,
  createWrappedDek,
  domainHash,
  nowLabel,
  randomId,
  sha256Hex,
  signReceipt,
  signProtocolObject,
  verifyProtocolObject,
  verifySignedChallenge,
} from "./protocol.mjs";
import { seedState } from "./seed.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataFile = join(root, "data", "caputxo-state.json");
const port = Number(process.env.PORT ?? 8787);
const challenges = new Map();

async function readState() {
  try {
    return JSON.parse(await readFile(dataFile, "utf8"));
  } catch {
    await writeState(seedState);
    return seedState;
  }
}

async function writeState(state) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(state, null, 2));
}

function send(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,PUT,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(body));
}

function ownerKey(owner) {
  if (owner === "Bob") return "02bb...2222";
  if (owner === "Controller") return "04cc...3333";
  return "03aa...1111";
}

function shortHash() {
  return `${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`;
}

function addAudit(state, event, actor, target, result) {
  state.audit = [{ id: randomId("aud"), event, actor, target, result, time: nowLabel() }, ...state.audit];
}

async function addReceipt(state, receipt) {
  const signed = await signReceipt(receipt);
  const next = {
    id: `rct_${signed.hash.slice(0, 8)}...${signed.hash.slice(-4)}`,
    time: signed.issuedAt,
    signed,
    ...receipt,
  };
  state.receipts = [next, ...state.receipts];
  return next;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return send(res, 204, {});
    if (req.url === "/api/health" && req.method === "GET") {
      return send(res, 200, { ok: true, storage: "json", dataFile, controller: await controllerPublicKey() });
    }
    if (req.url === "/api/controller/public-key" && req.method === "GET") {
      return send(res, 200, await controllerPublicKey());
    }
    if (req.url === "/api/state" && req.method === "GET") {
      return send(res, 200, await readState());
    }
    if (req.url === "/api/state" && req.method === "PUT") {
      const state = await readBody(req);
      await writeState(state);
      return send(res, 200, { ok: true });
    }
    if (req.url === "/api/reset" && req.method === "POST") {
      await writeState(seedState);
      return send(res, 200, seedState);
    }
    if (req.url === "/api/auth/challenge" && req.method === "POST") {
      const body = await readBody(req);
      const challenge = `CapUTXO login challenge for ${body.identity ?? "unknown"}: ${randomId("chal")}`;
      const challengeId = randomId("challenge");
      challenges.set(challengeId, { challenge, identity: body.identity, expiresAt: Date.now() + 5 * 60 * 1000 });
      return send(res, 200, { challengeId, challenge, expiresInSeconds: 300 });
    }
    if (req.url === "/api/auth/verify" && req.method === "POST") {
      const body = await readBody(req);
      const record = challenges.get(body.challengeId);
      if (!record || record.expiresAt < Date.now()) return send(res, 401, { ok: false, reason: "challenge_expired" });
      const ok = verifySignedChallenge({ publicKeyDerHex: body.publicKeyDerHex, challenge: record.challenge, signatureHex: body.signatureHex });
      if (ok) challenges.delete(body.challengeId);
      return send(res, ok ? 200 : 401, { ok, identity: record.identity, reason: ok ? "verified" : "bad_signature" });
    }
    if (req.url === "/api/assets/mint" && req.method === "POST") {
      const body = await readBody(req);
      const state = await readState();
      const assetHash = sha256Hex(body.name ?? randomId("asset"));
      const asset = {
        id: `asset-${String(body.name ?? "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${state.assets.length + 1}`,
        name: body.name || "untitled.enc",
        type: body.type || "application/octet-stream",
        size: body.size || `${(2 + state.assets.length * 0.73).toFixed(2)} MB`,
        hash: `${assetHash.slice(0, 4)}...${assetHash.slice(-4)}`,
        fullHash: assetHash,
        outpoint: `${domainHash("CapUTXO.outpoint.v1", { assetHash, nonce: randomId("nonce") }).slice(0, 12)}...:0`,
        owner: body.owner || "Alice",
        ownerKey: ownerKey(body.owner || "Alice"),
        epoch: 0,
        mode: body.mode || "CONTROLLED_VIEWER_MVP",
        status: "Active",
        createdAt: nowLabel(),
      };
      asset.kms = await createWrappedDek({ assetId: asset.id, assetHash, ownerKey: asset.ownerKey });
      state.assets = [asset, ...state.assets];
      state.selectedAssetId = asset.id;
      await addReceipt(state, { kind: "Asset Minted", assetId: asset.id, subject: asset.owner, ok: true, policy: asset.mode, trace: "manifest committed, KMS record active" });
      addAudit(state, "Asset Minted", "Controller", asset.id, "Recorded");
      await writeState(state);
      return send(res, 201, { ok: true, asset, state });
    }
    if (req.url === "/api/access/requests" && req.method === "POST") {
      const body = await readBody(req);
      const state = await readState();
      const asset = state.assets.find((item) => item.id === body.assetId);
      if (!asset) return send(res, 404, { ok: false, reason: "asset_not_found" });
      const policy = state.policies.find((item) => item.id === asset.mode);
      const requester = body.requester || "Alice";
      const ok = asset.owner === requester && asset.status === "Active" && policy?.state === "Active";
      const request = {
        id: randomId("req"),
        assetId: asset.id,
        requester,
        requesterKey: ownerKey(requester),
        mode: asset.mode,
        challenge: shortHash(),
        status: ok ? "Granted" : "Denied",
        reason: ok ? "Current owner matches capability state." : "Requester, policy, or asset status is not eligible.",
        time: nowLabel(),
      };
      state.accessRequests = [request, ...state.accessRequests];
      await addReceipt(state, {
        kind: ok ? "Access Granted" : "Access Denied",
        assetId: asset.id,
        subject: requester,
        ok,
        policy: asset.mode,
        trace: ok ? `owner=current, epoch=${asset.epoch}` : `owner=${asset.owner}, requester=${requester}, status=${asset.status}`,
      });
      addAudit(state, ok ? "Grant Issued" : "Access Denied", "Controller", requester, ok ? "Accepted" : "Denied");
      await writeState(state);
      return send(res, 200, { ok, request, state });
    }
    if (req.url === "/api/transfers" && req.method === "POST") {
      const body = await readBody(req);
      const state = await readState();
      const asset = state.assets.find((item) => item.id === body.assetId);
      if (!asset) return send(res, 404, { ok: false, reason: "asset_not_found" });
      if (asset.owner === body.to) return send(res, 409, { ok: false, reason: "owner_unchanged" });
      const transfer = {
        id: randomId("xfer"),
        assetId: asset.id,
        from: asset.owner,
        to: body.to,
        step: "prepare",
        precommitment: randomId("pre"),
        status: "Prepared",
        createdAt: nowLabel(),
      };
      state.transfers = [transfer, ...state.transfers];
      addAudit(state, "Transfer Prepared", "Controller", `${asset.owner} -> ${body.to}`, "Recorded");
      await writeState(state);
      return send(res, 201, { ok: true, transfer, state });
    }
    if (req.url?.startsWith("/api/transfers/") && req.url.endsWith("/advance") && req.method === "POST") {
      const transferId = req.url.split("/")[3];
      const state = await readState();
      const transfer = state.transfers.find((item) => item.id === transferId);
      if (!transfer) return send(res, 404, { ok: false, reason: "transfer_not_found" });
      const order = ["prepare", "precommit", "transfer", "finalize"];
      const nextStep = order[Math.min(order.indexOf(transfer.step) + 1, order.length - 1)];
      transfer.step = nextStep;
      transfer.status = nextStep === "precommit" ? "Precommitted" : nextStep === "transfer" ? "Broadcast" : nextStep === "finalize" ? "Finalized" : "Prepared";
      if (nextStep === "finalize") {
        const asset = state.assets.find((item) => item.id === transfer.assetId);
        if (asset) {
          asset.owner = transfer.to;
          asset.ownerKey = ownerKey(transfer.to);
          asset.epoch += 1;
          asset.outpoint = `${domainHash("CapUTXO.transferOutpoint.v1", { id: transfer.id, epoch: asset.epoch }).slice(0, 12)}...:1`;
          await addReceipt(state, { kind: "Transfer Finalized", assetId: asset.id, subject: `${transfer.from} -> ${transfer.to}`, ok: true, policy: asset.mode, trace: "precommitment matched, epoch advanced" });
        }
        addAudit(state, "Transfer Finalized", "Controller", `${transfer.from} -> ${transfer.to}`, "Recorded");
      } else {
        addAudit(state, `Transfer ${transfer.status}`, "Controller", transfer.id, "Recorded");
      }
      await writeState(state);
      return send(res, 200, { ok: true, transfer, state });
    }
    if (req.url === "/api/utxo/currentness" && req.method === "POST") {
      return send(res, 200, await fetchUtxoCurrentness(await readBody(req)));
    }
    if (req.url === "/api/wallets/utxos" && req.method === "POST") {
      const body = await readBody(req);
      return send(res, 200, await fetchAddressUtxos(body.address));
    }
    if (req.url === "/api/tx/intent" && req.method === "POST") {
      const body = await readBody(req);
      const state = await readState();
      const asset = state.assets.find((item) => item.id === body.assetId);
      const wallet = state.wallets?.find((item) => item.id === body.walletId);
      if (!asset) return send(res, 404, { ok: false, reason: "asset_not_found" });
      if (!wallet) return send(res, 404, { ok: false, reason: "wallet_not_found" });
      const intent = {
        id: randomId("intent"),
        network: wallet.network ?? "BSV Testnet",
        walletId: wallet.id,
        address: wallet.address,
        assetId: asset.id,
        currentOutpoint: asset.outpoint,
        currentOwner: asset.owner,
        targetOwner: body.to,
        capabilityHash: domainHash("CapUTXO.transferIntent.v1", {
          assetId: asset.id,
          outpoint: asset.outpoint,
          epoch: asset.epoch,
          to: body.to,
          wallet: wallet.address,
        }),
        requiredSigner: wallet.address,
        signingMode: "external-wallet",
        createdAt: nowLabel(),
      };
      return send(res, 200, { ok: true, intent });
    }
    if (req.url === "/api/bsv/broadcast" && req.method === "POST") {
      const body = await readBody(req);
      return send(res, 200, await broadcastRawTransaction(body.rawTx));
    }
    if (req.url === "/api/receipts/verify" && req.method === "POST") {
      const body = await readBody(req);
      return send(res, 200, verifyProtocolObject(body.signed ?? body));
    }
    if (req.url === "/api/receipts/sign" && req.method === "POST") {
      return send(res, 201, await signProtocolObject("CapUTXO.receipt.v1", await readBody(req)));
    }
    return send(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    return send(res, 500, { ok: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
}).listen(port, () => {
  console.log(`CapUTXO gateway listening on http://localhost:${port}`);
});
