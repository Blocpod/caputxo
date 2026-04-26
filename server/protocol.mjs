import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const keyDir = join(root, "data", "keys");
const controllerKeyFile = join(keyDir, "controller-ed25519.json");
const kmsKeyFile = join(keyDir, "kms-aes256.key");

export function canonicalize(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("Only safe integers are supported in protocol objects");
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }
  throw new Error(`Unsupported canonical type: ${typeof value}`);
}

export function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function domainHash(domain, value) {
  return sha256Hex(Buffer.concat([Buffer.from(domain), Buffer.from(canonicalize(value))]));
}

export function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export function nowLabel() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

async function ensureControllerIdentity() {
  try {
    const stored = JSON.parse(await readFile(controllerKeyFile, "utf8"));
    return {
      publicKey: crypto.createPublicKey(stored.publicKeyPem),
      privateKey: crypto.createPrivateKey(stored.privateKeyPem),
      publicKeyPem: stored.publicKeyPem,
      publicKeyDerHex: stored.publicKeyDerHex,
    };
  } catch {
    await mkdir(keyDir, { recursive: true });
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
    const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
    const publicKeyDerHex = publicKey.export({ type: "spki", format: "der" }).toString("hex");
    await writeFile(controllerKeyFile, JSON.stringify({ publicKeyPem, privateKeyPem, publicKeyDerHex }, null, 2));
    return { publicKey, privateKey, publicKeyPem, publicKeyDerHex };
  }
}

async function ensureKmsKey() {
  try {
    return Buffer.from(await readFile(kmsKeyFile, "utf8"), "hex");
  } catch {
    await mkdir(keyDir, { recursive: true });
    const key = crypto.randomBytes(32);
    await writeFile(kmsKeyFile, key.toString("hex"));
    return key;
  }
}

export async function controllerPublicKey() {
  const identity = await ensureControllerIdentity();
  return { publicKeyDerHex: identity.publicKeyDerHex, publicKeyPem: identity.publicKeyPem };
}

export async function signProtocolObject(domain, payload) {
  const identity = await ensureControllerIdentity();
  const unsigned = {
    domain,
    issuedAt: nowLabel(),
    controllerPublicKeyDerHex: identity.publicKeyDerHex,
    payload,
  };
  const hash = domainHash(domain, unsigned);
  const signatureHex = crypto.sign(null, Buffer.from(hash, "hex"), identity.privateKey).toString("hex");
  return { ...unsigned, hash, signatureHex };
}

export function verifyProtocolObject(signed) {
  const { signatureHex, hash, ...unsigned } = signed;
  const expectedHash = domainHash(signed.domain, unsigned);
  if (expectedHash !== hash) return { ok: false, reason: "hash_mismatch" };
  const publicKey = crypto.createPublicKey({
    key: Buffer.from(signed.controllerPublicKeyDerHex, "hex"),
    type: "spki",
    format: "der",
  });
  const ok = crypto.verify(null, Buffer.from(hash, "hex"), publicKey, Buffer.from(signatureHex, "hex"));
  return { ok, reason: ok ? "valid" : "bad_signature" };
}

export async function signReceipt(fields) {
  return signProtocolObject("CapUTXO.receipt.v1", fields);
}

export async function createWrappedDek({ assetId, assetHash, ownerKey }) {
  const kmsKey = await ensureKmsKey();
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", kmsKey, iv);
  cipher.setAAD(Buffer.from(canonicalize({ assetId, assetHash, ownerKey })));
  const wrapped = Buffer.concat([cipher.update(dek), cipher.final()]);
  return {
    wrappingKeyId: "local-aes256-gcm-kek-v1",
    ivHex: iv.toString("hex"),
    tagHex: cipher.getAuthTag().toString("hex"),
    wrappedDekHex: wrapped.toString("hex"),
    dekHash: sha256Hex(dek),
  };
}

export function verifySignedChallenge({ publicKeyDerHex, challenge, signatureHex }) {
  const publicKey = crypto.createPublicKey({
    key: Buffer.from(publicKeyDerHex, "hex"),
    type: "spki",
    format: "der",
  });
  return crypto.verify(null, Buffer.from(challenge), publicKey, Buffer.from(signatureHex, "hex"));
}
