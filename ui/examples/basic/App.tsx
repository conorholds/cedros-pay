import React, { useState } from "react";
import { CedrosPay, CedrosProvider, useCedrosTheme } from "../../src";
import "../../src/styles.css";

function ThemeSwitcher() {
  const { mode, setMode } = useCedrosTheme();
  const nextMode = mode === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={() => setMode(nextMode)}
      style={{ marginBottom: "1rem" }}
    >
      Switch to {nextMode} mode
    </button>
  );
}

// Environment variables with fallbacks
const config = {
  stripePublicKey:
    (import.meta as any).env?.VITE_STRIPE_PUBLIC_KEY || "pk_test_placeholder",
  serverUrl: (import.meta as any).env?.VITE_SERVER_URL || "http://localhost:8080",
  solanaCluster: ((import.meta as any).env?.VITE_SOLANA_CLUSTER ||
    "mainnet-beta") as "mainnet-beta" | "devnet" | "testnet",
  theme: "light" as const,
};

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  return (
    <CedrosProvider config={config}>
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "2rem" }}>
        <h1 style={{ marginBottom: "1rem" }}>Cedros Pay Demo</h1>
        <ThemeSwitcher />

        <CedrosPay
          resource="demo-item-id-1"
          callbacks={{
            onPaymentSuccess: (result) => {
              console.log("Payment successful!", result);
              setIsUnlocked(true);
            },
            onPaymentError: (error) => console.error("Payment error:", error),
          }}
        />

        <section style={{ marginTop: "1.5rem" }}>
          {isUnlocked ? (
            <p>🎉 Content unlocked! Render your premium experience here.</p>
          ) : (
            <p>
              Purchase access for $1 or 1 USDC to unlock the hidden content.
            </p>
          )}
        </section>
      </main>
    </CedrosProvider>
  );
}
