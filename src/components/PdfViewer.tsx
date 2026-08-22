import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfViewerProps {
  pdfUrl: string;
  title?: string;
  onLoadComplete?: (numPages: number) => void;
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNum: number) => Promise<any>;
}

export function PdfViewer({ pdfUrl, title, onLoadComplete }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);

  // Load and render PDF
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch PDF
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error(`Failed to load PDF: ${response.statusText}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise as PDFDocumentProxy;
        
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        onLoadComplete?.(pdf.numPages);

        // Render first page
        renderPage(pdf, 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load PDF';
        setError(message);
        console.error('PDF loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [pdfUrl, onLoadComplete]);

  // Render specific page
  const renderPage = async (pdf: PDFDocumentProxy, pageNum: number) => {
    try {
      if (!canvasRef.current) return;

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas context not available');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      setCurrentPage(pageNum);
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Failed to render page');
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1 && pdfDocRef.current) {
      renderPage(pdfDocRef.current, currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages && pdfDocRef.current) {
      renderPage(pdfDocRef.current, currentPage + 1);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Error loading PDF</p>
          <p className="text-red-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      {title && (
        <div className="bg-gray-800 p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold truncate">{title}</h2>
        </div>
      )}

      {/* Canvas */}
      <div className="bg-gray-950 overflow-auto flex justify-center p-4 max-h-96">
        <canvas
          ref={canvasRef}
          className="shadow-lg"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <button
          onClick={handlePreviousPage}
          disabled={currentPage <= 1}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
        >
          Previous
        </button>

        <div className="text-white text-sm">
          Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{numPages}</span>
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPage >= numPages}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
