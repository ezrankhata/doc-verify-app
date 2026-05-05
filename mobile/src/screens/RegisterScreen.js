import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { hashFile } from '../utils/hashUtils';
import { registerDocument } from '../services/blockchainService';

const STEP_LABELS = ['Select File', 'Hash File', 'Register', 'Done'];

export default function RegisterScreen() {
  const [step, setStep]           = useState(0);
  const [file, setFile]           = useState(null);
  const [hash, setHash]           = useState('');
  const [txHash, setTxHash]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const reset = () => {
    setStep(0); setFile(null); setHash(''); setTxHash(''); setError('');
  };

  const pickFile = async () => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      setFile(asset);
      setLoading(true);
      try {
        const h = await hashFile(asset.uri);
        setHash(h);
        setStep(1);
      } catch (e) {
        setError('Failed to hash file: ' + e.message);
      } finally {
        setLoading(false);
      }
    } catch (e) {
      setError('Could not open file picker.');
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await registerDocument(hash);
      setTxHash(result.txHash);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Register Document</Text>
      <Text style={styles.subtitle}>Store your document's hash on the Ethereum blockchain.</Text>

      {/* Stepper */}
      <View style={styles.stepper}>
        {STEP_LABELS.map((label, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
              <Text style={[styles.stepCircleText, i <= step && styles.stepCircleTextActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i <= step && styles.stepLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Step 0 — Pick file */}
      {step === 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select a File</Text>
          <Text style={styles.cardDesc}>Choose any file. It will be hashed locally — nothing is uploaded.</Text>
          <TouchableOpacity style={styles.dropZone} onPress={pickFile} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#4a3aff" />
            ) : (
              <>
                <Text style={styles.dropIcon}>📄</Text>
                <Text style={styles.dropText}>Tap to select file</Text>
                <Text style={styles.dropSubText}>PDF, images, Word, any format</Text>
              </>
            )}
          </TouchableOpacity>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      )}

      {/* Step 1 — Confirm hash */}
      {step === 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>File Hashed</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>File</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{file?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Size</Text>
            <Text style={styles.infoValue}>{(file?.size / 1024).toFixed(1)} KB</Text>
          </View>
          <Text style={styles.infoLabel}>SHA-256 Hash</Text>
          <View style={styles.hashBox}>
            <Text style={styles.hashText} selectable>{hash}</Text>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.btnPrimaryText}>  Registering on blockchain...</Text>
              </View>
            ) : (
              <Text style={styles.btnPrimaryText}>Register on Blockchain</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={reset}>
            <Text style={styles.btnGhostText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2 — Success */}
      {step === 2 && (
        <View style={styles.card}>
          <View style={styles.successBadge}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Document Registered!</Text>
          <Text style={styles.successDesc}>
            Your document hash is now permanently stored on the Ethereum Sepolia blockchain.
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>File</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{file?.name}</Text>
          </View>
          <Text style={styles.infoLabel}>Document Hash</Text>
          <View style={styles.hashBox}>
            <Text style={styles.hashText} selectable>{hash}</Text>
          </View>
          <Text style={styles.infoLabel}>Transaction Hash</Text>
          <View style={styles.hashBox}>
            <Text style={styles.hashText} selectable>{txHash}</Text>
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={reset}>
            <Text style={styles.btnPrimaryText}>Register Another Document</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06061a' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: '#F0EFFF', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#9896b8', marginBottom: 24, lineHeight: 20 },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stepCircleActive: { backgroundColor: '#4a3aff', borderColor: '#4a3aff' },
  stepCircleText: { color: '#4e4c72', fontSize: 11, fontWeight: '700' },
  stepCircleTextActive: { color: '#fff' },
  stepLabel: { color: '#4e4c72', fontSize: 10, textAlign: 'center' },
  stepLabelActive: { color: '#4a3aff' },
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
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { color: '#9896b8', fontSize: 12, marginBottom: 6 },
  infoValue: { color: '#F0EFFF', fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },
  hashBox: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8,
    padding: 10, marginBottom: 16,
  },
  hashText: { color: '#4a3aff', fontSize: 11, fontFamily: 'monospace' },
  btnPrimary: {
    backgroundColor: '#4a3aff', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
    shadowColor: '#4a3aff', shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnGhost: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnGhostText: { color: '#9896b8', fontSize: 14 },
  errorText: {
    color: '#EF4444', fontSize: 13, backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8, padding: 10, marginVertical: 8,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  successBadge: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 2,
    borderColor: '#10B981', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 12,
  },
  successIcon: { color: '#10B981', fontSize: 26, fontWeight: '700' },
  successTitle: { color: '#F0EFFF', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  successDesc: { color: '#9896b8', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
});
