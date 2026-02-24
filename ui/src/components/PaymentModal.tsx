import React, { useEffect } from "react";
import { StripeButton } from "./StripeButton";
import { CreditsButton } from "./CreditsButton";
import { useCedrosTheme } from "../context";
import { getModalCloseButtonStyles } from "../utils";
import type { CartItem, PaymentMethod } from "../types";

const LazyCryptoButton = React.lazy(() =>
  import("./CryptoButton").then((mod) => ({ default: mod.CryptoButton }))
);

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource?: string;         // Single resource ID (for single-item payments)
  items?: CartItem[];        // Multiple items (for cart purchases) - mutually exclusive with resource
  cardLabel?: string;
  cryptoLabel?: string;
  creditsLabel?: string;
  showCard?: boolean;
  showCrypto?: boolean;
  showCredits?: boolean;
  onPaymentAttempt?: (method: PaymentMethod) => void; // Track payment attempt for analytics
  onPaymentSuccess?: (txId: string) => void;  // Legacy: used for auto-Stripe fallback only
  onPaymentError?: (error: string) => void;   // Legacy: used for auto-Stripe fallback only
  // Method-specific callbacks (new, preferred)
  onStripeSuccess?: (txId: string) => void;
  onCryptoSuccess?: (txId: string) => void;
  onCreditsSuccess?: (txId: string) => void;
  onStripeError?: (error: string) => void;
  onCryptoError?: (error: string) => void;
  onCreditsError?: (error: string) => void;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  couponCode?: string;
  /** JWT token from cedros-login for credits payment authentication */
  authToken?: string;
  testPageUrl?: string;
  hideMessages?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  resource,
  items,
  cardLabel = "Card",
  cryptoLabel = "USDC (Solana)",
  creditsLabel = "Pay with Credits",
  showCard = true,
  showCrypto = true,
  showCredits = false,
  onPaymentAttempt,
  onPaymentSuccess,
  onPaymentError,
  onStripeSuccess,
  onCryptoSuccess,
  onCreditsSuccess,
  onStripeError,
  onCryptoError,
  onCreditsError,
  customerEmail,
  successUrl,
  cancelUrl,
  metadata,
  couponCode,
  authToken,
  testPageUrl,
  hideMessages = false,
}) => {
  const { tokens } = useCedrosTheme();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position and lock scroll
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflowY = "scroll";

      // CRITICAL: Return cleanup function to restore scroll if component unmounts while modal is open
      // Without this, unmounting with isOpen=true leaves the page permanently scroll-locked
      return () => {
        const savedScrollY = document.body.style.top
          ? Math.abs(parseInt(document.body.style.top.replace('px', ''), 10))
          : 0;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflowY = "";
        window.scrollTo(0, savedScrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="cedros-modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: tokens.modalOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        className="cedros-modal-content"
        style={{
          backgroundColor: tokens.modalBackground,
          borderRadius: "12px",
          padding: "2rem",
          maxWidth: "400px",
          width: "100%",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: `1px solid ${tokens.modalBorder}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: 600,
              color: tokens.surfaceText,
            }}
          >
            Choose Payment Method
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={getModalCloseButtonStyles(tokens.surfaceText)}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {showCard && (
            <StripeButton
              resource={resource}
              items={items}
              label={cardLabel}
              onAttempt={onPaymentAttempt}
              onSuccess={onStripeSuccess || onPaymentSuccess}
              onError={onStripeError || onPaymentError}
              customerEmail={customerEmail}
              successUrl={successUrl}
              cancelUrl={cancelUrl}
              metadata={metadata}
              couponCode={couponCode}
            />
          )}
          {showCrypto && (
            <React.Suspense fallback={null}>
              <LazyCryptoButton
                resource={resource}
                items={items}
                label={cryptoLabel}
                onAttempt={onPaymentAttempt}
                onSuccess={onCryptoSuccess || onPaymentSuccess}
                onError={onCryptoError || onPaymentError}
                testPageUrl={testPageUrl}
                hideMessages={hideMessages}
                metadata={metadata}
                couponCode={couponCode}
              />
            </React.Suspense>
          )}
          {showCredits && (
            <CreditsButton
              resource={resource}
              items={items}
              label={creditsLabel}
              authToken={authToken}
              onAttempt={onPaymentAttempt ? () => onPaymentAttempt('credits') : undefined}
              onSuccess={onCreditsSuccess || onPaymentSuccess}
              onError={onCreditsError || onPaymentError}
              metadata={metadata}
              couponCode={couponCode}
            />
          )}
        </div>
      </div>
    </div>
  );
};
