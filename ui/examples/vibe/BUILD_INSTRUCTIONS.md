# 🤖 AI Agent Build Instructions: Cedros Pay Demo App

> **For AI Agents (Claude, GPT, etc.):** This document contains complete, executable instructions to build a working Cedros Pay demo app. Follow each step sequentially, creating all files exactly as specified.

> **For Developers:** You can also use this as a manual guide. Customize the example by changing resource IDs, page content, and styling to match your use case.

---

## 📋 Project Overview

**What you're building:** A React demo app showcasing Cedros Pay's dual payment system (Stripe + Solana).

**Key features:**

- Single product purchase page (ebook for $1)
- Multi-item cart page (ebook + coffee tip for $2 total)
- Wallet connection UI with Phantom/Solflare support
- PDF download after successful payment
- Theme switching (light/dark mode)

**Tech stack:**

- React 18+ with TypeScript
- Vite (build tool)
- @cedros/pay-react (payment components)
- Solana wallet adapters
- React Router DOM

---

## 🎯 Customization Points

Before starting, you can customize these values:

| What               | Default                                   | Change to...                        |
| ------------------ | ----------------------------------------- | ----------------------------------- |
| **App name**       | `cedros-pay-ebook-demo`                   | Your app name                       |
| **Resource IDs**   | `ebook-guide`, `coffee-tip`               | Your product IDs                    |
| **Prices**         | $1.00 each                                | Your prices (configured in backend) |
| **PDF filename**   | `cedros-guide-to-generational-wealth.pdf` | Your digital product                |
| **Page titles**    | "Ebook", "Cart"                           | Your product names                  |
| **Success action** | Open PDF in new tab                       | Redirect, show content, etc.        |

---

## ✅ Step-by-Step Build Instructions

### Step 1: Initialize Project

```bash
# Create new Vite React TypeScript project
npm create vite@latest cedros-pay-ebook-demo -- --template react-ts

# Navigate into project
cd cedros-pay-ebook-demo

# Install dependencies
npm install

# Install Cedros Pay
npm install @cedros/pay-react

# Install Solana wallet adapters
npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-base @solana/wallet-adapter-wallets @solana/wallet-adapter-react-ui

# Install React Router
npm install react-router-dom
```

**Verification:** Run `npm run dev` - you should see the default Vite React app.

---

### Step 2: Create Environment Configuration

Create `.env` in project root:

```env
# Stripe Configuration
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_test_key_here

# Backend API
VITE_SERVER_URL=http://localhost:8080

# Solana Configuration
VITE_SOLANA_CLUSTER=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

**Verification:** Environment variables should be accessible via `import.meta.env.VITE_*`

---

### Step 3: Create Directory Structure

```bash
# Create directories
mkdir -p src/routes src/components src/lib public

