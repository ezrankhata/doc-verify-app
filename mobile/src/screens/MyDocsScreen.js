import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { getMyDocuments, getWalletAddress } from '../services/blockchainService';
import { shortenAddress } from '../utils/hashUtils';

export default function MyDocsScreen() {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const address = getWalletAddress();

  const load = useCallback(async () => {
    try {
      const hashes = await getMyDocuments();
      setDocs(hashes);
    } catch (e) {
      setDocs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4a3aff" size="large" />
        <Text style={styles.loadingText}>Loading from blockchain...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Documents</Text>
        <Text style={styles.subtitle}>Registered by {shortenAddress(address)}</Text>
      </View>

      {docs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Documents Yet</Text>
          <Text style={styles.emptyDesc}>
            Documents you register on the blockchain will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4a3aff" />}
          ListHeaderComponent={
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{docs.length} document{docs.length !== 1 ? 's' : ''} registered</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.docCard}>
              <View style={styles.docIndex}>
                <Text style={styles.docIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.docContent}>
                <Text style={styles.docLabel}>Document Hash</Text>
                <Text style={styles.docHash} selectable numberOfLines={2}>{item}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06061a' },
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '900', color: '#F0EFFF', marginBottom: 4 },
  subtitle: { color: '#9896b8', fontSize: 13 },
  center: { flex: 1, backgroundColor: '#06061a', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#9896b8', fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#F0EFFF', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { color: '#9896b8', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  countBadge: {
    backgroundColor: 'rgba(74,58,255,0.1)', borderWidth: 1,
    borderColor: 'rgba(74,58,255,0.2)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 12,
  },
  countText: { color: '#4a3aff', fontSize: 13, fontWeight: '600' },
  docCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: 'rgba(10,10,36,0.88)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  docIndex: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#4a3aff', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  docIndexText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  docContent: { flex: 1 },
  docLabel: { color: '#9896b8', fontSize: 11, marginBottom: 4 },
  docHash: { color: '#F0EFFF', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
});
