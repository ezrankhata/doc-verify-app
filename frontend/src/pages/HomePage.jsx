import { Upload, ShieldCheck, FileSearch, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { useBlockchain } from "../context/BlockchainContext";

export default function HomePage({ setPage }) {
  const { isConnected, connect, isConnecting, hasMetaMask } = useBlockchain();

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-eyebrow">
          <ShieldCheck size={13} />
          Powered by Ethereum Blockchain
        </div>
        <h1 className="hero-title">
          Document Verification<br />
          <span>You Can Trust</span>
        </h1>
        <p className="hero-sub">
          Upload any document, generate its SHA-256 fingerprint in your browser,
          and anchor it permanently on the Ethereum blockchain. Prove authenticity
          and ownership — without a central authority.
        </p>
        <div className="hero-btns">
          {isConnected ? (
            <>
              <button className="btn btn-primary btn-lg" onClick={() => setPage("register")}>
                Register Document <ArrowRight size={16} />
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => setPage("verify")}>
                Verify Document
              </button>
            </>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={connect} disabled={isConnecting || !hasMetaMask}>
              {isConnecting ? <><span className="spinner" /> Connecting</> : <>Connect Wallet <ArrowRight size={16} /></>}
            </button>
          )}
        </div>
        {!hasMetaMask && (
          <p className="text-muted text-sm" style={{ marginTop: 14 }}>
            MetaMask is required to use this platform.{" "}
            <a href="https://metamask.io" target="_blank" rel="noreferrer" style={{ color: "var(--blue)" }}>Install MetaMask</a>
          </p>
        )}
      </div>

      {/* Features */}
      <div className="feature-grid">
        {[
          {
            icon: <Upload size={22} />,
            title: "Register Documents",
            desc: "Upload any file — the SHA-256 hash is computed locally in your browser. Only the hash is stored on-chain.",
          },
          {
            icon: <FileSearch size={22} />,
            title: "Instant Verification",
            desc: "Re-upload a document to verify it. A matching on-chain record proves it is authentic and untampered.",
          },
          {
            icon: <ShieldCheck size={22} />,
            title: "QR Code Stamping",
            desc: "After registration, a QR code is embedded into your PDF. Anyone can scan it to verify instantly.",
          },
          {
            icon: <Lock size={22} />,
            title: "Immutable Records",
            desc: "Records stored on Ethereum cannot be altered or deleted — your ownership is permanent and trustless.",
          },
        ].map(({ icon, title, desc }) => (
          <div className="feature-card" key={title}>
            <div className="feature-icon">{icon}</div>
            <div className="feature-title">{title}</div>
            <div className="feature-desc">{desc}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="how-card">
        <h3>How It Works</h3>
        <div className="how-steps">
          {[
            "Connect your MetaMask wallet to the platform.",
            "Upload a document — it is hashed with SHA-256 entirely in your browser.",
            "Click Register — MetaMask signs the transaction and stores the hash on-chain.",
            "Download your document with the QR code stamped on it.",
            "Anyone can scan the QR code or upload the file to verify authenticity instantly.",
          ].map((step, i) => (
            <div className="how-step" key={i}>
              <div className="how-step-num">{i + 1}</div>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
