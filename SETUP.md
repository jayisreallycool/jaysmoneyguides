# JaysMoneyGuides Setup Guide

## 🎯 Overview

JaysMoneyGuides is a full-stack ebook platform with:
- **Firebase Storage** for hosting real PDF ebooks
- **Stripe** for payment processing
- **React + TypeScript** frontend with PDF.js viewer
- **Express** backend for Stripe webhooks and signed URLs

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase project with Firestore & Storage
- Stripe account
- Gmail account (for order emails - optional)

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Firestore Database (Start in test mode)
4. Enable Cloud Storage
5. Go to **Project Settings** → **Service Accounts** → **Generate new private key**
6. Copy the entire JSON and save as `FIREBASE_SERVICE_ACCOUNT_KEY`

**Upload your PDFs to Firebase Storage:**
```
ebooks/
├── public/
│   └── affiliate-marketing-for-beginners-bruises.pdf
└── private/
    ├── affiliate-marketing-for-beginners-vol1.pdf
    └── complete-seo-guide.pdf
```

### 2. Stripe Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Get your keys from **Developers** → **API Keys**:
   - `STRIPE_PUBLISHABLE_KEY` (starts with `pk_`)
   - `STRIPE_SECRET_KEY` (starts with `sk_`)
3. Create webhook endpoint:
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - URL: `https://yourdomain.com/api/webhook/stripe`
   - Events: `checkout.session.completed`
   - Copy the **Signing secret** as `STRIPE_WEBHOOK_SECRET`

### 3. Environment Setup

```bash
cd jaysmoneyguides

# Copy example .env
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local
```

**Required variables:**
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
FIREBASE_SERVICE_ACCOUNT_KEY={...}
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

**Terminal 1 - Backend:**
```bash
npm run server
```
This runs the Express server on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
npm run dev
```
This runs the Vite dev server on `http://localhost:5173`

## 📋 API Endpoints

### Frontend API Calls
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/create-checkout-session` | Create Stripe checkout |
| `POST` | `/api/get-signed-url` | Get signed URL for PDF download |
| `GET` | `/api/purchase-status/{sessionId}` | Check purchase completion |
| `GET` | `/api/health` | Health check |

### Stripe Webhook
| Event | Handler |
|-------|---------|
| `checkout.session.completed` | Save order to Firestore |

## 🔐 How It Works

### Free Ebook Flow
1. User clicks "Read Now" on free ebook
2. PDF is fetched directly from Firebase Storage via signed URL
3. PDF.js renders the PDF in modal viewer
4. User can download via signed URL

### Paid Ebook Flow
1. User clicks "Buy Now"
2. Frontend creates Stripe checkout session via `/api/create-checkout-session`
3. User redirected to Stripe checkout page
4. After payment, redirected back with `?purchase_id={sessionId}`
5. Frontend checks purchase status and adds ebook to `ownedEbooks` localStorage
6. User can now read and download via Firebase Storage signed URL

### Download Flow
1. User clicks "Download PDF"
2. Backend generates signed URL from Firebase (5-minute expiry)
3. Frontend redirects to signed URL
4. Browser downloads PDF directly from Firebase Storage

## 🛠️ Development

### Project Structure
```
src/
├── components/
│   ├── EbookCard.tsx          # Ebook listing card
│   ├── EbookViewerModal.tsx   # PDF viewer modal
│   └── PdfViewer.tsx          # PDF.js wrapper
├── config/
│   └── firebase.ts            # Firebase initialization
├── data/
│   └── ebooks.ts              # Ebook metadata
├── lib/
│   └── firebase-storage.ts    # Storage utilities
└── App.tsx                    # Main app

server.ts                       # Express backend
```

### Build for Production

```bash
npm run build
```

Output in `dist/` directory.

## 🚀 Deployment

### Vercel (Frontend)
```bash
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_STRIPE_PUBLISHABLE_KEY
vercel env add VITE_API_URL https://your-api.herokuapp.com
vercel deploy
```

### Railway/Heroku (Backend)
```bash
heroku config:set STRIPE_SECRET_KEY=sk_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...
heroku config:set FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
git push heroku main
```

### Stripe Webhook URL
Update in Stripe Dashboard:
- `https://your-api-domain.com/api/webhook/stripe`

## 📊 Testing

### Test Stripe Payments
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

### Test Firebase Storage
- Free ebook is publicly readable
- Paid ebook requires valid signed URL

## 🔧 Troubleshooting

### "Failed to load PDF"
- Check Firebase Storage bucket name in config
- Verify PDF path is correct
- Check Firebase credentials

### "Stripe failed to load"
- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set
- Check network tab for CORS issues

### "Unauthorized: Token required"
- Paid ebook requires purchase first
- Check `ownedEbooks` in localStorage

### "Webhook signature verification failed"
- Verify `STRIPE_WEBHOOK_SECRET` is correct (from Stripe dashboard)
- Check webhook URL matches exactly

## 📚 Useful Links
- [Firebase Docs](https://firebase.google.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [PDF.js Docs](https://mozilla.github.io/pdf.js/)
- [Express Docs](https://expressjs.com/)

## 📝 License
MIT
