import type { Ebook } from '../data/ebooks';

interface EbookCardProps {
  ebook: Ebook;
  isOwned: boolean;
  onRead: (ebook: Ebook) => void;
  onBuy: (ebook: Ebook) => void;
}

export function EbookCard({
  ebook,
  isOwned,
  onRead,
  onBuy
}: EbookCardProps) {
  const placeholderImage = `https://via.placeholder.com/250x350?text=${encodeURIComponent(ebook.title)}`;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden">
      {/* Cover Image */}
      <div className="aspect-[3/4] bg-gray-200 overflow-hidden">
        <img
          src={placeholderImage}
          alt={ebook.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 line-clamp-2">
          {ebook.title}
        </h3>
        
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
          {ebook.description}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{ebook.pages} pages</p>
            {!ebook.isFree && (
              <p className="text-lg font-bold text-blue-600 mt-1">
                ${ebook.price.toFixed(2)}
              </p>
            )}
            {ebook.isFree && (
              <p className="text-lg font-bold text-green-600 mt-1">Free</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          {isOwned || ebook.isFree ? (
            <button
              onClick={() => onRead(ebook)}
              className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
            >
              Read Now
            </button>
          ) : (
            <button
              onClick={() => onBuy(ebook)}
              className="flex-1 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition"
            >
              Buy Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
