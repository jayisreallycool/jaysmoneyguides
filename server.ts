import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { storage } from './src/config/firebase';
import { ref, getBytes } from 'firebase/storage';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
);

if (Object.keys(serviceAccount).length > 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

// Middleware
app.use(cors());
app.use(express.json());

// Ebook mapping for Stripe
const ebookMap: Record<string, { title: string; pdfPath: string }> = {
  'affiliate-marketing-beginners': {
    title: 'Affiliate Marketing for Beginners',
    pdfPath: 'ebooks/public/affiliate-marketing-for-beginners-bruises.pdf'
  },
  'affiliate-marketing-vol1': {
    title: 'Affiliate Marketing Volume 1',
    pdfPath: 'ebooks/private/affiliate-marketing-for-beginners-vol1.pdf'
  },
  'complete-seo-guide': {
    title: 'The Complete SEO Guide',
    pdfPath: 'ebooks/private/complete-seo-guide.pdf'
  }
};

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/create-checkout-session
 * Create a Stripe checkout session for an ebook
 */
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { ebookId, ebookTitle, price } = req.body;

    if (!ebookId || !ebookTitle || !price) {
      return res.status(400).json({
        error: 'Missing required fields: ebookId, ebookTitle, price'
      });
    }

    // Create Stripe product and price if not exists
    const product = await stripe.products.create({
      name: ebookTitle,
      description: `Digital ebook: ${ebookTitle}`,
      metadata: { ebookId }
    });

    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price * 100), // Convert to cents
      currency: 'usd'
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.SITE_URL || 'http://localhost:5173'}?purchase_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL || 'http://localhost:5173'}`,
      metadata: {
        ebookId,
        ebookTitle
      }
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session'
    });
  }
});

/**
 * POST /api/get-signed-url
 * Get a signed URL for downloading a PDF from Firebase Storage
 */
app.post('/api/get-signed-url', async (req, res) => {
  try {
    const { path } = req.body;

    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    // Generate signed URL using Firebase Admin SDK
    const bucket = admin.storage().bucket();
    const file = bucket.file(path);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    res.json({ signedUrl });
  } catch (error) {
    console.error('Signed URL error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate signed URL'
    });
  }
});

/**
 * GET /api/download-ebook
 * Download ebook PDF - for free ebooks or authenticated users
 */
app.get('/api/download-ebook', async (req, res) => {
  try {
    const { productId, token } = req.query;

    if (!productId) {
      return res.status(400).json({ error: 'Missing productId' });
    }

    const ebook = ebookMap[productId as string];
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' });
    }

    // For free ebooks, allow direct download
    // For paid ebooks, verify token
    if (!productId.includes('affiliate-marketing-beginners')) {
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Token required' });
      }

      // Verify token (basic validation)
      // In production, verify against database
      if (!verifyDownloadToken(token as string, productId as string)) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
    }

    // Get signed URL from Firebase
    const bucket = admin.storage().bucket();
    const file = bucket.file(ebook.pdfPath);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Redirect to signed URL
    res.redirect(signedUrl);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Download failed'
    });
  }
});

/**
 * POST /api/webhook/stripe
 * Stripe webhook for payment completion
 */
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Store order in Firestore
      if (admin.firestore) {
        const db = admin.firestore();
        await db.collection('orders').doc(session.id).set({
          sessionId: session.id,
          ebookId: session.metadata?.ebookId,
          ebookTitle: session.metadata?.ebookTitle,
          amount: session.amount_total,
          currency: session.currency,
          customerEmail: session.customer_email,
          createdAt: new Date(),
          status: 'completed'
        });
      }

      console.log(`✓ Order completed: ${session.id} for ebook ${session.metadata?.ebookId}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error}`);
  }
});

/**
 * GET /api/purchase-status/:sessionId
 * Check purchase status after Stripe checkout
 */
app.get('/api/purchase-status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      res.json({
        status: 'success',
        productId: session.metadata?.ebookId,
        customerEmail: session.customer_email
      });
    } else {
      res.json({
        status: 'pending',
        paymentStatus: session.payment_status
      });
    }
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check status'
    });
  }
});

/**
 * Helper: Verify download token
 */
function verifyDownloadToken(token: string, productId: string): boolean {
  try {
    const secret = process.env.DOWNLOAD_TOKEN_SECRET || 'secret';
    const [timestamp, hash] = token.split('.');

    if (!timestamp || !hash) return false;

    const ts = parseInt(timestamp);
    const now = Date.now();

    // Token expires in 30 days
    if (now - ts > 30 * 24 * 60 * 60 * 1000) return false;

    // Verify HMAC
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${productId}:${timestamp}`)
      .digest('hex');

    return hash === expected;
  } catch {
    return false;
  }
}

/**
 * Error handling middleware
 */
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: error.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✓ JaysMoneyGuides server running on http://localhost:${PORT}`);
  console.log(`  - Firebase Storage: ${process.env.FIREBASE_STORAGE_BUCKET}`);
  console.log(`  - Stripe Webhook: POST /api/webhook/stripe`);
  console.log(`  - Download API: GET /api/download-ebook?productId=...`);
  console.log(`  - Checkout API: POST /api/create-checkout-session`);
  console.log();
});
