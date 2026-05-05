import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

/**
 * Compute SHA-256 hash of a file — matches the web app's hash exactly.
 * Returns a 0x-prefixed hex string (bytes32 compatible).
 */
export const hashFile = async (fileUri) => {
  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Decode base64 → Uint8Array (raw bytes)
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // SHA-256 digest of raw bytes
  const hashBuffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);

  // Convert ArrayBuffer → 0x-prefixed hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
};

/**
 * Shorten a wallet address for display: 0xf39F...2266
 */
export const shortenAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Format a Unix timestamp to a readable date string
 */
export const formatTimestamp = (unixTimestamp) => {
  if (!unixTimestamp) return '';
  return new Date(Number(unixTimestamp) * 1000).toLocaleString();
};
