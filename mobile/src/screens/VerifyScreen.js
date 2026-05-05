import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { hashFile, shortenAddress, formatTimestamp } from '../utils/hashUtils';
import { verifyDocument } from '../services/blockchainService';

export default function VerifyScreen() {
  const [tab, setTab]             = useState('upload'); // 'upload' | 'scan'
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]     = useState(false);

  const reset = () => { setResult(null); setError(''); setScanned(false); };

  // ── Upload & Verify ──────────────────────────────────────
  const pickAndVerify = async () => {
    reset();
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (res.canceled) return;
      const asset = res.assets[0];

      // If the file is a stamped PDF (has QR code on it), its hash will differ
      // from the original. Guide the user to scan the QR code instead.
      const isPdf = asset.name?.toLowerCase().endsWith('.pdf') ||
                    asset.mimeType === 'application/pdf';
      if (isPdf) {
        setError(
          'This looks like a stamped PDF. If it has a QR code on it, use the ' +
          '"Scan QR Code" tab to verify it — that reads the hash directly from the QR.'
        );
        // Still proceed to hash + verify in case it's an unstamped original PDF
      }

      setLoading(true);
      try {
        const hash = await hashFile(asset.uri);
        const verifyResult = await verifyDocument(hash);
        if (verifyResult.found) setError(''); // Clear the PDF hint if it verified fine
        setResult({ ...verifyResult, hash, fileName: asset.name });
      } catch (e) {
        setError('Verification failed: ' + e.message);
      } finally {
        setLoading(false);
      }
    } catch (e) {
      setError('Could not open file picker.');
    }
  };

  useEffect(() => {
    if (tab === 'scan' && !permission?.granted) requestPermission();
  }, [tab]);

  const handleScan = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);
    setError('');
    try {
      // Extract hash from URL: https://.../?hash=0x...
      let hash = data;
      try {
        const url = new URL(data);
        const paramHash = url.searchParams.get('hash');
        if (paramHash) hash = paramHash;
      } catch { /* not a URL — treat raw data as hash */ }

      if (!hash.startsWith('0x') || hash.length !== 66) {
        setError('This QR code does not contain a valid document hash.');
        setLoading(false);
        return;
      }
      const verifyResult = await verifyDocument(hash);
      setResult({ ...verifyResult, hash });
    } catch (e) {
      setError('Could not verify: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const ResultCard = () => {
    if (!result) return null;
    const found = result.found;
    return (
      <View style={[styles.resultCard, found ? styles.resultFound : styles.resultNotFound]}>
        <View style={[styles.resultBadge, found ? styles.badgeFound : styles.badgeNotFound]}>
          <Text style={[styles.resultBadgeText, found ? styles.badgeFoundText : styles.badgeNotFoundText]}>
            {found ? '✓ AUTHENTIC' : '✗ NOT FOUND'}
          </Text>
        </View>
        {found ? (
          <>
            <Text style={styles.resultDesc}>This document is registered on the Ethereum blockchain.</Text>
            {result.fileName && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>File</Text>
                <Text style={styles.resultValue} numberOfLines={1}>{result.fileName}</Text>
              </View>
            )}
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Registered By</Text>
              <Text style={styles.resultValue}>{shortenAddress(result.owner)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Registered On</Text>
              <Text style={styles.resultValue}>{result.registeredAt}</Text>
            </View>
            <Text style={styles.resultLabel}>Document Hash</Text>
            <View style={styles.hashBox}>
              <Text style={styles.hashText} selectable>{result.hash}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.resultDesc}>
            No record found for this document. It may have been modified or was never registered.
          </Text>
        )}
        <TouchableOpacity style={styles.btnGhost} onPress={reset}>
          <Text style={styles.btnGhostText}>Verify Another</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Verify Document</Text>
      <Text style={styles.subtitle}>Upload a file or scan a QR code to check authenticity.</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upload' && styles.tabActive]}
          onPress={() => { setTab('upload'); reset(); }}
        >
          <Text style={[styles.tabText, tab === 'upload' && styles.tabTextActive]}>Upload File</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'scan' && styles.tabActive]}
          onPress={() => { setTab('scan'); reset(); }}
        >
          <Text style={[styles.tabText, tab === 'scan' && styles.tabTextActive]}>Scan QR Code</Text>
        </TouchableOpacity>
      </View>

      {/* Upload Tab */}
      {tab === 'upload' && !result && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload the Document</Text>
          <Text style={styles.cardDesc}>Select the same file that was registered. We will recompute its hash.</Text>
          <TouchableOpacity style={styles.dropZone} onPress={pickAndVerify} disabled={loading}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#4a3aff" size="large" />
                <Text style={styles.loadingText}>Verifying...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.dropIcon}>🔍</Text>
                <Text style={styles.dropText}>Tap to select file</Text>
                <Text style={styles.dropSubText}>We verify its hash against the blockchain</Text>
              </>
            )}
          </TouchableOpacity>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      )}

      {/* Scan Tab */}
      {tab === 'scan' && !result && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scan QR Code</Text>
          <Text style={styles.cardDesc}>Point camera at the QR code on a registered document.</Text>
          {permission && !permission.granted && (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionText}>Camera permission denied.</Text>
              <TouchableOpacity onPress={requestPermission} style={styles.btnSmall}>
                <Text style={styles.btnSmallText}>Request Permission</Text>
              </TouchableOpacity>
            </View>
          )}
          {permission?.granted && !scanned && (
            <View style={styles.cameraContainer}>
              <CameraView
                onBarcodeScanned={handleScan}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                style={styles.camera}
              />
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame} />
              </View>
              <Text style={styles.scanHint}>Align QR code within the frame</Text>
            </View>
          )}
          {scanned && loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#4a3aff" size="large" />
              <Text style={styles.loadingText}>Checking blockchain...</Text>
            </View>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {scanned && !loading && !result && (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setScanned(false)}>
              <Text style={styles.btnPrimaryText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ResultCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06061a' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: '#F0EFFF', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#9896b8', marginBottom: 20, lineHeight: 20 },
  tabs: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10, padding: 3, marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#4a3aff' },
  tabText: { color: '#9896b8', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  card: {
    backgroundColor: 'rgba(10,10,36,0.88)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 20,
  },
  cardTitle: { color: '#F0EFFF', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardDesc: { color: '#9896b8', fontSize: 13, marginBottom: 16, lineHeight: 20 },
  dropZone: {
    borderWidth: 1.5, borderColor: 'rgba(74,58,255,0.35)',
    borderStyle: 'dashed', borderRadius: 12,
    padding: 32, alignItems: 'center', backgroundColor: 'rgba(74,58,255,0.05)',
  },
  dropIcon: { fontSize: 32, marginBottom: 8 },
  dropText: { color: '#F0EFFF', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  dropSubText: { color: '#9896b8', fontSize: 12 },
  cameraContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  camera: { width: '100%', height: 280 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: 180, height: 180, borderWidth: 2,
    borderColor: '#4a3aff', borderRadius: 12,
  },
  scanHint: { color: '#9896b8', fontSize: 12, textAlign: 'center', marginTop: 8 },
  permissionBox: { alignItems: 'center', padding: 20 },
  permissionText: { color: '#9896b8', marginBottom: 12 },
  btnSmall: {
    backgroundColor: 'rgba(74,58,255,0.2)', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  btnSmallText: { color: '#4a3aff', fontWeight: '600' },
  loadingContainer: { alignItems: 'center', padding: 24, gap: 12 },
  loadingText: { color: '#9896b8', fontSize: 14 },
  errorText: {
    color: '#EF4444', fontSize: 13, backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8, padding: 10, marginTop: 12,
  },
  resultCard: {
    borderRadius: 16, padding: 20, borderWidth: 1,
  },
  resultFound: { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' },
  resultNotFound: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' },
  resultBadge: {
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12,
  },
  badgeFound: { backgroundColor: 'rgba(16,185,129,0.15)' },
  badgeNotFound: { backgroundColor: 'rgba(239,68,68,0.15)' },
  resultBadgeText: { fontSize: 13, fontWeight: '700' },
  badgeFoundText: { color: '#10B981' },
  badgeNotFoundText: { color: '#EF4444' },
  resultDesc: { color: '#9896b8', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resultLabel: { color: '#9896b8', fontSize: 12, marginBottom: 4 },
  resultValue: { color: '#F0EFFF', fontSize: 12, fontWeight: '600' },
  hashBox: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 10, marginBottom: 12 },
  hashText: { color: '#4a3aff', fontSize: 11, fontFamily: 'monospace' },
  btnPrimary: {
    backgroundColor: '#4a3aff', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnGhost: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnGhostText: { color: '#9896b8', fontSize: 14 },
});
