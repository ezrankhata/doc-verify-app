/**
 * useDocument.js
 * Usage (Student 4):
 *   import useDocument from "../hooks/useDocument";
 *
 *   // On the Upload & Sign page:
 *   const { hash, txState, register, selectFile, selectedFile, error } = useDocument(signer);
 *
 *   // On the Verify page:
 *   const { verifyResult, verify, selectFile, selectedFile, error } = useDocument(signer);
 *
 *   // On the My Documents page:
 *   const { ownerDocs, fetchOwnerDocs } = useDocument(signer);
 */

import { useState, useCallback } from "react";
import { hashFile, isValidHash } from "../utils/hashUtils";
import {
  registerDocument  as registerDocumentSvc,
  verifyDocument    as verifyDocumentSvc,
  getDocumentsByOwner,
  TX_STATE,
} from "../services/blockchainService";
import { scanFileForQR } from "../utils/qrScanner";

/**
 * @typedef {Object} UseDocumentReturn
 *
 * ── Shared ────────────────────────────────────────────────────────────────────
 * @property {File|null}   selectedFile  - The file the user picked from disk
 * @property {string|null} hash          - "0x"-prefixed SHA-256 hash of selectedFile
 * @property {boolean}     isHashing     - True while computing the hash
 * @property {string|null} error         - Last error message
 * @property {Function}    selectFile    - (file: File) => void   — hash + store a file
 * @property {Function}    clearFile     - ()           => void   — reset state
 *
 * ── Registration (Task 4.4 / 4.7) ────────────────────────────────────────────
 * @property {string}      txState       - One of TX_STATE values
 * @property {object|null} txReceipt     - ethers TransactionReceipt after confirmation
 * @property {Function}    register      - () => Promise<void>
 *
 * ── Verification (Task 4.5) ──────────────────────────────────────────────────
 * @property {object|null} verifyResult  - { owner, timestamp } or null
 * @property {boolean}     isVerifying   - True while the read call is in-flight
 * @property {boolean}     verified      - True if verifyResult.owner !== null
 * @property {Function}    verify        - () => Promise<void>
 *
 * ── Owner's document list (Task 4.6) ─────────────────────────────────────────
 * @property {string[]}    ownerDocs     - Array of bytes32 hashes owned by current wallet
 * @property {boolean}     isFetching    - True while fetching owner docs
 * @property {Function}    fetchOwnerDocs - (ownerAddress: string) => Promise<void>
 */

/**
 * @param {import("ethers").Signer|null} signer - Pass the signer from useWallet()
 * @returns {UseDocumentReturn}
 */
const useDocument = (signer) => {
  // File & Hash state
  const [selectedFile, setSelectedFile] = useState(null);
  const [hash,         setHash]         = useState(null);
  const [isHashing,    setIsHashing]    = useState(false);
  const [hashSource,   setHashSource]   = useState(null); // "file" | "qr"

  //Registration state 
  const [txState,   setTxState]   = useState(TX_STATE.IDLE);
  const [txReceipt, setTxReceipt] = useState(null);

  // Verification state 
  const [verifyResult, setVerifyResult] = useState(null);
  const [isVerifying,  setIsVerifying]  = useState(false);

  // Owner docs state 
  const [ownerDocs,   setOwnerDocs]   = useState([]);
  const [isFetching,  setIsFetching]  = useState(false);

  // Shared error state
  const [error, setError] = useState(null);

  
  // Task 4.3 — selectFile
  // Accepts a File, computes its SHA-256 hash, and stores both in state.
 
  const selectFile = useCallback(async (file) => {
    if (!file) return;
    setSelectedFile(file);
    setHash(null);
    setError(null);
    setTxState(TX_STATE.IDLE);
    setTxReceipt(null);
    setVerifyResult(null);

    setIsHashing(true);
    try {
      const computedHash = await hashFile(file);
      setHash(computedHash);
    } catch (err) {
      setError(`Hashing failed: ${err.message}`);
    } finally {
      setIsHashing(false);
    }
  }, []);

  /**
   * selectFileForVerify — like selectFile but first scans the file for an
   * embedded DocVerify QR code. If found, uses the QR hash (so stamped PDFs
   * verify correctly). Falls back to full file hashing if no QR is detected.
   */
  const selectFileForVerify = useCallback(async (file) => {
    if (!file) return;
    setSelectedFile(file);
    setHash(null);
    setHashSource(null);
    setError(null);
    setVerifyResult(null);
    setIsHashing(true);
    try {
      const qrHash = await scanFileForQR(file);
      if (qrHash) {
        setHash(qrHash);
        setHashSource("qr");
      } else {
        const computedHash = await hashFile(file);
        setHash(computedHash);
        setHashSource("file");
      }
    } catch (err) {
      setError(`Hashing failed: ${err.message}`);
    } finally {
      setIsHashing(false);
    }
  }, []);

  /** Reset all document state */
  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setHash(null);
    setHashSource(null);
    setIsHashing(false);
    setTxState(TX_STATE.IDLE);
    setTxReceipt(null);
    setVerifyResult(null);
    setError(null);
  }, []);


  // egister
  // Submits the document hash to the smart contract.

  const register = useCallback(async () => {
    if (!hash) {
      setError("Please select a document first.");
      return;
    }
    if (!isValidHash(hash)) {
      setError("Invalid hash format. Re-select the document.");
      return;
    }
    if (!signer) {
      setError("Wallet not connected. Please connect MetaMask first.");
      return;
    }

    setError(null);
    setTxReceipt(null);

    try {
      const receipt = await registerDocumentSvc(hash, signer, (state) => {
        setTxState(state);
      });
      setTxReceipt(receipt);
    } catch (err) {
      setError(err.message);
    }
  }, [hash, signer]);


  //verify
  // Looks up the document hash on-chain and returns owner + timestamp.

  const verify = useCallback(async () => {
    if (!hash) {
      setError("Please select a document to verify.");
      return;
    }
    if (!isValidHash(hash)) {
      setError("Invalid hash. Re-select the document.");
      return;
    }

    setError(null);
    setVerifyResult(null);
    setIsVerifying(true);

    try {
      const result = await verifyDocumentSvc(hash, signer);
      setVerifyResult(result);
    } catch (err) {
      // NOT_FOUND is a normal outcome — surface it as a result, not an error
      if (err.reason === "NOT_FOUND") {
        setVerifyResult({ notFound: true, owner: null, timestamp: null });
      } else {
        setError(err.message);
      }
    } finally {
      setIsVerifying(false);
    }
  }, [hash, signer]);

 
  // fetchOwnerDocs
  // Retrieves all document hashes registered by a specific wallet address.

  const fetchOwnerDocs = useCallback(async (ownerAddress) => {
    if (!ownerAddress) return;
    setError(null);
    setIsFetching(true);
    try {
      const docs = await getDocumentsByOwner(ownerAddress);
      setOwnerDocs(docs);
    } catch (err) {
      setError(err.message);
      setOwnerDocs([]);
    } finally {
      setIsFetching(false);
    }
  }, []);


  return {
    // File & hash
    selectedFile,
    hash,
    hashSource,
    isHashing,
    selectFile,
    selectFileForVerify,
    clearFile,

    // Registration (
    txState,
    txReceipt,
    register,
    TX_STATE,           // expose enum so Student 4 can compare states

    // Verification 
    verifyResult,
    isVerifying,
    verified: Boolean(verifyResult && !verifyResult.notFound),
    verify,

    // Owner history 
    ownerDocs,
    isFetching,
    fetchOwnerDocs,

    // Shared
    error,
    clearError: () => setError(null),
  };
};

export default useDocument;
