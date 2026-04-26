# CapUTXO Protocol Specification Draft

Status: draft implementation guide.

## 1. Purpose

CapUTXO binds controller-managed future access to a transferable capability state. The encrypted asset remains fixed. The capability currentness, owner key, and epoch determine whether the controller may issue new managed access grants.

## 2. Non-Claims

CapUTXO does not revoke knowledge already released. A prior owner may retain plaintext, a released DEK, screenshots, memory dumps, or local copies. CapUTXO controls future managed grants from the controller/KMS.

## 3. Canonical Encoding

Signed and hashed protocol objects use deterministic canonical JSON:

- object keys sorted lexicographically;
- arrays encoded in order;
- strings JSON-escaped;
- booleans as `true` or `false`;
- safe integers only;
- no floats, `undefined`, functions, or cyclic values.

The domain-separated hash is:

```text
sha256(domain || canonicalize(object))
```

## 4. State Object

Minimum CapUTXO state fields:

```json
{
  "version": 1,
  "network": "BSV Testnet",
  "genesisOutpointHash": "hex32",
  "currentOutpoint": "txid:vout",
  "assetHash": "hex32",
  "manifestHash": "hex32",
  "policyHash": "hex32",
  "controllerPubKeyHash": "hash160",
  "ownerPubKeyHash": "hash160",
  "epoch": 1,
  "accessStateCommitment": "hex32",
  "receiptRoot": "hex32",
  "status": "ACTIVE",
  "previousStateHash": "hex32",
  "lastTransitionType": "MINT|TRANSFER|FREEZE|UNFREEZE"
}
```

## 5. Asset Manifest

The asset manifest commits to the fixed encrypted asset:

```json
{
  "caputxoVersion": "1.0",
  "assetId": "urn:caputxo:sha256:<assetHash>",
  "genesisOutpointHash": "hex32",
  "assetHash": "hex32",
  "ciphertext": {
    "ciphertextHash": "hex32",
    "locations": [],
    "encryption": {
      "algorithm": "AES-256-GCM",
      "kdf": "HKDF-SHA256",
      "aadDomain": "CapUTXO.assetAAD.v1"
    }
  },
  "policyHash": "hex32"
}
```

`manifestHash = domainHash("CapUTXO.manifest.v1", manifest)`.

## 6. Policy Object

```json
{
  "id": "CONTROLLED_VIEWER_MVP",
  "state": "Active",
  "ttl": 300,
  "allowDownload": false,
  "requireFinality": true
}
```

`policyHash = domainHash("CapUTXO.policy.v1", policy)`.

## 7. Transition Rules

### Mint

Inputs:

- asset manifest;
- initial owner key hash;
- controller key hash;
- policy hash.

Rules:

- epoch must be `0`;
- status must be `ACTIVE`;
- current outpoint must reference the mint capability output;
- access state commitment must commit to wrapped DEK state.

### Transfer Prepare

Rules:

- selected state must be current;
- asset status must be active;
- target owner must differ from current owner;
- precommitment must bind old outpoint, old epoch, target owner, policy hash, and expiry.

### Transfer Finalize

Rules:

- precommitment must match;
- capability spend must be confirmed or accepted by configured finality policy;
- owner key hash changes to target owner;
- epoch increments by one;
- previous state hash points to prior state;
- old owner becomes stale for future managed grants.

### Access Grant

Rules:

- request challenge signature must verify;
- current outpoint must be unspent/current;
- requester key hash must match current owner key hash;
- policy must be active;
- asset status must be active;
- grant expiry must be within policy TTL.

### Access Denial

The controller must issue a signed denial receipt when a request is rejected for stale ownership, invalid signature, inactive policy, frozen asset, expired challenge, or failed currentness verification.

## 8. Receipt Format

Receipts are signed Ed25519 protocol objects:

```json
{
  "domain": "CapUTXO.receipt.v1",
  "issuedAt": "Apr 26, 2026, 2:35 AM",
  "controllerPublicKeyDerHex": "hex",
  "payload": {
    "kind": "Access Granted",
    "assetId": "asset-design-spec",
    "subject": "Bob",
    "ok": true,
    "policy": "CONTROLLED_VIEWER_MVP",
    "trace": "owner=current, epoch=1"
  },
  "hash": "hex32",
  "signatureHex": "hex"
}
```

Verification:

1. Recompute `domainHash(domain, unsignedFields)`.
2. Compare to `hash`.
3. Verify Ed25519 signature over the hash.

## 9. Threat Model

Protected against:

- stale owner requesting future managed grants;
- receipt tampering;
- policy status mismatch;
- frozen asset release;
- invalid controller receipt signature;
- invalid signed access challenge.

Not protected against yet:

- compromised controller;
- malicious wallet;
- browser compromise;
- prior plaintext retention;
- unavailable or dishonest public indexer;
- chain reorg unless finality policy accounts for it.

## 10. Testnet Transaction Path

Production path:

1. User connects a non-custodial BSV wallet.
2. Gateway prepares a transfer intent.
3. Wallet signs a transaction spending the current capability UTXO.
4. Gateway broadcasts raw transaction.
5. Indexer verifies new outpoint currentness.
6. Controller advances CapUTXO state and issues a signed receipt.

This repository implements steps 2, 4, 5 boundaries and signed receipts. Step 3 requires a real wallet provider and funded testnet UTXO.
