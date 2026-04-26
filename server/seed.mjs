export const seedState = {
  assets: [
    {
      id: "asset-design-spec",
      name: "design_spec.pdf.enc",
      type: "application/octet-stream",
      size: "2.48 MB",
      hash: "b1f7...9a3c",
      outpoint: "a1b2c3d4e5f6...:1",
      owner: "Bob",
      ownerKey: "02bb...2222",
      epoch: 1,
      mode: "CONTROLLED_VIEWER_MVP",
      status: "Active",
      createdAt: "25 Apr 2026, 8:04 PM"
    },
    {
      id: "asset-investor-packet",
      name: "investor_packet.zip.enc",
      type: "encrypted-archive",
      size: "8.12 MB",
      hash: "81ca...f03d",
      outpoint: "ff90aa13c0de...:0",
      owner: "Alice",
      ownerKey: "03aa...1111",
      epoch: 0,
      mode: "LOCAL_DECRYPT_DEMO",
      status: "Active",
      createdAt: "25 Apr 2026, 8:12 PM"
    }
  ],
  accessRequests: [
    {
      id: "req_9e7c",
      assetId: "asset-design-spec",
      requester: "Bob",
      requesterKey: "02bb...2222",
      mode: "CONTROLLED_VIEWER_MVP",
      challenge: "7f3a...c91d",
      status: "Granted",
      reason: "Current owner matches capability state.",
      time: "25 Apr 2026, 9:43 PM"
    },
    {
      id: "req_12ab",
      assetId: "asset-design-spec",
      requester: "Alice",
      requesterKey: "03aa...1111",
      mode: "CONTROLLED_VIEWER_MVP",
      challenge: "bd91...443c",
      status: "Denied",
      reason: "Requester is stale owner after epoch advance.",
      time: "25 Apr 2026, 9:12 PM"
    }
  ],
  transfers: [
    {
      id: "xfer_45e8",
      assetId: "asset-design-spec",
      from: "Alice",
      to: "Bob",
      step: "finalize",
      precommitment: "pre_7ac1...e91f",
      status: "Finalized",
      createdAt: "25 Apr 2026, 9:42 PM"
    }
  ],
  receipts: [
    {
      id: "rct_9e7c...b22f",
      kind: "Access Granted",
      assetId: "asset-design-spec",
      subject: "Bob",
      ok: true,
      policy: "CONTROLLED_VIEWER_MVP",
      time: "25 Apr 2026, 9:43 PM",
      trace: "owner=current, epoch=1, finality=6"
    },
    {
      id: "rct_12ab...44ef",
      kind: "Access Denied",
      assetId: "asset-design-spec",
      subject: "Alice",
      ok: false,
      policy: "CONTROLLED_VIEWER_MVP",
      time: "25 Apr 2026, 9:12 PM",
      trace: "owner=stale, epoch=0 rejected"
    },
    {
      id: "rct_0aa1...77cc",
      kind: "Transfer Finalized",
      assetId: "asset-design-spec",
      subject: "Alice -> Bob",
      ok: true,
      policy: "CONTROLLED_VIEWER_MVP",
      time: "25 Apr 2026, 9:42 PM",
      trace: "precommitment matched, epoch advanced"
    }
  ],
  audit: [
    { id: "aud_001", event: "Grant Issued", actor: "Controller", target: "Bob", result: "Accepted", time: "25 Apr 2026, 9:43 PM" },
    { id: "aud_002", event: "Access Denied", actor: "Controller", target: "Alice", result: "Denied", time: "25 Apr 2026, 9:12 PM" },
    { id: "aud_003", event: "Transfer Finalized", actor: "Controller", target: "asset-design-spec", result: "Recorded", time: "25 Apr 2026, 9:42 PM" },
    { id: "aud_004", event: "Epoch Advanced", actor: "Indexer", target: "0 -> 1", result: "Recorded", time: "25 Apr 2026, 9:42 PM" }
  ],
  policies: [
    {
      id: "LOCAL_DECRYPT_DEMO",
      name: "Local Decrypt Demo",
      state: "Active",
      ttl: 120,
      allowDownload: false,
      requireFinality: false,
      copy: "Controller may release an expiring DEK package to the current owner."
    },
    {
      id: "CONTROLLED_VIEWER_MVP",
      name: "Controlled Viewer MVP",
      state: "Active",
      ttl: 300,
      allowDownload: false,
      requireFinality: true,
      copy: "Managed viewer access with signed receipts and no stale grants."
    },
    {
      id: "TEE_THRESHOLD_FUTURE",
      name: "TEE Threshold Future",
      state: "Planned",
      ttl: 60,
      allowDownload: false,
      requireFinality: true,
      copy: "Future hardened execution path for threshold or enclave release."
    }
  ],
  selectedAssetId: "asset-design-spec",
  proofBundle: ""
};
