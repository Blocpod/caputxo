import { StrictMode, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
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
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  UserRoundCheck,
  X,
} from "lucide-react";
import "./styles.css";

type TransferStep = "prepare" | "precommit" | "transfer" | "finalize";
type AccessMode = "LOCAL_DECRYPT_DEMO" | "CONTROLLED_VIEWER_MVP" | "TEE_THRESHOLD_FUTURE";

const nav = [
  ["Overview", Hexagon],
  ["Mint", Box],
  ["Assets", DatabaseZap],
  ["Access", UserRoundCheck],
  ["Transfers", Send],
  ["Receipts", FileCheck2],
  ["Policies", ShieldCheck],
  ["Audit", Braces],
] as const;

const systemNav = [
  ["Identities", Fingerprint],
  ["Keys", KeyRound],
  ["Settings", Settings],
] as const;

const steps: Array<{ id: TransferStep; label: string; detail: string }> = [
  { id: "prepare", label: "Prepare", detail: "Policy & terms" },
  { id: "precommit", label: "Precommit", detail: "State commit" },
  { id: "transfer", label: "Transfer", detail: "Capability moves" },
  { id: "finalize", label: "Finalize", detail: "Epoch advances" },
];

const modes: Array<{ id: AccessMode; name: string; state: string; copy: string }> = [
  {
    id: "LOCAL_DECRYPT_DEMO",
    name: "Local Decrypt Demo",
    state: "Active",
    copy: "Controller may release an expiring DEK package to the current owner.",
  },
  {
    id: "CONTROLLED_VIEWER_MVP",
    name: "Controlled Viewer MVP",
    state: "Active",
    copy: "Managed viewer access with signed receipts and no stale grants.",
  },
  {
    id: "TEE_THRESHOLD_FUTURE",
    name: "TEE Threshold Future",
    state: "Planned",
    copy: "Future hardened execution path for threshold or enclave release.",
  },
];

const receipts = [
  ["rct_9e7c...b22f", "Access Granted", "9:43 PM", true],
  ["rct_12ab...44ef", "Access Denied", "9:12 PM", false],
  ["rct_0aa1...77cc", "Access Granted", "8:55 PM", true],
] as const;

const events = [
  ["Grant Issued", "to Alice", "25 Apr 26, 8:12 PM", "Epoch 0", "good"],
  ["Transfer Finalized", "to Bob", "25 Apr 26, 9:42 PM", "Epoch 1", "info"],
  ["Epoch Advanced", "from 0 -> 1", "25 Apr 26, 9:42 PM", "", "warn"],
  ["Access Attempt", "Accepted", "25 Apr 26, 9:43 PM", "", "good"],
] as const;

const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // The dashboard remains usable in browsers that block clipboard access.
  }
};

