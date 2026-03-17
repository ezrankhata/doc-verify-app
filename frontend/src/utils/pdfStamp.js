/**
 * pdfStamp.js
 * Stamps a QR code onto a PDF or generates a standalone QR card for non-PDF files.
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

/**
 * Converts a data URL to a Uint8Array (browser-safe, no fetch needed).
 */
const dataUrlToBytes = (dataUrl) => {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

/**
 * Builds the verify URL that gets encoded into the QR code.
 */
export const buildVerifyUrl = (hash) => {
  const base = window.location.origin + window.location.pathname;
  return `${base}?hash=${hash}`;
};

/**
 * Generates a QR code PNG as Uint8Array from a hash.
 */
const generateQRBytes = async (hash) => {
  const url = buildVerifyUrl(hash);
  const dataUrl = await QRCode.toDataURL(url, {
    width: 200,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
  return dataUrlToBytes(dataUrl);
};

/**
 * Stamps a QR code onto the bottom-right corner of the first page of a PDF.
 * Returns a Blob of the modified PDF.
 *
 * @param {File} file  - The original PDF file
 * @param {string} hash - The registered SHA-256 hash
 * @returns {Promise<Blob>}
 */
export const stampPDF = async (file, hash) => {
  const qrBytes = await generateQRBytes(hash);
  const pdfBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const qrImage = await pdfDoc.embedPng(qrBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  const qrSize = 85;
  const pad = 14;
  const boxPad = 6;
  const textHeight = 14;

  const boxW = qrSize + boxPad * 2;
  const boxH = qrSize + boxPad * 2 + textHeight;
  const boxX = width - boxW - pad;
  const boxY = pad;

  // White background box with border
  firstPage.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 0.75,
  });

  // QR image
  firstPage.drawImage(qrImage, {
    x: boxX + boxPad,
    y: boxY + boxPad + textHeight,
    width: qrSize,
    height: qrSize,
  });

  // Label text
  const label = "Scan to verify";
  const fontSize = 6.5;
  const textWidth = font.widthOfTextAtSize(label, fontSize);
  firstPage.drawText(label, {
    x: boxX + (boxW - textWidth) / 2,
    y: boxY + boxPad,
    size: fontSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  const modified = await pdfDoc.save();
  return new Blob([modified], { type: "application/pdf" });
};

/**
 * Generates a standalone QR code card as a PDF (for non-PDF files).
 * Returns a Blob containing a small PDF with just the QR code and info.
 *
 * @param {string} fileName - Original file name
 * @param {string} hash
 * @returns {Promise<Blob>}
 */
export const generateQRCard = async (fileName, hash) => {
  const qrBytes = await generateQRBytes(hash);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([300, 340]);
  const qrImage = await pdfDoc.embedPng(qrBytes);

  // Background
  page.drawRectangle({
    x: 0, y: 0,
    width: 300, height: 340,
    color: rgb(0.97, 0.97, 0.97),
  });

  // Header
  page.drawText("Document Verification", {
    x: 30, y: 300,
    size: 14,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText("Scan the QR code to verify authenticity", {
    x: 30, y: 282,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Divider
  page.drawLine({
    start: { x: 30, y: 274 },
    end:   { x: 270, y: 274 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  // QR code centered
  const qrSize = 180;
  page.drawImage(qrImage, {
    x: (300 - qrSize) / 2,
    y: 80,
    width: qrSize,
    height: qrSize,
  });

  // File name (truncated)
  const name = fileName.length > 38 ? fileName.slice(0, 35) + "…" : fileName;
  page.drawText(`File: ${name}`, {
    x: 30, y: 62,
    size: 7,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Hash (truncated)
  const shortHash = hash.slice(0, 20) + "…" + hash.slice(-8);
  page.drawText(`Hash: ${shortHash}`, {
    x: 30, y: 50,
    size: 7,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText("Powered by DocVerify — Blockchain Document Verification", {
    x: 30, y: 30,
    size: 6,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: "application/pdf" });
};

/**
 * Triggers a browser download of a Blob.
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
