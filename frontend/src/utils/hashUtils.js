/**
 * hashUtils.js
 * Student 2 — Task 4.3
 * SHA-256 document hashing using the browser's native Web Crypto API.
 * No external dependencies required.
 */

/**
 * Converts an ArrayBuffer to a hex string.
 * @param {ArrayBuffer} buffer
 * @returns {string} lowercase hex string
 */
const bufferToHex = (buffer) => {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Converts a hex string to a Uint8Array (used for bytes32 encoding).
 * @param {string} hex
 * @returns {Uint8Array}
 */
export const hexToBytes = (hex) => {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
};

/**
 * Computes the SHA-256 hash of a File object (PDF or any binary).
 * Reads the file as an ArrayBuffer and feeds it to SubtleCrypto.
 *
 * @param {File} file - The file selected by the user
 * @returns {Promise<string>} - Resolves to a "0x"-prefixed 64-char hex string
 *                             suitable for Solidity bytes32
 * @throws {Error} if the file cannot be read or hashing fails
 */
export const hashFile = async (file) => {
  if (!file || !(file instanceof File)) {
    throw new Error("Invalid input: expected a File object.");
  }

  // Read the file as a raw ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Use the browser's SubtleCrypto to compute SHA-256
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);

  // Convert to hex and prepend "0x" so ethers.js treats it as bytes32
  const hexHash = "0x" + bufferToHex(hashBuffer);
  return hexHash;
};

/**
 * Computes the SHA-256 hash of a plain string (useful for testing).
 *
 * @param {string} text
 * @returns {Promise<string>} "0x"-prefixed hex hash
 */
export const hashString = async (text) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return "0x" + bufferToHex(hashBuffer);
};

/**
 * Validates that a value looks like a valid SHA-256 hex hash (bytes32).
 * Accepts both "0x"-prefixed and bare 64-char hex strings.
 *
 * @param {string} hash
 * @returns {boolean}
 */
export const isValidHash = (hash) => {
  if (typeof hash !== "string") return false;
  const clean = hash.startsWith("0x") ? hash.slice(2) : hash;
  return /^[0-9a-fA-F]{64}$/.test(clean);
};
