import { useRef, useState, useEffect } from "react";
import { Upload, QrCode, FileSearch, CheckCircle, AlertCircle, RotateCcw } from "lucide-react";
import { useBlockchain } from "../context/BlockchainContext";
import { verifyDocument } from "../services/blockchainService";
import { getNameByWallet } from "../utils/userStore";

export default function VerifyPage() {
  const {
    isConnected, connect, isConnecting, hasMetaMask,
    selectedFile, hash, hashSource, isHashing, selectFileForVerify, clearFile,
    verify, isVerifying, verifyResult,
    docError, clearDocError,
  } = useBlockchain();

  const inputRef = useRef(null);
  const [drag, setDrag]             = useState(false);
  const [tab, setTab]               = useState("upload");
  const [scanError, setScanError]   = useState(null);
  const [qrResult, setQrResult]     = useState(null);
  const [qrError, setQrError]       = useState(null);
  const [qrVerifying, setQrVerifying] = useState(false);
  const [scannedHash, setScannedHash] = useState(null);
  const scannerRef = useRef(null);

  const handleFile = (file) => { if (!file) return; clearDocError?.(); selectFileForVerify(file); };
  const handleDrop = (e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlHash = params.get("hash");
    if (urlHash) { setTab("scan"); verifyByHash(urlHash); }
  }, []);

  useEffect(() => {
    if (tab !== "scan" || scannedHash) return;
    let scanner;
    const start = async () => {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 260, height: 260 } }, false);
        scanner.render((text) => {
          try {
            const url = new URL(text);
            const h = url.searchParams.get("hash");
            if (h) { setScannedHash(h); scanner.clear().catch(() => {}); verifyByHash(h); }
            else setScanError("QR code found but is not a DocVerify code.");
          } catch { setScanError("Could not read QR code. Make sure it is a DocVerify QR code."); }
        }, () => {});
        scannerRef.current = scanner;
      } catch (err) { setScanError("Could not start camera: " + err.message); }
    };
    start();
    return () => { if (scannerRef.current) scannerRef.current.clear().catch(() => {}); };
  }, [tab, scannedHash]);

  const verifyByHash = async (h) => {
    setQrResult(null); setQrError(null); setQrVerifying(true); setScannedHash(h);
    try {
      const result = await verifyDocument(h);
      setQrResult(result);
    } catch (err) {
      if (err?.reason === "NOT_FOUND" || err?.message?.includes("not found")) setQrResult({ notFound: true });
      else setQrError(err?.message || "Verification failed.");
    } finally { setQrVerifying(false); }
  };

  const resetScan = () => {
    setScannedHash(null); setQrResult(null); setQrError(null); setScanError(null);
    window.history.replaceState({}, "", window.location.pathname);
  };

  if (!isConnected) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Verify Document</h1>
          <p className="page-sub">Check if a document has been registered on the blockchain.</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "48px 28px" }}>
          <div className="feature-icon" style={{ margin: "0 auto 16px" }}><FileSearch size={22} /></div>
          <p className="text-muted" style={{ marginBottom: 20 }}>Connect your wallet to verify documents.</p>
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
        <h1 className="page-title">Verify Document</h1>
        <p className="page-sub">Upload a document to verify its authenticity, or scan the QR code printed on it.</p>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === "upload" ? "active" : ""}`}
          onClick={() => { setTab("upload"); resetScan(); clearFile(); clearDocError?.(); }}>
          <Upload size={14} /> Upload File
        </button>
        <button className={`tab-btn ${tab === "scan" ? "active" : ""}`}
          onClick={() => { setTab("scan"); clearFile(); clearDocError?.(); }}>
          <QrCode size={14} /> Scan QR Code
        </button>
      </div>

      {/* Upload tab */}
      {tab === "upload" && (
        <div className="card">
          <div className="card-title"><span className="step-num">1</span> Select Document to Verify</div>
          <div
            className={`drop-zone ${drag ? "dragover" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
          >
            <input ref={inputRef} type="file" onChange={(e) => handleFile(e.target.files[0])} />
            {selectedFile ? (
              <>
                <div className="drop-icon"><FileSearch size={22} /></div>
                <div className="drop-title">{selectedFile.name}</div>
                <div className="drop-sub">{(selectedFile.size / 1024).toFixed(1)} KB — click to change</div>
              </>
            ) : (
              <>
                <div className="drop-icon"><Upload size={22} /></div>
                <div className="drop-title">Drop your file here</div>
                <div className="drop-sub">or <span>browse files</span></div>
              </>
            )}
          </div>

          {isHashing && (
            <div className="alert alert-info">
              <span className="spinner" /> {hashSource === null ? "Scanning for QR code…" : "Computing hash…"}
            </div>
          )}

          {hash && !isHashing && (
            <>
              {hashSource === "qr" && (
                <div className="alert alert-info" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <QrCode size={15} />
                  <span>QR code detected — verifying by embedded QR hash</span>
                </div>
              )}
              <div className="hash-box">{hash}</div>
              <button className="btn btn-primary" onClick={verify} disabled={isVerifying}>
                {isVerifying ? <><span className="spinner" /> Checking blockchain…</> : <><FileSearch size={15} /> Verify Document</>}
              </button>
            </>
          )}

          {verifyResult && <VerifyResult result={verifyResult} hash={hash} />}
          {docError && <div className="alert alert-error mt-12"><AlertCircle size={15} /> {docError}</div>}
          {verifyResult && (
            <button className="btn btn-outline mt-20" onClick={() => { clearFile(); clearDocError?.(); }}>
              <RotateCcw size={14} /> Verify Another
            </button>
          )}
        </div>
      )}

      {/* Scan tab */}
      {tab === "scan" && (
        <div className="card">
          {!scannedHash ? (
            <>
              <div className="card-title"><span className="step-num">1</span> Scan QR Code</div>
              <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
                Point your camera at the QR code printed on the document.
              </p>
              {scanError
                ? <div className="alert alert-error"><AlertCircle size={15} /> {scanError}</div>
                : <div id="qr-reader" style={{ width: "100%" }} />
              }
            </>
          ) : (
            <>
              <div className="card-title"><CheckCircle size={16} style={{ color: "var(--success)" }} /> QR Code Detected</div>
              <div className="hash-box" style={{ marginBottom: 16 }}>{scannedHash}</div>
              {qrVerifying && <div className="alert alert-info"><span className="spinner" /> Checking blockchain…</div>}
              {qrResult && <VerifyResult result={qrResult} hash={scannedHash} />}
              {qrError && <div className="alert alert-error"><AlertCircle size={15} /> {qrError}</div>}
              <button className="btn btn-outline mt-20" onClick={resetScan}>
                <RotateCcw size={14} /> Scan Another
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function VerifyResult({ result, hash }) {
  if (result.notFound) {
    return (
      <div className="verify-result not-found">
        <div className="result-title" style={{ color: "var(--error)" }}>
          <AlertCircle size={20} /> Document Not Found
        </div>
        <p className="text-sm" style={{ color: "var(--text-2)", lineHeight: 1.7 }}>
          No on-chain record matches this document. It was either never registered,
          or the file has been modified since registration.
        </p>
      </div>
    );
  }

  const ownerName = getNameByWallet(result.owner);

  return (
    <div className="verify-result authentic">
      <div className="result-title" style={{ color: "var(--success)" }}>
        <CheckCircle size={20} /> Authentic Document
      </div>
      <div className="result-row">
        <span className="result-label">Registered By</span>
        <span className="result-value">
          {ownerName
            ? <strong style={{ color: "var(--success)", fontFamily: "inherit", fontSize: 14 }}>{ownerName}</strong>
            : <>{result.owner.slice(0, 10)}...{result.owner.slice(-6)} <span className="text-muted">(unregistered user)</span></>
          }
        </span>
      </div>
      <div className="result-row">
        <span className="result-label">Registered On</span>
        <span className="result-value">{result.timestamp.toLocaleString()}</span>
      </div>
      <div className="result-row">
        <span className="result-label">Document Hash</span>
        <span className="result-value">{hash}</span>
      </div>
    </div>
  );
}
