// DocVerify — React Native App
// UI: Student 4 (Hussain Thomson)
// Logic: Our contract (0xc73f…), Alchemy RPC, hardcoded wallet

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, StatusBar, Animated, ActivityIndicator,
  Alert, Dimensions, FlatList, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────
// Our infrastructure (Student 3 — Ezra Nkhata)
// ─────────────────────────────────────────────────────────────────────────────
const RPC_URL         = 'https://eth-sepolia.g.alchemy.com/v2/qLzPGQ_Rij_D4bQuzKtXE';
const PRIVATE_KEY     = '0x7ed87eb46d1310bfa36090c0797a60973560d75f5b20ec7635f3dc1c3c61d1c0';
const WALLET_ADDRESS  = '0x13b90C5a7c1cFd4cF34B35976A6959B654Df1b00';
const CHAIN_ID        = 11155111;

// ─────────────────────────────────────────────────────────────────────────────
// Our contract (Student 1 — Lushomo Sibale)
// ─────────────────────────────────────────────────────────────────────────────
export const CONTRACT_ADDRESS = '0xc73fdD462dA0Eb3B5d5A0648F7d0Cc171A337878';

export const CONTRACT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: 'bytes32', name: 'hash',      type: 'bytes32' },
      { indexed: true,  internalType: 'address', name: 'owner',     type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'DocumentRegistered',
    type: 'event',
  },
  {
    inputs:  [{ internalType: 'bytes32', name: 'hash', type: 'bytes32' }],
    name: 'registerDocument',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs:  [{ internalType: 'bytes32', name: 'hash', type: 'bytes32' }],
    name: 'verifyDocument',
    outputs: [
      { internalType: 'address', name: 'owner',     type: 'address' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs:  [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'getDocumentsByOwner',
    outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Blockchain service (Student 2 — Luzangu Nayame)
// ─────────────────────────────────────────────────────────────────────────────
const provider     = new ethers.JsonRpcProvider(RPC_URL);
const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

/**
 * hashDocument — hashes raw file bytes with SHA-256.
 * Decodes base64 to Uint8Array first so the output matches
 * the web app's Web Crypto API (crypto.subtle.digest) exactly.
 */
export async function hashDocument(fileUri) {
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const hashBuffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
    const hashArray  = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.log('HASH ERROR:', err);
    throw err;
  }
}

/**
 * verifyDocument — free read call, no gas.
 */
export async function verifyDocument(hash) {
  try {
    const [owner, rawTimestamp] = await readContract.verifyDocument(hash);
    const ZERO = '0x0000000000000000000000000000000000000000';
    if (owner === ZERO) return { found: false };
    return {
      found: true,
      owner,
      registeredAt: new Date(Number(rawTimestamp) * 1000).toLocaleString(),
    };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

/**
 * registerDocument — signs with the hardcoded wallet, costs ~50k gas.
 */
export async function registerDocument(hash) {
  try {
    const wallet        = new ethers.Wallet(PRIVATE_KEY, provider);
    const writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    const tx = await writeContract.registerDocument(hash);
    await tx.wait(1);
    return { success: true, txHash: tx.hash };
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('insufficient funds'))
      return { success: false, error: 'Not enough Sepolia ETH. Visit the Sepolia faucet.' };
    if (msg.includes('execution reverted') || msg.includes('already registered'))
      return { success: false, error: 'This document is already registered on-chain.' };
    return { success: false, error: msg };
  }
}

/**
 * getMyDocuments — returns all hashes for the hardcoded wallet.
 */
export async function getMyDocuments(walletAddress) {
  try {
    const hashes = await readContract.getDocumentsByOwner(walletAddress);
    return Array.from(hashes);
  } catch {
    return [];
  }
}

/**
 * handleQRScan — parses DocVerify QR URL and calls verifyDocument.
 */
export async function handleQRScan(qrText) {
  try {
    const url  = new URL(qrText);
    const hash = url.searchParams.get('hash');
    if (!hash) return { found: false, error: 'No hash found in QR code.' };
    return await verifyDocument(hash);
  } catch {
    return { found: false, error: 'Not a valid DocVerify QR code.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — Student 4's UI
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:         '#0A0E1A',
  surface:    '#111827',
  card:       '#1A2235',
  border:     '#1E2D45',
  accent:     '#00D4FF',
  accentDim:  '#00D4FF22',
  success:    '#00FF88',
  successDim: '#00FF8822',
  warning:    '#FFB800',
  warningDim: '#FFB80022',
  danger:     '#FF4D6A',
  dangerDim:  '#FF4D6A22',
  text:       '#E8F0FE',
  textMid:    '#8A9BBE',
  textDim:    '#4A5A7A',
  mono:       Platform.OS === 'ios' ? 'Courier New' : 'monospace',
};

const { width: SW } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI components
// ─────────────────────────────────────────────────────────────────────────────
function Badge({ label, color = T.accent }) {
  return (
    <View style={[s.badge, { borderColor: color, backgroundColor: color + '22' }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function Divider({ label }) {
  return (
    <View style={s.dividerRow}>
      <View style={s.dividerLine} />
      {label ? <Text style={s.dividerLabel}>{label}</Text> : null}
      {label ? <View style={s.dividerLine} /> : null}
    </View>
  );
}

function HashDisplay({ hash }) {
  return (
    <View style={s.hashBox}>
      <Text style={s.hashLabel}>SHA-256 HASH</Text>
      <Text style={s.hashValue} numberOfLines={1} selectable>
        {hash.slice(0, 14)}…{hash.slice(-10)}
      </Text>
      <Text style={s.hashFull} numberOfLines={2} selectable>{hash}</Text>
    </View>
  );
}

function TxToast({ txHash, visible, onClose }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 14 }),
        Animated.delay(5000),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onClose?.());
    }
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.View style={[s.toast, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
    }]}>
      <View style={s.toastIconWrap}>
        <Ionicons name="checkmark" size={16} color={T.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.toastTitle}>Transaction Confirmed</Text>
        <Text style={s.toastSub} numberOfLines={1}>{txHash?.slice(0, 22)}…</Text>
      </View>
      <TouchableOpacity onPress={() => Linking.openURL(`https://sepolia.etherscan.io/tx/${txHash}`)}>
        <Text style={s.toastLink}>View ↗</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ErrorBox({ message, onDismiss }) {
  if (!message) return null;
  return (
    <View style={s.errorBox}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
        <Ionicons name="warning-outline" size={14} color={T.danger} style={{ marginTop: 2 }} />
        <Text style={[s.errorText, { flex: 1 }]}>{message}</Text>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={{ marginTop: 6 }}>
          <Text style={[s.errorText, { fontWeight: '700' }]}>Dismiss ×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 1 — Home
// ─────────────────────────────────────────────────────────────────────────────
function HomeScreen({ onNavigate }) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const shortWallet = `${WALLET_ADDRESS.slice(0, 6)}…${WALLET_ADDRESS.slice(-4)}`;

  return (
    <Animated.ScrollView contentContainerStyle={s.screen} style={{ opacity: fade }}>
      {/* Hero */}
      <View style={s.hero}>
        <View style={s.logoMark}>
          <Ionicons name="shield-checkmark-outline" size={34} color={T.accent} />
        </View>
        <Text style={s.heroTitle}>DocVerify</Text>
        <Text style={s.heroSub}>Tamper-proof document authentication on Ethereum Sepolia</Text>
      </View>

      {/* Network */}
      <View style={s.networkBanner}>
        <View style={s.networkDot} />
        <Text style={s.networkText}>Live · Sepolia Testnet</Text>
        <Text style={s.networkAddr}>
          {CONTRACT_ADDRESS.slice(0, 8)}…{CONTRACT_ADDRESS.slice(-6)}
        </Text>
      </View>

      <Divider label="WALLET" />

      <View style={s.walletCard}>
        <View style={s.walletRow}>
          <Ionicons name="wallet-outline" size={22} color={T.accent} />
          <View style={{ flex: 1 }}>
            <Text style={s.walletLabel}>Connected</Text>
            <Text style={s.walletAddr}>{shortWallet}</Text>
          </View>
          <Badge label="Active" color={T.success} />
        </View>
      </View>

      <Divider label="ACTIONS" />

      <View style={s.actionGrid}>
        {[
          { key: 'register', iconName: 'document-outline',    title: 'Register', desc: 'Hash & store a document on-chain',   badge: '~50k gas', badgeColor: T.warning, border: T.accent  },
          { key: 'verify',   iconName: 'search-outline',       title: 'Verify',   desc: 'Check authenticity of any document', badge: 'Free',     badgeColor: T.success, border: T.success },
          { key: 'docs',     iconName: 'folder-open-outline',  title: 'My Docs',  desc: 'All docs tied to your wallet',       badge: 'Free',     badgeColor: T.success, border: T.textDim },
          { key: 'scan',     iconName: 'camera-outline',       title: 'Scan QR',  desc: 'Verify via stamped QR code',         badge: 'Free',     badgeColor: T.success, border: T.textDim },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[s.actionCard, { borderColor: item.border }]}
            onPress={() => onNavigate(item.key)}
            activeOpacity={0.75}
          >
            <Ionicons name={item.iconName} size={22} color={T.accent} />
            <Text style={s.actionTitle}>{item.title}</Text>
            <Text style={s.actionDesc}>{item.desc}</Text>
            <Badge label={item.badge} color={item.badgeColor} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={s.contractFooter}
        onPress={() => Linking.openURL(`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`)}
      >
        <Text style={s.contractFooterText}>View deployed contract on Etherscan ↗</Text>
      </TouchableOpacity>
    </Animated.ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 2 — Register Document
// ─────────────────────────────────────────────────────────────────────────────
function RegisterScreen({ onNavigateHome }) {
  const [file,      setFile]      = useState(null);
  const [hash,      setHash]      = useState(null);
  const [status,    setStatus]    = useState('idle');
  const [txHash,    setTxHash]    = useState(null);
  const [error,     setError]     = useState(null);
  const [showToast, setShowToast] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const resetProgress = () => progressAnim.setValue(0);

  const pickFile = async () => {
    setError(null);
    setStatus('picking');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) { setStatus('idle'); return; }
      const asset = result.assets[0];
      setFile({ name: asset.name, uri: asset.uri, size: formatBytes(asset.size) });
      setHash(null); setTxHash(null); resetProgress();
      setStatus('idle');
    } catch (err) {
      setError('Could not open file picker: ' + err.message);
      setStatus('idle');
    }
  };

  const computeHash = async () => {
    if (!file) return;
    setError(null);
    setStatus('hashing');
    try {
      const h = await hashDocument(file.uri);
      setHash(h);
      setStatus('idle');
    } catch (err) {
      setError('Hashing failed: ' + err.message);
      setStatus('idle');
    }
  };

  const handleRegister = async () => {
    if (!hash) return;
    setError(null);
    setStatus('confirming');
    resetProgress();
    Animated.timing(progressAnim, { toValue: 0.7, duration: 2500, useNativeDriver: false }).start();

    const result = await registerDocument(hash);

    if (result.success) {
      Animated.timing(progressAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start(() => {
        setTxHash(result.txHash);
        setStatus('success');
        setShowToast(true);
      });
    } else {
      progressAnim.setValue(0);
      setStatus('error');
      setError(result.error || 'Transaction failed. Try again.');
    }
  };

  const handleReset = () => {
    setFile(null); setHash(null); setStatus('idle');
    setTxHash(null); setError(null); resetProgress();
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const step1Done = !!file;
  const step2Done = !!hash;
  const step3Done = status === 'success';

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.screenTitle}>Register Document</Text>
      <Text style={s.screenDesc}>
        Pick a file → SHA-256 hash it locally → store the hash permanently on Ethereum Sepolia.
      </Text>

      {/* Step 1 */}
      <View style={[s.stepCard, step1Done && s.stepCardDone]}>
        <View style={s.stepHeader}>
          <View style={[s.stepNum, step1Done && s.stepNumDone]}>
            {step1Done
              ? <Ionicons name="checkmark" size={14} color={T.accent} />
              : <Text style={s.stepNumText}>1</Text>}
          </View>
          <Text style={s.stepTitle}>Select File</Text>
        </View>
        <TouchableOpacity
          style={[s.filePickerBtn, step1Done && { borderColor: T.accent, borderStyle: 'solid' }]}
          onPress={pickFile}
          disabled={status === 'confirming' || status === 'success'}
          activeOpacity={0.7}
        >
          {status === 'picking' ? (
            <View style={s.filePlaceholder}>
              <ActivityIndicator color={T.accent} />
              <Text style={s.filePlaceholderText}>Opening picker…</Text>
            </View>
          ) : file ? (
            <View style={s.fileInfo}>
              <Ionicons name="document-outline" size={28} color={T.accent} />
              <View style={{ flex: 1 }}>
                <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
                <Text style={s.fileSize}>{file.size}</Text>
              </View>
              {status !== 'confirming' && status !== 'success' && (
                <Text style={s.changeFile}>Change</Text>
              )}
            </View>
          ) : (
            <View style={s.filePlaceholder}>
              <Ionicons name="add-circle-outline" size={30} color={T.textDim} />
              <Text style={s.filePlaceholderText}>Tap to select a file</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Step 2 */}
      <View style={[s.stepCard, step2Done && s.stepCardDone, !step1Done && s.stepCardDisabled]}>
        <View style={s.stepHeader}>
          <View style={[s.stepNum, step2Done && s.stepNumDone]}>
            {step2Done
              ? <Ionicons name="checkmark" size={14} color={T.accent} />
              : <Text style={[s.stepNumText, !step1Done && { color: T.textDim }]}>2</Text>}
          </View>
          <Text style={[s.stepTitle, !step1Done && { color: T.textDim }]}>Compute SHA-256 Hash</Text>
        </View>
        {hash ? (
          <HashDisplay hash={hash} />
        ) : (
          <TouchableOpacity
            style={[s.secondaryBtn, (!step1Done || status === 'hashing') && s.btnDisabled]}
            onPress={computeHash}
            disabled={!step1Done || status === 'hashing' || status === 'confirming'}
            activeOpacity={0.7}
          >
            {status === 'hashing' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={T.accent} size="small" />
                <Text style={s.secondaryBtnText}>Hashing file…</Text>
              </View>
            ) : (
              <Text style={s.secondaryBtnText}>Hash Document</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Step 3 */}
      <View style={[s.stepCard, step3Done && { borderColor: T.success }, !step2Done && s.stepCardDisabled]}>
        <View style={s.stepHeader}>
          <View style={[s.stepNum, step3Done && { backgroundColor: T.successDim, borderColor: T.success }]}>
            {step3Done
              ? <Ionicons name="checkmark" size={14} color={T.success} />
              : <Text style={[s.stepNumText, !step2Done && { color: T.textDim }]}>3</Text>}
          </View>
          <Text style={[s.stepTitle, !step2Done && { color: T.textDim }]}>Register On-Chain</Text>
        </View>

        {status === 'confirming' && (
          <View style={s.progressWrap}>
            <View style={s.progressTrack}>
              <Animated.View style={[s.progressFill, { width: progressWidth }]} />
            </View>
            <Text style={s.progressLabel}>Waiting for Sepolia confirmation…</Text>
            <Text style={s.progressSub}>This can take 15–30 seconds</Text>
          </View>
        )}

        {status === 'success' && txHash && (
          <View style={s.successBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle" size={15} color={T.success} />
              <Text style={s.successTitle}>Registered on Ethereum Sepolia</Text>
            </View>
            <Text style={s.successTx} numberOfLines={1} selectable>Tx: {txHash}</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
              <TouchableOpacity onPress={() => Linking.openURL(`https://sepolia.etherscan.io/tx/${txHash}`)}>
                <Text style={s.explorerLink}>View on Etherscan ↗</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleReset}>
                <Text style={s.explorerLink}>Register another →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {status === 'error' && (
          <ErrorBox message={error} onDismiss={() => { setStatus('idle'); setError(null); }} />
        )}

        {status !== 'confirming' && status !== 'success' && (
          <TouchableOpacity
            style={[s.primaryBtn, !step2Done && s.btnDisabled]}
            onPress={handleRegister}
            disabled={!step2Done || status === 'confirming'}
            activeOpacity={0.8}
          >
            <Text style={s.primaryBtnText}>Register Document</Text>
          </TouchableOpacity>
        )}
      </View>

      <TxToast txHash={txHash} visible={showToast} onClose={() => setShowToast(false)} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 3 — Verify Document
// ─────────────────────────────────────────────────────────────────────────────
function VerifyScreen() {
  const [file,   setFile]   = useState(null);
  const [hash,   setHash]   = useState(null);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error,  setError]  = useState(null);

  const pickFile = async () => {
    setError(null);
    setStatus('picking');
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) { setStatus('idle'); return; }
      const asset = res.assets[0];
      setFile({ name: asset.name, uri: asset.uri, size: formatBytes(asset.size) });
      setHash(null); setResult(null);
      setStatus('idle');
    } catch (err) {
      setError('Could not open file picker: ' + err.message);
      setStatus('idle');
    }
  };

  const handleVerify = async () => {
    if (!file) return;
    setError(null); setResult(null);

    setStatus('hashing');
    let h;
    try {
      h = await hashDocument(file.uri);
      setHash(h);
    } catch (err) {
      setError('Hashing failed: ' + err.message);
      setStatus('error');
      return;
    }

    setStatus('verifying');
    const res = await verifyDocument(h);
    setResult(res);
    setStatus(res.found ? 'found' : res.error ? 'error' : 'notfound');
    if (res.error) setError(res.error);
  };

  const handleReset = () => {
    setFile(null); setHash(null); setResult(null);
    setStatus('idle'); setError(null);
  };

  const busy = ['picking', 'hashing', 'verifying'].includes(status);

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.screenTitle}>Verify Document</Text>
      <Text style={s.screenDesc}>
        Pick any file — the app re-hashes it and checks the Sepolia blockchain. No wallet needed. Free.
      </Text>

      <TouchableOpacity
        style={[s.filePickerBtn, file && { borderColor: T.accent, borderStyle: 'solid' }, busy && { opacity: 0.6 }]}
        onPress={pickFile}
        disabled={busy}
        activeOpacity={0.7}
      >
        {status === 'picking' ? (
          <View style={s.filePlaceholder}>
            <ActivityIndicator color={T.accent} />
            <Text style={s.filePlaceholderText}>Opening picker…</Text>
          </View>
        ) : file ? (
          <View style={s.fileInfo}>
            <Ionicons name="document-outline" size={28} color={T.accent} />
            <View style={{ flex: 1 }}>
              <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
              <Text style={s.fileSize}>{file.size}</Text>
            </View>
            {!busy && <Text style={s.changeFile}>Change</Text>}
          </View>
        ) : (
          <View style={s.filePlaceholder}>
            <Ionicons name="add-circle-outline" size={30} color={T.textDim} />
            <Text style={s.filePlaceholderText}>Tap to select a file to verify</Text>
          </View>
        )}
      </TouchableOpacity>

      {hash && <HashDisplay hash={hash} />}

      {(status === 'hashing' || status === 'verifying') && (
        <View style={s.verifySteps}>
          <View style={s.verifyStep}>
            <View style={[s.verifyStepDot, status !== 'hashing' && { backgroundColor: T.success }]}>
              {status === 'hashing'
                ? <ActivityIndicator color={T.bg} size="small" />
                : <Ionicons name="checkmark" size={14} color={T.bg} />}
            </View>
            <Text style={s.verifyStepLabel}>Computing SHA-256 hash</Text>
          </View>
          <View style={s.verifyStep}>
            <View style={[s.verifyStepDot, status === 'verifying' ? { backgroundColor: T.accent } : { backgroundColor: T.border }]}>
              {status === 'verifying' && <ActivityIndicator color={T.bg} size="small" />}
            </View>
            <Text style={[s.verifyStepLabel, status !== 'verifying' && { color: T.textDim }]}>
              Querying Sepolia contract
            </Text>
          </View>
        </View>
      )}

      {!busy && (
        <TouchableOpacity
          style={[s.primaryBtn, !file && s.btnDisabled, { marginTop: 12 }]}
          onPress={status === 'idle' ? handleVerify : handleReset}
          disabled={!file && status === 'idle'}
          activeOpacity={0.8}
        >
          <Text style={s.primaryBtnText}>
            {status === 'idle' ? 'Verify Document' : 'Verify Another'}
          </Text>
        </TouchableOpacity>
      )}

      {status === 'found' && result && (
        <View style={[s.resultCard, { borderColor: T.success }]}>
          <View style={s.resultHeader}>
            <View style={[s.resultIconWrap, { backgroundColor: T.successDim, borderColor: T.success }]}>
              <Ionicons name="checkmark" size={18} color={T.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.resultTitle, { color: T.success }]}>Authentic Document</Text>
              <Text style={s.resultSub}>Verified on Ethereum Sepolia</Text>
            </View>
          </View>
          <Divider />
          <View style={s.resultRow}>
            <Text style={s.resultKey}>Registered Owner</Text>
            <Text style={s.resultVal} selectable numberOfLines={1}>
              {result.owner?.slice(0, 14)}…{result.owner?.slice(-6)}
            </Text>
          </View>
          <View style={s.resultRow}>
            <Text style={s.resultKey}>Timestamp</Text>
            <Text style={s.resultVal}>{result.registeredAt}</Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://sepolia.etherscan.io/address/${result.owner}`)}
            style={{ marginTop: 6 }}
          >
            <Text style={s.explorerLink}>View owner on Etherscan ↗</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'notfound' && (
        <View style={[s.resultCard, { borderColor: T.danger }]}>
          <View style={s.resultHeader}>
            <View style={[s.resultIconWrap, { backgroundColor: T.dangerDim, borderColor: T.danger }]}>
              <Ionicons name="close" size={18} color={T.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.resultTitle, { color: T.danger }]}>Not Registered</Text>
              <Text style={s.resultSub}>
                No on-chain record found. The document may be unregistered or has been tampered with.
              </Text>
            </View>
          </View>
        </View>
      )}

      {status === 'error' && <ErrorBox message={error} onDismiss={() => setStatus('idle')} />}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 4 — My Documents
// ─────────────────────────────────────────────────────────────────────────────
function MyDocsScreen() {
  const [hashes,  setHashes]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const loadDocs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await getMyDocuments(WALLET_ADDRESS);
      setHashes(result);
    } catch (err) {
      setError('Could not fetch documents: ' + err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={s.docItem}
      onPress={() => Linking.openURL(`https://sepolia.etherscan.io/search?q=${item}`)}
      activeOpacity={0.75}
    >
      <View style={s.docIndexWrap}>
        <Text style={s.docIndexText}>{index + 1}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.docHash} selectable numberOfLines={1}>
          {item.slice(0, 14)}…{item.slice(-10)}
        </Text>
        <Text style={s.docHashFull} selectable numberOfLines={1}>{item}</Text>
      </View>
      <View style={s.docViewBtn}>
        <Text style={s.docViewBtnText}>↗</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={[s.screen, { paddingBottom: 60 }]}>
      <Text style={s.screenTitle}>My Documents</Text>
      <Text style={s.screenDesc}>
        All hashes registered under your wallet on the DocumentRegistry contract.
        Tap any row to inspect it on Etherscan.
      </Text>

      {loading ? (
        <View style={s.emptyState}>
          <ActivityIndicator color={T.accent} size="large" />
          <Text style={s.emptyText}>Fetching from Sepolia…</Text>
        </View>
      ) : error ? (
        <ErrorBox message={error} onDismiss={loadDocs} />
      ) : hashes.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="mail-open-outline" size={44} color={T.textMid} />
          <Text style={s.emptyText}>No documents registered yet</Text>
          <Text style={s.emptySubText}>Use the Register tab to store your first document on-chain.</Text>
        </View>
      ) : (
        <>
          <View style={s.docCountRow}>
            <Badge label={`${hashes.length} document${hashes.length !== 1 ? 's' : ''}`} color={T.accent} />
            <TouchableOpacity onPress={loadDocs}>
              <Text style={s.refreshBtn}>↻  Refresh</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={hashes}
            keyExtractor={(item) => item}
            renderItem={renderItem}
            scrollEnabled={false}
          />
          <TouchableOpacity
            style={{ marginTop: 8 }}
            onPress={() => Linking.openURL(`https://sepolia.etherscan.io/address/${WALLET_ADDRESS}`)}
          >
            <Text style={s.explorerLink}>View wallet on Etherscan ↗</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 5 — Scan QR
// ─────────────────────────────────────────────────────────────────────────────
function ScanLine() {
  const y = useRef(new Animated.Value(0)).current;
  const VIEWFINDER_SIZE = SW - 40;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(y, { toValue: 1, duration: 2500, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = y.interpolate({
    inputRange: [0, 1],
    outputRange: [0, VIEWFINDER_SIZE - 4],
  });

  return (
    <Animated.View
      style={[s.scanLine, { top: 0, transform: [{ translateY }] }]}
      pointerEvents="none"
    />
  );
}

function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned,  setScanned]  = useState(false);
  const [status,   setStatus]   = useState('idle');
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || status === 'verifying') return;
    setScanned(true);
    setStatus('verifying');
    setResult(null); setError(null);

    const res = await handleQRScan(data);
    setResult(res);
    if (res.found) {
      setStatus('found');
    } else if (res.error) {
      setStatus('error');
      setError(res.error);
    } else {
      setStatus('notfound');
    }
  };

  const resetScan = () => {
    setScanned(false); setStatus('idle');
    setResult(null); setError(null);
  };

  if (!permission) {
    return (
      <View style={[s.screen, s.emptyState]}>
        <ActivityIndicator color={T.accent} size="large" />
        <Text style={s.emptyText}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[s.screen, s.emptyState]}>
        <Ionicons name="camera-outline" size={44} color={T.textMid} />
        <Text style={s.emptyText}>Camera access is required to scan QR codes</Text>
        <TouchableOpacity
          style={[s.primaryBtn, { marginTop: 16, paddingHorizontal: 32 }]}
          onPress={requestPermission}
        >
          <Text style={s.primaryBtnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.screenTitle}>Scan QR Code</Text>
      <Text style={s.screenDesc}>
        Scan the QR stamp on a registered document. The app reads the hash and queries Sepolia — no wallet, no gas.
      </Text>

      <View style={s.viewfinder}>
        {!scanned && (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={handleBarCodeScanned}
          />
        )}
        <View style={s.vfCornerTL} />
        <View style={s.vfCornerTR} />
        <View style={s.vfCornerBL} />
        <View style={s.vfCornerBR} />
        {!scanned && <ScanLine />}
        {status === 'verifying' && (
          <View style={s.vfOverlay}>
            <ActivityIndicator color={T.accent} size="large" />
            <Text style={s.vfOverlayText}>Querying blockchain…</Text>
          </View>
        )}
        {status === 'found' && (
          <View style={[s.vfOverlay, { backgroundColor: T.success + 'CC' }]}>
            <Ionicons name="checkmark" size={42} color={T.bg} />
            <Text style={[s.vfOverlayText, { color: T.bg, fontWeight: '800' }]}>Verified!</Text>
          </View>
        )}
        {(status === 'notfound' || status === 'error') && (
          <View style={[s.vfOverlay, { backgroundColor: T.danger + 'CC' }]}>
            <Ionicons name="close" size={42} color="#fff" />
            <Text style={[s.vfOverlayText, { color: '#fff', fontWeight: '800' }]}>Not Found</Text>
          </View>
        )}
      </View>

      {scanned && (
        <TouchableOpacity style={s.primaryBtn} onPress={resetScan} activeOpacity={0.8}>
          <Text style={s.primaryBtnText}>Scan Another</Text>
        </TouchableOpacity>
      )}

      {status === 'found' && result && (
        <View style={[s.resultCard, { borderColor: T.success, marginTop: 16 }]}>
          <View style={s.resultHeader}>
            <View style={[s.resultIconWrap, { backgroundColor: T.successDim, borderColor: T.success }]}>
              <Ionicons name="checkmark" size={18} color={T.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.resultTitle, { color: T.success }]}>Authentic Document</Text>
              <Text style={s.resultSub}>Hash verified on Ethereum Sepolia</Text>
            </View>
          </View>
          <Divider />
          <View style={s.resultRow}>
            <Text style={s.resultKey}>Owner</Text>
            <Text style={s.resultVal} selectable numberOfLines={1}>
              {result.owner?.slice(0, 14)}…{result.owner?.slice(-6)}
            </Text>
          </View>
          <View style={s.resultRow}>
            <Text style={s.resultKey}>Registered</Text>
            <Text style={s.resultVal}>{result.registeredAt}</Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://sepolia.etherscan.io/address/${result.owner}`)}
            style={{ marginTop: 6 }}
          >
            <Text style={s.explorerLink}>View on Etherscan ↗</Text>
          </TouchableOpacity>
        </View>
      )}

      {(status === 'notfound' || status === 'error') && (
        <View style={[s.resultCard, { borderColor: T.danger, marginTop: 16 }]}>
          <View style={s.resultHeader}>
            <View style={[s.resultIconWrap, { backgroundColor: T.dangerDim, borderColor: T.danger }]}>
              <Ionicons name="close" size={18} color={T.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.resultTitle, { color: T.danger }]}>Not Registered</Text>
              <Text style={s.resultSub}>{error || 'No on-chain record found for this QR code.'}</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'home',     iconName: 'shield-checkmark-outline', label: 'Home'    },
  { key: 'register', iconName: 'document-outline',         label: 'Register' },
  { key: 'verify',   iconName: 'search-outline',           label: 'Verify'   },
  { key: 'docs',     iconName: 'folder-open-outline',      label: 'My Docs'  },
  { key: 'scan',     iconName: 'camera-outline',           label: 'Scan QR'  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const shortWallet = `${WALLET_ADDRESS.slice(0, 6)}…${WALLET_ADDRESS.slice(-4)}`;

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':     return <HomeScreen     onNavigate={setActiveTab} />;
      case 'register': return <RegisterScreen onNavigateHome={() => setActiveTab('home')} />;
      case 'verify':   return <VerifyScreen />;
      case 'docs':     return <MyDocsScreen />;
      case 'scan':     return <ScanScreen />;
      default:         return null;
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="shield-checkmark-outline" size={16} color={T.accent} />
          <Text style={s.topBarLogo}>DocVerify</Text>
        </View>
        <View style={s.topBarWallet}>
          <View style={s.topBarDot} />
          <Text style={s.topBarAddr}>{shortWallet}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>{renderScreen()}</View>

      {/* Bottom tab bar */}
      <View style={s.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity key={tab.key} style={s.tabItem} onPress={() => setActiveTab(tab.key)} activeOpacity={0.7}>
              <Ionicons name={tab.iconName} size={18} color={active ? T.accent : T.textDim} />
              <Text style={[s.tabLabel, active && { color: T.accent }]}>{tab.label}</Text>
              {active && <View style={s.tabActiveLine} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: T.bg },
  screen: { padding: 20, paddingBottom: 40 },

  topBar:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 13, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  topBarLogo:        { color: T.accent, fontSize: 16, fontWeight: '800', fontFamily: T.mono },
  topBarWallet:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.accentDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  topBarDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: T.success },
  topBarAddr:        { color: T.accent, fontSize: 12, fontFamily: T.mono },
  topBarConnect:     { backgroundColor: T.accentDim, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  topBarConnectText: { color: T.accent, fontSize: 12, fontWeight: '700' },

  tabBar:        { flexDirection: 'row', backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingBottom: 6 },
  tabItem:       { flex: 1, alignItems: 'center', paddingVertical: 8, position: 'relative' },
  tabLabel:      { fontSize: 9, color: T.textDim, marginTop: 3, fontWeight: '600', letterSpacing: 0.3 },
  tabActiveLine: { position: 'absolute', top: 0, width: 28, height: 2, backgroundColor: T.accent, borderRadius: 1 },

  hero:      { alignItems: 'center', paddingVertical: 28 },
  logoMark:  { width: 68, height: 68, borderRadius: 18, backgroundColor: T.accentDim, borderWidth: 1, borderColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 30, fontWeight: '900', color: T.text, fontFamily: T.mono, letterSpacing: -0.5 },
  heroSub:   { fontSize: 13, color: T.textMid, marginTop: 7, textAlign: 'center', lineHeight: 20, maxWidth: SW * 0.75 },

  networkBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: T.border, marginBottom: 8 },
  networkDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: T.success },
  networkText:   { color: T.success, fontSize: 12, fontWeight: '700' },
  networkAddr:   { color: T.textDim, fontSize: 10, fontFamily: T.mono, marginLeft: 'auto' },

  walletCard:     { backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.accentDim, padding: 16, marginBottom: 8 },
  walletRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletLabel:    { color: T.textMid, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  walletAddr:     { color: T.text, fontSize: 14, fontFamily: T.mono, fontWeight: '700' },
  disconnectBtn:  { marginTop: 10, alignSelf: 'flex-start' },
  disconnectText: { color: T.textDim, fontSize: 11, fontWeight: '600' },

  connectBtn:  { backgroundColor: T.accentDim, borderRadius: 14, borderWidth: 1.5, borderColor: T.accent, padding: 22, alignItems: 'center', marginBottom: 8 },
  connectText: { color: T.accent, fontSize: 17, fontWeight: '800' },
  connectHint: { color: T.textDim, fontSize: 11, marginTop: 5 },

  actionGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  actionCard:  { width: (SW - 50) / 2, backgroundColor: T.card, borderRadius: 12, borderWidth: 1, padding: 16, gap: 6 },
  actionTitle: { color: T.text, fontSize: 15, fontWeight: '800' },
  actionDesc:  { color: T.textMid, fontSize: 11, lineHeight: 15, flex: 1 },

  contractFooter:     { alignItems: 'center', marginTop: 12 },
  contractFooterText: { color: T.textDim, fontSize: 11 },

  dividerRow:   { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 10 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: T.border },
  dividerLabel: { color: T.textDim, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },

  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '800' },

  screenTitle: { color: T.text, fontSize: 22, fontWeight: '900', marginBottom: 6, fontFamily: T.mono },
  screenDesc:  { color: T.textMid, fontSize: 13, lineHeight: 19, marginBottom: 20 },

  stepCard:         { backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 10 },
  stepCardDone:     { borderColor: T.accentDim },
  stepCardDisabled: { opacity: 0.4 },
  stepHeader:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  stepNum:          { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  stepNumDone:      { backgroundColor: T.accentDim, borderColor: T.accent },
  stepNumText:      { color: T.textDim, fontSize: 12, fontWeight: '800' },
  stepTitle:        { color: T.text, fontSize: 14, fontWeight: '700' },

  filePickerBtn:       { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, borderStyle: 'dashed', padding: 18 },
  fileInfo:            { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileName:            { color: T.text, fontSize: 14, fontWeight: '700', maxWidth: SW * 0.45 },
  fileSize:            { color: T.textDim, fontSize: 11, marginTop: 2 },
  changeFile:          { color: T.accent, fontSize: 12, fontWeight: '700', marginLeft: 'auto' },
  filePlaceholder:     { alignItems: 'center', gap: 6, paddingVertical: 8 },
  filePlaceholderText: { color: T.textDim, fontSize: 13 },

  hashBox:   { backgroundColor: T.bg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: T.accentDim, marginTop: 8 },
  hashLabel: { color: T.textDim, fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginBottom: 4 },
  hashValue: { color: T.accent, fontSize: 13, fontFamily: T.mono, fontWeight: '700' },
  hashFull:  { color: T.textDim, fontSize: 9, fontFamily: T.mono, marginTop: 4, lineHeight: 13 },

  primaryBtn:       { backgroundColor: T.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnText:   { color: T.bg, fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  secondaryBtn:     { backgroundColor: T.accentDim, borderRadius: 10, borderWidth: 1, borderColor: T.accent, padding: 13, alignItems: 'center' },
  secondaryBtnText: { color: T.accent, fontSize: 13, fontWeight: '700' },
  btnDisabled:      { opacity: 0.35 },

  warningBox:  { backgroundColor: T.warningDim, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: T.warning, marginBottom: 10 },
  warningText: { color: T.warning, fontSize: 12, lineHeight: 18 },
  errorBox:    { backgroundColor: T.dangerDim, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: T.danger, marginTop: 8 },
  errorText:   { color: T.danger, fontSize: 12, lineHeight: 18 },

  progressWrap:  { gap: 8, paddingVertical: 4 },
  progressTrack: { height: 5, backgroundColor: T.border, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: T.accent, borderRadius: 3 },
  progressLabel: { color: T.textMid, fontSize: 13, textAlign: 'center', fontWeight: '600' },
  progressSub:   { color: T.textDim, fontSize: 11, textAlign: 'center' },

  successBox:   { backgroundColor: T.successDim, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: T.success, gap: 6 },
  successTitle: { color: T.success, fontSize: 15, fontWeight: '800' },
  successTx:    { color: T.textMid, fontSize: 10, fontFamily: T.mono },
  explorerLink: { color: T.accent, fontSize: 12, fontWeight: '700' },

  resultCard:     { backgroundColor: T.card, borderRadius: 12, borderWidth: 1, padding: 16, gap: 8 },
  resultHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultIconWrap: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  resultTitle:    { fontSize: 15, fontWeight: '800', color: T.text },
  resultSub:      { color: T.textMid, fontSize: 12, marginTop: 2, lineHeight: 17 },
  resultRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultKey:      { color: T.textDim, fontSize: 12, fontWeight: '700' },
  resultVal:      { color: T.text, fontSize: 12, fontFamily: T.mono, maxWidth: '60%' },

  verifySteps:     { gap: 10, marginVertical: 12, paddingLeft: 4 },
  verifyStep:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifyStepDot:   { width: 24, height: 24, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  verifyStepLabel: { color: T.textMid, fontSize: 13, fontWeight: '600' },

  docCountRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  refreshBtn:    { color: T.accent, fontSize: 13, fontWeight: '700' },
  docItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 8 },
  docIndexWrap:  { width: 30, height: 30, borderRadius: 8, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center' },
  docIndexText:  { color: T.accent, fontSize: 12, fontWeight: '800' },
  docHash:       { color: T.text, fontSize: 13, fontWeight: '700', fontFamily: T.mono },
  docHashFull:   { color: T.textDim, fontSize: 9, fontFamily: T.mono, marginTop: 2 },
  docViewBtn:    { width: 32, height: 32, borderRadius: 8, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center' },
  docViewBtnText:{ color: T.accent, fontSize: 15, fontWeight: '800' },

  emptyState:   { alignItems: 'center', paddingVertical: 56, gap: 10 },
  emptyText:    { color: T.textMid, fontSize: 15, textAlign: 'center', fontWeight: '600' },
  emptySubText: { color: T.textDim, fontSize: 12, textAlign: 'center', lineHeight: 18, maxWidth: SW * 0.7 },

  viewfinder:  { width: SW - 40, height: SW - 40, alignSelf: 'center', backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', marginBottom: 16, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  vfCornerTL:  { position: 'absolute', top: 18, left: 18, width: 32, height: 32, borderTopWidth: 3, borderLeftWidth: 3, borderColor: T.accent, borderRadius: 5 },
  vfCornerTR:  { position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderTopWidth: 3, borderRightWidth: 3, borderColor: T.accent, borderRadius: 5 },
  vfCornerBL:  { position: 'absolute', bottom: 18, left: 18, width: 32, height: 32, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: T.accent, borderRadius: 5 },
  vfCornerBR:  { position: 'absolute', bottom: 18, right: 18, width: 32, height: 32, borderBottomWidth: 3, borderRightWidth: 3, borderColor: T.accent, borderRadius: 5 },
  scanLine:    { position: 'absolute', left: 18, right: 18, height: 2, backgroundColor: T.accent, opacity: 0.7, borderRadius: 1 },
  vfOverlay:   { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg + 'CC', gap: 8 },
  vfOverlayText:{ color: T.textMid, fontSize: 15, fontWeight: '700' },

  toast:        { position: 'absolute', bottom: 24, left: 20, right: 20, backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.success, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, shadowColor: T.success, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  toastIconWrap:{ width: 32, height: 32, borderRadius: 8, backgroundColor: T.successDim, alignItems: 'center', justifyContent: 'center' },
  toastTitle:   { color: T.success, fontSize: 13, fontWeight: '800' },
  toastSub:     { color: T.textMid, fontSize: 11, fontFamily: T.mono, marginTop: 1 },
  toastLink:    { color: T.accent, fontSize: 12, fontWeight: '700' },
});
