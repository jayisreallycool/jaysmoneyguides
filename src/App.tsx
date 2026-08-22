import { useState, useEffect } from 'react';
import { EbookCard } from './components/EbookCard';
import { EbookViewerModal } from './components/EbookViewerModal';
import { ebooks } from './data/ebooks';
import type { Ebook } from './data/ebooks';
import './App.css';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Type for Stripe loaded via CDN
declare global {
  interface Window {
    Stripe?: (key: string) => any;
  }
}

export function App() {
  const [selectedEbook, setSelectedEbook] = useState<Ebook | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [ownedEbooks, setOwnedEbooks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Stripe and owned ebooks on mount
  useEffect(() => {
    // Load Stripe.js from CDN
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    document.body.appendChild(script);

    // Load owned ebooks from localStorage
    const owned = localStorage.getItem('ownedEbooks');
    if (owned) {
      setOwnedEbooks(JSON.parse(owned));
    }

    // Check for purchase completion in URL params
    const params = new URLSearchParams(window.location.search);
    const purchaseId = params.get('purchase_id');
    if (purchaseId) {
      handlePurchaseComplete(purchaseId);
    }

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Check if user owns an ebook
  const isOwned = (ebookId: string) => {
    return ownedEbooks.includes(ebookId);
  };

  // Handle purchase completion
  const handlePurchaseComplete = async (purchaseId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/purchase-status/${purchaseId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.productId) {
          const updated = [...ownedEbooks, data.productId];
          setOwnedEbooks(updated);
          localStorage.setItem('ownedEbooks', JSON.stringify(updated));
          
          // Remove from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (err) {
      console.error('Error checking purchase status:', err);
    }
  };

  // Handle buying an ebook
  const handleBuyEbook = async (ebook: Ebook) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!window.Stripe) {
        throw new Error('Stripe failed to load');
      }

      const stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);

      // Call backend to create checkout session
      const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ebookId: ebook.id,
          ebookTitle: ebook.title,
          price: ebook.price,
          stripePriceId: ebook.stripePriceId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe checkout
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      setError(message);
      console.error('Purchase error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reading an ebook
  const handleReadEbook = (ebook: Ebook) => {
    setSelectedEbook(ebook);
    setIsViewerOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Jay's Money Guides</h1>
          <p className="text-gray-600 mt-2">Premium financial education ebooks</p>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Free Ebooks Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Free Ebooks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ebooks.filter(e => e.isFree).map(ebook => (
              <EbookCard
                key={ebook.id}
                ebook={ebook}
                isOwned={true}
                onRead={handleReadEbook}
                onBuy={handleBuyEbook}
              />
            ))}
          </div>
        </section>

        {/* Paid Ebooks Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Premium Ebooks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ebooks.filter(e => !e.isFree).map(ebook => (
              <EbookCard
                key={ebook.id}
                ebook={ebook}
                isOwned={isOwned(ebook.id)}
                onRead={handleReadEbook}
                onBuy={handleBuyEbook}
              />
            ))}
          </div>
        </section>
      </main>

      {/* PDF Viewer Modal */}
      {selectedEbook && (
        <EbookViewerModal
          ebook={selectedEbook}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          isOwned={isOwned(selectedEbook.id) || selectedEbook.isFree}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700 font-semibold">Processing payment...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
