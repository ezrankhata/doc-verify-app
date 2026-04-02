/**
 * qrScanner.js
 * Scans a File (PDF or image) for an embedded DocVerify QR code.
 * Used during verification so that stamped PDFs can be verified
 * using the hash encoded in their QR code rather than their modified file hash.
 */
import jsQR from "jsqr";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/**
 * Renders the first page of a PDF to an ImageData object using pdf.js.
 */
async function pdfToImageData(file) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Draws an image File to a canvas and returns its ImageData.
 */
function imageToImageData(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

/**
 * Scans a file (PDF or image) for an embedded DocVerify QR code.
 * Returns the hash string (e.g. "0x...64 hex chars") if found, or null.
 */
export async function scanFileForQR(file) {
  try {
    let imageData;
    if (file.type === "application/pdf") {
      imageData = await pdfToImageData(file);
    } else if (file.type.startsWith("image/")) {
      imageData = await imageToImageData(file);
    } else {
      return null;
    }

    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (!code) return null;

    // Expect a URL like https://.../?hash=0x<64 hex chars>
    try {
      const url = new URL(code.data);
      const hash = url.searchParams.get("hash");
      if (hash && /^0x[0-9a-fA-F]{64}$/.test(hash)) return hash;
    } catch {
      // QR may contain the raw hash directly
      if (/^0x[0-9a-fA-F]{64}$/.test(code.data)) return code.data;
    }
    return null;
  } catch {
    return null; // No QR found or any error — caller falls back to file hashing
  }
}