function App() {
  const [step, setStep] = useState<TransferStep>("transfer");
  const [mode, setMode] = useState<AccessMode>("CONTROLLED_VIEWER_MVP");
  const stepIndex = steps.findIndex((item) => item.id === step);
  const modeCopy = useMemo(() => modes.find((item) => item.id === mode)!, [mode]);
  const progress = ((stepIndex + 1) / steps.length) * 100;

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
            <button className={label === "Overview" ? "nav-item active" : "nav-item"} key={label}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <nav className="nav-block system" aria-label="System">
          <span className="nav-kicker">System</span>
          {systemNav.map(([label, Icon]) => (
            <button className="nav-item" key={label}>
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
            <input aria-label="Search command" placeholder="Search or type a command..." />
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
              <img src="/caputxo-reference.png" alt="" />
              <span>
                <strong>Alice</strong>
                <small>Controller</small>
              </span>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>

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
            <Owner name="Alice" role="Old Owner" variant="alice" />
            <div className="flow-arrow">
              <Sparkles size={20} />
              <span>Capability UTXO moves. Rights move with it.</span>
            </div>
            <Owner name="Bob" role="New Owner" variant="bob" />
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
            <KeyValue label="Current Outpoint" value="a1b2c3d4e5f6...:1" />
            <KeyValue label="State Hash" value="45e8...7c2f" />
            <KeyValue label="Asset Hash" value="b1f7...9a3c" accent />
            <KeyValue label="Owner (PKH)" value={stepIndex >= 2 ? "02bb...2222" : "03ab...cdef"} />
            <KeyValue label="Epoch" value={stepIndex >= 3 ? "1" : "0"} />
            <KeyValue label="Status" value="Active" pill />
            <hr />
            <KeyValue label="Controller" value="Alice (Controller ID)" badge />
            <KeyValue label="Verified At" value="25 Apr 2026, 9:43 PM" />
            <KeyValue label="Finality" value="6+ Confirmed" violet />
          </Panel>

          <Panel title="Managed Transfer" icon={<Activity size={18} />} className="transfer">
            <div className="steps">
              {steps.map((item, index) => (
                <button
                  key={item.id}
                  className={index <= stepIndex ? "step active" : "step"}
                  onClick={() => setStep(item.id)}
                >
                  <span>{index + 1}</span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </button>
              ))}
            </div>
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
                <span>Target Epoch</span>
                <strong>1</strong>
              </div>
            </div>
          </Panel>

          <Panel title="Access Verifier" icon={<ShieldCheck size={18} />} className="verifier">
            <span className="live-badge">Live</span>
            <KeyValue label="Challenge" value="7f3a...c91d" />
            <KeyValue label="Signed Request" value="d9b2...aa90" />
            <KeyValue label="Verification Trace" value="Valid" pill />
            <KeyValue label="Policy" value={mode} />
            <hr />
            <KeyValue label="Outcome" value="Signed Receipt" pill />
            <KeyValue label="Receipt ID" value="rct_9e7c...b22f" />
            <button className="primary-action">
              View Receipt
              <ExternalLink size={16} />
            </button>
          </Panel>

          <Panel title="Access Policy" icon={<ShieldCheck size={18} />} className="policy">
            <div className="mode-list">
              {modes.map((item) => (
                <button
                  key={item.id}
                  className={mode === item.id ? "mode active" : "mode"}
                  onClick={() => setMode(item.id)}
                >
                  <span>
                    <strong>{item.id}</strong>
                    <small>{item.copy}</small>
                  </span>
                  <em>{item.state}</em>
                </button>
              ))}
            </div>
            <button className="secondary-action">
              View Policy Details
              <ExternalLink size={16} />
            </button>
          </Panel>

          <Panel title="Activity Timeline" icon={<Activity size={18} />} action="View All" className="timeline">
            <div className="timeline-list">
              {events.map(([title, detail, time, epoch, tone]) => (
                <div className={`timeline-event ${tone}`} key={`${title}-${time}`}>
                  <i />
                  <span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </span>
                  <time>{time}</time>
                  {epoch && <em>{epoch}</em>}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Secure Asset (Fixed)" icon={<Box size={18} />} action="AES-256-GCM" className="asset-panel">
            <div className="asset-layout">
              <AssetCube compact />
              <div className="manifest">
                <strong>Asset Manifest</strong>
                <KeyValue label="Name" value="design_spec.pdf.enc" />
                <KeyValue label="Type" value="application/octet-stream" />
                <KeyValue label="Size" value="2.48 MB" />
                <KeyValue label="Asset Hash" value="b1f7...9a3c" accent />
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
            <div className="receipt-list">
              {receipts.map(([id, decision, time, ok]) => (
                <button className="receipt" key={id} onClick={() => copyText(id)}>
                  {ok ? <BadgeCheck size={19} /> : <X size={19} />}
                  <strong>{id}</strong>
                  <span className={ok ? "ok" : "deny"}>{decision}</span>
                  <time>{time}</time>
                </button>
              ))}
            </div>
            <button className="secondary-action">
              Generate Proof
              <ExternalLink size={16} />
            </button>
          </Panel>
        </section>

        <footer className="footer">
          <span><span className="status-dot" /> BSV Testnet</span>
          <span>Blockchain Height <strong>849,231</strong></span>
          <span>Network Time <strong>25 Apr 2026, 9:43:21 PM</strong></span>
          <span>Finality <strong>6+ Confirmations</strong></span>
          <span>Protocol <strong>CapUTXO v1.0</strong></span>
          <span className="ops"><span className="status-dot" /> All Systems Operational</span>
        </footer>
      </section>

      <aside className="mode-drawer">
        <div>
          <span className="drawer-kicker">Selected Policy</span>
          <h2>{modeCopy.name}</h2>
          <p>{modeCopy.copy}</p>
        </div>
        <button onClick={() => setStep("prepare")}>
          <RotateCcw size={16} /> Replay Transfer
        </button>
        <button onClick={() => setMode("CONTROLLED_VIEWER_MVP")}>
          <Eye size={16} /> Viewer MVP
        </button>
      </aside>
    </main>
  );
}

function Panel({
  title,
  icon,
  action,
  className = "",
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: string;
  className?: string;
  children: ReactNode;
}) {
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

function KeyValue({
  label,
  value,
  accent,
  pill,
  badge,
  violet,
  good,
}: {
  label: string;
  value: string;
  accent?: boolean;
  pill?: boolean;
  badge?: boolean;
  violet?: boolean;
  good?: boolean;
}) {
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