# You should now have:
# src/
#   routes/
#   components/
#   lib/
# public/
```

---

### Step 4: Add PDF Asset (Placeholder)

Create a placeholder PDF or add your actual PDF:

**Option A - Placeholder:**

```bash
# Create a simple placeholder text file
echo "Your ebook content here" > public/cedros-guide-to-generational-wealth.pdf
```

**Option B - Real PDF:**
Copy your actual PDF file to `public/cedros-guide-to-generational-wealth.pdf`

**Verification:** File should be accessible at `/cedros-guide-to-generational-wealth.pdf` when app runs.

---

### Step 5: Create Wallet Connection Component

Create `src/components/WalletConnection.tsx`:

```tsx
import { FC, PropsWithChildren, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint =
  import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export const WalletConnection: FC<PropsWithChildren> = ({ children }) => {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
```

**Purpose:** Wraps app with Solana wallet context, enables wallet connection.

---

### Step 6: Create Payment Success Handler

Create `src/lib/payment.ts`:

```ts
export function openEbookAfterSuccess() {
  // PDF is served from /public:
  const url = "/cedros-guide-to-generational-wealth.pdf";
  window.open(url, "_blank", "noopener,noreferrer");
}
```

**Purpose:** Opens PDF in new tab after successful payment.

**Customization:** Replace with redirect, content unlock, API call, etc.

---

### Step 7: Create Purchase Button Components

Create `src/components/PurchaseExamples.tsx`:

```tsx
import { openEbookAfterSuccess } from "../lib/payment";
import { CedrosPay } from "@cedros/pay-react";

// SINGLE PRODUCT — $1 Ebook
export function EbookPurchaseButton() {
  return (
    <CedrosPay
      resource="ebook-guide"
      callbacks={{
        onPaymentSuccess: (result) => {
          console.log("Payment successful:", result);
          openEbookAfterSuccess();
        },
        onPaymentError: (error) => {
          console.error("Payment failed:", error);
        },
      }}
    />
  );
}

// CART — $2 total (Ebook $1 + Coffee $1)
export function CartPurchaseButton() {
  return (
    <CedrosPay
      items={[
        { resource: "ebook-guide", quantity: 1 },
        { resource: "coffee-tip", quantity: 1 },
      ]}
      callbacks={{
        onPaymentSuccess: (result) => {
          console.log("Cart payment successful:", result);
          openEbookAfterSuccess();
        },
        onPaymentError: (error) => {
          console.error("Cart payment failed:", error);
        },
      }}
    />
  );
}
```

**Purpose:** Reusable payment button components for single and multi-item purchases.

**Customization:** Change `resource` IDs to match your backend configuration.

---

### Step 8: Create Page Components

#### `src/routes/Home.tsx`

```tsx
export default function Home() {
  return (
    <div>
      <h2>Welcome to Cedros Pay Demo</h2>
      <p>
        This demo showcases the CedrosPay component for both single product and
        cart purchases.
      </p>
      <ul>
        <li>
          <strong>Ebook page:</strong> Single $1 purchase
        </li>
        <li>
          <strong>Cart page:</strong> $2 total (Ebook $1 + Coffee $1)
        </li>
      </ul>
      <p>
        Payment methods available: Credit Card (Stripe) + Crypto (Solana USDC)
      </p>
    </div>
  );
}
```

#### `src/routes/EbookPage.tsx`

```tsx
import { EbookPurchaseButton } from "../components/PurchaseExamples";

export default function EbookPage() {
  return (
    <section>
      <h2>Cedros Guide to Generational Wealth</h2>
      <p>Get instant access to our exclusive ebook for just $1.</p>
      <p>After payment, the PDF will open in a new tab.</p>
      <EbookPurchaseButton />
    </section>
  );
}
```

#### `src/routes/CartPage.tsx`

```tsx
import { CartPurchaseButton } from "../components/PurchaseExamples";

export default function CartPage() {
  return (
    <section>
      <h2>Your Cart</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <li style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
          <span>Cedros Guide to Generational Wealth (PDF)</span>
          <span style={{ float: "right" }}>$1.00</span>
        </li>
        <li style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
          <span>Buy me a coffee ☕</span>
          <span style={{ float: "right" }}>$1.00</span>
        </li>
        <li style={{ padding: "8px 0", fontWeight: "bold" }}>
          <span>Total</span>
          <span style={{ float: "right" }}>$2.00</span>
        </li>
      </ul>
      <CartPurchaseButton />
    </section>
  );
}
```

**Purpose:** Three route pages demonstrating different use cases.

---

### Step 9: Update App.tsx with Routing

Replace `src/App.tsx` with:

```tsx
import { Routes, Route, Link } from "react-router-dom";
import { CedrosProvider } from "@cedros/pay-react";
import "@cedros/pay-react/style.css";
import Home from "./routes/Home";
import EbookPage from "./routes/EbookPage";
import CartPage from "./routes/CartPage";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function App() {
  return (
    <CedrosProvider
      stripePublicKey={import.meta.env.VITE_STRIPE_PUBLIC_KEY}
      serverUrl={import.meta.env.VITE_SERVER_URL || "http://localhost:8080"}
      solanaCluster={import.meta.env.VITE_SOLANA_CLUSTER || "devnet"}
    >
      <div style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <h1 style={{ margin: 0 }}>Cedros Pay Demo</h1>
          <WalletMultiButton />
        </header>

        <nav
          style={{
            marginBottom: "2rem",
            borderBottom: "2px solid #eee",
            paddingBottom: "1rem",
          }}
        >
          <Link
            to="/"
            style={{
              marginRight: 20,
              textDecoration: "none",
              color: "#0066cc",
            }}
          >
            Home
          </Link>
          <Link
            to="/ebook"
            style={{
              marginRight: 20,
              textDecoration: "none",
              color: "#0066cc",
            }}
          >
            Ebook
          </Link>
          <Link to="/cart" style={{ textDecoration: "none", color: "#0066cc" }}>
            Cart
          </Link>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ebook" element={<EbookPage />} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </div>
    </CedrosProvider>
  );
}
```

**Purpose:** Main app component with CedrosPay provider, routing, and navigation.

---

### Step 10: Update main.tsx with Providers

Replace `src/main.tsx` with:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { WalletConnection } from "./components/WalletConnection";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletConnection>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </WalletConnection>
  </React.StrictMode>
);
```

**Purpose:** Entry point with all necessary providers (Wallet, Router, CedrosPay).

---

### Step 11: Clean Up Generated Files

Remove unused files from Vite template:

```bash
# Remove default Vite template files (optional)
rm src/App.css
```

---

### Step 12: Backend Configuration Requirement

**IMPORTANT:** Your Cedros Pay backend must define these resources:

#### Resource: `ebook-guide`

- Price: $1.00 USD
- USDC equivalent: ~1 USDC
- Description: "Cedros Guide to Generational Wealth (PDF)"

#### Resource: `coffee-tip`

- Price: $1.00 USD
- USDC equivalent: ~1 USDC
- Description: "Buy me a coffee"

The backend handles all pricing logic. The frontend only passes resource IDs.

**Backend setup guide:** See [Cedros Pay Backend Documentation](https://github.com/conorholds/cedros-pay/tree/main/server)

---

### Step 13: Run Development Server

```bash
npm run dev
```

**Expected output:**

```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

Open `http://localhost:5173` in your browser.

---

### Step 14: Testing Checklist

**Frontend testing:**

- [ ] App loads without errors
- [ ] Navigation works (Home, Ebook, Cart)
- [ ] Wallet connect button appears (top right)
- [ ] Payment buttons render on Ebook and Cart pages
- [ ] Both Stripe and Solana payment options show

**Wallet testing:**

- [ ] Click "Select Wallet" - modal opens
- [ ] Phantom/Solflare wallets appear in list
- [ ] Connect wallet - shows connected address
- [ ] Disconnect works

**Stripe payment testing:**

- [ ] Click "Pay with Card" button
- [ ] Redirects to Stripe checkout
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Any future expiry, any CVC, any ZIP
- [ ] Redirects back after payment
- [ ] PDF opens in new tab

**Crypto payment testing:**

- [ ] Connect wallet first
- [ ] Click "Pay with Crypto" button
- [ ] Wallet prompts for transaction approval
- [ ] Approve transaction
- [ ] Payment processes
- [ ] PDF opens in new tab

---

## 🎨 Customization Guide

### Change Resource IDs

In `src/components/PurchaseExamples.tsx`:

```tsx
// Change 'ebook-guide' to your resource ID
<CedrosPay
  resource="your-product-id"
  callbacks={{ onPaymentSuccess, onPaymentError }}
/>

// Or for cart:
<CedrosPay
  items={[
    { resource: 'your-product-1', quantity: 1 },
    { resource: 'your-product-2', quantity: 1 }
  ]}
  callbacks={{ onPaymentSuccess, onPaymentError }}
/>
```

### Use Component API Options

The `<CedrosPay>` component uses option groups for a cleaner, future-proof API:

```tsx
<CedrosPay
  resource="your-product-id"

  // Callback handlers
  callbacks={{
    onPaymentSuccess: (result) => {
      // result contains: { transactionId, method, timestamp? }
      console.log('Payment completed:', result);
      console.log('Transaction ID:', result.transactionId);
      console.log('Method used:', result.method); // 'stripe' | 'crypto'
    },
    onPaymentError: (error) => {
      // error contains detailed error info
      console.error('Payment failed:', error);
    },
    onPaymentAttempt: (method) => {
      // Called when user clicks pay button (for analytics)
      console.log('Attempting payment with', method);
    }
  }}

  // Checkout configuration
  checkout={{
    customerEmail: "user@example.com",
    couponCode: "SAVE20",
    successUrl: "/thank-you",
    cancelUrl: "/checkout",
    metadata: { orderId: "12345" }
  }}

  // Display customization
  display={{
    cardLabel: "Pay with Card",
    cryptoLabel: "Pay with Crypto",
    layout: "horizontal", // or "vertical"
    className: "my-custom-styles"
  }}

  // Advanced options
  advanced={{
    wallets: [...], // Custom wallet adapters
    autoDetectWallets: true
  }}
/>
```

### Change Success Action

In `src/lib/payment.ts`:

```ts
// Instead of opening PDF:
export function onPaymentSuccess() {
  // Option 1: Redirect
  window.location.href = "/thank-you";

  // Option 2: Show content
  // (Use state management to unlock content)

  // Option 3: API call
  // await fetch('/api/fulfill-order', ...);
}
```

**Note:** The `onPaymentSuccess` callback now receives a `PaymentSuccessResult` object instead of just a transaction ID string.

### Add Styling

**Option A - Tailwind CSS:**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Option B - Custom CSS:**
Add styles to `src/index.css` or create component-specific CSS files.

### Change Prices

Prices are configured in the backend, not the frontend. Update your backend resource definitions.

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify

```bash
# Build for production
npm run build

# Deploy dist/ folder to Netlify
```

### Environment Variables

Make sure to set these in your hosting platform:

- `VITE_STRIPE_PUBLIC_KEY`
- `VITE_SERVER_URL`
- `VITE_SOLANA_CLUSTER`
- `VITE_SOLANA_RPC_URL`

---

## 🐛 Troubleshooting

### "Module not found: @cedros/pay-react"

- Run `npm install @cedros/pay-react`
- Restart dev server

### Wallet button doesn't appear

- Check `@solana/wallet-adapter-react-ui` is installed
- Verify `WalletConnection` wrapper in `main.tsx`
- Check browser console for errors

### Payment buttons don't show

- Verify `CedrosProvider` wraps your app
- Check environment variables are set
- Verify backend is running on `VITE_SERVER_URL`

### Backend connection failed

- Ensure backend is running
- Check `VITE_SERVER_URL` points to correct address
- Verify CORS is enabled on backend
- Check browser network tab for request errors

### PDF doesn't open

- Verify file exists in `public/` folder
- Check browser pop-up blocker settings
- Verify filename matches in `payment.ts`

---

## 📚 Additional Resources

- [Cedros Pay React SDK](https://github.com/conorholds/cedros-pay/tree/main/ui)
- [Cedros Pay Server](https://github.com/conorholds/cedros-pay/tree/main/server)
- [Solana Wallet Adapter Docs](https://github.com/solana-labs/wallet-adapter)
- [Stripe Testing Cards](https://stripe.com/docs/testing)

---

## ✅ Success Criteria

Your demo is complete when:

- ✅ All pages load without errors
- ✅ Wallet connection works
- ✅ Both payment methods (Stripe + Solana) are functional
- ✅ Single product purchase works
- ✅ Multi-item cart purchase works
- ✅ PDF opens after successful payment
- ✅ Backend resources are properly configured

---

**🎉 You're done!** You now have a working Cedros Pay demo that showcases dual payment functionality.
