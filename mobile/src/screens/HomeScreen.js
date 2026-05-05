import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { getWalletAddress, shortenAddress } from '../services/blockchainService';
import { shortenAddress as shorten } from '../utils/hashUtils';

const FEATURES = [
  { title: 'Tamper Detection', desc: 'Any change to a document produces a completely different hash and fails verification.' },
  { title: 'Immutable Record', desc: 'Once registered, the blockchain record cannot be altered or deleted by anyone.' },
  { title: 'No Central Authority', desc: 'The Ethereum blockchain enforces integrity automatically without a middleman.' },
  { title: 'QR Verification', desc: 'Scan a QR code on a printed document to instantly verify its authenticity.' },
];

export default function HomeScreen({ onNavigate }) {
  const address = getWalletAddress();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.eyebrow}>
          <Text style={styles.eyebrowText}>BLOCKCHAIN POWERED</Text>
        </View>
        <Text style={styles.title}>Document{'\n'}Verification</Text>
        <Text style={styles.subtitle}>
          Register and verify documents on the Ethereum blockchain. Tamper-proof, permanent, and trustless.
        </Text>
        <View style={styles.walletBadge}>
          <View style={styles.dot} />
          <Text style={styles.walletText}>Connected: {shorten(address)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => onNavigate('register')}>
          <Text style={styles.btnPrimaryText}>Register Document</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => onNavigate('verify')}>
          <Text style={styles.btnSecondaryText}>Verify Document</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Why Use This Platform</Text>
      {FEATURES.map((f, i) => (
        <View key={i} style={styles.featureCard}>
          <Text style={styles.featureTitle}>{f.title}</Text>
          <Text style={styles.featureDesc}>{f.desc}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>How It Works</Text>
      {['Select any file', 'Hash is computed locally (SHA-256)', 'Hash registered on Sepolia blockchain', 'Anyone can verify by re-hashing'].map((step, i) => (
        <View key={i} style={styles.stepRow}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Contract: {shorten(address)}</Text>
        <Text style={styles.footerText}>Network: Ethereum Sepolia</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06061a' },
  content: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 32 },
  eyebrow: {
    borderWidth: 1, borderColor: 'rgba(74,58,255,0.4)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: 'rgba(74,58,255,0.1)', marginBottom: 16,
  },
  eyebrowText: { color: '#4a3aff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 36, fontWeight: '900', color: '#F0EFFF', textAlign: 'center', lineHeight: 42, marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#9896b8', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  walletBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  walletText: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  actions: { gap: 12, marginBottom: 32 },
  btnPrimary: {
    backgroundColor: '#4a3aff', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#4a3aff', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    borderWidth: 1, borderColor: 'rgba(74,58,255,0.4)',
    borderRadius: 12, paddingVertical: 16, alignItems: 'center',
    backgroundColor: 'rgba(74,58,255,0.08)',
  },
  btnSecondaryText: { color: '#4a3aff', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#F0EFFF', marginBottom: 12, marginTop: 8 },
  featureCard: {
    backgroundColor: 'rgba(10,10,36,0.88)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    padding: 16, marginBottom: 10,
  },
  featureTitle: { color: '#F0EFFF', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  featureDesc: { color: '#9896b8', fontSize: 13, lineHeight: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(74,58,255,0.14)', borderWidth: 1,
    borderColor: 'rgba(74,58,255,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#4a3aff', fontSize: 12, fontWeight: '700' },
  stepText: { color: '#9896b8', fontSize: 14, flex: 1 },
  footer: { marginTop: 24, gap: 4, alignItems: 'center' },
  footerText: { color: '#4e4c72', fontSize: 11 },
});
