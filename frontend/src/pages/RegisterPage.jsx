import { useRef, useState } from "react";
import { Upload, FileText, Download, AlertCircle, CheckCircle, Loader } from "lucide-react";
import { useBlockchain } from "../context/BlockchainContext";
import { stampPDF, generateQRCard, downloadBlob } from "../utils/pdfStamp";

export default function RegisterPage() {
  const {
    isConnected, address, connect, isConnecting, hasMetaMask,
    selectedFile, hash, isHashing, selectFile, clearFile,
    txState, txReceipt, register, TX_STATE,
    docError, clearDocError,
  } = useBlockchain();

  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [isStamping, setIsStamping] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const isPDF = selectedFile?.name?.toLowerCase().endsWith(".pdf");

  const handleFile = (file) => {
    if (!file) return;
    clearDocError?.();
    setDownloaded(false);
    selectFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDownload = async () => {
    setIsStamping(true);
    try {
      const blob = isPDF
        ? await stampPDF(selectedFile, hash)
        : await generateQRCard(selectedFile.name, hash);
      downloadBlob(blob, isPDF ? `verified_${selectedFile.name}` : `qr_card_${selectedFile.name}.pdf`);
      setDownloaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsStamping(false);
    }
  };

  if (!isConnected) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Register Document</h1>
          <p className="page-sub">Anchor your document's SHA-256 fingerprint permanently on the blockchain.</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "48px 28px" }}>
          <div className="feature-icon" style={{ margin: "0 auto 16px" }}><Upload size={22} /></div>
          <p className="text-muted" style={{ marginBottom: 20 }}>Connect your wallet to register documents.</p>
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
        <h1 className="page-title">Register Document</h1>
        <p className="page-sub">Upload a file to generate its SHA-256 hash and register it on the Ethereum blockchain.</p>
      </div>

      {/* Step 1 */}
      <div className="card">
        <div className="card-title">
          <span className="step-num">1</span>
          Select Document
        </div>

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
              <div className="drop-icon"><FileText size={22} /></div>
              <div className="drop-title">{selectedFile.name}</div>
              <div className="drop-sub">{(selectedFile.size / 1024).toFixed(1)} KB — click to change file</div>
              {!isPDF && (
                <div className="alert alert-warning" style={{ marginTop: 14, textAlign: "left" }}>
                  <AlertCircle size={15} />
                  Non-PDF file — a separate QR card PDF will be generated after registration.
                </div>
              )}
            </>
          ) : (
            <>
              <div className="drop-icon"><Upload size={22} /></div>
              <div className="drop-title">Drop your file here</div>
              <div className="drop-sub">or <span>browse files</span> — any format accepted</div>
            </>
          )}
        </div>

        {isHashing && (
          <div className="alert alert-info">
            <span className="spinner" />
            Computing SHA-256 hash locally in your browser…
          </div>
        )}

        {hash && !isHashing && (
          <>
            <div className="card-title" style={{ marginTop: 22 }}>
              <span className="step-num">2</span>
              Document Hash (SHA-256)
            </div>
            <div className="hash-box">{hash}</div>
            <p className="text-sm text-muted">This fingerprint uniquely identifies your document. The file never left your device.</p>
          </>
        )}
      </div>

      {/* Step 3 — Register */}
      {hash && (
        <div className="card">
          <div className="card-title">
            <span className="step-num">3</span>
            Register on Blockchain
          </div>

          <p className="text-sm text-muted" style={{ marginBottom: 18 }}>
            Registering as:{" "}
            <span style={{ fontFamily: "monospace", color: "var(--blue)", fontSize: 12 }}>{address}</span>
          </p>

          {txState === TX_STATE.PENDING && (
            <div className="alert alert-info">
              <span className="spinner" />
              Waiting for MetaMask confirmation — please check your MetaMask popup.
            </div>
          )}

          {txState === TX_STATE.CONFIRMED && (
            <div className="alert alert-success">
              <CheckCircle size={15} />
              Document successfully registered on the blockchain!
            </div>
          )}

          {txState === TX_STATE.FAILED && (
            <div className="alert alert-error">
              <AlertCircle size={15} />
              {docError || "Transaction failed. Please try again."}
            </div>
          )}

          {txState === TX_STATE.CONFIRMED && txReceipt && (
            <p className="text-xs text-muted" style={{ marginBottom: 16 }}>
              Transaction:{" "}
              <span style={{ fontFamily: "monospace", color: "var(--success)", wordBreak: "break-all" }}>{txReceipt.hash}</span>
            </p>
          )}

          <div className="flex-row">
            <button
              className="btn btn-primary"
              onClick={register}
              disabled={txState === TX_STATE.PENDING || txState === TX_STATE.CONFIRMED}
            >
              {txState === TX_STATE.PENDING
                ? <><span className="spinner" /> Registering…</>
                : txState === TX_STATE.CONFIRMED
                  ? <><CheckCircle size={15} /> Registered</>
                  : "Register Document"
              }
            </button>
            {(txState === TX_STATE.CONFIRMED || txState === TX_STATE.FAILED) && (
              <button className="btn btn-outline" onClick={() => { clearFile(); clearDocError?.(); setDownloaded(false); }}>
                Register Another
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 4 — Download */}
      {txState === TX_STATE.CONFIRMED && (
        <div className="card card-gradient">
          <div className="card-title">
            <span className="step-num">4</span>
            Download Verified Document
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
            {isPDF
              ? "The QR code will be stamped onto your PDF. Anyone who scans it is taken directly to the verification page."
              : "A QR verification card PDF will be generated — attach it to your document before printing or sharing."
            }
          </p>
          <div className="flex-row">
            <button className="btn btn-success" onClick={handleDownload} disabled={isStamping}>
              {isStamping
                ? <><span className="spinner" /> Generating…</>
                : <><Download size={15} /> {isPDF ? "Download PDF with QR" : "Download QR Card"}</>
              }
            </button>
            {downloaded && (
              <span className="flex-row text-sm" style={{ color: "var(--success)", gap: 6 }}>
                <CheckCircle size={14} /> Downloaded
              </span>
            )}
          </div>
        </div>
      )}

      {docError && txState === TX_STATE.IDLE && (
        <div className="alert alert-error">
          <AlertCircle size={15} /> {docError}
        </div>
      )}
    </div>
  );
}
