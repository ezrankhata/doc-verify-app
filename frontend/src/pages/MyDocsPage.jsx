import { useEffect } from "react";
import { FolderOpen, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { useBlockchain } from "../context/BlockchainContext";

export default function MyDocsPage() {
  const { isConnected, address, connect, isConnecting, hasMetaMask, ownerDocs, isFetching, fetchOwnerDocs, docError } = useBlockchain();

  useEffect(() => {
    if (isConnected && address) fetchOwnerDocs(address);
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">My Documents</h1>
          <p className="page-sub">View all documents registered under your wallet address.</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "48px 28px" }}>
          <div className="feature-icon" style={{ margin: "0 auto 16px" }}><FolderOpen size={22} /></div>
          <p className="text-muted" style={{ marginBottom: 20 }}>Connect your wallet to view your registered documents.</p>
          <button className="btn btn-primary" onClick={connect} disabled={isConnecting || !hasMetaMask}>
            {isConnecting ? <><span className="spinner" /> Connecting</> : "Connect Wallet"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Documents</h1>
        <p className="page-sub">
          All document hashes registered on-chain by{" "}
          <span style={{ fontFamily: "monospace", color: "var(--blue)", fontSize: 13 }}>
            {address?.slice(0, 10)}...{address?.slice(-6)}
          </span>
        </p>
      </div>

      <div className="card">
        <div className="flex-between" style={{ marginBottom: 22 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            <FolderOpen size={18} style={{ color: "var(--blue)" }} />
            Registered Documents
            {!isFetching && (
              <span style={{
                background: "var(--grad-subtle)", border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: 20, padding: "2px 10px", fontSize: 12, color: "var(--blue)", fontWeight: 700,
              }}>
                {ownerDocs.length}
              </span>
            )}
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => fetchOwnerDocs(address)} disabled={isFetching}>
            {isFetching ? <><span className="spinner" /> Loading</> : <><RefreshCw size={13} /> Refresh</>}
          </button>
        </div>

        {isFetching && (
          <div className="alert alert-info">
            <span className="spinner" /> Fetching your documents from the blockchain…
          </div>
        )}

        {!isFetching && ownerDocs.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div className="feature-icon" style={{ margin: "0 auto 14px" }}><FileText size={22} /></div>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>No documents registered yet</p>
            <p className="text-sm text-muted">Go to the Register page to add your first document.</p>
          </div>
        )}

        {!isFetching && ownerDocs.map((hash, i) => (
          <div key={hash} className="doc-item">
            <span className="doc-num">{i + 1}</span>
            <span className="doc-hash">{hash}</span>
          </div>
        ))}

        {docError && (
          <div className="alert alert-error mt-12">
            <AlertCircle size={15} /> {docError}
          </div>
        )}
      </div>
    </div>
  );
}
