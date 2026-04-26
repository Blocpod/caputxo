import { StrictMode, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import {
  Activity,
  BadgeCheck,
  Bell,
  Box,
  Braces,
  Check,
  ChevronDown,
  CircleDot,
  Copy,
  DatabaseZap,
  ExternalLink,
  Eye,
  FileCheck2,
  Fingerprint,
  Hexagon,
  KeyRound,
  Layers3,
  LockKeyhole,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import "./styles.css";

type Page = "Overview" | "Mint" | "Assets" | "Access" | "Transfers" | "Receipts" | "Policies" | "Audit" | "Identities" | "Keys" | "Settings";
type TransferStep = "prepare" | "precommit" | "transfer" | "finalize";
type AccessMode = "LOCAL_DECRYPT_DEMO" | "CONTROLLED_VIEWER_MVP" | "TEE_THRESHOLD_FUTURE";
type AssetStatus = "Active" | "Pending" | "Frozen";
type ReceiptKind = "Access Granted" | "Access Denied" | "Transfer Finalized" | "Asset Minted" | "Policy Updated" | "Asset Status Updated" | "Proof Generated";

type AssetRecord = {
  id: string;
  name: string;
  type: string;
  size: string;
  hash: string;
  outpoint: string;
  owner: "Alice" | "Bob" | "Controller";
  ownerKey: string;
  epoch: number;
  mode: AccessMode;
  status: AssetStatus;
  createdAt: string;
};

type AccessRequest = {
  id: string;
  assetId: string;
  requester: "Alice" | "Bob" | "Mallory";
  requesterKey: string;
  mode: AccessMode;
  challenge: string;
  status: "Pending" | "Granted" | "Denied";
  reason: string;
  time: string;
};

type TransferRecord = {
  id: string;
  assetId: string;
  from: "Alice" | "Bob" | "Controller";
  to: "Alice" | "Bob" | "Controller";
  step: TransferStep;
  precommitment: string;
  status: "Prepared" | "Precommitted" | "Broadcast" | "Finalized";
  createdAt: string;
};

type ReceiptRecord = {
  id: string;
  kind: ReceiptKind;
  assetId: string;
  subject: string;
  ok: boolean;
  policy: AccessMode;
  time: string;
  trace: string;
};

type AuditRecord = {
  id: string;
  event: string;
  actor: string;
  target: string;
  result: "Accepted" | "Denied" | "Recorded" | "Updated";
  time: string;
};

type PolicyRecord = {
  id: AccessMode;
  name: string;
  state: "Active" | "Planned" | "Paused";
  ttl: number;
  allowDownload: boolean;
  requireFinality: boolean;
  copy: string;
};

type AppState = {
  assets: AssetRecord[];
  accessRequests: AccessRequest[];
  transfers: TransferRecord[];
  receipts: ReceiptRecord[];
  audit: AuditRecord[];
  policies: PolicyRecord[];
  selectedAssetId: string;
  proofBundle: string;
};

const nav: Array<[Page, typeof Hexagon]> = [
  ["Overview", Hexagon],
  ["Mint", Box],
  ["Assets", DatabaseZap],
  ["Access", UserRoundCheck],
  ["Transfers", Send],
  ["Receipts", FileCheck2],
  ["Policies", ShieldCheck],
  ["Audit", Braces],
];

const systemNav: Array<[Page, typeof Fingerprint]> = [
  ["Identities", Fingerprint],
  ["Keys", KeyRound],
  ["Settings", Settings],
];

const steps: Array<{ id: TransferStep; label: string; detail: string }> = [
  { id: "prepare", label: "Prepare", detail: "Policy & terms" },
  { id: "precommit", label: "Precommit", detail: "State commit" },
  { id: "transfer", label: "Transfer", detail: "Capability moves" },
  { id: "finalize", label: "Finalize", detail: "Epoch advances" },
];

const initialPolicies: PolicyRecord[] = [
  {
    id: "LOCAL_DECRYPT_DEMO",
    name: "Local Decrypt Demo",
    state: "Active",
    ttl: 120,
    allowDownload: false,
    requireFinality: false,
    copy: "Controller may release an expiring DEK package to the current owner.",
  },
  {
    id: "CONTROLLED_VIEWER_MVP",
    name: "Controlled Viewer MVP",
    state: "Active",
    ttl: 300,
    allowDownload: false,
    requireFinality: true,
    copy: "Managed viewer access with signed receipts and no stale grants.",
  },
  {
    id: "TEE_THRESHOLD_FUTURE",
    name: "TEE Threshold Future",
    state: "Planned",
    ttl: 60,
    allowDownload: false,
    requireFinality: true,
    copy: "Future hardened execution path for threshold or enclave release.",
  },
];

const initialAssets: AssetRecord[] = [
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
    createdAt: "25 Apr 2026, 8:04 PM",
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
    createdAt: "25 Apr 2026, 8:12 PM",
  },
];

const initialAccess: AccessRequest[] = [
  {
    id: "req_9e7c",
    assetId: "asset-design-spec",
    requester: "Bob",
    requesterKey: "02bb...2222",
    mode: "CONTROLLED_VIEWER_MVP",
    challenge: "7f3a...c91d",
    status: "Granted",
    reason: "Current owner matches capability state.",
    time: "25 Apr 2026, 9:43 PM",
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
    time: "25 Apr 2026, 9:12 PM",
  },
];

const initialTransfers: TransferRecord[] = [
  {
    id: "xfer_45e8",
    assetId: "asset-design-spec",
    from: "Alice",
    to: "Bob",
    step: "finalize",
    precommitment: "pre_7ac1...e91f",
    status: "Finalized",
    createdAt: "25 Apr 2026, 9:42 PM",
  },
];

const initialReceipts: ReceiptRecord[] = [
  {
    id: "rct_9e7c...b22f",
    kind: "Access Granted",
    assetId: "asset-design-spec",
    subject: "Bob",
    ok: true,
    policy: "CONTROLLED_VIEWER_MVP",
    time: "25 Apr 2026, 9:43 PM",
    trace: "owner=current, epoch=1, finality=6",
  },
  {
    id: "rct_12ab...44ef",
    kind: "Access Denied",
    assetId: "asset-design-spec",
    subject: "Alice",
    ok: false,
    policy: "CONTROLLED_VIEWER_MVP",
    time: "25 Apr 2026, 9:12 PM",
    trace: "owner=stale, epoch=0 rejected",
  },
  {
    id: "rct_0aa1...77cc",
    kind: "Transfer Finalized",
    assetId: "asset-design-spec",
    subject: "Alice -> Bob",
    ok: true,
    policy: "CONTROLLED_VIEWER_MVP",
    time: "25 Apr 2026, 9:42 PM",
    trace: "precommitment matched, epoch advanced",
  },
];

const initialAudit: AuditRecord[] = [
  { id: "aud_001", event: "Grant Issued", actor: "Controller", target: "Bob", result: "Accepted", time: "25 Apr 2026, 9:43 PM" },
  { id: "aud_002", event: "Access Denied", actor: "Controller", target: "Alice", result: "Denied", time: "25 Apr 2026, 9:12 PM" },
  { id: "aud_003", event: "Transfer Finalized", actor: "Controller", target: "asset-design-spec", result: "Recorded", time: "25 Apr 2026, 9:42 PM" },
  { id: "aud_004", event: "Epoch Advanced", actor: "Indexer", target: "0 -> 1", result: "Recorded", time: "25 Apr 2026, 9:42 PM" },
];

const nowLabel = () =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`;
const shortHash = () => `${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`;

const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Clipboard permissions vary; copying is a convenience, not a required flow.
  }
};

function useStoredState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function App() {
  const [page, setPage] = useState<Page>("Overview");
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<TransferStep>("transfer");
  const [selectedMode, setSelectedMode] = useState<AccessMode>("CONTROLLED_VIEWER_MVP");
  const [assets, setAssets] = useStoredState("caputxo.assets", initialAssets);
  const [accessRequests, setAccessRequests] = useStoredState("caputxo.accessRequests", initialAccess);
  const [transfers, setTransfers] = useStoredState("caputxo.transfers", initialTransfers);
  const [receipts, setReceipts] = useStoredState("caputxo.receipts", initialReceipts);
  const [audit, setAudit] = useStoredState("caputxo.audit", initialAudit);
  const [policies, setPolicies] = useStoredState("caputxo.policies", initialPolicies);
  const [selectedAssetId, setSelectedAssetId] = useStoredState("caputxo.selectedAssetId", initialAssets[0].id);
  const [mintName, setMintName] = useState("new_capability_asset.enc");
  const [mintOwner, setMintOwner] = useState<"Alice" | "Bob" | "Controller">("Alice");
  const [mintMode, setMintMode] = useState<AccessMode>("CONTROLLED_VIEWER_MVP");
  const [accessRequester, setAccessRequester] = useState<"Alice" | "Bob" | "Mallory">("Bob");
  const [transferTo, setTransferTo] = useState<"Alice" | "Bob" | "Controller">("Alice");
  const [proofBundle, setProofBundle] = useStoredState("caputxo.proofBundle", "");
  const [apiStatus, setApiStatus] = useState<"Connecting" | "API synced" | "Browser local">("Connecting");
  const [apiHydrated, setApiHydrated] = useState(false);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0];
  const selectedPolicy = policies.find((policy) => policy.id === selectedMode) ?? policies[0];
  const visibleAssets = useMemo(
    () => assets.filter((asset) => `${asset.name} ${asset.hash} ${asset.owner}`.toLowerCase().includes(query.toLowerCase())),
    [assets, query],
  );

  const stateSnapshot: AppState = useMemo(
    () => ({ assets, accessRequests, transfers, receipts, audit, policies, selectedAssetId, proofBundle }),
    [assets, accessRequests, transfers, receipts, audit, policies, selectedAssetId, proofBundle],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/state")
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        return response.json() as Promise<AppState>;
      })
      .then((state) => {
        if (cancelled) return;
        setAssets(state.assets ?? initialAssets);
        setAccessRequests(state.accessRequests ?? initialAccess);
        setTransfers(state.transfers ?? initialTransfers);
        setReceipts(state.receipts ?? initialReceipts);
        setAudit(state.audit ?? initialAudit);
        setPolicies(state.policies ?? initialPolicies);
        setSelectedAssetId(state.selectedAssetId ?? initialAssets[0].id);
        setProofBundle(state.proofBundle ?? "");
        setApiStatus("API synced");
      })
      .catch(() => {
        if (!cancelled) setApiStatus("Browser local");
      })
      .finally(() => {
        if (!cancelled) setApiHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setAccessRequests, setAssets, setAudit, setPolicies, setProofBundle, setReceipts, setSelectedAssetId, setTransfers]);

  useEffect(() => {
    if (!apiHydrated || apiStatus !== "API synced") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch("/api/state", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(stateSnapshot),
        signal: controller.signal,
      }).catch(() => setApiStatus("Browser local"));
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [apiHydrated, apiStatus, stateSnapshot]);

  const runCommandSearch = () => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return;
    const pageMatch = [...nav, ...systemNav].find(([label]) => label.toLowerCase().startsWith(normalized));
    if (pageMatch) {
      setPage(pageMatch[0]);
      return;
    }
    const assetMatch = assets.find((asset) => `${asset.name} ${asset.hash} ${asset.owner}`.toLowerCase().includes(normalized));
    if (assetMatch) {
      setSelectedAssetId(assetMatch.id);
      setPage("Assets");
    }
  };

  const addAudit = (event: string, actor: string, target: string, result: AuditRecord["result"]) => {
    setAudit((items) => [{ id: makeId("aud"), event, actor, target, result, time: nowLabel() }, ...items]);
  };

  const addReceipt = (receipt: Omit<ReceiptRecord, "id" | "time">) => {
    const next = { ...receipt, id: makeId("rct"), time: nowLabel() };
    setReceipts((items) => [next, ...items]);
    return next;
  };

  const mintAsset = () => {
    const next: AssetRecord = {
      id: `asset-${mintName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${assets.length + 1}`,
      name: mintName || "untitled.enc",
      type: "application/octet-stream",
      size: `${(2 + assets.length * 0.73).toFixed(2)} MB`,
      hash: shortHash(),
      outpoint: `${Math.random().toString(16).slice(2, 14)}...:0`,
      owner: mintOwner,
      ownerKey: mintOwner === "Bob" ? "02bb...2222" : mintOwner === "Controller" ? "04cc...3333" : "03aa...1111",
      epoch: 0,
      mode: mintMode,
      status: "Active",
      createdAt: nowLabel(),
    };
    setAssets((items) => [next, ...items]);
    setSelectedAssetId(next.id);
    addReceipt({ kind: "Asset Minted", assetId: next.id, subject: next.owner, ok: true, policy: next.mode, trace: "manifest committed, KMS record active" });
    addAudit("Asset Minted", "Controller", next.id, "Recorded");
    setPage("Assets");
  };

  const evaluateAccess = () => {
    const policy = policies.find((item) => item.id === selectedAsset.mode)!;
    const requesterKey = accessRequester === "Bob" ? "02bb...2222" : accessRequester === "Alice" ? "03aa...1111" : "ff00...bad0";
    const ownerMatch = selectedAsset.owner === accessRequester;
    const policyLive = policy.state === "Active";
    const ok = ownerMatch && policyLive && selectedAsset.status === "Active";
    const request: AccessRequest = {
      id: makeId("req"),
      assetId: selectedAsset.id,
      requester: accessRequester,
      requesterKey,
      mode: selectedAsset.mode,
      challenge: shortHash(),
      status: ok ? "Granted" : "Denied",
      reason: ok ? "Current owner matches capability state." : !policyLive ? "Selected policy is not active." : "Requester does not match current owner.",
      time: nowLabel(),
    };
    setAccessRequests((items) => [request, ...items]);
    addReceipt({
      kind: ok ? "Access Granted" : "Access Denied",
      assetId: selectedAsset.id,
      subject: accessRequester,
      ok,
      policy: selectedAsset.mode,
      trace: ok ? `owner=current, epoch=${selectedAsset.epoch}` : `owner=${selectedAsset.owner}, requester=${accessRequester}`,
    });
    addAudit(ok ? "Grant Issued" : "Access Denied", "Controller", accessRequester, ok ? "Accepted" : "Denied");
  };

  const createTransfer = () => {
    if (transferTo === selectedAsset.owner) return;
    const next: TransferRecord = {
      id: makeId("xfer"),
      assetId: selectedAsset.id,
      from: selectedAsset.owner,
      to: transferTo,
      step: "prepare",
      precommitment: makeId("pre"),
      status: "Prepared",
      createdAt: nowLabel(),
    };
    setTransfers((items) => [next, ...items]);
    setStep("prepare");
    addAudit("Transfer Prepared", "Controller", `${selectedAsset.owner} -> ${transferTo}`, "Recorded");
  };

  const advanceTransfer = (id: string) => {
    const order: TransferStep[] = ["prepare", "precommit", "transfer", "finalize"];
    const transfer = transfers.find((item) => item.id === id);
    if (!transfer) return;
    const currentIndex = order.indexOf(transfer.step);
    const nextStep = order[Math.min(currentIndex + 1, order.length - 1)];
    const nextStatus: TransferRecord["status"] =
      nextStep === "precommit" ? "Precommitted" : nextStep === "transfer" ? "Broadcast" : nextStep === "finalize" ? "Finalized" : "Prepared";

    setTransfers((items) => items.map((item) => (item.id === id ? { ...item, step: nextStep, status: nextStatus } : item)));
    setStep(nextStep);
    if (nextStep === "finalize") {
      setAssets((items) =>
        items.map((asset) =>
          asset.id === transfer.assetId
            ? {
                ...asset,
                owner: transfer.to,
                ownerKey: transfer.to === "Bob" ? "02bb...2222" : transfer.to === "Controller" ? "04cc...3333" : "03aa...1111",
                epoch: asset.epoch + 1,
                outpoint: `${Math.random().toString(16).slice(2, 14)}...:1`,
              }
            : asset,
        ),
      );
      addReceipt({ kind: "Transfer Finalized", assetId: transfer.assetId, subject: `${transfer.from} -> ${transfer.to}`, ok: true, policy: selectedAsset.mode, trace: "precommitment matched, epoch advanced" });
      addAudit("Transfer Finalized", "Controller", `${transfer.from} -> ${transfer.to}`, "Recorded");
    } else {
      addAudit(`Transfer ${nextStatus}`, "Controller", transfer.id, "Recorded");
    }
  };

  const togglePolicy = (id: AccessMode) => {
    setPolicies((items) =>
      items.map((item) =>
        item.id === id ? { ...item, state: item.state === "Active" ? "Paused" : "Active" } : item,
      ),
    );
    addReceipt({ kind: "Policy Updated", assetId: selectedAsset.id, subject: id, ok: true, policy: id, trace: "policy state changed by controller" });
    addAudit("Policy Updated", "Controller", id, "Updated");
  };

  const updateAssetStatus = (id: string, status: AssetStatus) => {
    setAssets((items) => items.map((asset) => (asset.id === id ? { ...asset, status } : asset)));
    addReceipt({ kind: "Asset Status Updated", assetId: id, subject: status, ok: status !== "Frozen", policy: selectedAsset.mode, trace: `asset status set to ${status}` });
    addAudit("Asset Status Updated", "Controller", id, "Updated");
  };

  const generateProof = () => {
    const bundle = {
      generatedAt: nowLabel(),
      network: "BSV Testnet",
      selectedAsset: selectedAsset.id,
      assetHash: selectedAsset.hash,
      currentOutpoint: selectedAsset.outpoint,
      currentOwner: selectedAsset.owner,
      epoch: selectedAsset.epoch,
      receipts: receipts.filter((receipt) => receipt.assetId === selectedAsset.id).slice(0, 8),
    };
    const serialized = JSON.stringify(bundle, null, 2);
    setProofBundle(serialized);
    copyText(serialized);
    addReceipt({ kind: "Proof Generated", assetId: selectedAsset.id, subject: selectedAsset.name, ok: true, policy: selectedAsset.mode, trace: "proof bundle assembled and copied" });
    addAudit("Proof Generated", "Controller", selectedAsset.id, "Recorded");
  };

  const resetSimulation = () => {
    setAssets(initialAssets);
    setAccessRequests(initialAccess);
    setTransfers(initialTransfers);
    setReceipts(initialReceipts);
    setAudit(initialAudit);
    setPolicies(initialPolicies);
    setSelectedAssetId(initialAssets[0].id);
    setProofBundle("");
    setPage("Overview");
  };

  const renderPage = () => {
    const props = {
      step,
      setStep,
      selectedMode,
      setSelectedMode,
      selectedPolicy,
      assets,
      visibleAssets,
      selectedAsset,
      selectedAssetId,
      setSelectedAssetId,
      mintName,
      setMintName,
      mintOwner,
      setMintOwner,
      mintMode,
      setMintMode,
      mintAsset,
      accessRequester,
      setAccessRequester,
      evaluateAccess,
      accessRequests,
      transferTo,
      setTransferTo,
      transfers,
      createTransfer,
      advanceTransfer,
      receipts,
      policies,
      togglePolicy,
      updateAssetStatus,
      generateProof,
      proofBundle,
      resetSimulation,
      apiStatus,
      audit,
      setPage,
    };
    switch (page) {
      case "Mint":
        return <MintPage {...props} />;
      case "Assets":
        return <AssetsPage {...props} />;
      case "Access":
        return <AccessPage {...props} />;
      case "Transfers":
        return <TransfersPage {...props} />;
      case "Receipts":
        return <ReceiptsPage {...props} />;
      case "Policies":
        return <PoliciesPage {...props} />;
      case "Audit":
        return <AuditPage {...props} />;
      case "Identities":
        return <IdentitiesPage {...props} />;
      case "Keys":
        return <KeysPage {...props} />;
      case "Settings":
        return <SettingsPage {...props} />;
      default:
        return <OverviewPage {...props} />;
    }
  };

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Hexagon size={27} />
            <CircleDot size={13} />
          </div>
          <div>
            <strong>CapUTXO</strong>
            <span>Rights Without Reveal</span>
          </div>
        </div>

        <nav className="nav-block" aria-label="Control center">
          <span className="nav-kicker">Control Center</span>
          {nav.map(([label, Icon]) => (
            <button className={page === label ? "nav-item active" : "nav-item"} key={label} onClick={() => setPage(label)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <nav className="nav-block system" aria-label="System">
          <span className="nav-kicker">System</span>
          {systemNav.map(([label, Icon]) => (
            <button className={page === label ? "nav-item active" : "nav-item"} key={label} onClick={() => setPage(label)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <button className="network-card">
          <span className="pulse" />
          <span>
            <small>Network</small>
            <strong>BSV Testnet</strong>
          </span>
          <ChevronDown size={17} />
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="chain-select">
            <span className="status-dot" />
            BSV Testnet
            <ChevronDown size={16} />
          </button>
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Search command"
              placeholder="Search assets, pages, owners, hashes..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runCommandSearch();
              }}
            />
            <kbd>⌘K</kbd>
          </label>
          <div className="top-actions">
            <button aria-label="Health">
              <Activity size={19} />
            </button>
            <button aria-label="Notifications" className="bell">
              <Bell size={18} />
            </button>
            <button className="profile">
              <span className="profile-avatar" aria-hidden="true">
                <User size={18} />
              </span>
              <span>
                <strong>Alice</strong>
                <small>Controller</small>
              </span>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>

        {renderPage()}

        <footer className="footer">
          <span><span className="status-dot" /> BSV Testnet</span>
          <span>Assets <strong>{assets.length}</strong></span>
          <span>Open Transfers <strong>{transfers.filter((item) => item.status !== "Finalized").length}</strong></span>
          <span>Receipts <strong>{receipts.length}</strong></span>
          <span>Storage <strong>{apiStatus}</strong></span>
          <span>Protocol <strong>CapUTXO v1.0</strong></span>
          <span className="ops"><span className="status-dot" /> All Systems Operational</span>
        </footer>
      </section>
    </main>
  );
}

type PageProps = {
  step: TransferStep;
  setStep: (step: TransferStep) => void;
  selectedMode: AccessMode;
  setSelectedMode: (mode: AccessMode) => void;
  selectedPolicy: PolicyRecord;
  assets: AssetRecord[];
  visibleAssets: AssetRecord[];
  selectedAsset: AssetRecord;
  selectedAssetId: string;
  setSelectedAssetId: (id: string) => void;
  mintName: string;
  setMintName: (name: string) => void;
  mintOwner: AssetRecord["owner"];
  setMintOwner: (owner: AssetRecord["owner"]) => void;
  mintMode: AccessMode;
  setMintMode: (mode: AccessMode) => void;
  mintAsset: () => void;
  accessRequester: AccessRequest["requester"];
  setAccessRequester: (requester: AccessRequest["requester"]) => void;
  evaluateAccess: () => void;
  accessRequests: AccessRequest[];
  transferTo: AssetRecord["owner"];
  setTransferTo: (owner: AssetRecord["owner"]) => void;
  transfers: TransferRecord[];
  createTransfer: () => void;
  advanceTransfer: (id: string) => void;
  receipts: ReceiptRecord[];
  policies: PolicyRecord[];
  togglePolicy: (id: AccessMode) => void;
  updateAssetStatus: (id: string, status: AssetStatus) => void;
  generateProof: () => void;
  proofBundle: string;
  resetSimulation: () => void;
  apiStatus: "Connecting" | "API synced" | "Browser local";
  audit: AuditRecord[];
  setPage: (page: Page) => void;
};

function OverviewPage({ step, setStep, selectedMode, setSelectedMode, selectedPolicy, selectedAsset, receipts, audit, setPage }: PageProps) {
  const stepIndex = steps.findIndex((item) => item.id === step);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  return (
    <>
      <section className="hero-band">
        <div className="hero-copy">
          <h1>Transferable Cryptographic Access Rights</h1>
          <p>The asset stays fixed. The capability moves. Access moves with it.</p>
          <span className="managed-pill">
            <ShieldCheck size={18} /> Managed Access
          </span>
        </div>
        <AssetCube />
        <div className="ownership-flow">
          <Owner name="Alice" role={selectedAsset.owner === "Alice" ? "Current Owner" : "Old Owner"} variant="alice" />
          <div className="flow-arrow">
            <Sparkles size={20} />
            <span>Capability UTXO moves. Rights move with it.</span>
          </div>
          <Owner name="Bob" role={selectedAsset.owner === "Bob" ? "Current Owner" : "New Owner"} variant="bob" />
        </div>
        <div className="future-card">
          <strong>Managed Future Access</strong>
          <span><Check size={15} /> Future access controlled</span>
          <span><Check size={15} /> Revocation capable</span>
          <span><Check size={15} /> Auditably provable</span>
        </div>
      </section>

      <section className="grid">
        <Panel title="Current Capability" icon={<Layers3 size={18} />} className="capability">
          <KeyValue label="Current Outpoint" value={selectedAsset.outpoint} />
          <KeyValue label="Asset Hash" value={selectedAsset.hash} accent />
          <KeyValue label="Owner (PKH)" value={selectedAsset.ownerKey} />
          <KeyValue label="Epoch" value={String(selectedAsset.epoch)} />
          <KeyValue label="Status" value={selectedAsset.status} pill />
          <hr />
          <KeyValue label="Controller" value="Alice (Controller ID)" badge />
          <KeyValue label="Policy" value={selectedAsset.mode} />
          <KeyValue label="Finality" value="6+ Confirmed" violet />
        </Panel>

        <Panel title="Managed Transfer" icon={<Activity size={18} />} className="transfer">
          <TransferStepper step={step} setStep={setStep} />
          <div className="progress-row">
            <span>{step === "transfer" ? "Transfer In Progress" : `${steps[stepIndex].label} Stage`}</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <div className="progress-track">
            <i style={{ width: `${progress}%` }} />
          </div>
          <div className="transfer-party-row">
            <Party name="Alice" keyText="03aa...1111" />
            <Send size={24} />
            <Party name="Bob" keyText="02bb...2222" />
            <div className="epoch-box">
              <span>Current Epoch</span>
              <strong>{selectedAsset.epoch}</strong>
            </div>
          </div>
        </Panel>

        <Panel title="Access Verifier" icon={<ShieldCheck size={18} />} className="verifier">
          <span className="live-badge">Live</span>
          <KeyValue label="Challenge" value="7f3a...c91d" />
          <KeyValue label="Signed Request" value="d9b2...aa90" />
          <KeyValue label="Verification Trace" value="Valid" pill />
          <KeyValue label="Policy" value={selectedMode} />
          <hr />
          <KeyValue label="Outcome" value={receipts[0]?.kind ?? "Ready"} pill />
          <KeyValue label="Receipt ID" value={receipts[0]?.id ?? "pending"} />
          <button className="primary-action" onClick={() => setPage("Receipts")}>
            View Receipts
            <ExternalLink size={16} />
          </button>
        </Panel>

        <Panel title="Access Policy" icon={<ShieldCheck size={18} />} className="policy">
          <div className="mode-list">
            {["LOCAL_DECRYPT_DEMO", "CONTROLLED_VIEWER_MVP", "TEE_THRESHOLD_FUTURE"].map((id) => (
              <button key={id} className={selectedMode === id ? "mode active" : "mode"} onClick={() => setSelectedMode(id as AccessMode)}>
                <span>
                  <strong>{id}</strong>
                  <small>{id === selectedPolicy.id ? selectedPolicy.copy : "Available managed access mode."}</small>
                </span>
                <em>{id === selectedPolicy.id ? selectedPolicy.state : "Mode"}</em>
              </button>
            ))}
          </div>
          <button className="secondary-action" onClick={() => setPage("Policies")}>
            View Policy Details
            <ExternalLink size={16} />
          </button>
        </Panel>

        <Panel title="Activity Timeline" icon={<Activity size={18} />} action="View All" className="timeline">
          <div className="timeline-list">
            {audit.slice(0, 4).map((item) => (
              <TimelineEvent key={item.id} title={item.event} detail={item.target} time={item.time} result={item.result} />
            ))}
          </div>
        </Panel>

        <Panel title="Secure Asset (Fixed)" icon={<Box size={18} />} action="AES-256-GCM" className="asset-panel">
          <div className="asset-layout">
            <AssetCube compact />
            <div className="manifest">
              <strong>Asset Manifest</strong>
              <KeyValue label="Name" value={selectedAsset.name} />
              <KeyValue label="Type" value={selectedAsset.type} />
              <KeyValue label="Size" value={selectedAsset.size} />
              <KeyValue label="Asset Hash" value={selectedAsset.hash} accent />
              <KeyValue label="Location" value="On-chain (BSV)" good />
            </div>
          </div>
          <div className="fixed-note">
            <LockKeyhole size={17} />
            The encrypted asset never moves.
            <strong>Fixed</strong>
          </div>
        </Panel>

        <Panel title="Receipts & Proofs" icon={<FileCheck2 size={18} />} action="View All" className="receipts">
          <ReceiptList receipts={receipts.slice(0, 3)} />
          <button className="secondary-action" onClick={() => setPage("Receipts")}>
            Generate Proof
            <ExternalLink size={16} />
          </button>
        </Panel>
      </section>
    </>
  );
}

function MintPage({ mintName, setMintName, mintOwner, setMintOwner, mintMode, setMintMode, mintAsset, policies }: PageProps) {
  return (
    <section className="page-grid two">
      <Panel title="Mint Capability" icon={<Plus size={18} />} className="tool-panel">
        <div className="form-grid">
          <label>
            Asset Name
            <input value={mintName} onChange={(event) => setMintName(event.target.value)} />
          </label>
          <label>
            Initial Owner
            <select value={mintOwner} onChange={(event) => setMintOwner(event.target.value as AssetRecord["owner"])}>
              <option>Alice</option>
              <option>Bob</option>
              <option>Controller</option>
            </select>
          </label>
          <label>
            Access Policy
            <select value={mintMode} onChange={(event) => setMintMode(event.target.value as AccessMode)}>
              {policies.map((policy) => <option key={policy.id}>{policy.id}</option>)}
            </select>
          </label>
          <button className="primary-action inline-action" onClick={mintAsset}>
            Mint Asset Capability
            <BadgeCheck size={16} />
          </button>
        </div>
      </Panel>
      <Panel title="Mint Preview" icon={<Box size={18} />} className="asset-panel">
        <div className="asset-layout">
          <AssetCube compact />
          <div className="manifest">
            <strong>New Manifest</strong>
            <KeyValue label="Name" value={mintName || "untitled.enc"} />
            <KeyValue label="Owner" value={mintOwner} />
            <KeyValue label="Policy" value={mintMode} />
            <KeyValue label="Initial Epoch" value="0" />
            <KeyValue label="KMS State" value="Ready" pill />
          </div>
        </div>
        <div className="fixed-note">
          <LockKeyhole size={17} />
          Minting commits the encrypted asset hash and controller-managed key state.
          <strong>Fixed</strong>
        </div>
      </Panel>
    </section>
  );
}

function AssetsPage({ visibleAssets, selectedAssetId, selectedAsset, setSelectedAssetId, setPage, updateAssetStatus }: PageProps) {
  return (
    <section className="page-grid">
      <Panel title="Asset Registry" icon={<DatabaseZap size={18} />} className="wide-panel">
        <DataTable
          headers={["Asset", "Owner", "Epoch", "Policy", "Status", "Hash"]}
          rows={visibleAssets.map((asset) => ({
            id: asset.id,
            active: asset.id === selectedAssetId,
            cells: [asset.name, asset.owner, String(asset.epoch), asset.mode, asset.status, asset.hash],
            onClick: () => setSelectedAssetId(asset.id),
          }))}
        />
      </Panel>
      <Panel title="Asset Actions" icon={<ShieldCheck size={18} />} className="tool-panel">
        <div className="selected-summary">
          <strong>{selectedAsset.name}</strong>
          <span>{selectedAsset.owner} / epoch {selectedAsset.epoch}</span>
          <em>{selectedAsset.status}</em>
        </div>
        <div className="action-stack">
          <button onClick={() => setPage("Access")}><Eye size={16} /> Request Access</button>
          <button onClick={() => setPage("Transfers")}><Send size={16} /> Transfer Capability</button>
          <button onClick={() => setPage("Receipts")}><FileCheck2 size={16} /> View Receipts</button>
          <button onClick={() => updateAssetStatus(selectedAsset.id, selectedAsset.status === "Frozen" ? "Active" : "Frozen")}>
            <LockKeyhole size={16} /> {selectedAsset.status === "Frozen" ? "Unfreeze Asset" : "Freeze Asset"}
          </button>
        </div>
      </Panel>
    </section>
  );
}

function AccessPage({ selectedAsset, accessRequester, setAccessRequester, evaluateAccess, accessRequests }: PageProps) {
  return (
    <section className="page-grid two">
      <Panel title="Access Request Console" icon={<UserRoundCheck size={18} />} className="tool-panel">
        <div className="form-grid">
          <KeyValue label="Asset" value={selectedAsset.name} />
          <KeyValue label="Current Owner" value={selectedAsset.owner} />
          <KeyValue label="Epoch" value={String(selectedAsset.epoch)} />
          <label>
            Requester
            <select value={accessRequester} onChange={(event) => setAccessRequester(event.target.value as AccessRequest["requester"])}>
              <option>Alice</option>
              <option>Bob</option>
              <option>Mallory</option>
            </select>
          </label>
          <button className="primary-action inline-action" onClick={evaluateAccess}>
            Verify & Issue Receipt
            <ShieldCheck size={16} />
          </button>
        </div>
      </Panel>
      <Panel title="Request Queue" icon={<Activity size={18} />} className="wide-panel">
        <DataTable
          headers={["Request", "Requester", "Mode", "Decision", "Reason"]}
          rows={accessRequests.map((request) => ({
            id: request.id,
            cells: [request.id, request.requester, request.mode, request.status, request.reason],
          }))}
        />
      </Panel>
    </section>
  );
}

function TransfersPage({ selectedAsset, transferTo, setTransferTo, transfers, createTransfer, advanceTransfer }: PageProps) {
  return (
    <section className="page-grid two">
      <Panel title="Transfer Builder" icon={<Send size={18} />} className="tool-panel">
        <div className="form-grid">
          <KeyValue label="Asset" value={selectedAsset.name} />
          <KeyValue label="From" value={selectedAsset.owner} />
          <KeyValue label="Current Epoch" value={String(selectedAsset.epoch)} />
          <label>
            New Owner
            <select value={transferTo} onChange={(event) => setTransferTo(event.target.value as AssetRecord["owner"])}>
              <option>Alice</option>
              <option>Bob</option>
              <option>Controller</option>
            </select>
          </label>
          <button className="primary-action inline-action" onClick={createTransfer}>
            Prepare Transfer
            <Send size={16} />
          </button>
        </div>
      </Panel>
      <Panel title="Transfer Pipeline" icon={<Activity size={18} />} className="wide-panel">
        <div className="transfer-list">
          {transfers.map((transfer) => (
            <div className="transfer-card" key={transfer.id}>
              <div>
                <strong>{transfer.from} {"->"} {transfer.to}</strong>
                <span>{transfer.id} / {transfer.precommitment}</span>
              </div>
              <TransferStepper step={transfer.step} />
              <button disabled={transfer.status === "Finalized"} onClick={() => advanceTransfer(transfer.id)}>
                {transfer.status === "Finalized" ? "Finalized" : "Advance"}
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function ReceiptsPage({ receipts, generateProof, proofBundle }: PageProps) {
  return (
    <section className="page-grid">
      <Panel title="Receipts & Proofs" icon={<FileCheck2 size={18} />} className="wide-panel">
        <DataTable
          headers={["Receipt", "Kind", "Subject", "Policy", "Trace", "Time"]}
          rows={receipts.map((receipt) => ({
            id: receipt.id,
            cells: [receipt.id, receipt.kind, receipt.subject, receipt.policy, receipt.trace, receipt.time],
            onClick: () => copyText(receipt.id),
          }))}
        />
      </Panel>
      <Panel title="Proof Inspector" icon={<BadgeCheck size={18} />} className="tool-panel">
        <ReceiptList receipts={receipts.slice(0, 5)} />
        <button className="secondary-action" onClick={generateProof}>
          Generate Proof Bundle
          <ExternalLink size={16} />
        </button>
        {proofBundle && <pre className="proof-box">{proofBundle}</pre>}
      </Panel>
    </section>
  );
}

function PoliciesPage({ policies, togglePolicy }: PageProps) {
  return (
    <section className="page-grid">
      <Panel title="Policy Modes" icon={<ShieldCheck size={18} />} className="wide-panel">
        <div className="policy-grid">
          {policies.map((policy) => (
            <button className="policy-card" key={policy.id} onClick={() => togglePolicy(policy.id)}>
              <span>
                <strong>{policy.id}</strong>
                <small>{policy.copy}</small>
              </span>
              <em>{policy.state}</em>
              <KeyValue label="Grant TTL" value={`${policy.ttl}s`} />
              <KeyValue label="Downloads" value={policy.allowDownload ? "Allowed" : "Blocked"} />
              <KeyValue label="Finality" value={policy.requireFinality ? "Required" : "Optional"} />
            </button>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function AuditPage({ audit }: PageProps) {
  return (
    <section className="page-grid">
      <Panel title="Audit Ledger" icon={<Braces size={18} />} className="wide-panel">
        <DataTable
          headers={["Event", "Actor", "Target", "Result", "Time"]}
          rows={audit.map((item) => ({
            id: item.id,
            cells: [item.event, item.actor, item.target, item.result, item.time],
          }))}
        />
      </Panel>
    </section>
  );
}

function IdentitiesPage({ assets, accessRequests }: PageProps) {
  const identities = [
    { name: "Alice", role: "Controller / owner", pkh: "03aa...1111", assets: assets.filter((asset) => asset.owner === "Alice").length },
    { name: "Bob", role: "Owner", pkh: "02bb...2222", assets: assets.filter((asset) => asset.owner === "Bob").length },
    { name: "Controller", role: "Policy authority", pkh: "04cc...3333", assets: assets.filter((asset) => asset.owner === "Controller").length },
    { name: "Mallory", role: "External requester", pkh: "ff00...bad0", assets: 0 },
  ];
  return (
    <section className="page-grid">
      <Panel title="Identities" icon={<Fingerprint size={18} />} className="wide-panel">
        <DataTable
          headers={["Identity", "Role", "PubKey Hash", "Current Assets", "Requests"]}
          rows={identities.map((identity) => ({
            id: identity.name,
            cells: [
              identity.name,
              identity.role,
              identity.pkh,
              String(identity.assets),
              String(accessRequests.filter((request) => request.requester === identity.name).length),
            ],
          }))}
        />
      </Panel>
      <Panel title="Identity Notes" icon={<UserRoundCheck size={18} />} className="tool-panel">
        <div className="note-stack">
          <span><Check size={15} /> Access is granted only when requester PKH matches current capability owner.</span>
          <span><Check size={15} /> Stale owners may keep past knowledge, but future managed grants stop.</span>
          <span><Check size={15} /> Controller activity is receipt-backed and audit-visible.</span>
        </div>
      </Panel>
    </section>
  );
}

function KeysPage({ selectedAsset, policies }: PageProps) {
  const policy = policies.find((item) => item.id === selectedAsset.mode);
  return (
    <section className="page-grid two">
      <Panel title="KMS Record" icon={<KeyRound size={18} />} className="tool-panel">
        <div className="form-grid">
          <KeyValue label="Asset" value={selectedAsset.name} />
          <KeyValue label="Key State" value={selectedAsset.status === "Active" ? "Active" : "Blocked"} pill={selectedAsset.status === "Active"} />
          <KeyValue label="Wrapping Key" value="local-dev-kek-v1" />
          <KeyValue label="Grant TTL" value={`${policy?.ttl ?? 0}s`} />
          <KeyValue label="Owner PKH" value={selectedAsset.ownerKey} />
        </div>
      </Panel>
      <Panel title="Release Conditions" icon={<ShieldCheck size={18} />} className="wide-panel">
        <div className="note-stack">
          <span><Check size={15} /> Capability outpoint must be current.</span>
          <span><Check size={15} /> Epoch must match active KMS record.</span>
          <span><Check size={15} /> Policy state must be active.</span>
          <span><Check size={15} /> Frozen assets deny new managed access requests.</span>
        </div>
      </Panel>
    </section>
  );
}

function SettingsPage({ resetSimulation, assets, receipts, transfers, audit, apiStatus }: PageProps) {
  return (
    <section className="page-grid two">
      <Panel title="Workspace Settings" icon={<Settings size={18} />} className="tool-panel">
        <div className="form-grid">
          <KeyValue label="Persistence" value="Local Browser" pill />
          <KeyValue label="Gateway" value={apiStatus} />
          <KeyValue label="Assets" value={String(assets.length)} />
          <KeyValue label="Receipts" value={String(receipts.length)} />
          <KeyValue label="Transfers" value={String(transfers.length)} />
          <KeyValue label="Audit Events" value={String(audit.length)} />
          <button className="primary-action inline-action" onClick={resetSimulation}>
            Reset Simulation
            <Settings size={16} />
          </button>
        </div>
      </Panel>
      <Panel title="Runtime Health" icon={<Activity size={18} />} className="wide-panel">
        <div className="health-grid">
          <StatusTile label="Indexer" value="Synced" />
          <StatusTile label="Controller" value="Online" />
          <StatusTile label="KMS" value="Ready" />
          <StatusTile label="Receipt Store" value="Writable" />
        </div>
      </Panel>
    </section>
  );
}

function Panel({ title, icon, action, className = "", children }: { title: string; icon: ReactNode; action?: string; className?: string; children: ReactNode }) {
  return (
    <article className={`panel ${className}`}>
      <header>
        <span className="panel-title">
          {icon}
          {title}
        </span>
        {action && <button>{action}</button>}
      </header>
      {children}
    </article>
  );
}

function KeyValue({ label, value, accent, pill, badge, violet, good }: { label: string; value: string; accent?: boolean; pill?: boolean; badge?: boolean; violet?: boolean; good?: boolean }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <strong className={`${accent ? "accent" : ""} ${pill ? "pill" : ""} ${violet ? "violet" : ""} ${good ? "good" : ""}`}>
        {good && <span className="status-dot" />}
        {value}
        {!pill && !violet && !good && <Copy size={13} />}
        {badge && <BadgeCheck size={15} />}
      </strong>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<{ id: string; cells: string[]; active?: boolean; onClick?: () => void }> }) {
  return (
    <div className="data-table" role="table">
      <div className="data-row head" role="row">
        {headers.map((header) => <span key={header}>{header}</span>)}
      </div>
      {rows.map((row) => (
        <button className={row.active ? "data-row active" : "data-row"} key={row.id} onClick={row.onClick} role="row">
          {row.cells.map((cell, index) => <span key={`${row.id}-${index}`}>{cell}</span>)}
        </button>
      ))}
    </div>
  );
}

function TransferStepper({ step, setStep }: { step: TransferStep; setStep?: (step: TransferStep) => void }) {
  const stepIndex = steps.findIndex((item) => item.id === step);
  return (
    <div className="steps">
      {steps.map((item, index) => (
        <button key={item.id} className={index <= stepIndex ? "step active" : "step"} onClick={() => setStep?.(item.id)} disabled={!setStep}>
          <span>{index + 1}</span>
          <strong>{item.label}</strong>
          <small>{item.detail}</small>
        </button>
      ))}
    </div>
  );
}

function ReceiptList({ receipts }: { receipts: ReceiptRecord[] }) {
  return (
    <div className="receipt-list">
      {receipts.map((receipt) => (
        <button className="receipt" key={receipt.id} onClick={() => copyText(receipt.id)}>
          {receipt.ok ? <BadgeCheck size={19} /> : <XCircle size={19} />}
          <strong>{receipt.id}</strong>
          <span className={receipt.ok ? "ok" : "deny"}>{receipt.kind}</span>
          <time>{receipt.time}</time>
        </button>
      ))}
    </div>
  );
}

function TimelineEvent({ title, detail, time, result }: { title: string; detail: string; time: string; result: AuditRecord["result"] }) {
  const tone = result === "Denied" ? "deny" : result === "Updated" ? "warn" : result === "Accepted" ? "good" : "info";
  return (
    <div className={`timeline-event ${tone}`}>
      <i />
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <time>{time}</time>
      <em>{result}</em>
    </div>
  );
}

function AssetCube({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "asset-cube compact-cube" : "asset-cube"}>
      <span className="cube-label">Encrypted Asset (Fixed)</span>
      <div className="cube-stage">
        <div className="cube">
          <i className="side front" />
          <i className="side top" />
          <i className="side right" />
          <LockKeyhole className="cube-lock" size={compact ? 24 : 34} />
        </div>
      </div>
      {!compact && (
        <small>
          Asset Hash <b>b1f7...9a3c</b>
        </small>
      )}
    </div>
  );
}

function Owner({ name, role, variant }: { name: string; role: string; variant: "alice" | "bob" }) {
  return (
    <div className={`owner ${variant}`}>
      <div className="avatar">
        <User size={25} />
      </div>
      <strong>{name}</strong>
      <span>{role}</span>
    </div>
  );
}

function Party({ name, keyText }: { name: string; keyText: string }) {
  return (
    <div className="party">
      <div className="mini-avatar">
        <User size={16} />
      </div>
      <span>
        <strong>{name}</strong>
        <small>{keyText}</small>
      </span>
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-tile">
      <span className="status-dot" />
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

declare global {
  interface Window {
    __caputxoRoot?: Root;
  }
}

const rootElement = document.getElementById("root")!;
window.__caputxoRoot ??= createRoot(rootElement);
window.__caputxoRoot.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
