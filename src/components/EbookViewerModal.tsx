import { useState, useEffect } from 'react';
import { PdfViewer } from './PdfViewer';
import { getPdfViewUrl, getSignedUrlForPdf, downloadPdfFromUrl } from '../lib/firebase-storage';
import type { Ebook } from '../data/ebooks';

interface EbookViewerModalProps {
  ebook: Ebook;
  isOpen: boolean;
  onClose: () => void;
  isOwned: boolean;
}

export function EbookViewerModal({
  ebook,
  isOpen,
  onClose,
  isOwned
}: EbookViewerModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Load PDF from Firebase Storage
  useEffect(() => {
    if (!isOpen) {
      setPdfUrl(null);
      return;
    }

    // For free ebooks or owned paid ebooks, load the PDF
    if (ebook.isFree || isOwned) {
      const loadPdf = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const url = await getPdfViewUrl(ebook.pdfPath);
          setPdfUrl(url);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load PDF';
          setError(message);
          console.error('Error loading PDF:', err);
        } finally {
          setIsLoading(false);
        }
      };

      loadPdf();
    }
  }, [isOpen, ebook, isOwned]);

  // Handle PDF download
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setError(null);

      // Get signed URL from backend
      const signedUrl = await getSignedUrlForPdf(ebook.pdfPath);
      
      // Download the PDF
      await downloadPdfFromUrl(signedUrl, `${ebook.title}.pdf`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
      console.error('Error downloading PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{ebook.title}</h2>
            <p className="text-sm text-gray-600 mt-1">by {ebook.author}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-bold text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading PDF from Firebase Storage...</p>
              </div>
            </div>
          )}

          {!isLoading && pdfUrl && (
            <PdfViewer pdfUrl={pdfUrl} title={ebook.title} />
          )}

          {!isLoading && !pdfUrl && !ebook.isFree && !isOwned && (
            <div className="flex items-center justify-center h-96 bg-gray-100 rounded">
              <div className="text-center">
                <p className="text-gray-600 font-semibold mb-4">
                  Purchase this ebook to view and download
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Purchase Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with download button */}
        {pdfUrl && (ebook.isFree || isOwned) && (
          <div className="border-t p-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 transition"
            >
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
