export interface Ebook {
  id: string;
  title: string;
  description: string;
  author: string;
  price: number; // 0 for free
  coverImage: string; // Firebase Storage path
  pdfPath: string; // Firebase Storage path to PDF
  isFree: boolean;
  pages: number;
  category: string;
  stripeProductId?: string;
  stripePriceId?: string;
}

export const ebooks: Ebook[] = [
  {
    id: "affiliate-marketing-beginners",
    title: "Affiliate Marketing for Beginners: From Bruises to Riches",
    description: "Learn the fundamentals of affiliate marketing and start earning passive income. A comprehensive guide covering everything from choosing a niche to scaling your campaigns.",
    author: "Jay",
    price: 0,
    isFree: true,
    coverImage: "images/affiliate-marketing-cover.jpg",
    pdfPath: "ebooks/public/affiliate-marketing-for-beginners-bruises.pdf",
    pages: 150,
    category: "Marketing"
  },
  {
    id: "affiliate-marketing-vol1",
    title: "Affiliate Marketing for Beginners: Volume 1 - Advanced Strategies",
    description: "Take your affiliate marketing to the next level with advanced strategies, scaling techniques, and monetization secrets that professionals use.",
    author: "Jay",
    price: 29.99,
    isFree: false,
    coverImage: "images/affiliate-marketing-vol1-cover.jpg",
    pdfPath: "ebooks/private/affiliate-marketing-for-beginners-vol1.pdf",
    pages: 250,
    category: "Marketing",
    stripeProductId: "prod_AffiliateVol1",
    stripePriceId: "price_AffiliateVol1"
  },
  {
    id: "complete-seo-guide",
    title: "The Complete SEO Guide: Rank #1 on Google",
    description: "Master SEO from beginner to expert. Learn keyword research, on-page optimization, link building, and advanced ranking strategies used by top agencies.",
    author: "Jay",
    price: 39.99,
    isFree: false,
    coverImage: "images/seo-guide-cover.jpg",
    pdfPath: "ebooks/private/complete-seo-guide.pdf",
    pages: 320,
    category: "SEO",
    stripeProductId: "prod_SEOGuide",
    stripePriceId: "price_SEOGuide"
  }
];

export function getEbookById(id: string): Ebook | undefined {
  return ebooks.find(book => book.id === id);
}

export function getFreeEbooks(): Ebook[] {
  return ebooks.filter(book => book.isFree);
}

export function getPaidEbooks(): Ebook[] {
  return ebooks.filter(book => !book.isFree);
}
