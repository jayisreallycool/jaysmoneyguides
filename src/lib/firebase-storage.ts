import { storage } from '../config/firebase';
import { ref, getBytes, getMetadata } from 'firebase/storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Get a signed URL for a Firebase Storage file
 * Uses backend to generate signed URLs (5-minute expiry)
 */
export async function getSignedUrlForPdf(pdfPath: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/get-signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pdfPath })
    });

    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.statusText}`);
    }

    const data = await response.json();
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw error;
  }
}

/**
 * Fetch PDF bytes directly from Firebase Storage (client-side)
 * Use this for direct reads without backend
 */
export async function getPdfBytes(pdfPath: string): Promise<ArrayBuffer> {
  try {
    const fileRef = ref(storage, pdfPath);
    const bytes = await getBytes(fileRef);
    return bytes;
  } catch (error) {
    console.error(`Error fetching PDF from Firebase Storage (${pdfPath}):`, error);
    throw error;
  }
}

/**
 * Download PDF from signed URL
 */
export async function downloadPdfFromUrl(signedUrl: string, filename: string): Promise<void> {
  try {
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
}

/**
 * Stream PDF from Firebase Storage for viewing
 * Creates an object URL for embedding in viewer
 */
export async function getPdfViewUrl(pdfPath: string): Promise<string> {
  try {
    const bytes = await getPdfBytes(pdfPath);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return window.URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error creating PDF view URL:', error);
    throw error;
  }
}

/**
 * Check if PDF exists and get metadata
 */
export async function checkPdfExists(pdfPath: string): Promise<boolean> {
  try {
    const fileRef = ref(storage, pdfPath);
    await getMetadata(fileRef);
    return true;
  } catch {
    return false;
  }
}
