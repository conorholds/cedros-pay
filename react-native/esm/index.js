import {
  CedrosPayCheckout
} from "./chunks/chunk-K72WK5OJ.js";
import {
  __commonJS,
  __toESM
} from "./chunks/chunk-MWQDBMYF.js";

// src/i18n/translations/en.json
var require_en = __commonJS({
  "src/i18n/translations/en.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - Translation Source File (English)",
      version: "1.0.0",
      locale: "en",
      ui: {
        pay_with_card: "Pay with Card",
        pay_with_crypto: "Pay with USDC",
        pay_with_usdc: "Pay with USDC",
        pay_with_credits: "Pay with Credits",
        purchase: "Purchase",
        card: "Card",
        usdc_solana: "USDC (Solana)",
        crypto: "Crypto",
        credits: "Credits",
        connect_wallet: "Connect Wallet",
        connecting: "Connecting...",
        processing: "Processing...",
        loading: "Loading...",
        close: "Close",
        cancel: "Cancel",
        confirm: "Confirm",
        retry: "Try Again",
        go_back: "Go Back",
        contact_support: "Contact Support",
        disconnect: "Disconnect",
        payment_successful: "Payment successful!",
        subscribe: "Subscribe",
        subscribe_with_crypto: "Subscribe with USDC",
        subscribe_with_credits: "Subscribe with Credits",
        subscribed: "Subscribed",
        subscribed_until: "Subscribed until",
        subscription_active: "Your subscription is active!",
        redirecting_to_checkout: "Redirecting to checkout..."
      },
      errors: {
        invalid_payment_proof: {
          message: "Payment verification failed",
          action: "Please try your payment again. If this continues, contact support."
        },
        invalid_signature: {
          message: "Transaction signature is invalid",
          action: "Please approve the transaction in your wallet and try again."
        },
        invalid_transaction: {
          message: "Transaction format is invalid",
          action: "Please try your payment again. If this continues, try updating your wallet app."
        },
        transaction_not_found: {
          message: "Transaction not found on the blockchain",
          action: "Your transaction may still be processing. Please wait a moment and check your wallet, or try again."
        },
        transaction_not_confirmed: {
          message: "Transaction is still processing",
          action: "Please wait a moment for the blockchain to confirm your transaction, then try again."
        },
        transaction_failed: {
          message: "Transaction failed on the blockchain",
          action: "Check your wallet for details. You may need to adjust your transaction settings or add more SOL for fees."
        },
        transaction_expired: {
          message: "Transaction took too long to process",
          action: "Please try your payment again. Consider increasing transaction priority if your wallet supports it."
        },
        invalid_recipient: {
          message: "Payment was sent to the wrong address",
          action: "Please try again and ensure you approve the correct transaction in your wallet."
        },
        invalid_sender: {
          message: "Payment sender wallet is invalid",
          action: "Please reconnect your wallet and try again."
        },
        unauthorized_refund_issuer: {
          message: "You are not authorized to issue refunds",
          action: "Only authorized accounts can process refunds. Please contact support if you believe this is an error."
        },
        amount_below_minimum: {
          message: "Payment amount is too low",
          action: "Please check the required amount and try again."
        },
        amount_mismatch: {
          message: "Payment amount does not match the quote",
          action: "The price may have changed. Please refresh and try your payment again."
        },
        insufficient_funds_sol: {
          message: "Not enough SOL for transaction fees",
          action: "Add at least 0.001 SOL to your wallet to cover network fees, then try again."
        },
        insufficient_funds_token: {
          message: "Insufficient balance in your wallet",
          action: "Add more funds to your wallet and try again."
        },
        invalid_token_mint: {
          message: "Incorrect payment token",
          action: "Please pay with the correct token as shown in the payment details."
        },
        not_spl_transfer: {
          message: "Transaction is not a valid token transfer",
          action: "Please ensure you are sending the correct token type from your wallet."
        },
        missing_token_account: {
          message: "Token account not found",
          action: "Your wallet may need to create a token account first. Try again or use a different wallet."
        },
        invalid_token_program: {
          message: "Invalid token program",
          action: "Please try your payment again. If this continues, try using a different wallet."
        },
        missing_memo: {
          message: "Payment memo is required but was not included",
          action: "Please try your payment again and ensure transaction details are approved in your wallet."
        },
        invalid_memo: {
          message: "Payment memo format is invalid",
          action: "Please try your payment again."
        },
        payment_already_used: {
          message: "This payment has already been processed",
          action: "Check your transaction history. If you need to make another payment, please start a new transaction."
        },
        signature_reused: {
          message: "Transaction signature has already been used",
          action: "Please create a new payment transaction."
        },
        quote_expired: {
          message: "Payment quote has expired",
          action: "Prices are updated frequently. Please refresh and try your payment again."
        },
        missing_field: {
          message: "Required information is missing",
          action: "Please check all required fields and try again."
        },
        invalid_field: {
          message: "Some information is invalid",
          action: "Please check your input and try again."
        },
        invalid_amount: {
          message: "Payment amount is invalid",
          action: "Please check the amount and try again."
        },
        invalid_wallet: {
          message: "Wallet address is invalid",
          action: "Please reconnect your wallet and try again."
        },
        invalid_resource: {
          message: "Invalid item selection",
          action: "Please refresh the page and try again."
        },
        invalid_coupon: {
          message: "Invalid coupon code",
          action: "Please check the coupon code and try again."
        },
        invalid_cart_item: {
          message: "One or more cart items are invalid",
          action: "Please review your cart and try again."
        },
        empty_cart: {
          message: "Your cart is empty",
          action: "Please add items to your cart before checking out."
        },
        resource_not_found: {
          message: "Item not found",
          action: "This item may no longer be available. Please refresh and try again."
        },
        cart_not_found: {
          message: "Shopping cart not found",
          action: "Your cart may have expired. Please start a new order."
        },
        refund_not_found: {
          message: "Refund not found",
          action: "Please check your refund reference number or contact support."
        },
        product_not_found: {
          message: "Product not available",
          action: "This product may no longer be available. Please browse our current selection."
        },
        coupon_not_found: {
          message: "Coupon code not found",
          action: "Please check the coupon code or remove it to continue."
        },
        session_not_found: {
          message: "Payment session expired",
          action: "Please start a new payment."
        },
        cart_already_paid: {
          message: "This order has already been paid",
          action: "Check your order history. If you need to make another purchase, please start a new order."
        },
        refund_already_processed: {
          message: "This refund has already been processed",
          action: "Check your transaction history or contact support for details."
        },
        coupon_expired: {
          message: "Coupon has expired",
          action: "Please remove the coupon code or use a different code."
        },
        coupon_usage_limit_reached: {
          message: "Coupon usage limit reached",
          action: "This coupon has been fully redeemed. Please try a different code."
        },
        coupon_not_applicable: {
          message: "Coupon cannot be applied to this purchase",
          action: "Please check the coupon terms or remove it to continue."
        },
        coupon_wrong_payment_method: {
          message: "Coupon not valid for this payment method",
          action: "Try a different payment method or remove the coupon code."
        },
        stripe_error: {
          message: "Card payment service temporarily unavailable",
          action: "Please try again in a moment, or use cryptocurrency payment instead."
        },
        rpc_error: {
          message: "Blockchain network temporarily unavailable",
          action: "Please try again in a moment, or use card payment instead."
        },
        network_error: {
          message: "Network connection issue",
          action: "Please check your internet connection and try again."
        },
        internal_error: {
          message: "Something went wrong on our end",
          action: "Please try again. If this continues, contact support."
        },
        database_error: {
          message: "Service temporarily unavailable",
          action: "Please try again in a moment."
        },
        config_error: {
          message: "Service configuration error",
          action: "Please contact support for assistance."
        },
        unknown_error: {
          message: "An unexpected error occurred",
          action: "Please try again or contact support if this continues."
        }
      },
      validation: {
        unknown_token_mint: "Warning: Unrecognized token mint address. Double-check this is the correct token to avoid loss of funds.",
        token_typo_warning: "Token address does not match known stablecoins (USDC, USDT, PYUSD, CASH). Verify carefully to prevent permanent loss of funds."
      },
      wallet: {
        no_wallet_detected: "No Solana wallet detected",
        install_wallet: "Please install a Solana wallet like Phantom, Solflare, or Backpack.",
        wallet_not_connected: "Wallet not connected",
        connect_your_wallet: "Please connect your wallet to continue.",
        wallet_connection_failed: "Failed to connect wallet",
        try_again: "Please try connecting again.",
        transaction_rejected: "Transaction was rejected",
        approve_in_wallet: "Please approve the transaction in your wallet to continue.",
        select_wallet: "Select Wallet",
        change: "Change Wallet"
      }
    };
  }
});

// src/i18n/translations/ar.json
var require_ar = __commonJS({
  "src/i18n/translations/ar.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \u0645\u0644\u0641 \u0645\u0635\u062F\u0631 \u0627\u0644\u062A\u0631\u062C\u0645\u0629 (\u0627\u0644\u0639\u0631\u0628\u064A\u0629)",
      version: "1.0.0",
      locale: "ar",
      ui: {
        pay_with_card: "\u0627\u0644\u062F\u0641\u0639 \u0628\u0627\u0644\u0628\u0637\u0627\u0642\u0629",
        pay_with_crypto: "\u0627\u062F\u0641\u0639 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 USDC",
        pay_with_usdc: "\u0627\u062F\u0641\u0639 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 USDC",
        purchase: "\u0634\u0631\u0627\u0621",
        card: "\u0628\u0637\u0627\u0642\u0629",
        usdc_solana: "USDC (Solana)",
        crypto: "\u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0627\u0644\u0645\u0634\u0641\u0631\u0629",
        connect_wallet: "\u0631\u0628\u0637 \u0627\u0644\u0645\u062D\u0641\u0638\u0629",
        connecting: "\u062C\u0627\u0631\u064D \u0627\u0644\u0631\u0628\u0637...",
        processing: "\u062C\u0627\u0631\u064D \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629...",
        loading: "\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0645\u064A\u0644...",
        close: "\u0625\u063A\u0644\u0627\u0642",
        cancel: "\u0625\u0644\u063A\u0627\u0621",
        confirm: "\u062A\u0623\u0643\u064A\u062F",
        retry: "\u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629",
        go_back: "\u0627\u0644\u0631\u062C\u0648\u0639",
        contact_support: "\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645",
        pay_with_credits: "\u0627\u062F\u0641\u0639 \u0628\u0627\u0644\u0623\u0631\u0635\u062F\u0629",
        credits: "\u0627\u0644\u0623\u0631\u0635\u062F\u0629",
        disconnect: "\u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644",
        payment_successful: "\u062A\u0645 \u0627\u0644\u062F\u0641\u0639 \u0628\u0646\u062C\u0627\u062D!",
        subscribe: "\u0627\u0634\u062A\u0631\u0643",
        subscribe_with_crypto: "\u0627\u0634\u062A\u0631\u0643 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 USDC",
        subscribe_with_credits: "\u0627\u0634\u062A\u0631\u0643 \u0628\u0627\u0644\u0623\u0631\u0635\u062F\u0629",
        subscribed: "\u0645\u0634\u062A\u0631\u0643",
        subscribed_until: "\u0645\u0634\u062A\u0631\u0643 \u062D\u062A\u0649",
        subscription_active: "\u0627\u0634\u062A\u0631\u0627\u0643\u0643 \u0646\u0634\u0637!",
        redirecting_to_checkout: "\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0625\u0644\u0649 \u0627\u0644\u062F\u0641\u0639..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062F\u0641\u0639",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u062F\u0641\u0639. \u0625\u0630\u0627 \u0627\u0633\u062A\u0645\u0631 \u0630\u0644\u0643\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645."
        },
        invalid_signature: {
          message: "\u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0641\u064A \u0645\u062D\u0641\u0638\u062A\u0643 \u062B\u0645 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649."
        },
        invalid_transaction: {
          message: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u062F\u0641\u0639. \u0625\u0630\u0627 \u0627\u0633\u062A\u0645\u0631 \u0630\u0644\u0643\u060C \u062C\u0631\u0651\u0628 \u062A\u062D\u062F\u064A\u062B \u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0645\u062D\u0641\u0638\u0629."
        },
        transaction_not_found: {
          message: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0628\u0644\u0648\u0643 \u062A\u0634\u064A\u0646",
          action: "\u0642\u062F \u062A\u0643\u0648\u0646 \u0645\u0639\u0627\u0645\u0644\u062A\u0643 \u0642\u064A\u062F \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 \u0642\u0644\u064A\u0644\u064B\u0627 \u0648\u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0645\u062D\u0641\u0638\u062A\u0643\u060C \u0623\u0648 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        transaction_not_confirmed: {
          message: "\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0644\u0627 \u062A\u0632\u0627\u0644 \u0642\u064A\u062F \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 \u062D\u062A\u0649 \u062A\u0624\u0643\u062F \u0627\u0644\u0628\u0644\u0648\u0643 \u062A\u0634\u064A\u0646 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629\u060C \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        transaction_failed: {
          message: "\u0641\u0634\u0644\u062A \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0628\u0644\u0648\u0643 \u062A\u0634\u064A\u0646",
          action: "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644 \u0641\u064A \u0645\u062D\u0641\u0638\u062A\u0643. \u0642\u062F \u062A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0636\u0628\u0637 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0623\u0648 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0632\u064A\u062F \u0645\u0646 SOL \u0644\u0644\u0631\u0633\u0648\u0645."
        },
        transaction_expired: {
          message: "\u0627\u0633\u062A\u063A\u0631\u0642\u062A \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0648\u0642\u062A\u064B\u0627 \u0623\u0637\u0648\u0644 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u062F\u0641\u0639. \u0641\u0643\u0651\u0631 \u0641\u064A \u0632\u064A\u0627\u062F\u0629 \u0623\u0648\u0644\u0648\u064A\u0629 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0645\u062D\u0641\u0638\u062A\u0643 \u062A\u062F\u0639\u0645 \u0630\u0644\u0643."
        },
        invalid_recipient: {
          message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062F\u0641\u0639\u0629 \u0625\u0644\u0649 \u0639\u0646\u0648\u0627\u0646 \u062E\u0627\u0637\u0626",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u062C\u062F\u062F\u064B\u0627 \u0648\u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0645\u0648\u0627\u0641\u0642\u062A\u0643 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0641\u064A \u0645\u062D\u0641\u0638\u062A\u0643."
        },
        invalid_sender: {
          message: "\u0645\u062D\u0641\u0638\u0629 \u0645\u064F\u0631\u0633\u0650\u0644 \u0627\u0644\u062F\u0641\u0639 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0631\u0628\u0637 \u0645\u062D\u0641\u0638\u062A\u0643 \u062B\u0645 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u062C\u062F\u062F\u064B\u0627."
        },
        unauthorized_refund_issuer: {
          message: "\u063A\u064A\u0631 \u0645\u064F\u062E\u0648\u0651\u0644 \u0628\u0625\u0635\u062F\u0627\u0631 \u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0627\u0644\u0645\u064F\u0633\u062A\u0631\u062F\u0629",
          action: "\u064A\u0645\u0643\u0646 \u0644\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0635\u0631\u0651\u062D \u0644\u0647\u0627 \u0641\u0642\u0637 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0627\u0644\u0645\u0633\u062A\u0631\u062F\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645 \u0625\u0630\u0627 \u0643\u0646\u062A \u062A\u0639\u062A\u0642\u062F \u0623\u0646 \u0647\u0630\u0627 \u062E\u0637\u0623."
        },
        amount_below_minimum: {
          message: "\u0645\u0628\u0644\u063A \u0627\u0644\u062F\u0641\u0639 \u0645\u0646\u062E\u0641\u0636 \u062C\u062F\u064B\u0627",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        amount_mismatch: {
          message: "\u0645\u0628\u0644\u063A \u0627\u0644\u062F\u0641\u0639 \u0644\u0627 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u062A\u0633\u0639\u064A\u0631",
          action: "\u0642\u062F \u064A\u0643\u0648\u0646 \u0627\u0644\u0633\u0639\u0631 \u0642\u062F \u062A\u063A\u064A\u0651\u0631. \u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u0625\u0639\u0627\u062F\u0629 \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u062F\u0641\u0639."
        },
        insufficient_funds_sol: {
          message: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0627 \u064A\u0643\u0641\u064A \u0645\u0646 SOL \u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629",
          action: "\u0623\u0636\u0641 \u0645\u0627 \u0644\u0627 \u064A\u0642\u0644 \u0639\u0646 0.001 SOL \u0625\u0644\u0649 \u0645\u062D\u0641\u0638\u062A\u0643 \u0644\u062A\u063A\u0637\u064A\u0629 \u0631\u0633\u0648\u0645 \u0627\u0644\u0634\u0628\u0643\u0629\u060C \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        insufficient_funds_token: {
          message: "\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062D\u0641\u0638\u0629 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D",
          action: "\u0623\u0636\u0641 \u0627\u0644\u0645\u0632\u064A\u062F \u0645\u0646 \u0627\u0644\u0623\u0645\u0648\u0627\u0644 \u0625\u0644\u0649 \u0645\u062D\u0641\u0638\u062A\u0643 \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        invalid_token_mint: {
          message: "\u0631\u0645\u0632 \u0627\u0644\u062F\u0641\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062F\u0641\u0639 \u0628\u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0635\u062D\u064A\u062D \u0643\u0645\u0627 \u0647\u0648 \u0645\u0648\u0636\u062D \u0641\u064A \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062F\u0641\u0639."
        },
        not_spl_transfer: {
          message: "\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0644\u064A\u0633\u062A \u062A\u062D\u0648\u064A\u0644 \u0631\u0645\u0632 \u0635\u0627\u0644\u062D",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646\u0643 \u062A\u0631\u0633\u0644 \u0646\u0648\u0639 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0635\u062D\u064A\u062D \u0645\u0646 \u0645\u062D\u0641\u0638\u062A\u0643."
        },
        missing_token_account: {
          message: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0645\u0632",
          action: "\u0642\u062F \u062A\u062D\u062A\u0627\u062C \u0645\u062D\u0641\u0638\u062A\u0643 \u0625\u0644\u0649 \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u0631\u0645\u0632 \u0623\u0648\u0644\u064B\u0627. \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0623\u0648 \u0627\u0633\u062A\u062E\u062F\u0645 \u0645\u062D\u0641\u0638\u0629 \u0645\u062E\u062A\u0644\u0641\u0629."
        },
        invalid_token_program: {
          message: "\u0628\u0631\u0646\u0627\u0645\u062C \u0627\u0644\u0631\u0645\u0648\u0632 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u062F\u0641\u0639. \u0625\u0630\u0627 \u0627\u0633\u062A\u0645\u0631 \u0627\u0644\u0623\u0645\u0631\u060C \u062C\u0631\u0651\u0628 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0645\u062D\u0641\u0638\u0629 \u0623\u062E\u0631\u0649."
        },
        missing_memo: {
          message: "\u0645\u0630\u0643\u0631\u0629 \u0627\u0644\u062F\u0641\u0639 \u0645\u0637\u0644\u0648\u0628\u0629 \u0648\u0644\u0643\u0646 \u0644\u0645 \u064A\u062A\u0645 \u062A\u0636\u0645\u064A\u0646\u0647\u0627",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u062F\u0641\u0639 \u0648\u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0641\u064A \u0645\u062D\u0641\u0638\u062A\u0643."
        },
        invalid_memo: {
          message: "\u0635\u064A\u063A\u0629 \u0645\u0630\u0643\u0631\u0629 \u0627\u0644\u062F\u0641\u0639 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u062F\u0641\u0639."
        },
        payment_already_used: {
          message: "\u062A\u0645\u062A \u0645\u0639\u0627\u0644\u062C\u0629 \u0647\u0630\u0647 \u0627\u0644\u062F\u0641\u0639\u0629 \u0645\u0633\u0628\u0642\u064B\u0627",
          action: "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0633\u062C\u0644 \u0645\u0639\u0627\u0645\u0644\u0627\u062A\u0643. \u0625\u0630\u0627 \u0643\u0646\u062A \u0628\u062D\u0627\u062C\u0629 \u0625\u0644\u0649 \u0625\u062C\u0631\u0627\u0621 \u062F\u0641\u0639\u0629 \u0623\u062E\u0631\u0649\u060C \u0641\u064A\u064F\u0631\u062C\u0649 \u0628\u062F\u0621 \u0645\u0639\u0627\u0645\u0644\u0629 \u062C\u062F\u064A\u062F\u0629."
        },
        signature_reused: {
          message: "\u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0645\u0646 \u0642\u0628\u0644",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0646\u0634\u0627\u0621 \u0645\u0639\u0627\u0645\u0644\u0629 \u062F\u0641\u0639 \u062C\u062F\u064A\u062F\u0629."
        },
        quote_expired: {
          message: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0639\u0631\u0636 \u0627\u0644\u0633\u0639\u0631 \u0644\u0644\u062F\u0641\u0639",
          action: "\u064A\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0628\u0634\u0643\u0644 \u0645\u062A\u0643\u0631\u0631. \u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u0625\u0639\u0627\u062F\u0629 \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u062F\u0641\u0639."
        },
        missing_field: {
          message: "\u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0641\u0642\u0648\u062F\u0629",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        invalid_field: {
          message: "\u0628\u0639\u0636 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0645\u062F\u062E\u0644\u0627\u062A \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        invalid_amount: {
          message: "\u0645\u0628\u0644\u063A \u0627\u0644\u062F\u0641\u0639 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0645\u0628\u0644\u063A \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        invalid_wallet: {
          message: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u062D\u0641\u0638\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0631\u0628\u0637 \u0645\u062D\u0641\u0638\u062A\u0643 \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        invalid_resource: {
          message: "\u0627\u062E\u062A\u064A\u0627\u0631 \u0639\u0646\u0635\u0631 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D",
          action: "\u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629 \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        invalid_coupon: {
          message: "\u0631\u0645\u0632 \u0627\u0644\u0642\u0633\u064A\u0645\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0645\u0632 \u0627\u0644\u0642\u0633\u064A\u0645\u0629 \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        invalid_cart_item: {
          message: "\u0639\u0646\u0635\u0631 \u0648\u0627\u062D\u062F \u0623\u0648 \u0623\u0643\u062B\u0631 \u0641\u064A \u0627\u0644\u0633\u0644\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D",
          action: "\u064A\u0631\u062C\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0633\u0644\u0629 \u0627\u0644\u062A\u0633\u0648\u0642 \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        empty_cart: {
          message: "\u0633\u0644\u0629 \u0627\u0644\u062A\u0633\u0648\u0642 \u0641\u0627\u0631\u063A\u0629",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0636\u0627\u0641\u0629 \u0639\u0646\u0627\u0635\u0631 \u0625\u0644\u0649 \u0627\u0644\u0633\u0644\u0629 \u0642\u0628\u0644 \u0627\u0644\u062F\u0641\u0639."
        },
        resource_not_found: {
          message: "\u0627\u0644\u0639\u0646\u0635\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          action: "\u0642\u062F \u0644\u0627 \u064A\u0643\u0648\u0646 \u0647\u0630\u0627 \u0627\u0644\u0639\u0646\u0635\u0631 \u0645\u062A\u0627\u062D\u064B\u0627 \u0628\u0639\u062F \u0627\u0644\u0622\u0646. \u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629 \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        cart_not_found: {
          message: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0633\u0644\u0629 \u0627\u0644\u062A\u0633\u0648\u0642",
          action: "\u0642\u062F \u062A\u0643\u0648\u0646 \u0633\u0644\u062A\u0643 \u0642\u062F \u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u062A\u0647\u0627. \u064A\u0631\u062C\u0649 \u0628\u062F\u0621 \u0637\u0644\u0628 \u062C\u062F\u064A\u062F."
        },
        refund_not_found: {
          message: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u064F\u0633\u062A\u0631\u062F",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0642\u0645 \u0645\u0631\u062C\u0639 \u0627\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F \u0623\u0648 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645."
        },
        product_not_found: {
          message: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
          action: "\u0642\u062F \u0644\u0627 \u064A\u0643\u0648\u0646 \u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u062A\u062C \u0645\u062A\u0627\u062D\u064B\u0627 \u0628\u0639\u062F \u0627\u0644\u0622\u0646. \u064A\u0631\u062C\u0649 \u062A\u0635\u0641\u062D \u062A\u0634\u0643\u064A\u0644\u062A\u0646\u0627 \u0627\u0644\u062D\u0627\u0644\u064A\u0629."
        },
        coupon_not_found: {
          message: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0631\u0645\u0632 \u0627\u0644\u0642\u0633\u064A\u0645\u0629",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0631\u0645\u0632 \u0623\u0648 \u0625\u0632\u0627\u0644\u062A\u0647 \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629."
        },
        session_not_found: {
          message: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u062C\u0644\u0633\u0629 \u0627\u0644\u062F\u0641\u0639",
          action: "\u064A\u0631\u062C\u0649 \u0628\u062F\u0621 \u062F\u0641\u0639\u0629 \u062C\u062F\u064A\u062F\u0629."
        },
        cart_already_paid: {
          message: "\u062A\u0645 \u062F\u0641\u0639 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0645\u0633\u0628\u0642\u064B\u0627",
          action: "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0633\u062C\u0644 \u0627\u0644\u0637\u0644\u0628\u0627\u062A. \u0625\u0630\u0627 \u0643\u0646\u062A \u062A\u0631\u064A\u062F \u0634\u0631\u0627\u0621\u064B \u0622\u062E\u0631\u060C \u064A\u0631\u062C\u0649 \u0628\u062F\u0621 \u0637\u0644\u0628 \u062C\u062F\u064A\u062F."
        },
        refund_already_processed: {
          message: "\u062A\u0645\u062A \u0645\u0639\u0627\u0644\u062C\u0629 \u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F \u0645\u0633\u0628\u0642\u064B\u0627",
          action: "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0633\u062C\u0644 \u0645\u0639\u0627\u0645\u0644\u0627\u062A\u0643 \u0623\u0648 \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645 \u0644\u0644\u062A\u0641\u0627\u0635\u064A\u0644."
        },
        coupon_expired: {
          message: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0642\u0633\u064A\u0645\u0629",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0632\u0627\u0644\u0629 \u0631\u0645\u0632 \u0627\u0644\u0642\u0633\u064A\u0645\u0629 \u0623\u0648 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0631\u0645\u0632 \u0622\u062E\u0631."
        },
        coupon_usage_limit_reached: {
          message: "\u062A\u0645 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u062D\u062F \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0642\u0633\u064A\u0645\u0629",
          action: "\u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0647 \u0627\u0644\u0642\u0633\u064A\u0645\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644. \u064A\u0631\u062C\u0649 \u062A\u062C\u0631\u0628\u0629 \u0631\u0645\u0632 \u0622\u062E\u0631."
        },
        coupon_not_applicable: {
          message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0642\u0633\u064A\u0645\u0629 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0634\u0631\u0627\u0621",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0634\u0631\u0648\u0637 \u0627\u0644\u0642\u0633\u064A\u0645\u0629 \u0623\u0648 \u0625\u0632\u0627\u0644\u062A\u0647\u0627 \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629."
        },
        coupon_wrong_payment_method: {
          message: "\u0627\u0644\u0642\u0633\u064A\u0645\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 \u0644\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639 \u0647\u0630\u0647",
          action: "\u062C\u0631\u0651\u0628 \u0637\u0631\u064A\u0642\u0629 \u062F\u0641\u0639 \u0645\u062E\u062A\u0644\u0641\u0629 \u0623\u0648 \u0623\u0632\u0644 \u0631\u0645\u0632 \u0627\u0644\u0642\u0633\u064A\u0645\u0629."
        },
        stripe_error: {
          message: "\u062E\u062F\u0645\u0629 \u0627\u0644\u062F\u0641\u0639 \u0628\u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u0645\u0624\u0642\u062A\u064B\u0627",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u064B\u0627\u060C \u0623\u0648 \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062F\u0641\u0639 \u0628\u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0627\u0644\u0645\u0634\u0641\u0631\u0629 \u0628\u062F\u0644\u064B\u0627 \u0645\u0646 \u0630\u0644\u0643."
        },
        rpc_error: {
          message: "\u0634\u0628\u0643\u0629 \u0627\u0644\u0628\u0644\u0648\u0643 \u062A\u0634\u064A\u0646 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u0645\u0624\u0642\u062A\u064B\u0627",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u064B\u0627\u060C \u0623\u0648 \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062F\u0641\u0639 \u0628\u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0628\u062F\u0644\u064B\u0627 \u0645\u0646 \u0630\u0644\u0643."
        },
        network_error: {
          message: "\u0645\u0634\u0643\u0644\u0629 \u0641\u064A \u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0634\u0628\u0643\u0629",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
        },
        internal_error: {
          message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0645\u0646 \u062C\u0647\u062A\u0646\u0627",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629. \u0625\u0630\u0627 \u0627\u0633\u062A\u0645\u0631 \u0627\u0644\u0623\u0645\u0631\u060C \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645."
        },
        database_error: {
          message: "\u0627\u0644\u062E\u062F\u0645\u0629 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u0645\u0624\u0642\u062A\u064B\u0627",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u064B\u0627."
        },
        config_error: {
          message: "\u062E\u0637\u0623 \u0641\u064A \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062E\u062F\u0645\u0629",
          action: "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645 \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629."
        },
        unknown_error: {
          message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639",
          action: "\u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0623\u0648 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645 \u0625\u0630\u0627 \u0627\u0633\u062A\u0645\u0631 \u0630\u0644\u0643."
        }
      },
      validation: {
        unknown_token_mint: "\u062A\u062D\u0630\u064A\u0631: \u0639\u0646\u0648\u0627\u0646 mint \u0644\u0644\u0631\u0645\u0632 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641. \u062A\u062D\u0642\u0642 \u062C\u064A\u062F\u064B\u0627 \u0645\u0646 \u0623\u0646 \u0647\u0630\u0627 \u0647\u0648 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0635\u062D\u064A\u062D \u0644\u062A\u062C\u0646\u0651\u0628 \u0641\u0642\u062F\u0627\u0646 \u0627\u0644\u0623\u0645\u0648\u0627\u0644.",
        token_typo_warning: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0631\u0645\u0632 \u0644\u0627 \u064A\u062A\u0637\u0627\u0628\u0642 \u0645\u0639 \u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0642\u0631\u0629 \u0627\u0644\u0645\u0639\u0631\u0648\u0641\u0629 (USDC \u0648USDT \u0648PYUSD \u0648CASH). \u062A\u062D\u0642\u0651\u0642 \u0628\u0639\u0646\u0627\u064A\u0629 \u0644\u062A\u062C\u0646\u0651\u0628 \u0641\u0642\u062F\u0627\u0646 \u062F\u0627\u0626\u0645 \u0644\u0644\u0623\u0645\u0648\u0627\u0644."
      },
      wallet: {
        no_wallet_detected: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 \u0645\u062D\u0641\u0638\u0629 Solana",
        install_wallet: "\u064A\u0631\u062C\u0649 \u062A\u062B\u0628\u064A\u062A \u0645\u062D\u0641\u0638\u0629 Solana \u0645\u062B\u0644 Phantom \u0623\u0648 Solflare \u0623\u0648 Backpack.",
        wallet_not_connected: "\u0627\u0644\u0645\u062D\u0641\u0638\u0629 \u063A\u064A\u0631 \u0645\u062A\u0635\u0644\u0629",
        connect_your_wallet: "\u064A\u0631\u062C\u0649 \u0631\u0628\u0637 \u0645\u062D\u0641\u0638\u062A\u0643 \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629.",
        wallet_connection_failed: "\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u0645\u062D\u0641\u0638\u0629",
        try_again: "\u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u0644\u0644\u0627\u062A\u0635\u0627\u0644.",
        transaction_rejected: "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629",
        approve_in_wallet: "\u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0641\u064A \u0645\u062D\u0641\u0638\u062A\u0643 \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629.",
        select_wallet: "\u0627\u062E\u062A\u0631 \u0645\u062D\u0641\u0638\u0629",
        change: "\u062A\u063A\u064A\u064A\u0631"
      }
    };
  }
});

// src/i18n/translations/bn.json
var require_bn = __commonJS({
  "src/i18n/translations/bn.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \u0985\u09A8\u09C1\u09AC\u09BE\u09A6 \u0989\u09CE\u09B8 \u09AB\u09BE\u0987\u09B2 (\u09AC\u09BE\u0982\u09B2\u09BE)",
      version: "1.0.0",
      locale: "bn",
      ui: {
        pay_with_card: "\u0995\u09BE\u09B0\u09CD\u09A1 \u09A6\u09BF\u09AF\u09BC\u09C7 \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u0995\u09B0\u09C1\u09A8",
        pay_with_crypto: "USDC \u09A6\u09BF\u09AF\u09BC\u09C7 \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u0995\u09B0\u09C1\u09A8",
        pay_with_usdc: "USDC \u09A6\u09BF\u09AF\u09BC\u09C7 \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u0995\u09B0\u09C1\u09A8",
        purchase: "\u0995\u09CD\u09B0\u09AF\u09BC",
        card: "\u0995\u09BE\u09B0\u09CD\u09A1",
        usdc_solana: "USDC (Solana)",
        crypto: "\u0995\u09CD\u09B0\u09BF\u09AA\u09CD\u099F\u09CB",
        connect_wallet: "\u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09B8\u0982\u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09C1\u09A8",
        connecting: "\u09B8\u0982\u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09BE \u09B9\u099A\u09CD\u099B\u09C7...",
        processing: "\u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE\u0995\u09B0\u09A3 \u099A\u09B2\u099B\u09C7...",
        loading: "\u09B2\u09CB\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...",
        close: "\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8",
        cancel: "\u09AC\u09BE\u09A4\u09BF\u09B2",
        confirm: "\u09A8\u09BF\u09B6\u09CD\u099A\u09BF\u09A4 \u0995\u09B0\u09C1\u09A8",
        retry: "\u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8",
        go_back: "\u09AA\u09C7\u099B\u09A8\u09C7 \u09AF\u09BE\u09A8",
        contact_support: "\u09B8\u09B9\u09BE\u09AF\u09BC\u09A4\u09BE \u0995\u09C7\u09A8\u09CD\u09A6\u09CD\u09B0\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8",
        pay_with_credits: "\u0995\u09CD\u09B0\u09C7\u09A1\u09BF\u099F \u09A6\u09BF\u09AF\u09BC\u09C7 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u0995\u09B0\u09C1\u09A8",
        credits: "\u0995\u09CD\u09B0\u09C7\u09A1\u09BF\u099F",
        disconnect: "\u09B8\u0982\u09AF\u09CB\u0997 \u09AC\u09BF\u099A\u09CD\u099B\u09BF\u09A8\u09CD\u09A8 \u0995\u09B0\u09C1\u09A8",
        payment_successful: "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AB\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7!",
        subscribe: "\u09B8\u09BE\u09AC\u09B8\u09CD\u0995\u09CD\u09B0\u09BE\u0987\u09AC \u0995\u09B0\u09C1\u09A8",
        subscribe_with_crypto: "USDC \u09A6\u09BF\u09AF\u09BC\u09C7 \u09B8\u09BE\u09AC\u09B8\u09CD\u0995\u09CD\u09B0\u09BE\u0987\u09AC \u0995\u09B0\u09C1\u09A8",
        subscribe_with_credits: "\u0995\u09CD\u09B0\u09C7\u09A1\u09BF\u099F \u09A6\u09BF\u09AF\u09BC\u09C7 \u09B8\u09BE\u09AC\u09B8\u09CD\u0995\u09CD\u09B0\u09BE\u0987\u09AC \u0995\u09B0\u09C1\u09A8",
        subscribed: "\u09B8\u09BE\u09AC\u09B8\u09CD\u0995\u09CD\u09B0\u09BE\u0987\u09AC \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
        subscribed_until: "\u09B8\u09BE\u09AC\u09B8\u09CD\u0995\u09CD\u09B0\u09BE\u0987\u09AC \u0995\u09B0\u09BE \u0986\u099B\u09C7 \u09AA\u09B0\u09CD\u09AF\u09A8\u09CD\u09A4",
        subscription_active: "\u0986\u09AA\u09A8\u09BE\u09B0 \u09B8\u09BE\u09AC\u09B8\u09CD\u0995\u09CD\u09B0\u09BF\u09AA\u09B6\u09A8 \u09B8\u0995\u09CD\u09B0\u09BF\u09AF\u09BC!",
        redirecting_to_checkout: "\u099A\u09C7\u0995\u0986\u0989\u099F\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u099A\u09CD\u099B\u09C7..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AF\u09BE\u099A\u09BE\u0987\u0995\u09B0\u09A3 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964 \u098F\u099F\u09BF \u099A\u09B2\u09A4\u09C7 \u09A5\u09BE\u0995\u09B2\u09C7 \u09B8\u09B9\u09BE\u09AF\u09BC\u09A4\u09BE \u0995\u09C7\u09A8\u09CD\u09A6\u09CD\u09B0\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_signature: {
          message: "\u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u09C7\u09B0 \u09B8\u09CD\u09AC\u09BE\u0995\u09CD\u09B7\u09B0 \u0985\u09AC\u09C8\u09A7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F\u09C7 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u099F\u09BF \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09A8 \u0995\u09B0\u09C1\u09A8 \u098F\u09AC\u0982 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_transaction: {
          message: "\u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u09C7\u09B0 \u09AB\u09B0\u09AE\u09CD\u09AF\u09BE\u099F \u0985\u09AC\u09C8\u09A7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964 \u098F\u099F\u09BF \u099A\u09B2\u09A4\u09C7 \u09A5\u09BE\u0995\u09B2\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u0985\u09CD\u09AF\u09BE\u09AA\u099F\u09BF \u0986\u09AA\u09A1\u09C7\u099F \u0995\u09B0\u09C7 \u09A6\u09C7\u0996\u09C1\u09A8\u0964"
        },
        transaction_not_found: {
          message: "\u09AC\u09CD\u09B2\u0995\u099A\u09C7\u0987\u09A8\u09C7 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u099F\u09BF \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF",
          action: "\u0986\u09AA\u09A8\u09BE\u09B0 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u099F\u09BF \u098F\u0996\u09A8\u0993 \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE\u0995\u09B0\u09A3\u09C7\u09B0 \u09AE\u09A7\u09CD\u09AF\u09C7 \u09A5\u09BE\u0995\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0995\u09BF\u099B\u09C1\u0995\u09CD\u09B7\u09A3 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8, \u09AC\u09BE \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        transaction_not_confirmed: {
          message: "\u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u099F\u09BF \u098F\u0996\u09A8\u0993 \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE\u0995\u09B0\u09A3\u09C7 \u09B0\u09AF\u09BC\u09C7\u099B\u09C7",
          action: "\u09AC\u09CD\u09B2\u0995\u099A\u09C7\u0987\u09A8 \u0986\u09AA\u09A8\u09BE\u09B0 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u099F\u09BF \u09A8\u09BF\u09B6\u09CD\u099A\u09BF\u09A4 \u0995\u09B0\u09A4\u09C7 \u0995\u09BF\u099B\u09C1\u0995\u09CD\u09B7\u09A3 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8, \u09A4\u09BE\u09B0\u09AA\u09B0 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        transaction_failed: {
          message: "\u09AC\u09CD\u09B2\u0995\u099A\u09C7\u0987\u09A8\u09C7 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u099F\u09BF \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
          action: "\u09AC\u09BF\u09B8\u09CD\u09A4\u09BE\u09B0\u09BF\u09A4 \u099C\u09BE\u09A8\u09A4\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09A6\u09C7\u0996\u09C1\u09A8\u0964 \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u09C7\u09B0 \u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09B8\u09AE\u09A8\u09CD\u09AC\u09AF\u09BC \u0995\u09B0\u09A4\u09C7 \u09B9\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7 \u09AC\u09BE \u09AB\u09BF-\u098F\u09B0 \u099C\u09A8\u09CD\u09AF \u0986\u09B0\u0993 SOL \u09AF\u09CB\u0997 \u0995\u09B0\u09A4\u09C7 \u09B9\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u0964"
        },
        transaction_expired: {
          message: "\u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u099F\u09BF \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE\u0995\u09B0\u09A3\u09C7 \u09AC\u09C7\u09B6\u09BF \u09B8\u09AE\u09AF\u09BC \u09A8\u09BF\u09AF\u09BC\u09C7\u099B\u09C7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964 \u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09B8\u09AE\u09B0\u09CD\u09A5\u09A8 \u0995\u09B0\u09B2\u09C7 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u09C7\u09B0 \u0985\u0997\u09CD\u09B0\u09BE\u09A7\u09BF\u0995\u09BE\u09B0 \u09AC\u09BE\u09A1\u09BC\u09BE\u09A8\u09CB\u09B0 \u0995\u09A5\u09BE \u09AC\u09BF\u09AC\u09C7\u099A\u09A8\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_recipient: {
          message: "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AD\u09C1\u09B2 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE\u09AF\u09BC \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8 \u098F\u09AC\u0982 \u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F\u09C7 \u09B8\u09A0\u09BF\u0995 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09A8 \u0995\u09B0\u099B\u09C7\u09A8 \u09A4\u09BE \u09A8\u09BF\u09B6\u09CD\u099A\u09BF\u09A4 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_sender: {
          message: "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F\u099F\u09BF \u0985\u09AC\u09C8\u09A7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09AA\u09C1\u09A8\u09B0\u09BE\u09AF\u09BC \u09B8\u0982\u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        unauthorized_refund_issuer: {
          message: "\u0986\u09AA\u09A8\u09BF \u09B0\u09BF\u09AB\u09BE\u09A8\u09CD\u09A1 \u099C\u09BE\u09B0\u09BF \u0995\u09B0\u09BE\u09B0 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u09A8\u09A8",
          action: "\u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09B8\u09AE\u09C2\u09B9 \u09B0\u09BF\u09AB\u09BE\u09A8\u09CD\u09A1 \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u0964 \u098F\u099F\u09BF \u09AD\u09C1\u09B2 \u09AC\u09B2\u09C7 \u09AE\u09A8\u09C7 \u09B9\u09B2\u09C7 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09B8\u09B9\u09BE\u09AF\u09BC\u09A4\u09BE\u09AF\u09BC \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        amount_below_minimum: {
          message: "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u0996\u09C1\u09AC \u0995\u09AE",
          action: "\u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8\u09C0\u09AF\u09BC \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        amount_mismatch: {
          message: "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u0995\u09CB\u099F\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AE\u09BF\u09B2\u09C7 \u09A8\u09BE",
          action: "\u09A6\u09BE\u09AE \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09BF\u09A4 \u09B9\u09AF\u09BC\u09C7 \u09A5\u09BE\u0995\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09B0\u09BF\u09AB\u09CD\u09B0\u09C7\u09B6 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u0995\u09B0\u09C1\u09A8\u0964"
        },
        insufficient_funds_sol: {
          message: "\u09B2\u09C7\u09A8\u09A6\u09C7\u09A8 \u09AB\u09BF-\u098F\u09B0 \u099C\u09A8\u09CD\u09AF \u09AA\u09B0\u09CD\u09AF\u09BE\u09AA\u09CD\u09A4 SOL \u09A8\u09C7\u0987",
          action: "\u09A8\u09C7\u099F\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u0995 \u09AB\u09BF \u0995\u09AD\u09BE\u09B0 \u0995\u09B0\u09A4\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F\u09C7 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 0.001 SOL \u09AF\u09CB\u0997 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        insufficient_funds_token: {
          message: "\u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F\u09C7 \u09AA\u09B0\u09CD\u09AF\u09BE\u09AA\u09CD\u09A4 \u09AC\u09CD\u09AF\u09BE\u09B2\u09CD\u09AF\u09BE\u09A8\u09CD\u09B8 \u09A8\u09C7\u0987",
          action: "\u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F\u09C7 \u0986\u09B0\u0993 \u09AB\u09BE\u09A8\u09CD\u09A1 \u09AF\u09CB\u0997 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_token_mint: {
          message: "\u09AD\u09C1\u09B2 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u099F\u09CB\u0995\u09C7\u09A8",
          action: "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AC\u09BF\u09AC\u09B0\u09A3\u09C7 \u09AA\u09CD\u09B0\u09A6\u09B0\u09CD\u09B6\u09BF\u09A4 \u09B8\u09A0\u09BF\u0995 \u099F\u09CB\u0995\u09C7\u09A8 \u09A6\u09BF\u09AF\u09BC\u09C7 \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        not_spl_transfer: {
          message: "\u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u099F\u09BF \u09AC\u09C8\u09A7 \u099F\u09CB\u0995\u09C7\u09A8 \u099F\u09CD\u09B0\u09BE\u09A8\u09CD\u09B8\u09AB\u09BE\u09B0 \u09A8\u09AF\u09BC",
          action: "\u0986\u09AA\u09A8\u09BF \u09B8\u09A0\u09BF\u0995 \u099F\u09CB\u0995\u09C7\u09A8 \u099F\u09BE\u0987\u09AA \u09AA\u09BE\u09A0\u09BE\u099A\u09CD\u099B\u09C7\u09A8 \u09A4\u09BE \u09A8\u09BF\u09B6\u09CD\u099A\u09BF\u09A4 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        missing_token_account: {
          message: "\u099F\u09CB\u0995\u09C7\u09A8 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF",
          action: "\u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F\u0995\u09C7 \u0986\u0997\u09C7 \u098F\u0995\u099F\u09BF \u099F\u09CB\u0995\u09C7\u09A8 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09A4\u09C7 \u09B9\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u0964 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8 \u09AC\u09BE \u09AD\u09BF\u09A8\u09CD\u09A8 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_token_program: {
          message: "\u0985\u09AC\u09C8\u09A7 \u099F\u09CB\u0995\u09C7\u09A8 \u09AA\u09CD\u09B0\u09CB\u0997\u09CD\u09B0\u09BE\u09AE",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964 \u098F\u099F\u09BF \u099A\u09B2\u09A4\u09C7 \u09A5\u09BE\u0995\u09B2\u09C7 \u09AD\u09BF\u09A8\u09CD\u09A8 \u098F\u0995\u099F\u09BF \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C7 \u09A6\u09C7\u0996\u09C1\u09A8\u0964"
        },
        missing_memo: {
          message: "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AE\u09C7\u09AE\u09CB \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8\u09C0\u09AF\u09BC \u0995\u09BF\u09A8\u09CD\u09A4\u09C1 \u09B8\u0982\u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09A8\u09BF",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8 \u098F\u09AC\u0982 \u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F\u09C7 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u09C7\u09B0 \u09AC\u09BF\u09B8\u09CD\u09A4\u09BE\u09B0\u09BF\u09A4 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09A8 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_memo: {
          message: "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AE\u09C7\u09AE\u09CB\u09B0 \u09AB\u09B0\u09AE\u09CD\u09AF\u09BE\u099F \u0985\u09AC\u09C8\u09A7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        payment_already_used: {
          message: "\u098F\u0987 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F\u099F\u09BF \u0986\u0997\u09C7 \u09A5\u09C7\u0995\u09C7\u0987 \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE\u0995\u09C3\u09A4",
          action: "\u0986\u09AA\u09A8\u09BE\u09B0 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8 \u0987\u09A4\u09BF\u09B9\u09BE\u09B8 \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8\u0964 \u0986\u09B0\u09C7\u0995\u099F\u09BF \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u0995\u09B0\u09A4\u09C7 \u09B9\u09B2\u09C7 \u09A8\u09A4\u09C1\u09A8 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8 \u09B6\u09C1\u09B0\u09C1 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        signature_reused: {
          message: "\u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u09C7\u09B0 \u09B8\u09CD\u09AC\u09BE\u0995\u09CD\u09B7\u09B0 \u0986\u0997\u09C7 \u09A5\u09C7\u0995\u09C7\u0987 \u09AC\u09CD\u09AF\u09AC\u09B9\u09C3\u09A4 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09A8\u09A4\u09C1\u09A8 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8 \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09C1\u09A8\u0964"
        },
        quote_expired: {
          message: "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u0995\u09CB\u099F\u09C7\u09B0 \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6 \u09B6\u09C7\u09B7 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
          action: "\u09A6\u09BE\u09AE \u0998\u09A8 \u0998\u09A8 \u09B9\u09BE\u09B2\u09A8\u09BE\u0997\u09BE\u09A6 \u09B9\u09AF\u09BC\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09B0\u09BF\u09AB\u09CD\u09B0\u09C7\u09B6 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u0995\u09B0\u09C1\u09A8\u0964"
        },
        missing_field: {
          message: "\u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8\u09C0\u09AF\u09BC \u09A4\u09A5\u09CD\u09AF \u0985\u09A8\u09C1\u09AA\u09B8\u09CD\u09A5\u09BF\u09A4",
          action: "\u09B8\u09AE\u09B8\u09CD\u09A4 \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8\u09C0\u09AF\u09BC \u0998\u09B0 \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_field: {
          message: "\u0995\u09BF\u099B\u09C1 \u09A4\u09A5\u09CD\u09AF \u0985\u09AC\u09C8\u09A7",
          action: "\u0986\u09AA\u09A8\u09BE\u09B0 \u0987\u09A8\u09AA\u09C1\u099F \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_amount: {
          message: "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u0985\u09AC\u09C8\u09A7",
          action: "\u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_wallet: {
          message: "\u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09A0\u09BF\u0995\u09BE\u09A8\u09BE \u0985\u09AC\u09C8\u09A7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09AA\u09C1\u09A8\u09B0\u09BE\u09AF\u09BC \u09B8\u0982\u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_resource: {
          message: "\u09AD\u09C1\u09B2 \u0986\u0987\u099F\u09C7\u09AE \u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8",
          action: "\u09AA\u09C3\u09B7\u09CD\u09A0\u09BE \u09B0\u09BF\u09AB\u09CD\u09B0\u09C7\u09B6 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_coupon: {
          message: "\u0985\u09AC\u09C8\u09A7 \u0995\u09C1\u09AA\u09A8 \u0995\u09CB\u09A1",
          action: "\u0995\u09C1\u09AA\u09A8 \u0995\u09CB\u09A1\u099F\u09BF \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        invalid_cart_item: {
          message: "\u0995\u09BE\u09B0\u09CD\u099F\u09C7\u09B0 \u098F\u0995 \u09AC\u09BE \u098F\u0995\u09BE\u09A7\u09BF\u0995 \u0986\u0987\u099F\u09C7\u09AE \u0985\u09AC\u09C8\u09A7",
          action: "\u0986\u09AA\u09A8\u09BE\u09B0 \u0995\u09BE\u09B0\u09CD\u099F \u09AA\u09B0\u09CD\u09AF\u09BE\u09B2\u09CB\u099A\u09A8\u09BE \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        empty_cart: {
          message: "\u0986\u09AA\u09A8\u09BE\u09B0 \u0995\u09BE\u09B0\u09CD\u099F \u0996\u09BE\u09B2\u09BF",
          action: "\u099A\u09C7\u0995\u0986\u0989\u099F\u09C7\u09B0 \u0986\u0997\u09C7 \u0995\u09BE\u09B0\u09CD\u099F\u09C7 \u0986\u0987\u099F\u09C7\u09AE \u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        resource_not_found: {
          message: "\u0986\u0987\u099F\u09C7\u09AE \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF",
          action: "\u0986\u0987\u099F\u09C7\u09AE\u099F\u09BF \u0986\u09B0 \u0989\u09AA\u09B2\u09AC\u09CD\u09A7 \u09A8\u09BE\u0993 \u09A5\u09BE\u0995\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09B0\u09BF\u09AB\u09CD\u09B0\u09C7\u09B6 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        cart_not_found: {
          message: "\u09B6\u09AA\u09BF\u0982 \u0995\u09BE\u09B0\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF",
          action: "\u0986\u09AA\u09A8\u09BE\u09B0 \u0995\u09BE\u09B0\u09CD\u099F\u09C7\u09B0 \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6 \u09B6\u09C7\u09B7 \u09B9\u09AF\u09BC\u09C7 \u09A5\u09BE\u0995\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09A8\u09A4\u09C1\u09A8 \u0985\u09B0\u09CD\u09A1\u09BE\u09B0 \u09B6\u09C1\u09B0\u09C1 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        refund_not_found: {
          message: "\u09B0\u09BF\u09AB\u09BE\u09A8\u09CD\u09A1 \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF",
          action: "\u0986\u09AA\u09A8\u09BE\u09B0 \u09B0\u09BF\u09AB\u09BE\u09A8\u09CD\u09A1 \u09B0\u09C7\u09AB\u09BE\u09B0\u09C7\u09A8\u09CD\u09B8 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8 \u09AC\u09BE \u09B8\u09B9\u09BE\u09AF\u09BC\u09A4\u09BE\u09AF\u09BC \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        product_not_found: {
          message: "\u09AA\u09A3\u09CD\u09AF\u099F\u09BF \u0989\u09AA\u09B2\u09AC\u09CD\u09A7 \u09A8\u09AF\u09BC",
          action: "\u098F\u0987 \u09AA\u09A3\u09CD\u09AF\u099F\u09BF \u0986\u09B0 \u0989\u09AA\u09B2\u09AC\u09CD\u09A7 \u09A8\u09BE\u0993 \u09A5\u09BE\u0995\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8 \u09B8\u0982\u0997\u09CD\u09B0\u09B9 \u09A6\u09C7\u0996\u09C1\u09A8\u0964"
        },
        coupon_not_found: {
          message: "\u0995\u09C1\u09AA\u09A8 \u0995\u09CB\u09A1 \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF",
          action: "\u0995\u09C1\u09AA\u09A8 \u0995\u09CB\u09A1\u099F\u09BF \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8 \u09AC\u09BE \u09A4\u09BE \u0985\u09AA\u09B8\u09BE\u09B0\u09A3 \u0995\u09B0\u09C7 \u098F\u0997\u09BF\u09AF\u09BC\u09C7 \u09AF\u09BE\u09A8\u0964"
        },
        session_not_found: {
          message: "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09C7\u09B6\u09A8 \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6\u09CB\u09A4\u09CD\u09A4\u09C0\u09B0\u09CD\u09A3",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09A8\u09A4\u09C1\u09A8 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B6\u09C1\u09B0\u09C1 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        cart_already_paid: {
          message: "\u098F\u0987 \u0985\u09B0\u09CD\u09A1\u09BE\u09B0\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7\u09BF\u09A4",
          action: "\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09B0\u09CD\u09A1\u09BE\u09B0 \u0987\u09A4\u09BF\u09B9\u09BE\u09B8 \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8\u0964 \u09A8\u09A4\u09C1\u09A8 \u0995\u09CD\u09B0\u09AF\u09BC \u0995\u09B0\u09A4\u09C7 \u09B9\u09B2\u09C7 \u09A8\u09A4\u09C1\u09A8 \u0985\u09B0\u09CD\u09A1\u09BE\u09B0 \u09B6\u09C1\u09B0\u09C1 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        refund_already_processed: {
          message: "\u098F\u0987 \u09B0\u09BF\u09AB\u09BE\u09A8\u09CD\u09A1\u099F\u09BF \u0986\u0997\u09C7 \u09A5\u09C7\u0995\u09C7\u0987 \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE\u0995\u09C3\u09A4",
          action: "\u0986\u09AA\u09A8\u09BE\u09B0 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8 \u0987\u09A4\u09BF\u09B9\u09BE\u09B8 \u09A6\u09C7\u0996\u09C1\u09A8 \u09AC\u09BE \u09AC\u09BF\u09B8\u09CD\u09A4\u09BE\u09B0\u09BF\u09A4 \u099C\u09BE\u09A8\u09A4\u09C7 \u09B8\u09B9\u09BE\u09AF\u09BC\u09A4\u09BE\u09AF\u09BC \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        coupon_expired: {
          message: "\u0995\u09C1\u09AA\u09A8\u09C7\u09B0 \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6 \u09B6\u09C7\u09B7 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
          action: "\u0995\u09C1\u09AA\u09A8 \u0995\u09CB\u09A1\u099F\u09BF \u0985\u09AA\u09B8\u09BE\u09B0\u09A3 \u0995\u09B0\u09C1\u09A8 \u09AC\u09BE \u0985\u09A8\u09CD\u09AF \u0995\u09CB\u09A1 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        coupon_usage_limit_reached: {
          message: "\u0995\u09C1\u09AA\u09A8\u09C7\u09B0 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u09B8\u09C0\u09AE\u09BE \u09AA\u09C2\u09B0\u09CD\u09A3 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
          action: "\u098F\u0987 \u0995\u09C1\u09AA\u09A8\u099F\u09BF \u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3\u09AD\u09BE\u09AC\u09C7 \u09B0\u09BF\u09A1\u09BF\u09AE \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0985\u09A8\u09CD\u09AF \u0995\u09CB\u09A1 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        coupon_not_applicable: {
          message: "\u098F\u0987 \u0995\u09CD\u09B0\u09AF\u09BC\u09C7 \u0995\u09C1\u09AA\u09A8 \u09AA\u09CD\u09B0\u09AF\u09CB\u099C\u09CD\u09AF \u09A8\u09AF\u09BC",
          action: "\u0995\u09C1\u09AA\u09A8\u09C7\u09B0 \u09B6\u09B0\u09CD\u09A4\u09BE\u09AC\u09B2\u09BF \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8 \u09AC\u09BE \u098F\u099F\u09BF \u0985\u09AA\u09B8\u09BE\u09B0\u09A3 \u0995\u09B0\u09C7 \u098F\u0997\u09BF\u09AF\u09BC\u09C7 \u09AF\u09BE\u09A8\u0964"
        },
        coupon_wrong_payment_method: {
          message: "\u098F\u0987 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AA\u09A6\u09CD\u09A7\u09A4\u09BF\u09B0 \u099C\u09A8\u09CD\u09AF \u0995\u09C1\u09AA\u09A8 \u09AC\u09C8\u09A7 \u09A8\u09AF\u09BC",
          action: "\u09AD\u09BF\u09A8\u09CD\u09A8 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AA\u09A6\u09CD\u09A7\u09A4\u09BF \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8 \u09AC\u09BE \u0995\u09C1\u09AA\u09A8 \u0995\u09CB\u09A1\u099F\u09BF \u0985\u09AA\u09B8\u09BE\u09B0\u09A3 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        stripe_error: {
          message: "\u0995\u09BE\u09B0\u09CD\u09A1 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09C7\u09AC\u09BE \u09B8\u09BE\u09AE\u09AF\u09BC\u09BF\u0995\u09AD\u09BE\u09AC\u09C7 \u0985\u09A8\u09C1\u09AA\u09B2\u09AC\u09CD\u09A7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0995\u09BF\u099B\u09C1\u0995\u09CD\u09B7\u09A3 \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8, \u0985\u09A5\u09AC\u09BE \u09AC\u09BF\u0995\u09B2\u09CD\u09AA \u09B9\u09BF\u09B8\u09C7\u09AC\u09C7 \u0995\u09CD\u09B0\u09BF\u09AA\u09CD\u099F\u09CB\u0995\u09BE\u09B0\u09C7\u09A8\u09CD\u09B8\u09BF \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        rpc_error: {
          message: "\u09AC\u09CD\u09B2\u0995\u099A\u09C7\u0987\u09A8 \u09A8\u09C7\u099F\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u0995 \u09B8\u09BE\u09AE\u09AF\u09BC\u09BF\u0995\u09AD\u09BE\u09AC\u09C7 \u0985\u09A8\u09C1\u09AA\u09B2\u09AC\u09CD\u09A7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0995\u09BF\u099B\u09C1\u0995\u09CD\u09B7\u09A3 \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8, \u0985\u09A5\u09AC\u09BE \u09AC\u09BF\u0995\u09B2\u09CD\u09AA \u09B9\u09BF\u09B8\u09C7\u09AC\u09C7 \u0995\u09BE\u09B0\u09CD\u09A1 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        network_error: {
          message: "\u09A8\u09C7\u099F\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u0995 \u09B8\u0982\u09AF\u09CB\u0997\u09C7 \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE",
          action: "\u0986\u09AA\u09A8\u09BE\u09B0 \u0987\u09A8\u09CD\u099F\u09BE\u09B0\u09A8\u09C7\u099F \u09B8\u0982\u09AF\u09CB\u0997 \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        internal_error: {
          message: "\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AA\u0995\u09CD\u09B7 \u09A5\u09C7\u0995\u09C7 \u0995\u09BF\u099B\u09C1 \u09AD\u09C1\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964 \u098F\u099F\u09BF \u099A\u09B2\u09A4\u09C7 \u09A5\u09BE\u0995\u09B2\u09C7 \u09B8\u09B9\u09BE\u09AF\u09BC\u09A4\u09BE\u09AF\u09BC \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        database_error: {
          message: "\u09B8\u09C7\u09AC\u09BE \u09B8\u09BE\u09AE\u09AF\u09BC\u09BF\u0995\u09AD\u09BE\u09AC\u09C7 \u0985\u09A8\u09C1\u09AA\u09B2\u09AC\u09CD\u09A7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0995\u09BF\u099B\u09C1\u0995\u09CD\u09B7\u09A3 \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
        },
        config_error: {
          message: "\u09B8\u09C7\u09AC\u09BE \u0995\u09A8\u09AB\u09BF\u0997\u09BE\u09B0\u09C7\u09B6\u09A8 \u09A4\u09CD\u09B0\u09C1\u099F\u09BF",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09B8\u09B9\u09BE\u09AF\u09BC\u09A4\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8\u0964"
        },
        unknown_error: {
          message: "\u098F\u0995\u099F\u09BF \u0985\u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4 \u09A4\u09CD\u09B0\u09C1\u099F\u09BF \u0998\u099F\u09C7\u099B\u09C7",
          action: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8 \u09AC\u09BE \u098F\u099F\u09BF \u099A\u09B2\u09A4\u09C7 \u09A5\u09BE\u0995\u09B2\u09C7 \u09B8\u09B9\u09BE\u09AF\u09BC\u09A4\u09BE\u09AF\u09BC \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8\u0964"
        }
      },
      validation: {
        unknown_token_mint: "\u09B8\u09A4\u09B0\u09CD\u0995\u09A4\u09BE: \u0985\u09AA\u09B0\u09BF\u099A\u09BF\u09A4 \u099F\u09CB\u0995\u09C7\u09A8 \u09AE\u09BF\u09A8\u09CD\u099F \u09A0\u09BF\u0995\u09BE\u09A8\u09BE\u0964 \u0985\u09B0\u09CD\u09A5 \u09B9\u09BE\u09B0\u09BE\u09A8\u09CB \u098F\u09A1\u09BC\u09BE\u09A4\u09C7 \u098F\u099F\u09BF \u09B8\u09A0\u09BF\u0995 \u099F\u09CB\u0995\u09C7\u09A8 \u0995\u09BF\u09A8\u09BE \u09A6\u09C1\u0987\u09AC\u09BE\u09B0 \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09C1\u09A8\u0964",
        token_typo_warning: "\u099F\u09CB\u0995\u09C7\u09A8 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE \u09AA\u09B0\u09BF\u099A\u09BF\u09A4 \u09B8\u09CD\u099F\u09C7\u09AC\u09B2\u0995\u09AF\u09BC\u09C7\u09A8 (USDC, USDT, PYUSD, CASH)-\u098F\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AE\u09C7\u09B2\u09C7 \u09A8\u09BE\u0964 \u09B8\u09CD\u09A5\u09BE\u09AF\u09BC\u09C0 \u0985\u09B0\u09CD\u09A5\u09B9\u09BE\u09A8\u09BF \u09B0\u09CB\u09A7\u09C7 \u09B8\u09A4\u09B0\u09CD\u0995\u09AD\u09BE\u09AC\u09C7 \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09C1\u09A8\u0964"
      },
      wallet: {
        no_wallet_detected: "\u0995\u09CB\u09A8\u09CB Solana \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09B8\u09A8\u09BE\u0995\u09CD\u09A4 \u09B9\u09AF\u09BC\u09A8\u09BF",
        install_wallet: "Phantom, Solflare \u09AC\u09BE Backpack-\u098F\u09B0 \u09AE\u09A4\u09CB \u098F\u0995\u099F\u09BF Solana \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u0987\u09A8\u09B8\u09CD\u099F\u09B2 \u0995\u09B0\u09C1\u09A8\u0964",
        wallet_not_connected: "\u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09B8\u0982\u09AF\u09C1\u0995\u09CD\u09A4 \u09A8\u09AF\u09BC",
        connect_your_wallet: "\u099A\u09BE\u09B2\u09BF\u09AF\u09BC\u09C7 \u09AF\u09C7\u09A4\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09B8\u0982\u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09C1\u09A8\u0964",
        wallet_connection_failed: "\u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09B8\u0982\u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09A4\u09C7 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5",
        try_again: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09B8\u0982\u09AF\u09CB\u0997\u09C7\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964",
        transaction_rejected: "\u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u099F\u09BF \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u0996\u09CD\u09AF\u09BE\u09A4 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
        approve_in_wallet: "\u099A\u09BE\u09B2\u09BF\u09AF\u09BC\u09C7 \u09AF\u09C7\u09A4\u09C7 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F\u09C7 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u099F\u09BF \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09A8 \u0995\u09B0\u09C1\u09A8\u0964",
        select_wallet: "\u0993\u09AF\u09BC\u09BE\u09B2\u09C7\u099F \u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8 \u0995\u09B0\u09C1\u09A8",
        change: "\u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8"
      }
    };
  }
});

// src/i18n/translations/de.json
var require_de = __commonJS({
  "src/i18n/translations/de.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \xDCbersetzungsquelle (Deutsch)",
      version: "1.0.0",
      locale: "de",
      ui: {
        pay_with_card: "Mit Karte bezahlen",
        pay_with_crypto: "Mit USDC bezahlen",
        pay_with_usdc: "Mit USDC bezahlen",
        purchase: "Kaufen",
        card: "Karte",
        usdc_solana: "USDC (Solana)",
        crypto: "Krypto",
        connect_wallet: "Wallet verbinden",
        connecting: "Verbindung wird hergestellt...",
        processing: "Wird verarbeitet...",
        loading: "Wird geladen...",
        close: "Schlie\xDFen",
        cancel: "Abbrechen",
        confirm: "Best\xE4tigen",
        retry: "Erneut versuchen",
        go_back: "Zur\xFCck",
        contact_support: "Support kontaktieren",
        pay_with_credits: "Mit Credits bezahlen",
        credits: "Credits",
        disconnect: "Trennen",
        payment_successful: "Zahlung erfolgreich!",
        subscribe: "Abonnieren",
        subscribe_with_crypto: "Mit USDC abonnieren",
        subscribe_with_credits: "Mit Credits abonnieren",
        subscribed: "Abonniert",
        subscribed_until: "Abonniert bis",
        subscription_active: "Dein Abonnement ist aktiv!",
        redirecting_to_checkout: "Weiterleitung zur Kasse..."
      },
      errors: {
        invalid_payment_proof: {
          message: "Zahlungsverifizierung fehlgeschlagen",
          action: "Bitte versuchen Sie die Zahlung erneut. Wenn das weiterhin auftritt, kontaktieren Sie den Support."
        },
        invalid_signature: {
          message: "Transaktionssignatur ist ung\xFCltig",
          action: "Bitte genehmigen Sie die Transaktion in Ihrer Wallet und versuchen Sie es erneut."
        },
        invalid_transaction: {
          message: "Transaktionsformat ist ung\xFCltig",
          action: "Bitte versuchen Sie die Zahlung erneut. Falls das weiterhin passiert, aktualisieren Sie Ihre Wallet-App."
        },
        transaction_not_found: {
          message: "Transaktion nicht in der Blockchain gefunden",
          action: "Ihre Transaktion wird ggf. noch verarbeitet. Bitte warten Sie einen Moment und pr\xFCfen Sie Ihre Wallet oder versuchen Sie es erneut."
        },
        transaction_not_confirmed: {
          message: "Transaktion wird noch verarbeitet",
          action: "Bitte warten Sie einen Moment, bis die Blockchain Ihre Transaktion best\xE4tigt, und versuchen Sie es dann erneut."
        },
        transaction_failed: {
          message: "Transaktion in der Blockchain fehlgeschlagen",
          action: "Pr\xFCfen Sie die Details in Ihrer Wallet. Ggf. m\xFCssen Sie die Transaktionseinstellungen anpassen oder mehr SOL f\xFCr Geb\xFChren hinzuf\xFCgen."
        },
        transaction_expired: {
          message: "Die Transaktion hat zu lange gedauert",
          action: "Bitte versuchen Sie die Zahlung erneut. Erh\xF6hen Sie ggf. die Priorit\xE4t der Transaktion, sofern Ihre Wallet dies unterst\xFCtzt."
        },
        invalid_recipient: {
          message: "Zahlung wurde an die falsche Adresse gesendet",
          action: "Bitte versuchen Sie es erneut und stellen Sie sicher, dass Sie in Ihrer Wallet die richtige Transaktion genehmigen."
        },
        invalid_sender: {
          message: "Absender\u2011Wallet der Zahlung ist ung\xFCltig",
          action: "Bitte verbinden Sie Ihre Wallet erneut und versuchen Sie es noch einmal."
        },
        unauthorized_refund_issuer: {
          message: "Sie sind nicht berechtigt, R\xFCckerstattungen zu veranlassen",
          action: "Nur autorisierte Konten k\xF6nnen R\xFCckerstattungen verarbeiten. Kontaktieren Sie den Support, wenn Sie einen Fehler vermuten."
        },
        amount_below_minimum: {
          message: "Zahlungsbetrag ist zu niedrig",
          action: "Bitte pr\xFCfen Sie den erforderlichen Betrag und versuchen Sie es erneut."
        },
        amount_mismatch: {
          message: "Zahlungsbetrag stimmt nicht mit dem Angebot \xFCberein",
          action: "Der Preis kann sich ge\xE4ndert haben. Bitte aktualisieren Sie die Seite und zahlen Sie erneut."
        },
        insufficient_funds_sol: {
          message: "Nicht genug SOL f\xFCr Transaktionsgeb\xFChren",
          action: "F\xFCgen Sie Ihrer Wallet mindestens 0,001 SOL hinzu, um die Netzwerkgeb\xFChren zu decken, und versuchen Sie es erneut."
        },
        insufficient_funds_token: {
          message: "Unzureichendes Guthaben in Ihrer Wallet",
          action: "F\xFCgen Sie Ihrer Wallet mehr Guthaben hinzu und versuchen Sie es erneut."
        },
        invalid_token_mint: {
          message: "Falscher Zahlungs\u2011Token",
          action: "Bitte zahlen Sie mit dem in den Zahlungsdetails angegebenen richtigen Token."
        },
        not_spl_transfer: {
          message: "Transaktion ist keine g\xFCltige Token\u2011\xDCbertragung",
          action: "Stellen Sie sicher, dass Sie den richtigen Tokentyp aus Ihrer Wallet senden."
        },
        missing_token_account: {
          message: "Token\u2011Konto nicht gefunden",
          action: "Ihre Wallet muss ggf. zuerst ein Token\u2011Konto erstellen. Versuchen Sie es erneut oder verwenden Sie eine andere Wallet."
        },
        invalid_token_program: {
          message: "Ung\xFCltiges Token\u2011Programm",
          action: "Bitte versuchen Sie die Zahlung erneut. Wenn das weiterhin auftritt, verwenden Sie eine andere Wallet."
        },
        missing_memo: {
          message: "Zahlungsvermerk (Memo) ist erforderlich, wurde aber nicht hinzugef\xFCgt",
          action: "Bitte versuchen Sie die Zahlung erneut und genehmigen Sie die Transaktionsdetails in Ihrer Wallet."
        },
        invalid_memo: {
          message: "Format des Zahlungs\u2011Memos ist ung\xFCltig",
          action: "Bitte versuchen Sie die Zahlung erneut."
        },
        payment_already_used: {
          message: "Diese Zahlung wurde bereits verarbeitet",
          action: "Pr\xFCfen Sie Ihren Transaktionsverlauf. Wenn Sie eine weitere Zahlung vornehmen m\xF6chten, starten Sie eine neue Transaktion."
        },
        signature_reused: {
          message: "Transaktionssignatur wurde bereits verwendet",
          action: "Bitte erstellen Sie eine neue Zahlungstransaktion."
        },
        quote_expired: {
          message: "Zahlungsangebot ist abgelaufen",
          action: "Preise werden h\xE4ufig aktualisiert. Bitte aktualisieren Sie die Seite und zahlen Sie erneut."
        },
        missing_field: {
          message: "Erforderliche Angaben fehlen",
          action: "Bitte pr\xFCfen Sie alle Pflichtfelder und versuchen Sie es erneut."
        },
        invalid_field: {
          message: "Einige Angaben sind ung\xFCltig",
          action: "Bitte pr\xFCfen Sie Ihre Eingaben und versuchen Sie es erneut."
        },
        invalid_amount: {
          message: "Zahlungsbetrag ist ung\xFCltig",
          action: "Bitte pr\xFCfen Sie den Betrag und versuchen Sie es erneut."
        },
        invalid_wallet: {
          message: "Wallet\u2011Adresse ist ung\xFCltig",
          action: "Bitte verbinden Sie Ihre Wallet erneut und versuchen Sie es noch einmal."
        },
        invalid_resource: {
          message: "Ung\xFCltige Artikelauswahl",
          action: "Bitte aktualisieren Sie die Seite und versuchen Sie es erneut."
        },
        invalid_coupon: {
          message: "Ung\xFCltiger Gutscheincode",
          action: "Bitte pr\xFCfen Sie den Gutscheincode und versuchen Sie es erneut."
        },
        invalid_cart_item: {
          message: "Ein oder mehrere Warenkorbartikel sind ung\xFCltig",
          action: "Bitte \xFCberpr\xFCfen Sie Ihren Warenkorb und versuchen Sie es erneut."
        },
        empty_cart: {
          message: "Ihr Warenkorb ist leer",
          action: "Bitte f\xFCgen Sie Artikel in den Warenkorb, bevor Sie zur Kasse gehen."
        },
        resource_not_found: {
          message: "Artikel nicht gefunden",
          action: "Dieser Artikel ist m\xF6glicherweise nicht mehr verf\xFCgbar. Bitte aktualisieren Sie die Seite und versuchen Sie es erneut."
        },
        cart_not_found: {
          message: "Warenkorb nicht gefunden",
          action: "Ihr Warenkorb ist m\xF6glicherweise abgelaufen. Bitte starten Sie eine neue Bestellung."
        },
        refund_not_found: {
          message: "R\xFCckerstattung nicht gefunden",
          action: "Bitte pr\xFCfen Sie Ihre Erstattungsreferenznummer oder kontaktieren Sie den Support."
        },
        product_not_found: {
          message: "Produkt nicht verf\xFCgbar",
          action: "Dieses Produkt ist m\xF6glicherweise nicht mehr verf\xFCgbar. Bitte st\xF6bern Sie in unserer aktuellen Auswahl."
        },
        coupon_not_found: {
          message: "Gutscheincode nicht gefunden",
          action: "Bitte pr\xFCfen Sie den Code oder entfernen Sie ihn, um fortzufahren."
        },
        session_not_found: {
          message: "Zahlungssitzung abgelaufen",
          action: "Bitte starten Sie eine neue Zahlung."
        },
        cart_already_paid: {
          message: "Diese Bestellung wurde bereits bezahlt",
          action: "Pr\xFCfen Sie Ihre Bestellhistorie. Wenn Sie einen weiteren Kauf t\xE4tigen m\xF6chten, starten Sie eine neue Bestellung."
        },
        refund_already_processed: {
          message: "Diese R\xFCckerstattung wurde bereits verarbeitet",
          action: "Pr\xFCfen Sie Ihren Transaktionsverlauf oder kontaktieren Sie den Support f\xFCr Details."
        },
        coupon_expired: {
          message: "Gutschein ist abgelaufen",
          action: "Bitte entfernen Sie den Code oder verwenden Sie einen anderen."
        },
        coupon_usage_limit_reached: {
          message: "Gutschein\u2011Nutzungslimit erreicht",
          action: "Dieser Gutschein wurde vollst\xE4ndig eingel\xF6st. Bitte verwenden Sie einen anderen Code."
        },
        coupon_not_applicable: {
          message: "Gutschein kann nicht auf diesen Kauf angewendet werden",
          action: "Bitte pr\xFCfen Sie die Gutscheinbedingungen oder entfernen Sie ihn, um fortzufahren."
        },
        coupon_wrong_payment_method: {
          message: "Gutschein ist f\xFCr diese Zahlungsmethode nicht g\xFCltig",
          action: "Versuchen Sie eine andere Zahlungsmethode oder entfernen Sie den Code."
        },
        stripe_error: {
          message: "Kartenzahlungsdienst vor\xFCbergehend nicht verf\xFCgbar",
          action: "Bitte versuchen Sie es in K\xFCrze erneut oder nutzen Sie stattdessen die Krypto\u2011Zahlung."
        },
        rpc_error: {
          message: "Blockchain\u2011Netzwerk vor\xFCbergehend nicht verf\xFCgbar",
          action: "Bitte versuchen Sie es in K\xFCrze erneut oder nutzen Sie stattdessen Kartenzahlung."
        },
        network_error: {
          message: "Netzwerkverbindungsproblem",
          action: "Bitte pr\xFCfen Sie Ihre Internetverbindung und versuchen Sie es erneut."
        },
        internal_error: {
          message: "Auf unserer Seite ist ein Fehler aufgetreten",
          action: "Bitte versuchen Sie es erneut. Wenn das weiterhin passiert, kontaktieren Sie den Support."
        },
        database_error: {
          message: "Dienst vor\xFCbergehend nicht verf\xFCgbar",
          action: "Bitte versuchen Sie es in K\xFCrze erneut."
        },
        config_error: {
          message: "Fehler in der Dienstkonfiguration",
          action: "Bitte wenden Sie sich an den Support."
        },
        unknown_error: {
          message: "Es ist ein unerwarteter Fehler aufgetreten",
          action: "Bitte versuchen Sie es erneut oder kontaktieren Sie den Support, wenn das weiterhin passiert."
        }
      },
      validation: {
        unknown_token_mint: "Warnung: Nicht erkannte Token\u2011Mint\u2011Adresse. Pr\xFCfen Sie sorgf\xE4ltig, ob dies der richtige Token ist, um einen Verlust von Guthaben zu vermeiden.",
        token_typo_warning: "Token\u2011Adresse stimmt nicht mit bekannten Stablecoins (USDC, USDT, PYUSD, CASH) \xFCberein. Bitte sorgf\xE4ltig pr\xFCfen, um dauerhaften Verlust von Guthaben zu verhindern."
      },
      wallet: {
        no_wallet_detected: "Keine Solana\u2011Wallet erkannt",
        install_wallet: "Bitte installieren Sie eine Solana\u2011Wallet wie Phantom, Solflare oder Backpack.",
        wallet_not_connected: "Wallet nicht verbunden",
        connect_your_wallet: "Bitte verbinden Sie Ihre Wallet, um fortzufahren.",
        wallet_connection_failed: "Wallet\u2011Verbindung fehlgeschlagen",
        try_again: "Bitte versuchen Sie, die Verbindung erneut herzustellen.",
        transaction_rejected: "Transaktion wurde abgelehnt",
        approve_in_wallet: "Bitte genehmigen Sie die Transaktion in Ihrer Wallet, um fortzufahren.",
        select_wallet: "Wallet ausw\xE4hlen",
        change: "\xC4ndern"
      }
    };
  }
});

// src/i18n/translations/es.json
var require_es = __commonJS({
  "src/i18n/translations/es.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - Archivo de traducci\xF3n (Espa\xF1ol)",
      version: "1.0.0",
      locale: "es",
      ui: {
        pay_with_card: "Pagar con tarjeta",
        pay_with_crypto: "Pagar con USDC",
        pay_with_usdc: "Pagar con USDC",
        purchase: "Comprar",
        card: "Tarjeta",
        usdc_solana: "USDC (Solana)",
        crypto: "Cripto",
        connect_wallet: "Conectar billetera",
        connecting: "Conectando...",
        processing: "Procesando...",
        loading: "Cargando...",
        close: "Cerrar",
        cancel: "Cancelar",
        confirm: "Confirmar",
        retry: "Intentar de nuevo",
        go_back: "Volver",
        contact_support: "Contactar soporte",
        pay_with_credits: "Pagar con cr\xE9ditos",
        credits: "Cr\xE9ditos",
        disconnect: "Desconectar",
        payment_successful: "\xA1Pago realizado con \xE9xito!",
        subscribe: "Suscribirse",
        subscribe_with_crypto: "Suscribirse con USDC",
        subscribe_with_credits: "Suscribirse con cr\xE9ditos",
        subscribed: "Suscrito",
        subscribed_until: "Suscrito hasta",
        subscription_active: "\xA1Tu suscripci\xF3n est\xE1 activa!",
        redirecting_to_checkout: "Redirigiendo al checkout..."
      },
      errors: {
        invalid_payment_proof: {
          message: "La verificaci\xF3n del pago fall\xF3",
          action: "Intente realizar su pago nuevamente. Si el problema persiste, contacte soporte."
        },
        invalid_signature: {
          message: "La firma de la transacci\xF3n es inv\xE1lida",
          action: "Apruebe la transacci\xF3n en su billetera y vuelva a intentarlo."
        },
        invalid_transaction: {
          message: "El formato de la transacci\xF3n es inv\xE1lido",
          action: "Intente su pago de nuevo. Si contin\xFAa, intente actualizar su aplicaci\xF3n de billetera."
        },
        transaction_not_found: {
          message: "Transacci\xF3n no encontrada en la blockchain",
          action: "Su transacci\xF3n puede seguir proces\xE1ndose. Espere un momento y revise su billetera, o int\xE9ntelo de nuevo."
        },
        transaction_not_confirmed: {
          message: "La transacci\xF3n a\xFAn se est\xE1 procesando",
          action: "Espere un momento a que la blockchain confirme su transacci\xF3n y luego int\xE9ntelo nuevamente."
        },
        transaction_failed: {
          message: "La transacci\xF3n fall\xF3 en la blockchain",
          action: "Revise su billetera para m\xE1s detalles. Es posible que deba ajustar la configuraci\xF3n de la transacci\xF3n o a\xF1adir m\xE1s SOL para comisiones."
        },
        transaction_expired: {
          message: "La transacci\xF3n tard\xF3 demasiado en procesarse",
          action: "Intente su pago de nuevo. Considere aumentar la prioridad de la transacci\xF3n si su billetera lo admite."
        },
        invalid_recipient: {
          message: "El pago se envi\xF3 a la direcci\xF3n equivocada",
          action: "Intente de nuevo y aseg\xFArese de aprobar la transacci\xF3n correcta en su billetera."
        },
        invalid_sender: {
          message: "La billetera remitente del pago es inv\xE1lida",
          action: "Vuelva a conectar su billetera e int\xE9ntelo de nuevo."
        },
        unauthorized_refund_issuer: {
          message: "No est\xE1 autorizado para emitir reembolsos",
          action: "Solo las cuentas autorizadas pueden procesar reembolsos. Contacte soporte si cree que es un error."
        },
        amount_below_minimum: {
          message: "El monto del pago es demasiado bajo",
          action: "Verifique el monto requerido e int\xE9ntelo nuevamente."
        },
        amount_mismatch: {
          message: "El monto del pago no coincide con la cotizaci\xF3n",
          action: "El precio puede haber cambiado. Actualice la p\xE1gina e intente su pago nuevamente."
        },
        insufficient_funds_sol: {
          message: "No hay suficiente SOL para las comisiones de la transacci\xF3n",
          action: "A\xF1ada al menos 0.001 SOL a su billetera para cubrir las comisiones de la red y vuelva a intentarlo."
        },
        insufficient_funds_token: {
          message: "Saldo insuficiente en su billetera",
          action: "A\xF1ada m\xE1s fondos a su billetera e int\xE9ntelo de nuevo."
        },
        invalid_token_mint: {
          message: "Token de pago incorrecto",
          action: "Pague con el token correcto como se muestra en los detalles del pago."
        },
        not_spl_transfer: {
          message: "La transacci\xF3n no es una transferencia de tokens v\xE1lida",
          action: "Aseg\xFArese de enviar el tipo de token correcto desde su billetera."
        },
        missing_token_account: {
          message: "Cuenta de token no encontrada",
          action: "Su billetera puede necesitar crear primero una cuenta de token. Intente de nuevo o use una billetera diferente."
        },
        invalid_token_program: {
          message: "Programa de tokens inv\xE1lido",
          action: "Intente su pago nuevamente. Si esto contin\xFAa, pruebe con otra billetera."
        },
        missing_memo: {
          message: "El memo de pago es obligatorio pero no se incluy\xF3",
          action: "Intente su pago nuevamente y aseg\xFArese de aprobar los detalles de la transacci\xF3n en su billetera."
        },
        invalid_memo: {
          message: "El formato del memo de pago es inv\xE1lido",
          action: "Intente su pago nuevamente."
        },
        payment_already_used: {
          message: "Este pago ya ha sido procesado",
          action: "Revise su historial de transacciones. Si necesita realizar otro pago, inicie una nueva transacci\xF3n."
        },
        signature_reused: {
          message: "La firma de la transacci\xF3n ya se ha utilizado",
          action: "Cree una nueva transacci\xF3n de pago."
        },
        quote_expired: {
          message: "La cotizaci\xF3n de pago ha expirado",
          action: "Los precios se actualizan con frecuencia. Actualice la p\xE1gina e intente su pago nuevamente."
        },
        missing_field: {
          message: "Falta informaci\xF3n requerida",
          action: "Revise todos los campos obligatorios e int\xE9ntelo nuevamente."
        },
        invalid_field: {
          message: "Algunos datos son inv\xE1lidos",
          action: "Revise su informaci\xF3n e int\xE9ntelo de nuevo."
        },
        invalid_amount: {
          message: "El monto del pago es inv\xE1lido",
          action: "Verifique el monto e int\xE9ntelo nuevamente."
        },
        invalid_wallet: {
          message: "La direcci\xF3n de la billetera es inv\xE1lida",
          action: "Vuelva a conectar su billetera e int\xE9ntelo de nuevo."
        },
        invalid_resource: {
          message: "Selecci\xF3n de art\xEDculo inv\xE1lida",
          action: "Actualice la p\xE1gina e int\xE9ntelo de nuevo."
        },
        invalid_coupon: {
          message: "C\xF3digo de cup\xF3n inv\xE1lido",
          action: "Verifique el c\xF3digo de cup\xF3n e int\xE9ntelo nuevamente."
        },
        invalid_cart_item: {
          message: "Uno o m\xE1s art\xEDculos del carrito son inv\xE1lidos",
          action: "Revise su carrito e int\xE9ntelo nuevamente."
        },
        empty_cart: {
          message: "Su carrito est\xE1 vac\xEDo",
          action: "Agregue art\xEDculos a su carrito antes de pagar."
        },
        resource_not_found: {
          message: "Art\xEDculo no encontrado",
          action: "Es posible que este art\xEDculo ya no est\xE9 disponible. Actualice la p\xE1gina e int\xE9ntelo de nuevo."
        },
        cart_not_found: {
          message: "Carrito de compras no encontrado",
          action: "Su carrito puede haber expirado. Inicie un nuevo pedido."
        },
        refund_not_found: {
          message: "Reembolso no encontrado",
          action: "Verifique su n\xFAmero de referencia de reembolso o contacte soporte."
        },
        product_not_found: {
          message: "Producto no disponible",
          action: "Es posible que este producto ya no est\xE9 disponible. Explore nuestra selecci\xF3n actual."
        },
        coupon_not_found: {
          message: "C\xF3digo de cup\xF3n no encontrado",
          action: "Verifique el c\xF3digo de cup\xF3n o elim\xEDnelo para continuar."
        },
        session_not_found: {
          message: "Sesi\xF3n de pago expirada",
          action: "Inicie un nuevo pago."
        },
        cart_already_paid: {
          message: "Este pedido ya ha sido pagado",
          action: "Revise su historial de pedidos. Si necesita realizar otra compra, inicie un nuevo pedido."
        },
        refund_already_processed: {
          message: "Este reembolso ya fue procesado",
          action: "Revise su historial de transacciones o contacte soporte para m\xE1s detalles."
        },
        coupon_expired: {
          message: "El cup\xF3n ha expirado",
          action: "Elimine el c\xF3digo de cup\xF3n o utilice uno diferente."
        },
        coupon_usage_limit_reached: {
          message: "Se alcanz\xF3 el l\xEDmite de uso del cup\xF3n",
          action: "Este cup\xF3n ya fue canjeado completamente. Intente con un c\xF3digo diferente."
        },
        coupon_not_applicable: {
          message: "El cup\xF3n no se puede aplicar a esta compra",
          action: "Revise los t\xE9rminos del cup\xF3n o elim\xEDnelo para continuar."
        },
        coupon_wrong_payment_method: {
          message: "El cup\xF3n no es v\xE1lido para este m\xE9todo de pago",
          action: "Pruebe con un m\xE9todo de pago diferente o elimine el c\xF3digo de cup\xF3n."
        },
        stripe_error: {
          message: "Servicio de pago con tarjeta temporalmente no disponible",
          action: "Intente de nuevo en un momento o use el pago con criptomonedas."
        },
        rpc_error: {
          message: "La red de la blockchain est\xE1 temporalmente no disponible",
          action: "Intente de nuevo en un momento o use el pago con tarjeta."
        },
        network_error: {
          message: "Problema de conexi\xF3n a la red",
          action: "Verifique su conexi\xF3n a internet e int\xE9ntelo de nuevo."
        },
        internal_error: {
          message: "Algo sali\xF3 mal de nuestro lado",
          action: "Intente de nuevo. Si el problema contin\xFAa, contacte soporte."
        },
        database_error: {
          message: "Servicio temporalmente no disponible",
          action: "Intente nuevamente en un momento."
        },
        config_error: {
          message: "Error de configuraci\xF3n del servicio",
          action: "Contacte soporte para recibir asistencia."
        },
        unknown_error: {
          message: "Ocurri\xF3 un error inesperado",
          action: "Intente de nuevo o contacte soporte si el problema contin\xFAa."
        }
      },
      validation: {
        unknown_token_mint: "Advertencia: Direcci\xF3n de mint del token no reconocida. Verifique que sea el token correcto para evitar la p\xE9rdida de fondos.",
        token_typo_warning: "La direcci\xF3n del token no coincide con las stablecoins conocidas (USDC, USDT, PYUSD, CASH). Verif\xEDquelo cuidadosamente para evitar la p\xE9rdida permanente de fondos."
      },
      wallet: {
        no_wallet_detected: "No se detect\xF3 una billetera de Solana",
        install_wallet: "Instale una billetera de Solana como Phantom, Solflare o Backpack.",
        wallet_not_connected: "Billetera no conectada",
        connect_your_wallet: "Conecte su billetera para continuar.",
        wallet_connection_failed: "No se pudo conectar la billetera",
        try_again: "Intente conectarse nuevamente.",
        transaction_rejected: "La transacci\xF3n fue rechazada",
        approve_in_wallet: "Apruebe la transacci\xF3n en su billetera para continuar.",
        select_wallet: "Seleccionar billetera",
        change: "Cambiar"
      }
    };
  }
});

// src/i18n/translations/fil.json
var require_fil = __commonJS({
  "src/i18n/translations/fil.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - Pinagmulan ng Pagsasalin (Filipino/Tagalog)",
      version: "1.0.0",
      locale: "fil",
      ui: {
        pay_with_card: "Magbayad gamit ang Card",
        pay_with_crypto: "Magbayad gamit ang USDC",
        pay_with_usdc: "Magbayad gamit ang USDC",
        purchase: "Bilhin",
        card: "Card",
        usdc_solana: "USDC (Solana)",
        crypto: "Kripto",
        connect_wallet: "Ikonekta ang Wallet",
        connecting: "Kumokonekta...",
        processing: "Pinoproseso...",
        loading: "Naglo-load...",
        close: "Isara",
        cancel: "Kanselahin",
        confirm: "Kumpirmahin",
        retry: "Subukang Muli",
        go_back: "Bumalik",
        contact_support: "Makipag-ugnayan sa Suporta",
        pay_with_credits: "Magbayad gamit ang Credits",
        credits: "Credits",
        disconnect: "Idiskonekta",
        payment_successful: "Matagumpay ang pagbabayad!",
        subscribe: "Mag-subscribe",
        subscribe_with_crypto: "Mag-subscribe gamit ang USDC",
        subscribe_with_credits: "Mag-subscribe gamit ang Credits",
        subscribed: "Naka-subscribe",
        subscribed_until: "Naka-subscribe hanggang",
        subscription_active: "Aktibo ang iyong subscription!",
        redirecting_to_checkout: "Nagre-redirect sa checkout..."
      },
      errors: {
        invalid_payment_proof: {
          message: "Nabigo ang pagpapatunay ng pagbabayad",
          action: "Pakisubukang muli ang iyong pagbabayad. Kung magpatuloy ito, makipag-ugnayan sa suporta."
        },
        invalid_signature: {
          message: "Hindi wasto ang pirma ng transaksyon",
          action: "Pakiyaprubahan ang transaksyon sa iyong wallet at subukan muli."
        },
        invalid_transaction: {
          message: "Hindi wasto ang format ng transaksyon",
          action: "Pakisubukan muli ang iyong pagbabayad. Kung magpatuloy ito, subukang i-update ang iyong wallet app."
        },
        transaction_not_found: {
          message: "Hindi natagpuan ang transaksyon sa blockchain",
          action: "Maaaring pinoproseso pa ang iyong transaksyon. Mangyaring maghintay sandali at tingnan ang iyong wallet, o subukan muli."
        },
        transaction_not_confirmed: {
          message: "Pinoproseso pa ang transaksyon",
          action: "Mangyaring maghintay sandali para makumpirma ng blockchain ang iyong transaksyon, saka subukan muli."
        },
        transaction_failed: {
          message: "Nabigo ang transaksyon sa blockchain",
          action: "Suriin ang iyong wallet para sa mga detalye. Maaaring kailangan mong ayusin ang iyong mga setting ng transaksyon o magdagdag ng higit pang SOL para sa mga bayarin."
        },
        transaction_expired: {
          message: "Mas naging matagal ang pagproseso ng transaksyon",
          action: "Pakisubukan muli ang iyong pagbabayad. Isaalang-alang ang pagtaas ng prioridad ng transaksyon kung sinusuportahan ito ng iyong wallet."
        },
        invalid_recipient: {
          message: "Naipadala ang pagbabayad sa maling address",
          action: "Pakisubukan muli at tiyaking ang tamang transaksyon ang inaaprubahan sa iyong wallet."
        },
        invalid_sender: {
          message: "Hindi wasto ang wallet ng nagpadala ng pagbabayad",
          action: "Pakikonekta muli ang iyong wallet at subukan muli."
        },
        unauthorized_refund_issuer: {
          message: "Wala kang pahintulot na mag-isyu ng refund",
          action: "Tanging mga awtorisadong account lang ang maaaring magproseso ng refund. Makipag-ugnayan sa suporta kung sa tingin mo ay may mali."
        },
        amount_below_minimum: {
          message: "Masyadong mababa ang halagang babayaran",
          action: "Pakisuri ang kinakailangang halaga at subukan muli."
        },
        amount_mismatch: {
          message: "Hindi tumutugma ang halagang babayaran sa quote",
          action: "Maaaring nagbago ang presyo. I-refresh at subukan muli ang iyong pagbabayad."
        },
        insufficient_funds_sol: {
          message: "Kulang ang SOL para sa mga bayarin sa transaksyon",
          action: "Magdagdag ng hindi bababa sa 0.001 SOL sa iyong wallet para sa bayarin sa network, saka subukan muli."
        },
        insufficient_funds_token: {
          message: "Hindi sapat ang balanse sa iyong wallet",
          action: "Magdagdag ng pondo sa iyong wallet at subukan muli."
        },
        invalid_token_mint: {
          message: "Maling token ng pagbabayad",
          action: "Mangyaring magbayad gamit ang tamang token na ipinapakita sa mga detalye ng pagbabayad."
        },
        not_spl_transfer: {
          message: "Hindi wastong token transfer ang transaksyon",
          action: "Tiyaking ang tamang uri ng token ang iyong ipinapadala mula sa iyong wallet."
        },
        missing_token_account: {
          message: "Hindi natagpuan ang token account",
          action: "Maaaring kailangan munang gumawa ng token account ang iyong wallet. Subukan muli o gumamit ng ibang wallet."
        },
        invalid_token_program: {
          message: "Hindi wasto ang token program",
          action: "Pakisubukan muli ang iyong pagbabayad. Kung magpatuloy ito, subukang gumamit ng ibang wallet."
        },
        missing_memo: {
          message: "Kinakailangan ang payment memo ngunit hindi naisama",
          action: "Pakisubukan muli ang iyong pagbabayad at tiyaking naaprubahan ang mga detalye ng transaksyon sa iyong wallet."
        },
        invalid_memo: {
          message: "Hindi wasto ang format ng payment memo",
          action: "Pakisubukan muli ang iyong pagbabayad."
        },
        payment_already_used: {
          message: "Naiproseso na ang pagbabayad na ito",
          action: "Suriin ang iyong kasaysayan ng transaksyon. Kung kailangan mong gumawa ng panibagong pagbabayad, magsimula ng bagong transaksyon."
        },
        signature_reused: {
          message: "Nagamit na ang pirma ng transaksyon",
          action: "Mangyaring gumawa ng bagong transaksyon sa pagbabayad."
        },
        quote_expired: {
          message: "Nag-expire na ang quote ng pagbabayad",
          action: "Madalas ina-update ang mga presyo. I-refresh at subukan muli ang iyong pagbabayad."
        },
        missing_field: {
          message: "May nawawalang kinakailangang impormasyon",
          action: "Pakisuri ang lahat ng kinakailangang field at subukan muli."
        },
        invalid_field: {
          message: "May ilang impormasyong hindi wasto",
          action: "Pakisuri ang iyong inilagay at subukan muli."
        },
        invalid_amount: {
          message: "Hindi wasto ang halagang babayaran",
          action: "Pakisuri ang halaga at subukan muli."
        },
        invalid_wallet: {
          message: "Hindi wasto ang wallet address",
          action: "Pakikonekta muli ang iyong wallet at subukan muli."
        },
        invalid_resource: {
          message: "Hindi wastong pagpili ng item",
          action: "I-refresh ang pahina at subukan muli."
        },
        invalid_coupon: {
          message: "Di\u2011wastong kupon code",
          action: "Pakisuri ang code ng kupon at subukan muli."
        },
        invalid_cart_item: {
          message: "Isa o higit pang item sa cart ay hindi wasto",
          action: "Pakisuri ang iyong cart at subukan muli."
        },
        empty_cart: {
          message: "Walang laman ang iyong cart",
          action: "Magdagdag ng mga item sa iyong cart bago mag-checkout."
        },
        resource_not_found: {
          message: "Hindi natagpuan ang item",
          action: "Maaaring hindi na available ang item na ito. I-refresh at subukan muli."
        },
        cart_not_found: {
          message: "Hindi natagpuan ang shopping cart",
          action: "Maaaring nag-expire ang iyong cart. Mangyaring magsimula ng bagong order."
        },
        refund_not_found: {
          message: "Hindi natagpuan ang refund",
          action: "Pakisuri ang iyong refund reference number o makipag-ugnayan sa suporta."
        },
        product_not_found: {
          message: "Hindi available ang produkto",
          action: "Maaaring hindi na available ang produktong ito. Mangyaring tingnan ang kasalukuyang pagpipilian."
        },
        coupon_not_found: {
          message: "Hindi natagpuan ang code ng kupon",
          action: "Pakisuri ang code ng kupon o alisin ito upang magpatuloy."
        },
        session_not_found: {
          message: "Nag-expire ang session ng pagbabayad",
          action: "Mangyaring magsimula ng bagong pagbabayad."
        },
        cart_already_paid: {
          message: "Nabayaran na ang order na ito",
          action: "Suriin ang iyong kasaysayan ng order. Kung kailangan mong bumili muli, magsimula ng bagong order."
        },
        refund_already_processed: {
          message: "Naiproseso na ang refund na ito",
          action: "Suriin ang iyong kasaysayan ng transaksyon o makipag-ugnayan sa suporta para sa mga detalye."
        },
        coupon_expired: {
          message: "Nag-expire na ang kupon",
          action: "Alisin ang code ng kupon o gumamit ng ibang code."
        },
        coupon_usage_limit_reached: {
          message: "Naabot na ang limitasyon ng paggamit ng kupon",
          action: "Lubos nang nagamit ang kupon na ito. Mangyaring gumamit ng ibang code."
        },
        coupon_not_applicable: {
          message: "Hindi maaaring ilapat ang kupon sa pagbiling ito",
          action: "Pakisuri ang mga tuntunin ng kupon o alisin ito upang magpatuloy."
        },
        coupon_wrong_payment_method: {
          message: "Hindi wasto ang kupon para sa paraang pagbabayad na ito",
          action: "Subukan ang ibang paraan ng pagbabayad o alisin ang code ng kupon."
        },
        stripe_error: {
          message: "Panandaliang hindi available ang serbisyong card payment",
          action: "Pakisubukan muli mamaya, o gumamit ng pagbabayad gamit ang cryptocurrency."
        },
        rpc_error: {
          message: "Panandaliang hindi available ang network ng blockchain",
          action: "Pakisubukan muli mamaya, o gumamit ng pagbabayad gamit ang card."
        },
        network_error: {
          message: "Problema sa koneksyon sa network",
          action: "Pakisuri ang iyong internet connection at subukan muli."
        },
        internal_error: {
          message: "May nagkaproblema sa aming panig",
          action: "Pakisubukan muli. Kung magpatuloy ito, makipag-ugnayan sa suporta."
        },
        database_error: {
          message: "Panandaliang hindi available ang serbisyo",
          action: "Pakisubukan muli mamaya."
        },
        config_error: {
          message: "Error sa configuration ng serbisyo",
          action: "Mangyaring makipag-ugnayan sa suporta para sa tulong."
        },
        unknown_error: {
          message: "Nagkaroon ng hindi inaasahang error",
          action: "Pakisubukan muli o makipag-ugnayan sa suporta kung magpatuloy ito."
        }
      },
      validation: {
        unknown_token_mint: "Babala: Hindi kilalang token mint address. Suriing mabuti na ito ang tamang token upang maiwasan ang pagkawala ng pondo.",
        token_typo_warning: "Ang address ng token ay hindi tugma sa mga kilalang stablecoin (USDC, USDT, PYUSD, CASH). Tiyaking mabuti upang maiwasan ang permanenteng pagkawala ng pondo."
      },
      wallet: {
        no_wallet_detected: "Walang natagpuang Solana wallet",
        install_wallet: "Mangyaring mag-install ng Solana wallet tulad ng Phantom, Solflare, o Backpack.",
        wallet_not_connected: "Hindi nakakonekta ang wallet",
        connect_your_wallet: "Pakikonekta ang iyong wallet upang magpatuloy.",
        wallet_connection_failed: "Nabigo ang pagkonekta sa wallet",
        try_again: "Pakisubukang kumonekta muli.",
        transaction_rejected: "Tinanggihan ang transaksyon",
        approve_in_wallet: "Pakiyaprubahan ang transaksyon sa iyong wallet upang magpatuloy.",
        select_wallet: "Pumili ng wallet",
        change: "Baguhin"
      }
    };
  }
});

// src/i18n/translations/fr.json
var require_fr = __commonJS({
  "src/i18n/translations/fr.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - Fichier source de traduction (Fran\xE7ais)",
      version: "1.0.0",
      locale: "fr",
      ui: {
        pay_with_card: "Payer par carte",
        pay_with_crypto: "Payer en USDC",
        pay_with_usdc: "Payer en USDC",
        purchase: "Acheter",
        card: "Carte",
        usdc_solana: "USDC (Solana)",
        crypto: "Crypto",
        connect_wallet: "Connecter le portefeuille",
        connecting: "Connexion en cours...",
        processing: "Traitement en cours...",
        loading: "Chargement en cours...",
        close: "Fermer",
        cancel: "Annuler",
        confirm: "Confirmer",
        retry: "R\xE9essayer",
        go_back: "Retour",
        contact_support: "Contacter l\u2019assistance",
        pay_with_credits: "Payer avec des cr\xE9dits",
        credits: "Cr\xE9dits",
        disconnect: "D\xE9connecter",
        payment_successful: "Paiement r\xE9ussi !",
        subscribe: "S\u2019abonner",
        subscribe_with_crypto: "S\u2019abonner avec USDC",
        subscribe_with_credits: "S\u2019abonner avec des cr\xE9dits",
        subscribed: "Abonn\xE9",
        subscribed_until: "Abonn\xE9 jusqu\u2019au",
        subscription_active: "Votre abonnement est actif !",
        redirecting_to_checkout: "Redirection vers le paiement..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\xC9chec de la v\xE9rification du paiement",
          action: "Veuillez r\xE9essayer votre paiement. Si le probl\xE8me persiste, contactez l\u2019assistance."
        },
        invalid_signature: {
          message: "La signature de la transaction est invalide",
          action: "Veuillez approuver la transaction dans votre portefeuille puis r\xE9essayer."
        },
        invalid_transaction: {
          message: "Le format de la transaction est invalide",
          action: "Veuillez r\xE9essayer votre paiement. Si cela continue, essayez de mettre \xE0 jour votre application de portefeuille."
        },
        transaction_not_found: {
          message: "Transaction introuvable sur la blockchain",
          action: "Votre transaction est peut\u2011\xEAtre encore en cours de traitement. Patientez un instant et v\xE9rifiez votre portefeuille, ou r\xE9essayez."
        },
        transaction_not_confirmed: {
          message: "La transaction est encore en cours de traitement",
          action: "Veuillez patienter le temps que la blockchain confirme votre transaction, puis r\xE9essayez."
        },
        transaction_failed: {
          message: "La transaction a \xE9chou\xE9 sur la blockchain",
          action: "V\xE9rifiez les d\xE9tails dans votre portefeuille. Vous devrez peut\u2011\xEAtre ajuster les param\xE8tres de la transaction ou ajouter davantage de SOL pour les frais."
        },
        transaction_expired: {
          message: "La transaction a mis trop de temps \xE0 \xEAtre trait\xE9e",
          action: "Veuillez r\xE9essayer votre paiement. Envisagez d\u2019augmenter la priorit\xE9 de la transaction si votre portefeuille le permet."
        },
        invalid_recipient: {
          message: "Le paiement a \xE9t\xE9 envoy\xE9 \xE0 la mauvaise adresse",
          action: "Veuillez r\xE9essayer et assurez\u2011vous d\u2019approuver la bonne transaction dans votre portefeuille."
        },
        invalid_sender: {
          message: "Le portefeuille exp\xE9diteur du paiement est invalide",
          action: "Veuillez reconnecter votre portefeuille et r\xE9essayer."
        },
        unauthorized_refund_issuer: {
          message: "Vous n\u2019\xEAtes pas autoris\xE9 \xE0 \xE9mettre des remboursements",
          action: "Seuls les comptes autoris\xE9s peuvent traiter des remboursements. Contactez l\u2019assistance si vous pensez qu\u2019il s\u2019agit d\u2019une erreur."
        },
        amount_below_minimum: {
          message: "Montant de paiement trop faible",
          action: "Veuillez v\xE9rifier le montant requis puis r\xE9essayer."
        },
        amount_mismatch: {
          message: "Le montant du paiement ne correspond pas au devis",
          action: "Le prix a peut\u2011\xEAtre chang\xE9. Actualisez la page puis r\xE9essayez votre paiement."
        },
        insufficient_funds_sol: {
          message: "Solde en SOL insuffisant pour les frais de transaction",
          action: "Ajoutez au moins 0.001 SOL \xE0 votre portefeuille pour couvrir les frais r\xE9seau, puis r\xE9essayez."
        },
        insufficient_funds_token: {
          message: "Solde insuffisant dans votre portefeuille",
          action: "Ajoutez des fonds \xE0 votre portefeuille puis r\xE9essayez."
        },
        invalid_token_mint: {
          message: "Jeton de paiement incorrect",
          action: "Veuillez payer avec le jeton correct tel qu\u2019indiqu\xE9 dans les d\xE9tails du paiement."
        },
        not_spl_transfer: {
          message: "La transaction n\u2019est pas un transfert de jetons valide",
          action: "Assurez\u2011vous d\u2019envoyer le bon type de jeton depuis votre portefeuille."
        },
        missing_token_account: {
          message: "Compte de jetons introuvable",
          action: "Votre portefeuille doit peut\u2011\xEAtre d\u2019abord cr\xE9er un compte de jetons. R\xE9essayez ou utilisez un autre portefeuille."
        },
        invalid_token_program: {
          message: "Programme de jetons invalide",
          action: "Veuillez r\xE9essayer votre paiement. Si cela continue, essayez un autre portefeuille."
        },
        missing_memo: {
          message: "Le m\xE9mo de paiement est requis mais n\u2019a pas \xE9t\xE9 inclus",
          action: "Veuillez r\xE9essayer votre paiement et approuver les d\xE9tails de la transaction dans votre portefeuille."
        },
        invalid_memo: {
          message: "Format du m\xE9mo de paiement invalide",
          action: "Veuillez r\xE9essayer votre paiement."
        },
        payment_already_used: {
          message: "Ce paiement a d\xE9j\xE0 \xE9t\xE9 trait\xE9",
          action: "V\xE9rifiez votre historique de transactions. Si vous devez effectuer un autre paiement, commencez une nouvelle transaction."
        },
        signature_reused: {
          message: "La signature de la transaction a d\xE9j\xE0 \xE9t\xE9 utilis\xE9e",
          action: "Veuillez cr\xE9er une nouvelle transaction de paiement."
        },
        quote_expired: {
          message: "Le devis de paiement a expir\xE9",
          action: "Les prix sont fr\xE9quemment mis \xE0 jour. Actualisez la page puis r\xE9essayez votre paiement."
        },
        missing_field: {
          message: "Informations requises manquantes",
          action: "Veuillez v\xE9rifier tous les champs obligatoires puis r\xE9essayer."
        },
        invalid_field: {
          message: "Certaines informations sont invalides",
          action: "Veuillez v\xE9rifier vos saisies puis r\xE9essayer."
        },
        invalid_amount: {
          message: "Montant de paiement invalide",
          action: "Veuillez v\xE9rifier le montant puis r\xE9essayer."
        },
        invalid_wallet: {
          message: "Adresse de portefeuille invalide",
          action: "Veuillez reconnecter votre portefeuille et r\xE9essayer."
        },
        invalid_resource: {
          message: "S\xE9lection d\u2019article invalide",
          action: "Actualisez la page puis r\xE9essayez."
        },
        invalid_coupon: {
          message: "Code promo invalide",
          action: "Veuillez v\xE9rifier le code promo puis r\xE9essayer."
        },
        invalid_cart_item: {
          message: "Un ou plusieurs articles du panier sont invalides",
          action: "Veuillez v\xE9rifier votre panier puis r\xE9essayer."
        },
        empty_cart: {
          message: "Votre panier est vide",
          action: "Ajoutez des articles \xE0 votre panier avant de payer."
        },
        resource_not_found: {
          message: "Article introuvable",
          action: "Cet article n\u2019est peut\u2011\xEAtre plus disponible. Actualisez la page puis r\xE9essayez."
        },
        cart_not_found: {
          message: "Panier introuvable",
          action: "Votre panier a peut\u2011\xEAtre expir\xE9. Veuillez lancer une nouvelle commande."
        },
        refund_not_found: {
          message: "Remboursement introuvable",
          action: "Veuillez v\xE9rifier votre num\xE9ro de r\xE9f\xE9rence de remboursement ou contacter l\u2019assistance."
        },
        product_not_found: {
          message: "Produit non disponible",
          action: "Ce produit n\u2019est peut\u2011\xEAtre plus disponible. Parcourez notre s\xE9lection actuelle."
        },
        coupon_not_found: {
          message: "Code promo introuvable",
          action: "Veuillez v\xE9rifier le code ou le supprimer pour continuer."
        },
        session_not_found: {
          message: "Session de paiement expir\xE9e",
          action: "Veuillez commencer un nouveau paiement."
        },
        cart_already_paid: {
          message: "Cette commande a d\xE9j\xE0 \xE9t\xE9 pay\xE9e",
          action: "V\xE9rifiez votre historique de commandes. Pour un nouvel achat, lancez une nouvelle commande."
        },
        refund_already_processed: {
          message: "Ce remboursement a d\xE9j\xE0 \xE9t\xE9 trait\xE9",
          action: "V\xE9rifiez votre historique de transactions ou contactez l\u2019assistance pour plus de d\xE9tails."
        },
        coupon_expired: {
          message: "Le code promo a expir\xE9",
          action: "Supprimez le code promo ou utilisez\u2011en un autre."
        },
        coupon_usage_limit_reached: {
          message: "Limite d\u2019utilisation du code promo atteinte",
          action: "Ce code promo a \xE9t\xE9 enti\xE8rement utilis\xE9. Veuillez essayer un autre code."
        },
        coupon_not_applicable: {
          message: "Le code promo ne s\u2019applique pas \xE0 cet achat",
          action: "Veuillez v\xE9rifier les conditions du code ou le supprimer pour continuer."
        },
        coupon_wrong_payment_method: {
          message: "Le code promo n\u2019est pas valable pour ce mode de paiement",
          action: "Essayez un autre mode de paiement ou supprimez le code."
        },
        stripe_error: {
          message: "Service de paiement par carte temporairement indisponible",
          action: "Veuillez r\xE9essayer dans un instant, ou utilisez le paiement en crypto \xE0 la place."
        },
        rpc_error: {
          message: "R\xE9seau blockchain temporairement indisponible",
          action: "Veuillez r\xE9essayer dans un instant, ou utilisez le paiement par carte \xE0 la place."
        },
        network_error: {
          message: "Probl\xE8me de connexion r\xE9seau",
          action: "Veuillez v\xE9rifier votre connexion Internet puis r\xE9essayer."
        },
        internal_error: {
          message: "Un probl\xE8me est survenu de notre c\xF4t\xE9",
          action: "Veuillez r\xE9essayer. Si le probl\xE8me persiste, contactez l\u2019assistance."
        },
        database_error: {
          message: "Service temporairement indisponible",
          action: "Veuillez r\xE9essayer dans un instant."
        },
        config_error: {
          message: "Erreur de configuration du service",
          action: "Veuillez contacter l\u2019assistance pour obtenir de l\u2019aide."
        },
        unknown_error: {
          message: "Une erreur inattendue s\u2019est produite",
          action: "Veuillez r\xE9essayer ou contacter l\u2019assistance si cela persiste."
        }
      },
      validation: {
        unknown_token_mint: "Avertissement\xA0: adresse mint du jeton non reconnue. V\xE9rifiez bien qu\u2019il s\u2019agit du bon jeton afin d\u2019\xE9viter toute perte de fonds.",
        token_typo_warning: "L\u2019adresse du jeton ne correspond pas aux stablecoins connus (USDC, USDT, PYUSD, CASH). V\xE9rifiez attentivement pour \xE9viter toute perte d\xE9finitive de fonds."
      },
      wallet: {
        no_wallet_detected: "Aucun portefeuille Solana d\xE9tect\xE9",
        install_wallet: "Veuillez installer un portefeuille Solana comme Phantom, Solflare ou Backpack.",
        wallet_not_connected: "Portefeuille non connect\xE9",
        connect_your_wallet: "Veuillez connecter votre portefeuille pour continuer.",
        wallet_connection_failed: "\xC9chec de la connexion au portefeuille",
        try_again: "Veuillez r\xE9essayer la connexion.",
        transaction_rejected: "La transaction a \xE9t\xE9 refus\xE9e",
        approve_in_wallet: "Veuillez approuver la transaction dans votre portefeuille pour continuer.",
        select_wallet: "S\xE9lectionner un portefeuille",
        change: "Changer"
      }
    };
  }
});

// src/i18n/translations/he.json
var require_he = __commonJS({
  "src/i18n/translations/he.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \u05E7\u05D5\u05D1\u05E5 \u05DE\u05E7\u05D5\u05E8 \u05EA\u05E8\u05D2\u05D5\u05DD (\u05E2\u05D1\u05E8\u05D9\u05EA)",
      version: "1.0.0",
      locale: "he",
      ui: {
        pay_with_card: "\u05EA\u05E9\u05DC\u05D5\u05DD \u05D1\u05DB\u05E8\u05D8\u05D9\u05E1",
        pay_with_crypto: "\u05EA\u05E9\u05DC\u05D5\u05DD \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA USDC",
        pay_with_usdc: "\u05EA\u05E9\u05DC\u05D5\u05DD \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA USDC",
        purchase: "\u05E8\u05DB\u05D9\u05E9\u05D4",
        card: "\u05DB\u05E8\u05D8\u05D9\u05E1",
        usdc_solana: "USDC \u200F(Solana)",
        crypto: "\u05E7\u05E8\u05D9\u05E4\u05D8\u05D5",
        connect_wallet: "\u05D7\u05D1\u05E8 \u05D0\u05E8\u05E0\u05E7",
        connecting: "\u05DE\u05EA\u05D7\u05D1\u05E8...",
        processing: "\u05DE\u05E2\u05D1\u05D3...",
        loading: "\u05D8\u05D5\u05E2\u05DF...",
        close: "\u05E1\u05D2\u05D5\u05E8",
        cancel: "\u05D1\u05D9\u05D8\u05D5\u05DC",
        confirm: "\u05D0\u05D9\u05E9\u05D5\u05E8",
        retry: "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1",
        go_back: "\u05D7\u05D6\u05D5\u05E8",
        contact_support: "\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05D4\u05EA\u05DE\u05D9\u05DB\u05D4",
        pay_with_credits: "\u05E9\u05DC\u05DD \u05D1\u05E7\u05E8\u05D3\u05D9\u05D8\u05D9\u05DD",
        credits: "\u05E7\u05E8\u05D3\u05D9\u05D8\u05D9\u05DD",
        disconnect: "\u05E0\u05EA\u05E7",
        payment_successful: "\u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D4\u05E6\u05DC\u05D9\u05D7!",
        subscribe: "\u05D4\u05D9\u05E8\u05E9\u05DD",
        subscribe_with_crypto: "\u05D4\u05D9\u05E8\u05E9\u05DD \u05E2\u05DD USDC",
        subscribe_with_credits: "\u05D4\u05D9\u05E8\u05E9\u05DD \u05D1\u05E7\u05E8\u05D3\u05D9\u05D8\u05D9\u05DD",
        subscribed: "\u05E8\u05E9\u05D5\u05DD",
        subscribed_until: "\u05E8\u05E9\u05D5\u05DD \u05E2\u05D3",
        subscription_active: "\u05D4\u05DE\u05E0\u05D5\u05D9 \u05E9\u05DC\u05DA \u05E4\u05E2\u05D9\u05DC!",
        redirecting_to_checkout: "\u05DE\u05E2\u05D1\u05D9\u05E8 \u05DC\u05EA\u05E9\u05DC\u05D5\u05DD..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05E0\u05DB\u05E9\u05DC",
          action: "\u05E0\u05E1\u05D4 \u05DC\u05D1\u05E6\u05E2 \u05D0\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05E9\u05D5\u05D1. \u05D0\u05DD \u05D4\u05D1\u05E2\u05D9\u05D4 \u05E0\u05DE\u05E9\u05DB\u05EA, \u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05D4\u05EA\u05DE\u05D9\u05DB\u05D4."
        },
        invalid_signature: {
          message: "\u05D7\u05EA\u05D9\u05DE\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4 \u05D0\u05D9\u05E0\u05D4 \u05EA\u05E7\u05E4\u05D4",
          action: "\u05D0\u05E0\u05D0 \u05D0\u05E9\u05E8 \u05D0\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4 \u05D1\u05D0\u05E8\u05E0\u05E7 \u05E9\u05DC\u05DA \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        invalid_transaction: {
          message: "\u05E4\u05D5\u05E8\u05DE\u05D8 \u05D4\u05E2\u05E1\u05E7\u05D4 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05E3",
          action: "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05DC\u05D1\u05E6\u05E2 \u05D0\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD. \u05D0\u05DD \u05D4\u05D1\u05E2\u05D9\u05D4 \u05E0\u05DE\u05E9\u05DB\u05EA, \u05E2\u05D3\u05DB\u05DF \u05D0\u05EA \u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D9\u05EA \u05D4\u05D0\u05E8\u05E0\u05E7."
        },
        transaction_not_found: {
          message: "\u05D4\u05E2\u05E1\u05E7\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4 \u05D1\u05D1\u05DC\u05D5\u05E7\u05E6'\u05D9\u05D9\u05DF",
          action: "\u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05D4\u05E2\u05E1\u05E7\u05D4 \u05E9\u05DC\u05DA \u05E2\u05D3\u05D9\u05D9\u05DF \u05D1\u05E2\u05D9\u05D1\u05D5\u05D3. \u05D4\u05DE\u05EA\u05DF \u05E8\u05D2\u05E2 \u05D5\u05D1\u05D3\u05D5\u05E7 \u05D1\u05D0\u05E8\u05E0\u05E7, \u05D0\u05D5 \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        transaction_not_confirmed: {
          message: "\u05D4\u05E2\u05E1\u05E7\u05D4 \u05E2\u05D3\u05D9\u05D9\u05DF \u05D1\u05E2\u05D9\u05D1\u05D5\u05D3",
          action: "\u05D0\u05E0\u05D0 \u05D4\u05DE\u05EA\u05DF \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05E2\u05E1\u05E7\u05D4 \u05D1\u05D1\u05DC\u05D5\u05E7\u05E6'\u05D9\u05D9\u05DF \u05D5\u05DC\u05D0\u05D7\u05E8 \u05DE\u05DB\u05DF \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        transaction_failed: {
          message: "\u05D4\u05E2\u05E1\u05E7\u05D4 \u05E0\u05DB\u05E9\u05DC\u05D4 \u05D1\u05D1\u05DC\u05D5\u05E7\u05E6'\u05D9\u05D9\u05DF",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D1\u05D0\u05E8\u05E0\u05E7 \u05E9\u05DC\u05DA \u05DC\u05E4\u05E8\u05D8\u05D9\u05DD. \u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05EA\u05E6\u05D8\u05E8\u05DA \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05D0\u05EA \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4 \u05D0\u05D5 \u05DC\u05D4\u05D5\u05E1\u05D9\u05E3 SOL \u05E2\u05D1\u05D5\u05E8 \u05E2\u05DE\u05DC\u05D5\u05EA."
        },
        transaction_expired: {
          message: "\u05D4\u05E2\u05E1\u05E7\u05D4 \u05E0\u05DE\u05E9\u05DB\u05D4 \u05D6\u05DE\u05DF \u05E8\u05D1 \u05DE\u05D3\u05D9",
          action: "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05DC\u05D1\u05E6\u05E2 \u05D0\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD. \u05E9\u05E7\u05D5\u05DC \u05DC\u05D4\u05D2\u05D3\u05D9\u05DC \u05D0\u05EA \u05E2\u05D3\u05D9\u05E4\u05D5\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4 \u05D0\u05DD \u05D4\u05D0\u05E8\u05E0\u05E7 \u05E9\u05DC\u05DA \u05EA\u05D5\u05DE\u05DA \u05D1\u05DB\u05DA."
        },
        invalid_recipient: {
          message: "\u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05E0\u05E9\u05DC\u05D7 \u05DC\u05DB\u05EA\u05D5\u05D1\u05EA \u05E9\u05D2\u05D5\u05D9\u05D4",
          action: "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05D5\u05D5\u05D3\u05D0 \u05E9\u05D0\u05EA\u05D4 \u05DE\u05D0\u05E9\u05E8 \u05D0\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4 \u05D4\u05E0\u05DB\u05D5\u05E0\u05D4 \u05D1\u05D0\u05E8\u05E0\u05E7."
        },
        invalid_sender: {
          message: "\u05D0\u05E8\u05E0\u05E7 \u05E9\u05D5\u05DC\u05D7 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05E3",
          action: "\u05D7\u05D1\u05E8 \u05E9\u05D5\u05D1 \u05D0\u05EA \u05D4\u05D0\u05E8\u05E0\u05E7 \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        unauthorized_refund_issuer: {
          message: "\u05D0\u05D9\u05DF \u05DC\u05DA \u05D4\u05E8\u05E9\u05D0\u05D4 \u05DC\u05D4\u05E0\u05E4\u05D9\u05E7 \u05D4\u05D7\u05D6\u05E8\u05D9\u05DD",
          action: "\u05E8\u05E7 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D5\u05EA \u05DE\u05D5\u05E8\u05E9\u05D9\u05DD \u05D9\u05DB\u05D5\u05DC\u05D9\u05DD \u05DC\u05E2\u05D1\u05D3 \u05D4\u05D7\u05D6\u05E8\u05D9\u05DD. \u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05D4\u05EA\u05DE\u05D9\u05DB\u05D4 \u05D0\u05DD \u05DE\u05D3\u05D5\u05D1\u05E8 \u05D1\u05D8\u05E2\u05D5\u05EA."
        },
        amount_below_minimum: {
          message: "\u05E1\u05DB\u05D5\u05DD \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05E0\u05DE\u05D5\u05DA \u05DE\u05D3\u05D9",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E1\u05DB\u05D5\u05DD \u05D4\u05E0\u05D3\u05E8\u05E9 \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        amount_mismatch: {
          message: "\u05E1\u05DB\u05D5\u05DD \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05DC\u05D0 \u05EA\u05D5\u05D0\u05DD \u05D0\u05EA \u05D4\u05D4\u05E6\u05E2\u05D4",
          action: "\u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05D4\u05DE\u05D7\u05D9\u05E8 \u05D4\u05E9\u05EA\u05E0\u05D4. \u05E8\u05E2\u05E0\u05DF \u05D5\u05E0\u05E1\u05D4 \u05DC\u05D1\u05E6\u05E2 \u05D0\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05E9\u05D5\u05D1."
        },
        insufficient_funds_sol: {
          message: "\u05D0\u05D9\u05DF \u05DE\u05E1\u05E4\u05D9\u05E7 SOL \u05DC\u05E2\u05DE\u05DC\u05D5\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4",
          action: "\u05D4\u05D5\u05E1\u05E3 \u05DC\u05E4\u05D7\u05D5\u05EA \u200E0.001\u200E SOL \u05DC\u05D0\u05E8\u05E0\u05E7 \u05DB\u05D3\u05D9 \u05DC\u05DB\u05E1\u05D5\u05EA \u05E2\u05DE\u05DC\u05D5\u05EA \u05E8\u05E9\u05EA, \u05D5\u05D0\u05D6 \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        insufficient_funds_token: {
          message: "\u05D9\u05EA\u05E8\u05D4 \u05DC\u05D0 \u05DE\u05E1\u05E4\u05E7\u05EA \u05D1\u05D0\u05E8\u05E0\u05E7 \u05E9\u05DC\u05DA",
          action: "\u05D4\u05D5\u05E1\u05E3 \u05E2\u05D5\u05D3 \u05DB\u05E1\u05E4\u05D9\u05DD \u05DC\u05D0\u05E8\u05E0\u05E7 \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        invalid_token_mint: {
          message: "\u05D8\u05D5\u05E7\u05DF \u05EA\u05E9\u05DC\u05D5\u05DD \u05E9\u05D2\u05D5\u05D9",
          action: "\u05E9\u05DC\u05DD \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA \u05D4\u05D8\u05D5\u05E7\u05DF \u05D4\u05E0\u05DB\u05D5\u05DF \u05DB\u05E4\u05D9 \u05E9\u05DE\u05D5\u05E4\u05D9\u05E2 \u05D1\u05E4\u05E8\u05D8\u05D9 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD."
        },
        not_spl_transfer: {
          message: "\u05D4\u05E2\u05E1\u05E7\u05D4 \u05D0\u05D9\u05E0\u05D4 \u05D4\u05E2\u05D1\u05E8\u05EA \u05D8\u05D5\u05E7\u05DF \u05EA\u05E7\u05E4\u05D4",
          action: "\u05D5\u05D3\u05D0 \u05E9\u05D0\u05EA\u05D4 \u05E9\u05D5\u05DC\u05D7 \u05D0\u05EA \u05E1\u05D5\u05D2 \u05D4\u05D8\u05D5\u05E7\u05DF \u05D4\u05E0\u05DB\u05D5\u05DF \u05DE\u05D4\u05D0\u05E8\u05E0\u05E7."
        },
        missing_token_account: {
          message: "\u05D7\u05E9\u05D1\u05D5\u05DF \u05D8\u05D5\u05E7\u05DF \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0",
          action: "\u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05E2\u05DC \u05D4\u05D0\u05E8\u05E0\u05E7 \u05E9\u05DC\u05DA \u05DC\u05D9\u05E6\u05D5\u05E8 \u05EA\u05D7\u05D9\u05DC\u05D4 \u05D7\u05E9\u05D1\u05D5\u05DF \u05D8\u05D5\u05E7\u05DF. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05D0\u05D5 \u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05D0\u05E8\u05E0\u05E7 \u05D0\u05D7\u05E8."
        },
        invalid_token_program: {
          message: "\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05D8\u05D5\u05E7\u05DF \u05DC\u05D0 \u05EA\u05E7\u05E4\u05D4",
          action: "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05DC\u05D1\u05E6\u05E2 \u05D0\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD. \u05D0\u05DD \u05D4\u05D1\u05E2\u05D9\u05D4 \u05E0\u05DE\u05E9\u05DB\u05EA, \u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05D0\u05E8\u05E0\u05E7 \u05D0\u05D7\u05E8."
        },
        missing_memo: {
          message: "\u05E0\u05D3\u05E8\u05E9 \u05DE\u05D6\u05DB\u05E8 \u05EA\u05E9\u05DC\u05D5\u05DD \u05D0\u05DA \u05D4\u05D5\u05D0 \u05DC\u05D0 \u05E6\u05D5\u05E8\u05E3",
          action: "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05D0\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D5\u05D5\u05D3\u05D0 \u05E9\u05E4\u05E8\u05D8\u05D9 \u05D4\u05E2\u05E1\u05E7\u05D4 \u05DE\u05D0\u05D5\u05E9\u05E8\u05D9\u05DD \u05D1\u05D0\u05E8\u05E0\u05E7."
        },
        invalid_memo: {
          message: "\u05E4\u05D5\u05E8\u05DE\u05D8 \u05DE\u05D6\u05DB\u05E8 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05E3",
          action: "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05DC\u05D1\u05E6\u05E2 \u05D0\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD."
        },
        payment_already_used: {
          message: "\u05EA\u05E9\u05DC\u05D5\u05DD \u05D6\u05D4 \u05DB\u05D1\u05E8 \u05E2\u05D5\u05D1\u05BC\u05D3",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D9\u05EA \u05D4\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05E9\u05DC\u05DA. \u05D0\u05DD \u05E2\u05DC\u05D9\u05DA \u05DC\u05D1\u05E6\u05E2 \u05EA\u05E9\u05DC\u05D5\u05DD \u05E0\u05D5\u05E1\u05E3, \u05D4\u05EA\u05D7\u05DC \u05E2\u05E1\u05E7\u05D4 \u05D7\u05D3\u05E9\u05D4."
        },
        signature_reused: {
          message: "\u05D7\u05EA\u05D9\u05DE\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4 \u05DB\u05D1\u05E8 \u05E0\u05D5\u05E6\u05DC\u05D4",
          action: "\u05E6\u05D5\u05E8 \u05E2\u05E1\u05E7\u05EA \u05EA\u05E9\u05DC\u05D5\u05DD \u05D7\u05D3\u05E9\u05D4."
        },
        quote_expired: {
          message: "\u05D4\u05E6\u05E2\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05E4\u05D2\u05D4",
          action: "\u05D4\u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05DE\u05EA\u05E2\u05D3\u05DB\u05E0\u05D9\u05DD \u05DC\u05E2\u05D9\u05EA\u05D9\u05DD \u05E7\u05E8\u05D5\u05D1\u05D5\u05EA. \u05E8\u05E2\u05E0\u05DF \u05D5\u05E0\u05E1\u05D4 \u05DC\u05D1\u05E6\u05E2 \u05D0\u05EA \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05E9\u05D5\u05D1."
        },
        missing_field: {
          message: "\u05DE\u05D9\u05D3\u05E2 \u05E0\u05D3\u05E8\u05E9 \u05D7\u05E1\u05E8",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E9\u05D3\u05D5\u05EA \u05D4\u05E0\u05D3\u05E8\u05E9\u05D9\u05DD \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        invalid_field: {
          message: "\u05D7\u05DC\u05E7 \u05DE\u05D4\u05DE\u05D9\u05D3\u05E2 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05E3",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E7\u05DC\u05D8 \u05E9\u05DC\u05DA \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        invalid_amount: {
          message: "\u05E1\u05DB\u05D5\u05DD \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05E3",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E1\u05DB\u05D5\u05DD \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        invalid_wallet: {
          message: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D4\u05D0\u05E8\u05E0\u05E7 \u05D0\u05D9\u05E0\u05D4 \u05EA\u05E7\u05E4\u05D4",
          action: "\u05D7\u05D1\u05E8 \u05E9\u05D5\u05D1 \u05D0\u05EA \u05D4\u05D0\u05E8\u05E0\u05E7 \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        invalid_resource: {
          message: "\u05D1\u05D7\u05D9\u05E8\u05EA \u05E4\u05E8\u05D9\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05E4\u05D4",
          action: "\u05E8\u05E2\u05E0\u05DF \u05D0\u05EA \u05D4\u05D3\u05E3 \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        invalid_coupon: {
          message: "\u05E7\u05D5\u05D3 \u05E7\u05D5\u05E4\u05D5\u05DF \u05DC\u05D0 \u05EA\u05E7\u05E3",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05E7\u05D5\u05D3 \u05D4\u05E7\u05D5\u05E4\u05D5\u05DF \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        invalid_cart_item: {
          message: "\u05E4\u05E8\u05D9\u05D8 \u05D0\u05D7\u05D3 \u05D0\u05D5 \u05D9\u05D5\u05EA\u05E8 \u05D1\u05E2\u05D2\u05DC\u05D4 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05E3",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E2\u05D2\u05DC\u05D4 \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        empty_cart: {
          message: "\u05D4\u05E2\u05D2\u05DC\u05D4 \u05E9\u05DC\u05DA \u05E8\u05D9\u05E7\u05D4",
          action: "\u05D4\u05D5\u05E1\u05E3 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DC\u05E2\u05D2\u05DC\u05D4 \u05DC\u05E4\u05E0\u05D9 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD."
        },
        resource_not_found: {
          message: "\u05D4\u05E4\u05E8\u05D9\u05D8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0",
          action: "\u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05D4\u05E4\u05E8\u05D9\u05D8 \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF \u05E2\u05D5\u05D3. \u05E8\u05E2\u05E0\u05DF \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        cart_not_found: {
          message: "\u05E2\u05D2\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4",
          action: "\u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05E1\u05DC \u05D4\u05E7\u05E0\u05D9\u05D5\u05EA \u05E9\u05DC\u05DA \u05E4\u05D2. \u05D4\u05EA\u05D7\u05DC \u05D4\u05D6\u05DE\u05E0\u05D4 \u05D7\u05D3\u05E9\u05D4."
        },
        refund_not_found: {
          message: "\u05D4\u05D7\u05D6\u05E8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05DE\u05E1\u05E4\u05E8 \u05D4\u05D4\u05E4\u05E0\u05D9\u05D4 \u05E9\u05DC \u05D4\u05D4\u05D7\u05D6\u05E8 \u05D0\u05D5 \u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05D4\u05EA\u05DE\u05D9\u05DB\u05D4."
        },
        product_not_found: {
          message: "\u05D4\u05DE\u05D5\u05E6\u05E8 \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF",
          action: "\u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05D4\u05DE\u05D5\u05E6\u05E8 \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF \u05E2\u05D5\u05D3. \u05E2\u05D9\u05D9\u05DF \u05D1\u05DE\u05D1\u05D7\u05E8 \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9 \u05E9\u05DC\u05E0\u05D5."
        },
        coupon_not_found: {
          message: "\u05E7\u05D5\u05D3 \u05E7\u05D5\u05E4\u05D5\u05DF \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05E7\u05D5\u05D3 \u05D4\u05E7\u05D5\u05E4\u05D5\u05DF \u05D0\u05D5 \u05D4\u05E1\u05E8 \u05D0\u05D5\u05EA\u05D5 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA."
        },
        session_not_found: {
          message: "\u05E1\u05E9\u05DF \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05E4\u05D2",
          action: "\u05D4\u05EA\u05D7\u05DC \u05EA\u05E9\u05DC\u05D5\u05DD \u05D7\u05D3\u05E9."
        },
        cart_already_paid: {
          message: "\u05D4\u05D6\u05DE\u05E0\u05D4 \u05D6\u05D5 \u05DB\u05D1\u05E8 \u05E9\u05D5\u05DC\u05DE\u05D4",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D9\u05EA \u05D4\u05D4\u05D6\u05DE\u05E0\u05D5\u05EA \u05E9\u05DC\u05DA. \u05DC\u05E8\u05DB\u05D9\u05E9\u05D4 \u05E0\u05D5\u05E1\u05E4\u05EA, \u05D4\u05EA\u05D7\u05DC \u05D4\u05D6\u05DE\u05E0\u05D4 \u05D7\u05D3\u05E9\u05D4."
        },
        refund_already_processed: {
          message: "\u05D4\u05D7\u05D6\u05E8 \u05D6\u05D4 \u05DB\u05D1\u05E8 \u05E2\u05D5\u05D1\u05BC\u05D3",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D9\u05EA \u05D4\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05D0\u05D5 \u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05D4\u05EA\u05DE\u05D9\u05DB\u05D4 \u05DC\u05E4\u05E8\u05D8\u05D9\u05DD."
        },
        coupon_expired: {
          message: "\u05D4\u05E7\u05D5\u05E4\u05D5\u05DF \u05E4\u05D2",
          action: "\u05D4\u05E1\u05E8 \u05D0\u05EA \u05E7\u05D5\u05D3 \u05D4\u05E7\u05D5\u05E4\u05D5\u05DF \u05D0\u05D5 \u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05E7\u05D5\u05D3 \u05D0\u05D7\u05E8."
        },
        coupon_usage_limit_reached: {
          message: "\u05D4\u05D2\u05D9\u05E2\u05D5 \u05DC\u05DE\u05D2\u05D1\u05DC\u05EA \u05D4\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05E7\u05D5\u05E4\u05D5\u05DF",
          action: "\u05E7\u05D5\u05E4\u05D5\u05DF \u05D6\u05D4 \u05E0\u05D5\u05E6\u05DC \u05D1\u05DE\u05DC\u05D5\u05D0\u05D5. \u05E0\u05E1\u05D4 \u05E7\u05D5\u05D3 \u05D0\u05D7\u05E8."
        },
        coupon_not_applicable: {
          message: "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D9\u05D9\u05E9\u05DD \u05D0\u05EA \u05D4\u05E7\u05D5\u05E4\u05D5\u05DF \u05E2\u05DC \u05E8\u05DB\u05D9\u05E9\u05D4 \u05D6\u05D5",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05EA\u05E0\u05D0\u05D9 \u05D4\u05E7\u05D5\u05E4\u05D5\u05DF \u05D0\u05D5 \u05D4\u05E1\u05E8 \u05D0\u05D5\u05EA\u05D5 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA."
        },
        coupon_wrong_payment_method: {
          message: "\u05D4\u05E7\u05D5\u05E4\u05D5\u05DF \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05E3 \u05DC\u05E9\u05D9\u05D8\u05EA \u05EA\u05E9\u05DC\u05D5\u05DD \u05D6\u05D5",
          action: "\u05E0\u05E1\u05D4 \u05E9\u05D9\u05D8\u05EA \u05EA\u05E9\u05DC\u05D5\u05DD \u05D0\u05D7\u05E8\u05EA \u05D0\u05D5 \u05D4\u05E1\u05E8 \u05D0\u05EA \u05E7\u05D5\u05D3 \u05D4\u05E7\u05D5\u05E4\u05D5\u05DF."
        },
        stripe_error: {
          message: "\u05E9\u05D9\u05E8\u05D5\u05EA \u05EA\u05E9\u05DC\u05D5\u05DD \u05D1\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF \u05D6\u05DE\u05E0\u05D9\u05EA",
          action: "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05DE\u05D0\u05D5\u05D7\u05E8 \u05D9\u05D5\u05EA\u05E8, \u05D0\u05D5 \u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05EA\u05E9\u05DC\u05D5\u05DD \u05D1\u05E7\u05E8\u05D9\u05E4\u05D8\u05D5."
        },
        rpc_error: {
          message: "\u05E8\u05E9\u05EA \u05D4\u05D1\u05DC\u05D5\u05E7\u05E6'\u05D9\u05D9\u05DF \u05D0\u05D9\u05E0\u05D4 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05D6\u05DE\u05E0\u05D9\u05EA",
          action: "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05DE\u05D0\u05D5\u05D7\u05E8 \u05D9\u05D5\u05EA\u05E8, \u05D0\u05D5 \u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05EA\u05E9\u05DC\u05D5\u05DD \u05D1\u05DB\u05E8\u05D8\u05D9\u05E1."
        },
        network_error: {
          message: "\u05D1\u05E2\u05D9\u05D9\u05EA \u05D7\u05D9\u05D1\u05D5\u05E8 \u05DC\u05E8\u05E9\u05EA",
          action: "\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D7\u05D9\u05D1\u05D5\u05E8 \u05D4\u05D0\u05D9\u05E0\u05D8\u05E8\u05E0\u05D8 \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1."
        },
        internal_error: {
          message: "\u05DE\u05E9\u05D4\u05D5 \u05D4\u05E9\u05EA\u05D1\u05E9 \u05D0\u05E6\u05DC\u05E0\u05D5",
          action: "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1. \u05D0\u05DD \u05D4\u05D1\u05E2\u05D9\u05D4 \u05E0\u05DE\u05E9\u05DB\u05EA, \u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05D4\u05EA\u05DE\u05D9\u05DB\u05D4."
        },
        database_error: {
          message: "\u05D4\u05E9\u05D9\u05E8\u05D5\u05EA \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF \u05D6\u05DE\u05E0\u05D9\u05EA",
          action: "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05DE\u05D0\u05D5\u05D7\u05E8 \u05D9\u05D5\u05EA\u05E8."
        },
        config_error: {
          message: "\u05E9\u05D2\u05D9\u05D0\u05EA \u05EA\u05E6\u05D5\u05E8\u05EA \u05E9\u05D9\u05E8\u05D5\u05EA",
          action: "\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05D4\u05EA\u05DE\u05D9\u05DB\u05D4 \u05DC\u05E7\u05D1\u05DC\u05EA \u05E1\u05D9\u05D5\u05E2."
        },
        unknown_error: {
          message: "\u05D0\u05D9\u05E8\u05E2\u05D4 \u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DC\u05EA\u05D9 \u05E6\u05E4\u05D5\u05D9\u05D4",
          action: "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05D0\u05D5 \u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05D4\u05EA\u05DE\u05D9\u05DB\u05D4 \u05D0\u05DD \u05D4\u05D1\u05E2\u05D9\u05D4 \u05E0\u05DE\u05E9\u05DB\u05EA."
        }
      },
      validation: {
        unknown_token_mint: "\u05D0\u05D6\u05D4\u05E8\u05D4: \u05DB\u05EA\u05D5\u05D1\u05EA mint \u05E9\u05DC \u05D8\u05D5\u05E7\u05DF \u05D0\u05D9\u05E0\u05D4 \u05DE\u05D5\u05DB\u05E8\u05EA. \u05D1\u05D3\u05D5\u05E7 \u05D4\u05D9\u05D8\u05D1 \u05E9\u05D6\u05D4\u05D5 \u05D4\u05D8\u05D5\u05E7\u05DF \u05D4\u05E0\u05DB\u05D5\u05DF \u05DB\u05D3\u05D9 \u05DC\u05DE\u05E0\u05D5\u05E2 \u05D0\u05D5\u05D1\u05D3\u05DF \u05DB\u05E1\u05E4\u05D9\u05DD.",
        token_typo_warning: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D4\u05D8\u05D5\u05E7\u05DF \u05D0\u05D9\u05E0\u05D4 \u05EA\u05D5\u05D0\u05DE\u05EA \u05DC\u2011stablecoins \u05D4\u05DE\u05D5\u05DB\u05E8\u05D9\u05DD (USDC, USDT, PYUSD, CASH). \u05D5\u05D3\u05D0 \u05D1\u05E7\u05E4\u05D9\u05D3\u05D4 \u05DB\u05D3\u05D9 \u05DC\u05DE\u05E0\u05D5\u05E2 \u05D0\u05D5\u05D1\u05D3\u05DF \u05DB\u05E1\u05E4\u05D9\u05DD \u05E7\u05D1\u05D5\u05E2."
      },
      wallet: {
        no_wallet_detected: "\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05D0\u05E8\u05E0\u05E7 Solana",
        install_wallet: "\u05D4\u05EA\u05E7\u05DF \u05D0\u05E8\u05E0\u05E7 Solana \u05DB\u05D2\u05D5\u05DF Phantom, Solflare \u05D0\u05D5 Backpack.",
        wallet_not_connected: "\u05D4\u05D0\u05E8\u05E0\u05E7 \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D7\u05D5\u05D1\u05E8",
        connect_your_wallet: "\u05D7\u05D1\u05E8 \u05D0\u05EA \u05D4\u05D0\u05E8\u05E0\u05E7 \u05E9\u05DC\u05DA \u05DB\u05D3\u05D9 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        wallet_connection_failed: "\u05D7\u05D9\u05D1\u05D5\u05E8 \u05D4\u05D0\u05E8\u05E0\u05E7 \u05E0\u05DB\u05E9\u05DC",
        try_again: "\u05E0\u05E1\u05D4 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05E9\u05D5\u05D1.",
        transaction_rejected: "\u05D4\u05E2\u05E1\u05E7\u05D4 \u05E0\u05D3\u05D7\u05EA\u05D4",
        approve_in_wallet: "\u05D0\u05E9\u05E8 \u05D0\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4 \u05D1\u05D0\u05E8\u05E0\u05E7 \u05E9\u05DC\u05DA \u05DB\u05D3\u05D9 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        select_wallet: "\u05D1\u05D7\u05E8 \u05D0\u05E8\u05E0\u05E7",
        change: "\u05E9\u05E0\u05D4"
      }
    };
  }
});

// src/i18n/translations/id.json
var require_id = __commonJS({
  "src/i18n/translations/id.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - Berkas sumber terjemahan (Bahasa Indonesia)",
      version: "1.0.0",
      locale: "id",
      ui: {
        pay_with_card: "Bayar dengan Kartu",
        pay_with_crypto: "Bayar dengan USDC",
        pay_with_usdc: "Bayar dengan USDC",
        purchase: "Beli",
        card: "Kartu",
        usdc_solana: "USDC (Solana)",
        crypto: "Kripto",
        connect_wallet: "Hubungkan wallet",
        connecting: "Menghubungkan...",
        processing: "Memproses...",
        loading: "Memuat...",
        close: "Tutup",
        cancel: "Batal",
        confirm: "Konfirmasi",
        retry: "Coba Lagi",
        go_back: "Kembali",
        contact_support: "Hubungi Dukungan",
        pay_with_credits: "Bayar dengan kredit",
        credits: "Kredit",
        disconnect: "Putuskan koneksi",
        payment_successful: "Pembayaran berhasil!",
        subscribe: "Berlangganan",
        subscribe_with_crypto: "Berlangganan dengan USDC",
        subscribe_with_credits: "Berlangganan dengan kredit",
        subscribed: "Berlangganan",
        subscribed_until: "Berlangganan hingga",
        subscription_active: "Langganan Anda aktif!",
        redirecting_to_checkout: "Mengalihkan ke checkout..."
      },
      errors: {
        invalid_payment_proof: {
          message: "Verifikasi pembayaran gagal",
          action: "Silakan coba bayar lagi. Jika terus terjadi, hubungi dukungan."
        },
        invalid_signature: {
          message: "Tanda tangan transaksi tidak valid",
          action: "Harap setujui transaksi di wallet Anda lalu coba lagi."
        },
        invalid_transaction: {
          message: "Format transaksi tidak valid",
          action: "Silakan coba bayar lagi. Jika terus terjadi, coba perbarui aplikasi wallet Anda."
        },
        transaction_not_found: {
          message: "Transaksi tidak ditemukan di blockchain",
          action: "Transaksi Anda mungkin masih diproses. Harap tunggu sebentar dan periksa wallet Anda, atau coba lagi."
        },
        transaction_not_confirmed: {
          message: "Transaksi masih diproses",
          action: "Harap tunggu hingga blockchain mengonfirmasi transaksi Anda, lalu coba lagi."
        },
        transaction_failed: {
          message: "Transaksi gagal di blockchain",
          action: "Periksa detail di wallet Anda. Anda mungkin perlu menyesuaikan pengaturan transaksi atau menambah SOL untuk biaya."
        },
        transaction_expired: {
          message: "Transaksi memerlukan waktu terlalu lama untuk diproses",
          action: "Silakan coba bayar lagi. Pertimbangkan untuk meningkatkan prioritas transaksi jika wallet Anda mendukungnya."
        },
        invalid_recipient: {
          message: "Pembayaran dikirim ke alamat yang salah",
          action: "Harap coba lagi dan pastikan Anda menyetujui transaksi yang benar di wallet."
        },
        invalid_sender: {
          message: "Wallet pengirim pembayaran tidak valid",
          action: "Silakan hubungkan kembali wallet Anda lalu coba lagi."
        },
        unauthorized_refund_issuer: {
          message: "Anda tidak berwenang melakukan pengembalian dana",
          action: "Hanya akun yang berwenang yang dapat memproses pengembalian dana. Hubungi dukungan jika Anda merasa ini kesalahan."
        },
        amount_below_minimum: {
          message: "Jumlah pembayaran terlalu rendah",
          action: "Harap periksa jumlah yang diperlukan lalu coba lagi."
        },
        amount_mismatch: {
          message: "Jumlah pembayaran tidak sesuai dengan penawaran",
          action: "Harga mungkin telah berubah. Segarkan halaman lalu coba bayar lagi."
        },
        insufficient_funds_sol: {
          message: "SOL tidak cukup untuk biaya transaksi",
          action: "Tambahkan setidaknya 0.001 SOL ke wallet Anda untuk menutup biaya jaringan, lalu coba lagi."
        },
        insufficient_funds_token: {
          message: "Saldo di wallet Anda tidak mencukupi",
          action: "Tambahkan dana ke wallet Anda lalu coba lagi."
        },
        invalid_token_mint: {
          message: "Token pembayaran salah",
          action: "Harap bayar dengan token yang benar seperti yang ditampilkan pada detail pembayaran."
        },
        not_spl_transfer: {
          message: "Transaksi bukan transfer token yang valid",
          action: "Pastikan Anda mengirim jenis token yang benar dari wallet Anda."
        },
        missing_token_account: {
          message: "Akun token tidak ditemukan",
          action: "Wallet Anda mungkin perlu membuat akun token terlebih dahulu. Coba lagi atau gunakan wallet lain."
        },
        invalid_token_program: {
          message: "Program token tidak valid",
          action: "Silakan coba bayar lagi. Jika terus terjadi, coba gunakan wallet lain."
        },
        missing_memo: {
          message: "Memo pembayaran diperlukan tetapi tidak disertakan",
          action: "Silakan coba bayar lagi dan pastikan detail transaksi disetujui di wallet Anda."
        },
        invalid_memo: {
          message: "Format memo pembayaran tidak valid",
          action: "Silakan coba bayar lagi."
        },
        payment_already_used: {
          message: "Pembayaran ini sudah diproses",
          action: "Periksa riwayat transaksi Anda. Jika perlu melakukan pembayaran lain, mulai transaksi baru."
        },
        signature_reused: {
          message: "Tanda tangan transaksi sudah digunakan",
          action: "Harap buat transaksi pembayaran baru."
        },
        quote_expired: {
          message: "Penawaran pembayaran telah kedaluwarsa",
          action: "Harga diperbarui secara berkala. Segarkan halaman lalu coba bayar lagi."
        },
        missing_field: {
          message: "Informasi wajib hilang",
          action: "Silakan periksa semua kolom yang diperlukan lalu coba lagi."
        },
        invalid_field: {
          message: "Beberapa informasi tidak valid",
          action: "Harap periksa input Anda dan coba lagi."
        },
        invalid_amount: {
          message: "Jumlah pembayaran tidak valid",
          action: "Harap periksa jumlahnya lalu coba lagi."
        },
        invalid_wallet: {
          message: "Alamat wallet tidak valid",
          action: "Harap hubungkan kembali wallet Anda lalu coba lagi."
        },
        invalid_resource: {
          message: "Pilihan item tidak valid",
          action: "Silakan segarkan halaman dan coba lagi."
        },
        invalid_coupon: {
          message: "Kode kupon tidak valid",
          action: "Silakan periksa kode kupon lalu coba lagi."
        },
        invalid_cart_item: {
          message: "Satu atau lebih item di keranjang tidak valid",
          action: "Silakan periksa keranjang Anda lalu coba lagi."
        },
        empty_cart: {
          message: "Keranjang Anda kosong",
          action: "Silakan tambahkan item ke keranjang sebelum checkout."
        },
        resource_not_found: {
          message: "Item tidak ditemukan",
          action: "Item ini mungkin sudah tidak tersedia. Silakan segarkan halaman dan coba lagi."
        },
        cart_not_found: {
          message: "Keranjang belanja tidak ditemukan",
          action: "Keranjang Anda mungkin telah kedaluwarsa. Harap mulai pesanan baru."
        },
        refund_not_found: {
          message: "Pengembalian dana tidak ditemukan",
          action: "Harap periksa nomor referensi pengembalian dana Anda atau hubungi dukungan."
        },
        product_not_found: {
          message: "Produk tidak tersedia",
          action: "Produk ini mungkin sudah tidak tersedia. Silakan telusuri pilihan kami saat ini."
        },
        coupon_not_found: {
          message: "Kode kupon tidak ditemukan",
          action: "Silakan periksa kode kupon atau hapus untuk melanjutkan."
        },
        session_not_found: {
          message: "Sesi pembayaran kedaluwarsa",
          action: "Silakan mulai pembayaran baru."
        },
        cart_already_paid: {
          message: "Pesanan ini sudah dibayar",
          action: "Periksa riwayat pesanan Anda. Jika ingin membeli lagi, mulai pesanan baru."
        },
        refund_already_processed: {
          message: "Pengembalian dana ini sudah diproses",
          action: "Periksa riwayat transaksi Anda atau hubungi dukungan untuk detailnya."
        },
        coupon_expired: {
          message: "Kupon telah kedaluwarsa",
          action: "Harap hapus kode kupon atau gunakan kode lain."
        },
        coupon_usage_limit_reached: {
          message: "Batas penggunaan kupon telah tercapai",
          action: "Kupon ini telah digunakan sepenuhnya. Silakan coba kode lain."
        },
        coupon_not_applicable: {
          message: "Kupon tidak dapat diterapkan pada pembelian ini",
          action: "Harap periksa syarat kupon atau hapus untuk melanjutkan."
        },
        coupon_wrong_payment_method: {
          message: "Kupon tidak berlaku untuk metode pembayaran ini",
          action: "Coba metode pembayaran lain atau hapus kode kupon."
        },
        stripe_error: {
          message: "Layanan pembayaran kartu untuk sementara tidak tersedia",
          action: "Silakan coba lagi sebentar lagi, atau gunakan pembayaran kripto."
        },
        rpc_error: {
          message: "Jaringan blockchain untuk sementara tidak tersedia",
          action: "Silakan coba lagi sebentar lagi, atau gunakan pembayaran kartu."
        },
        network_error: {
          message: "Masalah koneksi jaringan",
          action: "Harap periksa koneksi internet Anda lalu coba lagi."
        },
        internal_error: {
          message: "Terjadi kesalahan pada pihak kami",
          action: "Silakan coba lagi. Jika terus berlanjut, hubungi dukungan."
        },
        database_error: {
          message: "Layanan untuk sementara tidak tersedia",
          action: "Silakan coba lagi nanti."
        },
        config_error: {
          message: "Kesalahan konfigurasi layanan",
          action: "Harap hubungi dukungan untuk bantuan."
        },
        unknown_error: {
          message: "Terjadi kesalahan tak terduga",
          action: "Silakan coba lagi atau hubungi dukungan jika ini berlanjut."
        }
      },
      validation: {
        unknown_token_mint: "Peringatan: Alamat mint token tidak dikenali. Periksa kembali bahwa ini token yang benar untuk mencegah kehilangan dana.",
        token_typo_warning: "Alamat token tidak cocok dengan stablecoin yang dikenal (USDC, USDT, PYUSD, CASH). Verifikasi dengan saksama untuk mencegah kehilangan dana permanen."
      },
      wallet: {
        no_wallet_detected: "Tidak ada wallet Solana terdeteksi",
        install_wallet: "Harap instal wallet Solana seperti Phantom, Solflare, atau Backpack.",
        wallet_not_connected: "Wallet belum terhubung",
        connect_your_wallet: "Harap hubungkan wallet Anda untuk melanjutkan.",
        wallet_connection_failed: "Gagal menghubungkan wallet",
        try_again: "Silakan coba hubungkan lagi.",
        transaction_rejected: "Transaksi ditolak",
        approve_in_wallet: "Harap setujui transaksi di wallet Anda untuk melanjutkan.",
        select_wallet: "Pilih dompet",
        change: "Ubah"
      }
    };
  }
});

// src/i18n/translations/hi.json
var require_hi = __commonJS({
  "src/i18n/translations/hi.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \u0905\u0928\u0941\u0935\u093E\u0926 \u0938\u094D\u0930\u094B\u0924 \u092B\u093C\u093E\u0907\u0932 (\u0939\u093F\u0902\u0926\u0940)",
      version: "1.0.0",
      locale: "hi",
      ui: {
        pay_with_card: "\u0915\u093E\u0930\u094D\u0921 \u0938\u0947 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0930\u0947\u0902",
        pay_with_crypto: "USDC \u0938\u0947 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0930\u0947\u0902",
        pay_with_usdc: "USDC \u0938\u0947 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0930\u0947\u0902",
        purchase: "\u0916\u0930\u0940\u0926\u0947\u0902",
        card: "\u0915\u093E\u0930\u094D\u0921",
        usdc_solana: "USDC (Solana)",
        crypto: "\u0915\u094D\u0930\u093F\u092A\u094D\u091F\u094B",
        connect_wallet: "\u0935\u0949\u0932\u0947\u091F \u0915\u0928\u0947\u0915\u094D\u091F \u0915\u0930\u0947\u0902",
        connecting: "\u0915\u0928\u0947\u0915\u094D\u091F \u0939\u094B \u0930\u0939\u093E \u0939\u0948...",
        processing: "\u092A\u094D\u0930\u0938\u0902\u0938\u094D\u0915\u0930\u0923 \u091C\u093E\u0930\u0940 \u0939\u0948...",
        loading: "\u0932\u094B\u0921 \u0939\u094B \u0930\u0939\u093E \u0939\u0948...",
        close: "\u092C\u0902\u0926 \u0915\u0930\u0947\u0902",
        cancel: "\u0930\u0926\u094D\u0926 \u0915\u0930\u0947\u0902",
        confirm: "\u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0930\u0947\u0902",
        retry: "\u092B\u093F\u0930 \u0938\u0947 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902",
        go_back: "\u0935\u093E\u092A\u0938 \u091C\u093E\u090F\u0901",
        contact_support: "\u0938\u092E\u0930\u094D\u0925\u0928 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902",
        pay_with_credits: "\u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0938\u0947 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0930\u0947\u0902",
        credits: "\u0915\u094D\u0930\u0947\u0921\u093F\u091F",
        disconnect: "\u0921\u093F\u0938\u094D\u0915\u0928\u0947\u0915\u094D\u091F \u0915\u0930\u0947\u0902",
        payment_successful: "\u092D\u0941\u0917\u0924\u093E\u0928 \u0938\u092B\u0932 \u0930\u0939\u093E!",
        subscribe: "\u0938\u0926\u0938\u094D\u092F\u0924\u093E \u0932\u0947\u0902",
        subscribe_with_crypto: "USDC \u0938\u0947 \u0938\u0926\u0938\u094D\u092F\u0924\u093E \u0932\u0947\u0902",
        subscribe_with_credits: "\u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0938\u0947 \u0938\u0926\u0938\u094D\u092F\u0924\u093E \u0932\u0947\u0902",
        subscribed: "\u0938\u0926\u0938\u094D\u092F\u0924\u093E \u0932\u0940 \u0917\u0908",
        subscribed_until: "\u0924\u0915 \u0938\u0926\u0938\u094D\u092F\u0924\u093E",
        subscription_active: "\u0906\u092A\u0915\u0940 \u0938\u0926\u0938\u094D\u092F\u0924\u093E \u0938\u0915\u094D\u0930\u093F\u092F \u0939\u0948!",
        redirecting_to_checkout: "\u091A\u0947\u0915\u0906\u0909\u091F \u092A\u0930 \u092D\u0947\u091C\u093E \u091C\u093E \u0930\u0939\u093E \u0939\u0948..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\u092D\u0941\u0917\u0924\u093E\u0928 \u0938\u0924\u094D\u092F\u093E\u092A\u0928 \u0935\u093F\u092B\u0932",
          action: "\u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u093E \u092D\u0941\u0917\u0924\u093E\u0928 \u092B\u093F\u0930 \u0938\u0947 \u0906\u091C\u093C\u092E\u093E\u090F\u0901\u0964 \u092F\u0926\u093F \u0938\u092E\u0938\u094D\u092F\u093E \u091C\u093E\u0930\u0940 \u0930\u0939\u0924\u0940 \u0939\u0948, \u0924\u094B \u0938\u092E\u0930\u094D\u0925\u0928 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964"
        },
        invalid_signature: {
          message: "\u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0915\u093E \u0939\u0938\u094D\u0924\u093E\u0915\u094D\u0937\u0930 \u0905\u092E\u093E\u0928\u094D\u092F \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u0947 \u0935\u0949\u0932\u0947\u091F \u092E\u0947\u0902 \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0915\u094B \u0905\u0928\u0941\u092E\u094B\u0926\u093F\u0924 \u0915\u0930\u0947\u0902 \u0914\u0930 \u092B\u093F\u0930 \u0938\u0947 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        invalid_transaction: {
          message: "\u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0915\u093E \u092A\u094D\u0930\u093E\u0930\u0942\u092A \u0905\u092E\u093E\u0928\u094D\u092F \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u093E \u092D\u0941\u0917\u0924\u093E\u0928 \u092B\u093F\u0930 \u0938\u0947 \u0906\u091C\u093C\u092E\u093E\u090F\u0901\u0964 \u092F\u0926\u093F \u092F\u0939 \u091C\u093E\u0930\u0940 \u0930\u0939\u0924\u093E \u0939\u0948, \u0924\u094B \u0905\u092A\u0928\u0947 \u0935\u0949\u0932\u0947\u091F \u0910\u092A \u0915\u094B \u0905\u092A\u0921\u0947\u091F \u0915\u0930\u0928\u0947 \u0915\u093E \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        transaction_not_found: {
          message: "\u092C\u094D\u0932\u0949\u0915\u091A\u0947\u0928 \u092A\u0930 \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E",
          action: "\u0906\u092A\u0915\u093E \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0905\u092D\u0940 \u092D\u0940 \u092A\u094D\u0930\u094B\u0938\u0947\u0938 \u0939\u094B \u0930\u0939\u093E \u0939\u094B \u0938\u0915\u0924\u093E \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0915\u0941\u091B \u0915\u094D\u0937\u0923 \u092A\u094D\u0930\u0924\u0940\u0915\u094D\u0937\u093E \u0915\u0930\u0947\u0902 \u0914\u0930 \u0905\u092A\u0928\u093E \u0935\u0949\u0932\u0947\u091F \u091C\u093E\u0901\u091A\u0947\u0902, \u092F\u093E \u092B\u093F\u0930 \u0938\u0947 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        transaction_not_confirmed: {
          message: "\u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0905\u092D\u0940 \u092D\u0940 \u092A\u094D\u0930\u094B\u0938\u0947\u0938 \u0939\u094B \u0930\u0939\u093E \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u092C\u094D\u0932\u0949\u0915\u091A\u0947\u0928 \u0926\u094D\u0935\u093E\u0930\u093E \u092A\u0941\u0937\u094D\u091F\u093F \u0939\u094B\u0928\u0947 \u0924\u0915 \u092A\u094D\u0930\u0924\u0940\u0915\u094D\u0937\u093E \u0915\u0930\u0947\u0902, \u092B\u093F\u0930 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        transaction_failed: {
          message: "\u092C\u094D\u0932\u0949\u0915\u091A\u0947\u0928 \u092A\u0930 \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0935\u093F\u092B\u0932 \u0939\u0941\u0906",
          action: "\u0935\u093F\u0935\u0930\u0923 \u0915\u0947 \u0932\u093F\u090F \u0905\u092A\u0928\u093E \u0935\u0949\u0932\u0947\u091F \u0926\u0947\u0916\u0947\u0902\u0964 \u0906\u092A\u0915\u094B \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938 \u0938\u092E\u093E\u092F\u094B\u091C\u093F\u0924 \u0915\u0930\u0928\u0940 \u092A\u0921\u093C \u0938\u0915\u0924\u0940 \u0939\u0948\u0902 \u092F\u093E \u0936\u0941\u0932\u094D\u0915 \u0915\u0947 \u0932\u093F\u090F \u0905\u0927\u093F\u0915 SOL \u091C\u094B\u0921\u093C\u0928\u093E \u092A\u0921\u093C \u0938\u0915\u0924\u093E \u0939\u0948\u0964"
        },
        transaction_expired: {
          message: "\u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0915\u094B \u092A\u094D\u0930\u094B\u0938\u0947\u0938 \u0939\u094B\u0928\u0947 \u092E\u0947\u0902 \u092C\u0939\u0941\u0924 \u0938\u092E\u092F \u0932\u0917\u093E",
          action: "\u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u093E \u092D\u0941\u0917\u0924\u093E\u0928 \u092B\u093F\u0930 \u0938\u0947 \u0915\u0930\u0947\u0902\u0964 \u092F\u0926\u093F \u0906\u092A\u0915\u093E \u0935\u0949\u0932\u0947\u091F \u0938\u092E\u0930\u094D\u0925\u0928 \u0915\u0930\u0924\u093E \u0939\u0948, \u0924\u094B \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0915\u0940 \u092A\u094D\u0930\u093E\u0925\u092E\u093F\u0915\u0924\u093E \u092C\u0922\u093C\u093E\u0928\u0947 \u092A\u0930 \u0935\u093F\u091A\u093E\u0930 \u0915\u0930\u0947\u0902\u0964"
        },
        invalid_recipient: {
          message: "\u092D\u0941\u0917\u0924\u093E\u0928 \u0917\u0932\u0924 \u092A\u0924\u0947 \u092A\u0930 \u092D\u0947\u091C\u093E \u0917\u092F\u093E",
          action: "\u0915\u0943\u092A\u092F\u093E \u0926\u094B\u092C\u093E\u0930\u093E \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0938\u0941\u0928\u093F\u0936\u094D\u091A\u093F\u0924 \u0915\u0930\u0947\u0902 \u0915\u093F \u0906\u092A \u0905\u092A\u0928\u0947 \u0935\u0949\u0932\u0947\u091F \u092E\u0947\u0902 \u0938\u0939\u0940 \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0915\u094B \u0905\u0928\u0941\u092E\u094B\u0926\u093F\u0924 \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964"
        },
        invalid_sender: {
          message: "\u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u093E \u092A\u094D\u0930\u0947\u0937\u0915 \u0935\u0949\u0932\u0947\u091F \u0905\u092E\u093E\u0928\u094D\u092F \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u093E \u0935\u0949\u0932\u0947\u091F \u092B\u093F\u0930 \u0938\u0947 \u0915\u0928\u0947\u0915\u094D\u091F \u0915\u0930\u0947\u0902 \u0914\u0930 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        unauthorized_refund_issuer: {
          message: "\u0906\u092A \u0930\u093F\u092B\u0902\u0921 \u091C\u093E\u0930\u0940 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0905\u0927\u093F\u0915\u0943\u0924 \u0928\u0939\u0940\u0902 \u0939\u0948\u0902",
          action: "\u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0916\u093E\u0924\u0947 \u0930\u093F\u092B\u0902\u0921 \u092A\u094D\u0930\u094B\u0938\u0947\u0938 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964 \u092F\u0926\u093F \u0906\u092A\u0915\u094B \u0932\u0917\u0924\u093E \u0939\u0948 \u0915\u093F \u092F\u0939 \u0924\u094D\u0930\u0941\u091F\u093F \u0939\u0948, \u0924\u094B \u0938\u092E\u0930\u094D\u0925\u0928 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964"
        },
        amount_below_minimum: {
          message: "\u092D\u0941\u0917\u0924\u093E\u0928 \u0930\u093E\u0936\u093F \u092C\u0939\u0941\u0924 \u0915\u092E \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0906\u0935\u0936\u094D\u092F\u0915 \u0930\u093E\u0936\u093F \u091C\u093E\u0901\u091A\u0947\u0902 \u0914\u0930 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        amount_mismatch: {
          message: "\u092D\u0941\u0917\u0924\u093E\u0928 \u0930\u093E\u0936\u093F \u0909\u0926\u094D\u0927\u0930\u0923 \u0938\u0947 \u092E\u0947\u0932 \u0928\u0939\u0940\u0902 \u0916\u093E\u0924\u0940",
          action: "\u0915\u0940\u092E\u0924 \u092C\u0926\u0932 \u0917\u0908 \u0939\u094B \u0938\u0915\u0924\u0940 \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u092A\u0947\u091C \u0930\u0940\u092B\u093C\u094D\u0930\u0947\u0936 \u0915\u0930\u0947\u0902 \u0914\u0930 \u092D\u0941\u0917\u0924\u093E\u0928 \u092B\u093F\u0930 \u0938\u0947 \u0915\u0930\u0947\u0902\u0964"
        },
        insufficient_funds_sol: {
          message: "\u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0936\u0941\u0932\u094D\u0915 \u0915\u0947 \u0932\u093F\u090F \u092A\u0930\u094D\u092F\u093E\u092A\u094D\u0924 SOL \u0928\u0939\u0940\u0902 \u0939\u0948",
          action: "\u0928\u0947\u091F\u0935\u0930\u094D\u0915 \u0936\u0941\u0932\u094D\u0915 \u0915\u0935\u0930 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0905\u092A\u0928\u0947 \u0935\u0949\u0932\u0947\u091F \u092E\u0947\u0902 \u0915\u092E \u0938\u0947 \u0915\u092E 0.001 SOL \u091C\u094B\u0921\u093C\u0947\u0902, \u092B\u093F\u0930 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        insufficient_funds_token: {
          message: "\u0906\u092A\u0915\u0947 \u0935\u0949\u0932\u0947\u091F \u092E\u0947\u0902 \u0905\u092A\u0930\u094D\u092F\u093E\u092A\u094D\u0924 \u0936\u0947\u0937 \u0930\u093E\u0936\u093F",
          action: "\u0905\u092A\u0928\u0947 \u0935\u0949\u0932\u0947\u091F \u092E\u0947\u0902 \u0914\u0930 \u0927\u0928\u0930\u093E\u0936\u093F \u091C\u094B\u0921\u093C\u0947\u0902 \u0914\u0930 \u092B\u093F\u0930 \u0938\u0947 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        invalid_token_mint: {
          message: "\u0917\u0932\u0924 \u092D\u0941\u0917\u0924\u093E\u0928 \u091F\u094B\u0915\u0928",
          action: "\u0915\u0943\u092A\u092F\u093E \u092D\u0941\u0917\u0924\u093E\u0928 \u0935\u093F\u0935\u0930\u0923 \u092E\u0947\u0902 \u0926\u093F\u0916\u093E\u090F \u0905\u0928\u0941\u0938\u093E\u0930 \u0938\u0939\u0940 \u091F\u094B\u0915\u0928 \u0938\u0947 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0930\u0947\u0902\u0964"
        },
        not_spl_transfer: {
          message: "\u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u092E\u093E\u0928\u094D\u092F \u091F\u094B\u0915\u0928 \u091F\u094D\u0930\u093E\u0902\u0938\u092B\u093C\u0930 \u0928\u0939\u0940\u0902 \u0939\u0948",
          action: "\u0938\u0941\u0928\u093F\u0936\u094D\u091A\u093F\u0924 \u0915\u0930\u0947\u0902 \u0915\u093F \u0906\u092A \u0905\u092A\u0928\u0947 \u0935\u0949\u0932\u0947\u091F \u0938\u0947 \u0938\u0939\u0940 \u092A\u094D\u0930\u0915\u093E\u0930 \u0915\u093E \u091F\u094B\u0915\u0928 \u092D\u0947\u091C \u0930\u0939\u0947 \u0939\u0948\u0902\u0964"
        },
        missing_token_account: {
          message: "\u091F\u094B\u0915\u0928 \u0916\u093E\u0924\u093E \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E",
          action: "\u0906\u092A\u0915\u0947 \u0935\u0949\u0932\u0947\u091F \u0915\u094B \u092A\u0939\u0932\u0947 \u091F\u094B\u0915\u0928 \u0916\u093E\u0924\u093E \u092C\u0928\u093E\u0928\u093E \u092A\u0921\u093C \u0938\u0915\u0924\u093E \u0939\u0948\u0964 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902 \u092F\u093E \u0915\u094B\u0908 \u0905\u0928\u094D\u092F \u0935\u0949\u0932\u0947\u091F \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964"
        },
        invalid_token_program: {
          message: "\u091F\u094B\u0915\u0928 \u092A\u094D\u0930\u094B\u0917\u094D\u0930\u093E\u092E \u0905\u092E\u093E\u0928\u094D\u092F \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u092D\u0941\u0917\u0924\u093E\u0928 \u092B\u093F\u0930 \u0938\u0947 \u0906\u091C\u093C\u092E\u093E\u090F\u0901\u0964 \u092F\u0926\u093F \u0938\u092E\u0938\u094D\u092F\u093E \u091C\u093E\u0930\u0940 \u0930\u0939\u0924\u0940 \u0939\u0948, \u0924\u094B \u0915\u094B\u0908 \u0905\u0928\u094D\u092F \u0935\u0949\u0932\u0947\u091F \u0906\u091C\u093C\u092E\u093E\u090F\u0901\u0964"
        },
        missing_memo: {
          message: "\u092D\u0941\u0917\u0924\u093E\u0928 \u092E\u0947\u092E\u094B \u0906\u0935\u0936\u094D\u092F\u0915 \u0939\u0948, \u0932\u0947\u0915\u093F\u0928 \u0936\u093E\u092E\u093F\u0932 \u0928\u0939\u0940\u0902 \u0915\u093F\u092F\u093E \u0917\u092F\u093E",
          action: "\u0915\u0943\u092A\u092F\u093E \u092D\u0941\u0917\u0924\u093E\u0928 \u092B\u093F\u0930 \u0938\u0947 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0938\u0941\u0928\u093F\u0936\u094D\u091A\u093F\u0924 \u0915\u0930\u0947\u0902 \u0915\u093F \u0906\u092A\u0928\u0947 \u0905\u092A\u0928\u0947 \u0935\u0949\u0932\u0947\u091F \u092E\u0947\u0902 \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0935\u093F\u0935\u0930\u0923 \u0905\u0928\u0941\u092E\u094B\u0926\u093F\u0924 \u0915\u093F\u090F \u0939\u0948\u0902\u0964"
        },
        invalid_memo: {
          message: "\u092D\u0941\u0917\u0924\u093E\u0928 \u092E\u0947\u092E\u094B \u0915\u093E \u092A\u094D\u0930\u093E\u0930\u0942\u092A \u0905\u092E\u093E\u0928\u094D\u092F \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u093E \u092D\u0941\u0917\u0924\u093E\u0928 \u092B\u093F\u0930 \u0938\u0947 \u0915\u0930\u0947\u0902\u0964"
        },
        payment_already_used: {
          message: "\u092F\u0939 \u092D\u0941\u0917\u0924\u093E\u0928 \u092A\u0939\u0932\u0947 \u0939\u0940 \u092A\u094D\u0930\u094B\u0938\u0947\u0938 \u0939\u094B \u091A\u0941\u0915\u093E \u0939\u0948",
          action: "\u0905\u092A\u0928\u093E \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0907\u0924\u093F\u0939\u093E\u0938 \u091C\u093E\u0901\u091A\u0947\u0902\u0964 \u092F\u0926\u093F \u0906\u092A\u0915\u094B \u092B\u093F\u0930 \u0938\u0947 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0930\u0928\u093E \u0939\u0948, \u0924\u094B \u0928\u0908 \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902\u0964"
        },
        signature_reused: {
          message: "\u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0939\u0938\u094D\u0924\u093E\u0915\u094D\u0937\u0930 \u092A\u0939\u0932\u0947 \u0939\u0940 \u0909\u092A\u092F\u094B\u0917 \u0915\u093F\u092F\u093E \u091C\u093E \u091A\u0941\u0915\u093E \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0928\u0908 \u092D\u0941\u0917\u0924\u093E\u0928 \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u092C\u0928\u093E\u090F\u0901\u0964"
        },
        quote_expired: {
          message: "\u092D\u0941\u0917\u0924\u093E\u0928 \u0909\u0926\u094D\u0927\u0930\u0923 \u0915\u0940 \u0938\u092E\u092F\u2011\u0938\u0940\u092E\u093E \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u0917\u0908",
          action: "\u0915\u0940\u092E\u0924\u0947\u0902 \u0905\u0915\u094D\u0938\u0930 \u0905\u092A\u0921\u0947\u091F \u0939\u094B\u0924\u0940 \u0939\u0948\u0902\u0964 \u0915\u0943\u092A\u092F\u093E \u092A\u0947\u091C \u0930\u0940\u092B\u093C\u094D\u0930\u0947\u0936 \u0915\u0930\u0947\u0902 \u0914\u0930 \u092B\u093F\u0930 \u0938\u0947 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0930\u0947\u0902\u0964"
        },
        missing_field: {
          message: "\u0906\u0935\u0936\u094D\u092F\u0915 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0905\u0928\u0941\u092A\u0932\u092C\u094D\u0927 \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0938\u092D\u0940 \u0906\u0935\u0936\u094D\u092F\u0915 \u092B\u093C\u0940\u0932\u094D\u0921 \u091C\u093E\u0901\u091A\u0947\u0902 \u0914\u0930 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        invalid_field: {
          message: "\u0915\u0941\u091B \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0905\u092E\u093E\u0928\u094D\u092F \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u0940 \u0907\u0928\u092A\u0941\u091F \u091C\u093E\u0901\u091A\u0947\u0902 \u0914\u0930 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        invalid_amount: {
          message: "\u092D\u0941\u0917\u0924\u093E\u0928 \u0930\u093E\u0936\u093F \u0905\u092E\u093E\u0928\u094D\u092F \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0930\u093E\u0936\u093F \u091C\u093E\u0901\u091A\u0947\u0902 \u0914\u0930 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        invalid_wallet: {
          message: "\u0935\u0949\u0932\u0947\u091F \u092A\u0924\u093E \u0905\u092E\u093E\u0928\u094D\u092F \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u093E \u0935\u0949\u0932\u0947\u091F \u092B\u093F\u0930 \u0938\u0947 \u0915\u0928\u0947\u0915\u094D\u091F \u0915\u0930\u0947\u0902 \u0914\u0930 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        invalid_resource: {
          message: "\u0906\u0907\u091F\u092E \u0915\u093E \u091A\u092F\u0928 \u0905\u092E\u093E\u0928\u094D\u092F \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u092A\u0947\u091C \u0930\u0940\u092B\u093C\u094D\u0930\u0947\u0936 \u0915\u0930\u0947\u0902 \u0914\u0930 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        invalid_coupon: {
          message: "\u0905\u092E\u093E\u0928\u094D\u092F \u0915\u0942\u092A\u0928 \u0915\u094B\u0921",
          action: "\u0915\u0943\u092A\u092F\u093E \u0915\u0942\u092A\u0928 \u0915\u094B\u0921 \u091C\u093E\u0901\u091A\u0947\u0902 \u0914\u0930 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        invalid_cart_item: {
          message: "\u0915\u093E\u0930\u094D\u091F \u092E\u0947\u0902 \u090F\u0915 \u092F\u093E \u0905\u0927\u093F\u0915 \u0906\u0907\u091F\u092E \u0905\u092E\u093E\u0928\u094D\u092F \u0939\u0948\u0902",
          action: "\u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u093E \u0915\u093E\u0930\u094D\u091F \u091C\u093E\u0901\u091A\u0947\u0902 \u0914\u0930 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        empty_cart: {
          message: "\u0906\u092A\u0915\u093E \u0915\u093E\u0930\u094D\u091F \u0916\u093E\u0932\u0940 \u0939\u0948",
          action: "\u091A\u0947\u0915\u0906\u0909\u091F \u0938\u0947 \u092A\u0939\u0932\u0947 \u0915\u0943\u092A\u092F\u093E \u0915\u093E\u0930\u094D\u091F \u092E\u0947\u0902 \u0906\u0907\u091F\u092E \u091C\u094B\u0921\u093C\u0947\u0902\u0964"
        },
        resource_not_found: {
          message: "\u0906\u0907\u091F\u092E \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E",
          action: "\u092F\u0939 \u0906\u0907\u091F\u092E \u0905\u092C \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u0924\u093E \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u092A\u0947\u091C \u0930\u0940\u092B\u093C\u094D\u0930\u0947\u0936 \u0915\u0930\u0947\u0902 \u0914\u0930 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        cart_not_found: {
          message: "\u0936\u0949\u092A\u093F\u0902\u0917 \u0915\u093E\u0930\u094D\u091F \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E",
          action: "\u0906\u092A\u0915\u093E \u0915\u093E\u0930\u094D\u091F \u0938\u0902\u092D\u0935\u0924\u0903 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u0917\u092F\u093E \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0928\u092F\u093E \u0911\u0930\u094D\u0921\u0930 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902\u0964"
        },
        refund_not_found: {
          message: "\u0930\u093F\u092B\u0902\u0921 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E",
          action: "\u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u093E \u0930\u093F\u092B\u0902\u0921 \u0938\u0902\u0926\u0930\u094D\u092D \u0928\u0902\u092C\u0930 \u091C\u093E\u0901\u091A\u0947\u0902 \u092F\u093E \u0938\u092E\u0930\u094D\u0925\u0928 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964"
        },
        product_not_found: {
          message: "\u0909\u0924\u094D\u092A\u093E\u0926 \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948",
          action: "\u092F\u0939 \u0909\u0924\u094D\u092A\u093E\u0926 \u0905\u092C \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u0924\u093E \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0939\u092E\u093E\u0930\u0940 \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u0938\u0942\u091A\u0940 \u092C\u094D\u0930\u093E\u0909\u091C\u093C \u0915\u0930\u0947\u0902\u0964"
        },
        coupon_not_found: {
          message: "\u0915\u0942\u092A\u0928 \u0915\u094B\u0921 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E",
          action: "\u0915\u0943\u092A\u092F\u093E \u0915\u094B\u0921 \u091C\u093E\u0901\u091A\u0947\u0902 \u092F\u093E \u0906\u0917\u0947 \u092C\u0922\u093C\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0909\u0938\u0947 \u0939\u091F\u093E\u090F\u0901\u0964"
        },
        session_not_found: {
          message: "\u092D\u0941\u0917\u0924\u093E\u0928 \u0938\u0924\u094D\u0930 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u0917\u092F\u093E",
          action: "\u0915\u0943\u092A\u092F\u093E \u0928\u092F\u093E \u092D\u0941\u0917\u0924\u093E\u0928 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902\u0964"
        },
        cart_already_paid: {
          message: "\u0907\u0938 \u0911\u0930\u094D\u0921\u0930 \u0915\u093E \u092D\u0941\u0917\u0924\u093E\u0928 \u092A\u0939\u0932\u0947 \u0939\u0940 \u0939\u094B \u091A\u0941\u0915\u093E \u0939\u0948",
          action: "\u0905\u092A\u0928\u093E \u0911\u0930\u094D\u0921\u0930 \u0907\u0924\u093F\u0939\u093E\u0938 \u091C\u093E\u0901\u091A\u0947\u0902\u0964 \u092F\u0926\u093F \u0906\u092A\u0915\u094B \u0926\u0942\u0938\u0930\u0940 \u0916\u0930\u0940\u0926 \u0915\u0930\u0928\u0940 \u0939\u0948, \u0924\u094B \u0928\u092F\u093E \u0911\u0930\u094D\u0921\u0930 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902\u0964"
        },
        refund_already_processed: {
          message: "\u092F\u0939 \u0930\u093F\u092B\u0902\u0921 \u092A\u0939\u0932\u0947 \u0939\u0940 \u092A\u094D\u0930\u094B\u0938\u0947\u0938 \u0915\u093F\u092F\u093E \u091C\u093E \u091A\u0941\u0915\u093E \u0939\u0948",
          action: "\u0905\u092A\u0928\u093E \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0907\u0924\u093F\u0939\u093E\u0938 \u091C\u093E\u0901\u091A\u0947\u0902 \u092F\u093E \u0905\u0927\u093F\u0915 \u0935\u093F\u0935\u0930\u0923 \u0915\u0947 \u0932\u093F\u090F \u0938\u092E\u0930\u094D\u0925\u0928 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964"
        },
        coupon_expired: {
          message: "\u0915\u0942\u092A\u0928 \u0915\u0940 \u0938\u092E\u092F\u2011\u0938\u0940\u092E\u093E \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u0917\u0908 \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0915\u0942\u092A\u0928 \u0915\u094B \u0939\u091F\u093E\u090F\u0901 \u092F\u093E \u0915\u094B\u0908 \u0926\u0942\u0938\u0930\u093E \u0915\u094B\u0921 \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964"
        },
        coupon_usage_limit_reached: {
          message: "\u0915\u0942\u092A\u0928 \u0909\u092A\u092F\u094B\u0917 \u0938\u0940\u092E\u093E \u092A\u0942\u0930\u0940 \u0939\u094B \u0917\u0908 \u0939\u0948",
          action: "\u092F\u0939 \u0915\u0942\u092A\u0928 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0930\u093F\u0921\u0940\u092E \u0915\u093F\u092F\u093E \u091C\u093E \u091A\u0941\u0915\u093E \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0915\u094B\u0908 \u0926\u0942\u0938\u0930\u093E \u0915\u094B\u0921 \u0906\u091C\u093C\u092E\u093E\u090F\u0901\u0964"
        },
        coupon_not_applicable: {
          message: "\u092F\u0939 \u0915\u0942\u092A\u0928 \u0907\u0938 \u0916\u0930\u0940\u0926 \u092A\u0930 \u0932\u093E\u0917\u0942 \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u093E",
          action: "\u0915\u0943\u092A\u092F\u093E \u0915\u0942\u092A\u0928 \u0915\u0940 \u0936\u0930\u094D\u0924\u0947\u0902 \u091C\u093E\u0901\u091A\u0947\u0902 \u092F\u093E \u0906\u0917\u0947 \u092C\u0922\u093C\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0907\u0938\u0947 \u0939\u091F\u093E\u090F\u0901\u0964"
        },
        coupon_wrong_payment_method: {
          message: "\u092F\u0939 \u0915\u0942\u092A\u0928 \u0907\u0938 \u092D\u0941\u0917\u0924\u093E\u0928 \u0935\u093F\u0927\u093F \u0915\u0947 \u0932\u093F\u090F \u092E\u093E\u0928\u094D\u092F \u0928\u0939\u0940\u0902 \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0905\u0932\u0917 \u092D\u0941\u0917\u0924\u093E\u0928 \u0935\u093F\u0927\u093F \u0906\u091C\u093C\u092E\u093E\u090F\u0901 \u092F\u093E \u0915\u0942\u092A\u0928 \u0915\u094B \u0939\u091F\u093E\u090F\u0901\u0964"
        },
        stripe_error: {
          message: "\u0915\u093E\u0930\u094D\u0921 \u092D\u0941\u0917\u0924\u093E\u0928 \u0938\u0947\u0935\u093E \u0905\u0938\u094D\u0925\u093E\u092F\u0940 \u0930\u0942\u092A \u0938\u0947 \u0905\u0928\u0941\u092A\u0932\u092C\u094D\u0927 \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0915\u0941\u091B \u0926\u0947\u0930 \u092E\u0947\u0902 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902, \u092F\u093E \u0907\u0938\u0915\u0947 \u092C\u091C\u093E\u092F \u0915\u094D\u0930\u093F\u092A\u094D\u091F\u094B \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0930\u0947\u0902\u0964"
        },
        rpc_error: {
          message: "\u092C\u094D\u0932\u0949\u0915\u091A\u0947\u0928 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 \u0905\u0938\u094D\u0925\u093E\u092F\u0940 \u0930\u0942\u092A \u0938\u0947 \u0905\u0928\u0941\u092A\u0932\u092C\u094D\u0927 \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0915\u0941\u091B \u0926\u0947\u0930 \u092E\u0947\u0902 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902, \u092F\u093E \u0907\u0938\u0915\u0947 \u092C\u091C\u093E\u092F \u0915\u093E\u0930\u094D\u0921 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0930\u0947\u0902\u0964"
        },
        network_error: {
          message: "\u0928\u0947\u091F\u0935\u0930\u094D\u0915 \u0915\u0928\u0947\u0915\u094D\u0936\u0928 \u0938\u092E\u0938\u094D\u092F\u093E",
          action: "\u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u093E \u0907\u0902\u091F\u0930\u0928\u0947\u091F \u0915\u0928\u0947\u0915\u094D\u0936\u0928 \u091C\u093E\u0901\u091A\u0947\u0902 \u0914\u0930 \u092B\u093F\u0930 \u0938\u0947 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        internal_error: {
          message: "\u0939\u092E\u093E\u0930\u0940 \u0913\u0930 \u0938\u0947 \u0915\u0941\u091B \u0917\u0932\u0924 \u0939\u094B \u0917\u092F\u093E",
          action: "\u0915\u0943\u092A\u092F\u093E \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964 \u092F\u0926\u093F \u0938\u092E\u0938\u094D\u092F\u093E \u092C\u0928\u0940 \u0930\u0939\u0924\u0940 \u0939\u0948, \u0924\u094B \u0938\u092E\u0930\u094D\u0925\u0928 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964"
        },
        database_error: {
          message: "\u0938\u0947\u0935\u093E \u0905\u0938\u094D\u0925\u093E\u092F\u0940 \u0930\u0942\u092A \u0938\u0947 \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948",
          action: "\u0915\u0943\u092A\u092F\u093E \u0925\u094B\u0921\u093C\u0940 \u0926\u0947\u0930 \u092C\u093E\u0926 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
        },
        config_error: {
          message: "\u0938\u0947\u0935\u093E \u0915\u0949\u0928\u094D\u092B\u093C\u093F\u0917\u0930\u0947\u0936\u0928 \u0924\u094D\u0930\u0941\u091F\u093F",
          action: "\u0915\u0943\u092A\u092F\u093E \u0938\u0939\u093E\u092F\u0924\u093E \u0915\u0947 \u0932\u093F\u090F \u0938\u092E\u0930\u094D\u0925\u0928 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964"
        },
        unknown_error: {
          message: "\u090F\u0915 \u0905\u092A\u094D\u0930\u0924\u094D\u092F\u093E\u0936\u093F\u0924 \u0924\u094D\u0930\u0941\u091F\u093F \u0939\u0941\u0908",
          action: "\u0915\u0943\u092A\u092F\u093E \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902, \u092F\u093E \u092F\u0926\u093F \u0938\u092E\u0938\u094D\u092F\u093E \u091C\u093E\u0930\u0940 \u0930\u0939\u0924\u0940 \u0939\u0948 \u0924\u094B \u0938\u092E\u0930\u094D\u0925\u0928 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964"
        }
      },
      validation: {
        unknown_token_mint: "\u091A\u0947\u0924\u093E\u0935\u0928\u0940: \u0905\u092A\u0930\u093F\u091A\u093F\u0924 \u091F\u094B\u0915\u0928 \u092E\u093F\u0902\u091F \u092A\u0924\u093E\u0964 \u0927\u0928\u0939\u093E\u0928\u093F \u0938\u0947 \u092C\u091A\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0938\u0941\u0928\u093F\u0936\u094D\u091A\u093F\u0924 \u0915\u0930\u0947\u0902 \u0915\u093F \u092F\u0939 \u0938\u0939\u0940 \u091F\u094B\u0915\u0928 \u0939\u0948\u0964",
        token_typo_warning: "\u091F\u094B\u0915\u0928 \u092A\u0924\u093E \u091C\u094D\u091E\u093E\u0924 \u0938\u094D\u091F\u0947\u092C\u0932\u0915\u0949\u0907\u0928\u094D\u0938 (USDC, USDT, PYUSD, CASH) \u0938\u0947 \u092E\u0947\u0932 \u0928\u0939\u0940\u0902 \u0916\u093E\u0924\u093E\u0964 \u0938\u094D\u0925\u093E\u092F\u0940 \u0927\u0928\u0939\u093E\u0928\u093F \u0938\u0947 \u092C\u091A\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0938\u093E\u0935\u0927\u093E\u0928\u0940 \u0938\u0947 \u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924 \u0915\u0930\u0947\u0902\u0964"
      },
      wallet: {
        no_wallet_detected: "\u0915\u094B\u0908 Solana \u0935\u0949\u0932\u0947\u091F \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E",
        install_wallet: "\u0915\u0943\u092A\u092F\u093E Phantom, Solflare \u092F\u093E Backpack \u091C\u0948\u0938\u093E Solana \u0935\u0949\u0932\u0947\u091F \u0907\u0902\u0938\u094D\u091F\u0949\u0932 \u0915\u0930\u0947\u0902\u0964",
        wallet_not_connected: "\u0935\u0949\u0932\u0947\u091F \u0915\u0928\u0947\u0915\u094D\u091F \u0928\u0939\u0940\u0902 \u0939\u0948",
        connect_your_wallet: "\u091C\u093E\u0930\u0940 \u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u093E \u0935\u0949\u0932\u0947\u091F \u0915\u0928\u0947\u0915\u094D\u091F \u0915\u0930\u0947\u0902\u0964",
        wallet_connection_failed: "\u0935\u0949\u0932\u0947\u091F \u0915\u0928\u0947\u0915\u094D\u0936\u0928 \u0935\u093F\u092B\u0932",
        try_again: "\u0915\u0943\u092A\u092F\u093E \u0926\u094B\u092C\u093E\u0930\u093E \u0915\u0928\u0947\u0915\u094D\u091F \u0915\u0930\u0928\u0947 \u0915\u093E \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964",
        transaction_rejected: "\u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0905\u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0915\u0930 \u0926\u093F\u092F\u093E \u0917\u092F\u093E",
        approve_in_wallet: "\u091C\u093E\u0930\u0940 \u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u0947 \u0935\u0949\u0932\u0947\u091F \u092E\u0947\u0902 \u0932\u0947\u0928\u2011\u0926\u0947\u0928 \u0915\u094B \u0905\u0928\u0941\u092E\u094B\u0926\u093F\u0924 \u0915\u0930\u0947\u0902\u0964",
        select_wallet: "\u0935\u0949\u0932\u0947\u091F \u091A\u0941\u0928\u0947\u0902",
        change: "\u092C\u0926\u0932\u0947\u0902"
      }
    };
  }
});

// src/i18n/translations/it.json
var require_it = __commonJS({
  "src/i18n/translations/it.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - File di traduzione (Italiano)",
      version: "1.0.0",
      locale: "it",
      ui: {
        pay_with_card: "Paga con carta",
        pay_with_crypto: "Paga con USDC",
        pay_with_usdc: "Paga con USDC",
        purchase: "Acquista",
        card: "Carta",
        usdc_solana: "USDC (Solana)",
        crypto: "Criptovaluta",
        connect_wallet: "Connetti il wallet",
        connecting: "Connessione in corso...",
        processing: "Elaborazione in corso...",
        loading: "Caricamento in corso...",
        close: "Chiudi",
        cancel: "Annulla",
        confirm: "Conferma",
        retry: "Riprova",
        go_back: "Indietro",
        contact_support: "Contatta l'assistenza",
        pay_with_credits: "Paga con crediti",
        credits: "Crediti",
        disconnect: "Disconnetti",
        payment_successful: "Pagamento riuscito!",
        subscribe: "Abbonati",
        subscribe_with_crypto: "Abbonati con USDC",
        subscribe_with_credits: "Abbonati con crediti",
        subscribed: "Abbonato",
        subscribed_until: "Abbonato fino al",
        subscription_active: "Il tuo abbonamento \xE8 attivo!",
        redirecting_to_checkout: "Reindirizzamento al checkout..."
      },
      errors: {
        invalid_payment_proof: {
          message: "Verifica del pagamento non riuscita",
          action: "Riprova a effettuare il pagamento. Se il problema persiste, contatta l'assistenza."
        },
        invalid_signature: {
          message: "Firma della transazione non valida",
          action: "Approva la transazione nel tuo wallet e riprova."
        },
        invalid_transaction: {
          message: "Formato della transazione non valido",
          action: "Riprova a effettuare il pagamento. Se continua, prova ad aggiornare l'app del wallet."
        },
        transaction_not_found: {
          message: "Transazione non trovata sulla blockchain",
          action: "La tua transazione potrebbe essere ancora in elaborazione. Attendi un momento e controlla il wallet, oppure riprova."
        },
        transaction_not_confirmed: {
          message: "Transazione ancora in elaborazione",
          action: "Attendi che la blockchain confermi la transazione, quindi riprova."
        },
        transaction_failed: {
          message: "Transazione non riuscita sulla blockchain",
          action: "Controlla il tuo wallet per i dettagli. Potresti dover modificare le impostazioni della transazione o aggiungere pi\xF9 SOL per le commissioni."
        },
        transaction_expired: {
          message: "La transazione ha impiegato troppo tempo per essere elaborata",
          action: "Riprova a effettuare il pagamento. Valuta di aumentare la priorit\xE0 della transazione se il tuo wallet lo consente."
        },
        invalid_recipient: {
          message: "Il pagamento \xE8 stato inviato all'indirizzo sbagliato",
          action: "Riprova assicurandoti di approvare la transazione corretta nel wallet."
        },
        invalid_sender: {
          message: "Il wallet mittente del pagamento non \xE8 valido",
          action: "Ricollega il tuo wallet e riprova."
        },
        unauthorized_refund_issuer: {
          message: "Non sei autorizzato a emettere rimborsi",
          action: "Solo gli account autorizzati possono elaborare rimborsi. Contatta l'assistenza se ritieni si tratti di un errore."
        },
        amount_below_minimum: {
          message: "L'importo del pagamento \xE8 troppo basso",
          action: "Controlla l'importo richiesto e riprova."
        },
        amount_mismatch: {
          message: "L'importo del pagamento non corrisponde al preventivo",
          action: "Il prezzo potrebbe essere cambiato. Aggiorna e riprova a pagare."
        },
        insufficient_funds_sol: {
          message: "SOL insufficienti per le commissioni di transazione",
          action: "Aggiungi almeno 0.001 SOL al tuo wallet per coprire le commissioni di rete, quindi riprova."
        },
        insufficient_funds_token: {
          message: "Saldo insufficiente nel tuo wallet",
          action: "Aggiungi fondi al tuo wallet e riprova."
        },
        invalid_token_mint: {
          message: "Token di pagamento errato",
          action: "Paga con il token corretto come indicato nei dettagli del pagamento."
        },
        not_spl_transfer: {
          message: "La transazione non \xE8 un trasferimento di token valido",
          action: "Assicurati di inviare dal tuo wallet il tipo di token corretto."
        },
        missing_token_account: {
          message: "Account token non trovato",
          action: "Il tuo wallet potrebbe dover creare prima un account token. Riprova o usa un wallet diverso."
        },
        invalid_token_program: {
          message: "Programma token non valido",
          action: "Riprova a effettuare il pagamento. Se continua, prova con un wallet diverso."
        },
        missing_memo: {
          message: "Memo del pagamento richiesto ma non incluso",
          action: "Riprova a effettuare il pagamento assicurandoti di approvare i dettagli della transazione nel wallet."
        },
        invalid_memo: {
          message: "Formato del memo del pagamento non valido",
          action: "Riprova a effettuare il pagamento."
        },
        payment_already_used: {
          message: "Questo pagamento \xE8 gi\xE0 stato elaborato",
          action: "Controlla la cronologia delle transazioni. Se devi effettuare un altro pagamento, avvia una nuova transazione."
        },
        signature_reused: {
          message: "La firma della transazione \xE8 gi\xE0 stata utilizzata",
          action: "Crea una nuova transazione di pagamento."
        },
        quote_expired: {
          message: "Il preventivo di pagamento \xE8 scaduto",
          action: "I prezzi vengono aggiornati frequentemente. Aggiorna e riprova a pagare."
        },
        missing_field: {
          message: "Informazioni obbligatorie mancanti",
          action: "Controlla tutti i campi obbligatori e riprova."
        },
        invalid_field: {
          message: "Alcune informazioni non sono valide",
          action: "Controlla i dati inseriti e riprova."
        },
        invalid_amount: {
          message: "Importo del pagamento non valido",
          action: "Controlla l'importo e riprova."
        },
        invalid_wallet: {
          message: "Indirizzo del wallet non valido",
          action: "Ricollega il tuo wallet e riprova."
        },
        invalid_resource: {
          message: "Selezione dell'articolo non valida",
          action: "Aggiorna la pagina e riprova."
        },
        invalid_coupon: {
          message: "Codice coupon non valido",
          action: "Controlla il codice coupon e riprova."
        },
        invalid_cart_item: {
          message: "Uno o pi\xF9 articoli nel carrello non sono validi",
          action: "Rivedi il carrello e riprova."
        },
        empty_cart: {
          message: "Il tuo carrello \xE8 vuoto",
          action: "Aggiungi articoli al carrello prima di procedere al checkout."
        },
        resource_not_found: {
          message: "Articolo non trovato",
          action: "Questo articolo potrebbe non essere pi\xF9 disponibile. Aggiorna e riprova."
        },
        cart_not_found: {
          message: "Carrello non trovato",
          action: "Il tuo carrello potrebbe essere scaduto. Avvia un nuovo ordine."
        },
        refund_not_found: {
          message: "Rimborso non trovato",
          action: "Controlla il numero di riferimento del rimborso o contatta l'assistenza."
        },
        product_not_found: {
          message: "Prodotto non disponibile",
          action: "Questo prodotto potrebbe non essere pi\xF9 disponibile. Consulta la selezione attuale."
        },
        coupon_not_found: {
          message: "Codice coupon non trovato",
          action: "Controlla il codice coupon o rimuovilo per continuare."
        },
        session_not_found: {
          message: "Sessione di pagamento scaduta",
          action: "Avvia un nuovo pagamento."
        },
        cart_already_paid: {
          message: "Questo ordine \xE8 gi\xE0 stato pagato",
          action: "Controlla la cronologia degli ordini. Se devi effettuare un altro acquisto, avvia un nuovo ordine."
        },
        refund_already_processed: {
          message: "Questo rimborso \xE8 gi\xE0 stato elaborato",
          action: "Controlla la cronologia delle transazioni o contatta l'assistenza per i dettagli."
        },
        coupon_expired: {
          message: "Il coupon \xE8 scaduto",
          action: "Rimuovi il codice coupon o usane un altro."
        },
        coupon_usage_limit_reached: {
          message: "Limite di utilizzo del coupon raggiunto",
          action: "Questo coupon \xE8 stato completamente riscattato. Prova con un altro codice."
        },
        coupon_not_applicable: {
          message: "Il coupon non pu\xF2 essere applicato a questo acquisto",
          action: "Verifica i termini del coupon o rimuovilo per continuare."
        },
        coupon_wrong_payment_method: {
          message: "Coupon non valido per questo metodo di pagamento",
          action: "Prova un metodo di pagamento diverso o rimuovi il codice coupon."
        },
        stripe_error: {
          message: "Servizio di pagamento con carta temporaneamente non disponibile",
          action: "Riprova tra poco, oppure utilizza il pagamento in criptovaluta."
        },
        rpc_error: {
          message: "Rete blockchain temporaneamente non disponibile",
          action: "Riprova tra poco, oppure usa il pagamento con carta."
        },
        network_error: {
          message: "Problemi di connessione di rete",
          action: "Controlla la connessione a Internet e riprova."
        },
        internal_error: {
          message: "Si \xE8 verificato un errore sul nostro server",
          action: "Riprova. Se il problema persiste, contatta l'assistenza."
        },
        database_error: {
          message: "Servizio temporaneamente non disponibile",
          action: "Riprova tra poco."
        },
        config_error: {
          message: "Errore di configurazione del servizio",
          action: "Contatta l'assistenza per ricevere aiuto."
        },
        unknown_error: {
          message: "Si \xE8 verificato un errore imprevisto",
          action: "Riprova o contatta l'assistenza se il problema persiste."
        }
      },
      validation: {
        unknown_token_mint: "Avviso: indirizzo di mint del token non riconosciuto. Controlla che questo sia il token corretto per evitare la perdita di fondi.",
        token_typo_warning: "L'indirizzo del token non corrisponde alle stablecoin note (USDC, USDT, PYUSD, CASH). Verifica attentamente per evitare perdite permanenti di fondi."
      },
      wallet: {
        no_wallet_detected: "Nessun wallet Solana rilevato",
        install_wallet: "Installa un wallet Solana come Phantom, Solflare o Backpack.",
        wallet_not_connected: "Wallet non connesso",
        connect_your_wallet: "Connetti il tuo wallet per continuare.",
        wallet_connection_failed: "Connessione al wallet non riuscita",
        try_again: "Riprova a connetterti.",
        transaction_rejected: "Transazione rifiutata",
        approve_in_wallet: "Approva la transazione nel tuo wallet per continuare.",
        select_wallet: "Seleziona wallet",
        change: "Cambia"
      }
    };
  }
});

// src/i18n/translations/ja.json
var require_ja = __commonJS({
  "src/i18n/translations/ja.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \u7FFB\u8A33\u5143\u30D5\u30A1\u30A4\u30EB\uFF08\u65E5\u672C\u8A9E\uFF09",
      version: "1.0.0",
      locale: "ja",
      ui: {
        pay_with_card: "\u30AB\u30FC\u30C9\u3067\u652F\u6255\u3046",
        pay_with_crypto: "USDC \u3067\u652F\u6255\u3046",
        pay_with_usdc: "USDC \u3067\u652F\u6255\u3046",
        purchase: "\u8CFC\u5165",
        card: "\u30AB\u30FC\u30C9",
        usdc_solana: "USDC\uFF08Solana\uFF09",
        crypto: "\u6697\u53F7\u8CC7\u7523",
        connect_wallet: "\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u63A5\u7D9A",
        connecting: "\u63A5\u7D9A\u4E2D\u2026",
        processing: "\u51E6\u7406\u4E2D\u2026",
        loading: "\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",
        close: "\u9589\u3058\u308B",
        cancel: "\u30AD\u30E3\u30F3\u30BB\u30EB",
        confirm: "\u78BA\u8A8D",
        retry: "\u3082\u3046\u4E00\u5EA6\u8A66\u3059",
        go_back: "\u623B\u308B",
        contact_support: "\u30B5\u30DD\u30FC\u30C8\u306B\u9023\u7D61",
        pay_with_credits: "\u30AF\u30EC\u30B8\u30C3\u30C8\u3067\u652F\u6255\u3046",
        credits: "\u30AF\u30EC\u30B8\u30C3\u30C8",
        disconnect: "\u5207\u65AD",
        payment_successful: "\u652F\u6255\u3044\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F\uFF01",
        subscribe: "\u30B5\u30D6\u30B9\u30AF\u30E9\u30A4\u30D6",
        subscribe_with_crypto: "USDC\u3067\u30B5\u30D6\u30B9\u30AF\u30E9\u30A4\u30D6",
        subscribe_with_credits: "\u30AF\u30EC\u30B8\u30C3\u30C8\u3067\u30B5\u30D6\u30B9\u30AF\u30E9\u30A4\u30D6",
        subscribed: "\u30B5\u30D6\u30B9\u30AF\u30E9\u30A4\u30D6\u6E08\u307F",
        subscribed_until: "\u30B5\u30D6\u30B9\u30AF\u30E9\u30A4\u30D6\u671F\u9650",
        subscription_active: "\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u306F\u6709\u52B9\u3067\u3059\uFF01",
        redirecting_to_checkout: "\u30C1\u30A7\u30C3\u30AF\u30A2\u30A6\u30C8\u3078\u79FB\u52D5\u3057\u3066\u3044\u307E\u3059..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\u652F\u6255\u3044\u306E\u691C\u8A3C\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
          action: "\u3082\u3046\u4E00\u5EA6\u304A\u652F\u6255\u3044\u3092\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002\u7D99\u7D9A\u3059\u308B\u5834\u5408\u306F\u30B5\u30DD\u30FC\u30C8\u306B\u3054\u9023\u7D61\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_signature: {
          message: "\u53D6\u5F15\u306E\u7F72\u540D\u304C\u7121\u52B9\u3067\u3059",
          action: "\u30A6\u30A9\u30EC\u30C3\u30C8\u3067\u53D6\u5F15\u3092\u627F\u8A8D\u3057\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_transaction: {
          message: "\u53D6\u5F15\u5F62\u5F0F\u304C\u7121\u52B9\u3067\u3059",
          action: "\u3082\u3046\u4E00\u5EA6\u304A\u652F\u6255\u3044\u3092\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002\u7D9A\u304F\u5834\u5408\u306F\u30A6\u30A9\u30EC\u30C3\u30C8\u30A2\u30D7\u30EA\u306E\u66F4\u65B0\u3092\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        transaction_not_found: {
          message: "\u30D6\u30ED\u30C3\u30AF\u30C1\u30A7\u30FC\u30F3\u4E0A\u3067\u53D6\u5F15\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
          action: "\u53D6\u5F15\u306F\u307E\u3060\u51E6\u7406\u4E2D\u306E\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u5C11\u3057\u5F85\u3063\u3066\u304B\u3089\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u78BA\u8A8D\u3059\u308B\u304B\u3001\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        transaction_not_confirmed: {
          message: "\u53D6\u5F15\u306F\u51E6\u7406\u4E2D\u3067\u3059",
          action: "\u30D6\u30ED\u30C3\u30AF\u30C1\u30A7\u30FC\u30F3\u306E\u78BA\u8A8D\u304C\u5B8C\u4E86\u3059\u308B\u307E\u3067\u304A\u5F85\u3061\u3044\u305F\u3060\u304D\u3001\u305D\u306E\u5F8C\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        transaction_failed: {
          message: "\u30D6\u30ED\u30C3\u30AF\u30C1\u30A7\u30FC\u30F3\u4E0A\u3067\u53D6\u5F15\u304C\u5931\u6557\u3057\u307E\u3057\u305F",
          action: "\u30A6\u30A9\u30EC\u30C3\u30C8\u306E\u8A73\u7D30\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u53D6\u5F15\u8A2D\u5B9A\u306E\u8ABF\u6574\u3084\u3001\u624B\u6570\u6599\u7528\u306B SOL \u3092\u8FFD\u52A0\u3059\u308B\u5FC5\u8981\u304C\u3042\u308B\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002"
        },
        transaction_expired: {
          message: "\u53D6\u5F15\u306E\u51E6\u7406\u306B\u6642\u9593\u304C\u304B\u304B\u308A\u3059\u304E\u307E\u3057\u305F",
          action: "\u3082\u3046\u4E00\u5EA6\u304A\u652F\u6255\u3044\u3092\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002\u30A6\u30A9\u30EC\u30C3\u30C8\u304C\u5BFE\u5FDC\u3057\u3066\u3044\u308B\u5834\u5408\u306F\u53D6\u5F15\u306E\u512A\u5148\u5EA6\u3092\u4E0A\u3052\u308B\u3053\u3068\u3092\u3054\u691C\u8A0E\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_recipient: {
          message: "\u652F\u6255\u3044\u304C\u8AA4\u3063\u305F\u30A2\u30C9\u30EC\u30B9\u306B\u9001\u4FE1\u3055\u308C\u307E\u3057\u305F",
          action: "\u518D\u5EA6\u304A\u8A66\u3057\u306E\u3046\u3048\u3001\u30A6\u30A9\u30EC\u30C3\u30C8\u3067\u6B63\u3057\u3044\u53D6\u5F15\u3092\u627F\u8A8D\u3057\u3066\u3044\u308B\u3053\u3068\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_sender: {
          message: "\u652F\u6255\u3044\u9001\u4FE1\u5143\u30A6\u30A9\u30EC\u30C3\u30C8\u304C\u7121\u52B9\u3067\u3059",
          action: "\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u518D\u63A5\u7D9A\u3057\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        unauthorized_refund_issuer: {
          message: "\u8FD4\u91D1\u3092\u884C\u3046\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093",
          action: "\u8FD4\u91D1\u306F\u8A31\u53EF\u3055\u308C\u305F\u30A2\u30AB\u30A6\u30F3\u30C8\u306E\u307F\u304C\u51E6\u7406\u3067\u304D\u307E\u3059\u3002\u8AA4\u308A\u3068\u601D\u308F\u308C\u308B\u5834\u5408\u306F\u30B5\u30DD\u30FC\u30C8\u306B\u3054\u9023\u7D61\u304F\u3060\u3055\u3044\u3002"
        },
        amount_below_minimum: {
          message: "\u652F\u6255\u3044\u91D1\u984D\u304C\u4F4E\u3059\u304E\u307E\u3059",
          action: "\u5FC5\u8981\u91D1\u984D\u3092\u3054\u78BA\u8A8D\u306E\u3046\u3048\u3001\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        amount_mismatch: {
          message: "\u652F\u6255\u3044\u91D1\u984D\u304C\u898B\u7A4D\u984D\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093",
          action: "\u4FA1\u683C\u304C\u5909\u66F4\u3055\u308C\u305F\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\u3057\u3066\u304B\u3089\u518D\u5EA6\u304A\u652F\u6255\u3044\u304F\u3060\u3055\u3044\u3002"
        },
        insufficient_funds_sol: {
          message: "\u53D6\u5F15\u624B\u6570\u6599\u306B\u5FC5\u8981\u306A SOL \u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059",
          action: "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u624B\u6570\u6599\u3092\u30AB\u30D0\u30FC\u3059\u308B\u305F\u3081\u3001\u30A6\u30A9\u30EC\u30C3\u30C8\u306B\u5C11\u306A\u304F\u3068\u3082 0.001 SOL \u3092\u8FFD\u52A0\u3057\u3066\u304B\u3089\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        insufficient_funds_token: {
          message: "\u30A6\u30A9\u30EC\u30C3\u30C8\u306E\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059",
          action: "\u30A6\u30A9\u30EC\u30C3\u30C8\u306B\u8CC7\u91D1\u3092\u8FFD\u52A0\u3057\u3066\u304B\u3089\u3001\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_token_mint: {
          message: "\u652F\u6255\u3044\u30C8\u30FC\u30AF\u30F3\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093",
          action: "\u652F\u6255\u3044\u8A73\u7D30\u306B\u8868\u793A\u3055\u308C\u3066\u3044\u308B\u6B63\u3057\u3044\u30C8\u30FC\u30AF\u30F3\u3067\u304A\u652F\u6255\u3044\u304F\u3060\u3055\u3044\u3002"
        },
        not_spl_transfer: {
          message: "\u53D6\u5F15\u306F\u6709\u52B9\u306A\u30C8\u30FC\u30AF\u30F3\u9001\u91D1\u3067\u306F\u3042\u308A\u307E\u305B\u3093",
          action: "\u30A6\u30A9\u30EC\u30C3\u30C8\u304B\u3089\u6B63\u3057\u3044\u7A2E\u985E\u306E\u30C8\u30FC\u30AF\u30F3\u3092\u9001\u4FE1\u3057\u3066\u3044\u308B\u3053\u3068\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002"
        },
        missing_token_account: {
          message: "\u30C8\u30FC\u30AF\u30F3\u30A2\u30AB\u30A6\u30F3\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
          action: "\u5148\u306B\u30C8\u30FC\u30AF\u30F3\u30A2\u30AB\u30A6\u30F3\u30C8\u306E\u4F5C\u6210\u304C\u5FC5\u8981\u306A\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002\u518D\u8A66\u884C\u3059\u308B\u304B\u3001\u5225\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u3054\u5229\u7528\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_token_program: {
          message: "\u30C8\u30FC\u30AF\u30F3\u30D7\u30ED\u30B0\u30E9\u30E0\u304C\u7121\u52B9\u3067\u3059",
          action: "\u3082\u3046\u4E00\u5EA6\u304A\u652F\u6255\u3044\u3092\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002\u7D9A\u304F\u5834\u5408\u306F\u5225\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u3054\u5229\u7528\u304F\u3060\u3055\u3044\u3002"
        },
        missing_memo: {
          message: "\u652F\u6255\u3044\u30E1\u30E2\u304C\u5FC5\u8981\u3067\u3059\u304C\u3001\u542B\u307E\u308C\u3066\u3044\u307E\u305B\u3093",
          action: "\u3082\u3046\u4E00\u5EA6\u304A\u652F\u6255\u3044\u3092\u884C\u3044\u3001\u30A6\u30A9\u30EC\u30C3\u30C8\u3067\u53D6\u5F15\u8A73\u7D30\u3092\u627F\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_memo: {
          message: "\u652F\u6255\u3044\u30E1\u30E2\u306E\u5F62\u5F0F\u304C\u7121\u52B9\u3067\u3059",
          action: "\u3082\u3046\u4E00\u5EA6\u304A\u652F\u6255\u3044\u3092\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        payment_already_used: {
          message: "\u3053\u306E\u652F\u6255\u3044\u306F\u3059\u3067\u306B\u51E6\u7406\u3055\u308C\u3066\u3044\u307E\u3059",
          action: "\u53D6\u5F15\u5C65\u6B74\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002\u5225\u306E\u304A\u652F\u6255\u3044\u304C\u5FC5\u8981\u306A\u5834\u5408\u306F\u3001\u65B0\u3057\u3044\u53D6\u5F15\u3092\u958B\u59CB\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        signature_reused: {
          message: "\u3053\u306E\u53D6\u5F15\u7F72\u540D\u306F\u3059\u3067\u306B\u4F7F\u7528\u3055\u308C\u3066\u3044\u307E\u3059",
          action: "\u65B0\u3057\u3044\u652F\u6255\u3044\u53D6\u5F15\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        quote_expired: {
          message: "\u652F\u6255\u3044\u898B\u7A4D\u3082\u308A\u306E\u6709\u52B9\u671F\u9650\u304C\u5207\u308C\u307E\u3057\u305F",
          action: "\u4FA1\u683C\u306F\u983B\u7E41\u306B\u66F4\u65B0\u3055\u308C\u307E\u3059\u3002\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\u3057\u3066\u304B\u3089\u518D\u5EA6\u304A\u652F\u6255\u3044\u304F\u3060\u3055\u3044\u3002"
        },
        missing_field: {
          message: "\u5FC5\u9808\u60C5\u5831\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059",
          action: "\u3059\u3079\u3066\u306E\u5FC5\u9808\u9805\u76EE\u3092\u78BA\u8A8D\u3057\u3066\u304B\u3089\u3001\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_field: {
          message: "\u4E00\u90E8\u306E\u60C5\u5831\u304C\u7121\u52B9\u3067\u3059",
          action: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u306E\u3046\u3048\u3001\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_amount: {
          message: "\u652F\u6255\u3044\u91D1\u984D\u304C\u7121\u52B9\u3067\u3059",
          action: "\u91D1\u984D\u3092\u78BA\u8A8D\u3057\u3066\u304B\u3089\u3001\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_wallet: {
          message: "\u30A6\u30A9\u30EC\u30C3\u30C8\u30A2\u30C9\u30EC\u30B9\u304C\u7121\u52B9\u3067\u3059",
          action: "\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u518D\u63A5\u7D9A\u3057\u3066\u304B\u3089\u3001\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_resource: {
          message: "\u7121\u52B9\u306A\u5546\u54C1\u9078\u629E\u3067\u3059",
          action: "\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\u3057\u3066\u304B\u3089\u3001\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_coupon: {
          message: "\u7121\u52B9\u306A\u30AF\u30FC\u30DD\u30F3\u30B3\u30FC\u30C9\u3067\u3059",
          action: "\u30AF\u30FC\u30DD\u30F3\u30B3\u30FC\u30C9\u3092\u78BA\u8A8D\u3057\u3066\u304B\u3089\u3001\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        invalid_cart_item: {
          message: "\u30AB\u30FC\u30C8\u5185\u306E\u4E00\u90E8\u5546\u54C1\u304C\u7121\u52B9\u3067\u3059",
          action: "\u30AB\u30FC\u30C8\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304B\u3089\u3001\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        empty_cart: {
          message: "\u30AB\u30FC\u30C8\u304C\u7A7A\u3067\u3059",
          action: "\u30C1\u30A7\u30C3\u30AF\u30A2\u30A6\u30C8\u306E\u524D\u306B\u5546\u54C1\u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        resource_not_found: {
          message: "\u5546\u54C1\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
          action: "\u3053\u306E\u5546\u54C1\u306F\u65E2\u306B\u5728\u5EAB\u5207\u308C\u306E\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\u3057\u3066\u304B\u3089\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        cart_not_found: {
          message: "\u30B7\u30E7\u30C3\u30D4\u30F3\u30B0\u30AB\u30FC\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
          action: "\u30AB\u30FC\u30C8\u306E\u6709\u52B9\u671F\u9650\u304C\u5207\u308C\u305F\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u65B0\u3057\u3044\u6CE8\u6587\u3092\u958B\u59CB\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        refund_not_found: {
          message: "\u8FD4\u91D1\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
          action: "\u8FD4\u91D1\u306E\u53C2\u7167\u756A\u53F7\u3092\u78BA\u8A8D\u3059\u308B\u304B\u3001\u30B5\u30DD\u30FC\u30C8\u306B\u3054\u9023\u7D61\u304F\u3060\u3055\u3044\u3002"
        },
        product_not_found: {
          message: "\u5546\u54C1\u306F\u5229\u7528\u3067\u304D\u307E\u305B\u3093",
          action: "\u3053\u306E\u5546\u54C1\u306F\u3059\u3067\u306B\u53D6\u308A\u6271\u3044\u304C\u306A\u3044\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u73FE\u5728\u306E\u53D6\u6271\u5546\u54C1\u3092\u3054\u89A7\u304F\u3060\u3055\u3044\u3002"
        },
        coupon_not_found: {
          message: "\u30AF\u30FC\u30DD\u30F3\u30B3\u30FC\u30C9\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
          action: "\u30B3\u30FC\u30C9\u3092\u78BA\u8A8D\u3059\u308B\u304B\u3001\u524A\u9664\u3057\u3066\u7D9A\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        session_not_found: {
          message: "\u652F\u6255\u3044\u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u6709\u52B9\u671F\u9650\u304C\u5207\u308C\u307E\u3057\u305F",
          action: "\u65B0\u3057\u3044\u304A\u652F\u6255\u3044\u3092\u958B\u59CB\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        cart_already_paid: {
          message: "\u3053\u306E\u6CE8\u6587\u306F\u3059\u3067\u306B\u652F\u6255\u3044\u6E08\u307F\u3067\u3059",
          action: "\u6CE8\u6587\u5C65\u6B74\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5225\u306E\u8CFC\u5165\u304C\u5FC5\u8981\u306A\u5834\u5408\u306F\u3001\u65B0\u3057\u3044\u6CE8\u6587\u3092\u958B\u59CB\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        refund_already_processed: {
          message: "\u3053\u306E\u8FD4\u91D1\u306F\u3059\u3067\u306B\u51E6\u7406\u3055\u308C\u3066\u3044\u307E\u3059",
          action: "\u53D6\u5F15\u5C65\u6B74\u3092\u78BA\u8A8D\u3059\u308B\u304B\u3001\u8A73\u7D30\u306F\u30B5\u30DD\u30FC\u30C8\u306B\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002"
        },
        coupon_expired: {
          message: "\u30AF\u30FC\u30DD\u30F3\u306E\u6709\u52B9\u671F\u9650\u304C\u5207\u308C\u3066\u3044\u307E\u3059",
          action: "\u30AF\u30FC\u30DD\u30F3\u30B3\u30FC\u30C9\u3092\u524A\u9664\u3059\u308B\u304B\u3001\u5225\u306E\u30B3\u30FC\u30C9\u3092\u3054\u5229\u7528\u304F\u3060\u3055\u3044\u3002"
        },
        coupon_usage_limit_reached: {
          message: "\u30AF\u30FC\u30DD\u30F3\u306E\u4F7F\u7528\u4E0A\u9650\u306B\u9054\u3057\u307E\u3057\u305F",
          action: "\u3053\u306E\u30AF\u30FC\u30DD\u30F3\u306F\u3059\u3067\u306B\u3059\u3079\u3066\u4F7F\u7528\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u5225\u306E\u30B3\u30FC\u30C9\u3092\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        coupon_not_applicable: {
          message: "\u3053\u306E\u8CFC\u5165\u306B\u306F\u30AF\u30FC\u30DD\u30F3\u3092\u9069\u7528\u3067\u304D\u307E\u305B\u3093",
          action: "\u30AF\u30FC\u30DD\u30F3\u306E\u6761\u4EF6\u3092\u78BA\u8A8D\u3059\u308B\u304B\u3001\u524A\u9664\u3057\u3066\u7D9A\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        coupon_wrong_payment_method: {
          message: "\u3053\u306E\u304A\u652F\u6255\u3044\u65B9\u6CD5\u3067\u306F\u30AF\u30FC\u30DD\u30F3\u306F\u7121\u52B9\u3067\u3059",
          action: "\u5225\u306E\u304A\u652F\u6255\u3044\u65B9\u6CD5\u3092\u8A66\u3059\u304B\u3001\u30AF\u30FC\u30DD\u30F3\u30B3\u30FC\u30C9\u3092\u524A\u9664\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        stripe_error: {
          message: "\u30AB\u30FC\u30C9\u6C7A\u6E08\u30B5\u30FC\u30D3\u30B9\u306F\u4E00\u6642\u7684\u306B\u5229\u7528\u3067\u304D\u307E\u305B\u3093",
          action: "\u3057\u3070\u3089\u304F\u3057\u3066\u304B\u3089\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u306B\u306A\u308B\u304B\u3001\u4EE3\u308F\u308A\u306B\u6697\u53F7\u8CC7\u7523\u3067\u304A\u652F\u6255\u3044\u304F\u3060\u3055\u3044\u3002"
        },
        rpc_error: {
          message: "\u30D6\u30ED\u30C3\u30AF\u30C1\u30A7\u30FC\u30F3\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u306F\u4E00\u6642\u7684\u306B\u5229\u7528\u3067\u304D\u307E\u305B\u3093",
          action: "\u3057\u3070\u3089\u304F\u3057\u3066\u304B\u3089\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u306B\u306A\u308B\u304B\u3001\u4EE3\u308F\u308A\u306B\u30AB\u30FC\u30C9\u6C7A\u6E08\u3092\u3054\u5229\u7528\u304F\u3060\u3055\u3044\u3002"
        },
        network_error: {
          message: "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u63A5\u7D9A\u306B\u554F\u984C\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
          action: "\u30A4\u30F3\u30BF\u30FC\u30CD\u30C3\u30C8\u63A5\u7D9A\u3092\u78BA\u8A8D\u306E\u3046\u3048\u3001\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        internal_error: {
          message: "\u30B5\u30FC\u30D0\u30FC\u5074\u3067\u554F\u984C\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
          action: "\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002\u7D99\u7D9A\u3059\u308B\u5834\u5408\u306F\u30B5\u30DD\u30FC\u30C8\u306B\u3054\u9023\u7D61\u304F\u3060\u3055\u3044\u3002"
        },
        database_error: {
          message: "\u30B5\u30FC\u30D3\u30B9\u3092\u4E00\u6642\u7684\u306B\u5229\u7528\u3067\u304D\u307E\u305B\u3093",
          action: "\u3057\u3070\u3089\u304F\u3057\u3066\u304B\u3089\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        },
        config_error: {
          message: "\u30B5\u30FC\u30D3\u30B9\u306E\u8A2D\u5B9A\u30A8\u30E9\u30FC\u3067\u3059",
          action: "\u30B5\u30DD\u30FC\u30C8\u307E\u3067\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002"
        },
        unknown_error: {
          message: "\u4E88\u671F\u3057\u306A\u3044\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
          action: "\u518D\u5EA6\u304A\u8A66\u3057\u306B\u306A\u308B\u304B\u3001\u7D99\u7D9A\u3059\u308B\u5834\u5408\u306F\u30B5\u30DD\u30FC\u30C8\u306B\u3054\u9023\u7D61\u304F\u3060\u3055\u3044\u3002"
        }
      },
      validation: {
        unknown_token_mint: "\u8B66\u544A\uFF1A\u672A\u78BA\u8A8D\u306E\u30C8\u30FC\u30AF\u30F3\u30DF\u30F3\u30C8\u30A2\u30C9\u30EC\u30B9\u3067\u3059\u3002\u8CC7\u91D1\u640D\u5931\u3092\u907F\u3051\u308B\u305F\u3081\u3001\u6B63\u3057\u3044\u30C8\u30FC\u30AF\u30F3\u3067\u3042\u308B\u3053\u3068\u3092\u518D\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
        token_typo_warning: "\u30C8\u30FC\u30AF\u30F3\u30A2\u30C9\u30EC\u30B9\u304C\u65E2\u77E5\u306E\u30B9\u30C6\u30FC\u30D6\u30EB\u30B3\u30A4\u30F3\uFF08USDC\u3001USDT\u3001PYUSD\u3001CASH\uFF09\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002\u8CC7\u91D1\u3092\u6052\u4E45\u7684\u306B\u5931\u3046\u306E\u3092\u9632\u3050\u305F\u3081\u3001\u6CE8\u610F\u6DF1\u304F\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      },
      wallet: {
        no_wallet_detected: "Solana \u30A6\u30A9\u30EC\u30C3\u30C8\u304C\u691C\u51FA\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F",
        install_wallet: "Phantom\u3001Solflare\u3001Backpack \u306A\u3069\u306E Solana \u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
        wallet_not_connected: "\u30A6\u30A9\u30EC\u30C3\u30C8\u304C\u63A5\u7D9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
        connect_your_wallet: "\u7D9A\u884C\u3059\u308B\u306B\u306F\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u63A5\u7D9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
        wallet_connection_failed: "\u30A6\u30A9\u30EC\u30C3\u30C8\u306E\u63A5\u7D9A\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
        try_again: "\u3082\u3046\u4E00\u5EA6\u63A5\u7D9A\u3092\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002",
        transaction_rejected: "\u53D6\u5F15\u304C\u62D2\u5426\u3055\u308C\u307E\u3057\u305F",
        approve_in_wallet: "\u7D9A\u884C\u3059\u308B\u306B\u306F\u3001\u30A6\u30A9\u30EC\u30C3\u30C8\u3067\u53D6\u5F15\u3092\u627F\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
        select_wallet: "\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u9078\u629E",
        change: "\u5909\u66F4"
      }
    };
  }
});

// src/i18n/translations/ko.json
var require_ko = __commonJS({
  "src/i18n/translations/ko.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \uBC88\uC5ED \uC6D0\uBCF8 \uD30C\uC77C(\uD55C\uAD6D\uC5B4)",
      version: "1.0.0",
      locale: "ko",
      ui: {
        pay_with_card: "\uCE74\uB4DC\uB85C \uACB0\uC81C",
        pay_with_crypto: "USDC\uB85C \uACB0\uC81C",
        pay_with_usdc: "USDC\uB85C \uACB0\uC81C",
        purchase: "\uAD6C\uB9E4",
        card: "\uCE74\uB4DC",
        usdc_solana: "USDC(\uC194\uB77C\uB098)",
        crypto: "\uAC00\uC0C1\uC790\uC0B0",
        connect_wallet: "\uC9C0\uAC11 \uC5F0\uACB0",
        connecting: "\uC5F0\uACB0 \uC911\u2026",
        processing: "\uCC98\uB9AC \uC911\u2026",
        loading: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026",
        close: "\uB2EB\uAE30",
        cancel: "\uCDE8\uC18C",
        confirm: "\uD655\uC778",
        retry: "\uB2E4\uC2DC \uC2DC\uB3C4",
        go_back: "\uB4A4\uB85C \uAC00\uAE30",
        contact_support: "\uACE0\uAC1D \uC9C0\uC6D0 \uBB38\uC758",
        pay_with_credits: "\uD06C\uB808\uB527\uC73C\uB85C \uACB0\uC81C",
        credits: "\uD06C\uB808\uB527",
        disconnect: "\uC5F0\uACB0 \uD574\uC81C",
        payment_successful: "\uACB0\uC81C\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4!",
        subscribe: "\uAD6C\uB3C5\uD558\uAE30",
        subscribe_with_crypto: "USDC\uB85C \uAD6C\uB3C5\uD558\uAE30",
        subscribe_with_credits: "\uD06C\uB808\uB527\uC73C\uB85C \uAD6C\uB3C5\uD558\uAE30",
        subscribed: "\uAD6C\uB3C5 \uC911",
        subscribed_until: "\uAD6C\uB3C5 \uAE30\uD55C",
        subscription_active: "\uAD6C\uB3C5\uC774 \uD65C\uC131\uD654\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4!",
        redirecting_to_checkout: "\uACB0\uC81C \uD398\uC774\uC9C0\uB85C \uC774\uB3D9 \uC911..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\uACB0\uC81C \uAC80\uC99D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4",
          action: "\uB2E4\uC2DC \uACB0\uC81C\uD574 \uC8FC\uC138\uC694. \uACC4\uC18D \uBC1C\uC0DD\uD558\uBA74 \uACE0\uAC1D \uC9C0\uC6D0\uC5D0 \uBB38\uC758\uD574 \uC8FC\uC138\uC694."
        },
        invalid_signature: {
          message: "\uAC70\uB798 \uC11C\uBA85\uC774 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uC9C0\uAC11\uC5D0\uC11C \uAC70\uB798\uB97C \uC2B9\uC778\uD55C \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        invalid_transaction: {
          message: "\uAC70\uB798 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uB2E4\uC2DC \uACB0\uC81C\uD574 \uC8FC\uC138\uC694. \uACC4\uC18D\uB418\uBA74 \uC9C0\uAC11 \uC571\uC744 \uC5C5\uB370\uC774\uD2B8\uD574 \uBCF4\uC138\uC694."
        },
        transaction_not_found: {
          message: "\uBE14\uB85D\uCCB4\uC778\uC5D0\uC11C \uAC70\uB798\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
          action: "\uAC70\uB798\uAC00 \uC544\uC9C1 \uCC98\uB9AC \uC911\uC77C \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uAE30\uB2E4\uB838\uB2E4\uAC00 \uC9C0\uAC11\uC744 \uD655\uC778\uD558\uAC70\uB098 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        transaction_not_confirmed: {
          message: "\uAC70\uB798\uAC00 \uC544\uC9C1 \uCC98\uB9AC \uC911\uC785\uB2C8\uB2E4",
          action: "\uBE14\uB85D\uCCB4\uC778 \uD655\uC778\uC774 \uC644\uB8CC\uB420 \uB54C\uAE4C\uC9C0 \uC7A0\uC2DC \uAE30\uB2E4\uB9B0 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        transaction_failed: {
          message: "\uBE14\uB85D\uCCB4\uC778\uC5D0\uC11C \uAC70\uB798\uAC00 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4",
          action: "\uC9C0\uAC11\uC5D0\uC11C \uC138\uBD80 \uC815\uBCF4\uB97C \uD655\uC778\uD558\uC138\uC694. \uAC70\uB798 \uC124\uC815\uC744 \uC870\uC815\uD558\uAC70\uB098 \uC218\uC218\uB8CC\uC6A9 SOL\uC744 \uB354 \uCD94\uAC00\uD574\uC57C \uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
        },
        transaction_expired: {
          message: "\uAC70\uB798 \uCC98\uB9AC \uC2DC\uAC04\uC774 \uB108\uBB34 \uC624\uB798 \uAC78\uB838\uC2B5\uB2C8\uB2E4",
          action: "\uB2E4\uC2DC \uACB0\uC81C\uD574 \uC8FC\uC138\uC694. \uC9C0\uAC11\uC774 \uC9C0\uC6D0\uD55C\uB2E4\uBA74 \uAC70\uB798 \uC6B0\uC120\uC21C\uC704\uB97C \uB192\uC774\uB294 \uAC83\uC744 \uACE0\uB824\uD574 \uBCF4\uC138\uC694."
        },
        invalid_recipient: {
          message: "\uACB0\uC81C\uAC00 \uC798\uBABB\uB41C \uC8FC\uC18C\uB85C \uC804\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
          action: "\uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC2DC\uACE0, \uC9C0\uAC11\uC5D0\uC11C \uC62C\uBC14\uB978 \uAC70\uB798\uB97C \uC2B9\uC778\uD588\uB294\uC9C0 \uD655\uC778\uD574 \uC8FC\uC138\uC694."
        },
        invalid_sender: {
          message: "\uACB0\uC81C \uBC1C\uC2E0 \uC9C0\uAC11\uC774 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uC9C0\uAC11\uC744 \uB2E4\uC2DC \uC5F0\uACB0\uD55C \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        unauthorized_refund_issuer: {
          message: "\uD658\uBD88 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
          action: "\uD658\uBD88\uC740 \uC2B9\uC778\uB41C \uACC4\uC815\uB9CC \uCC98\uB9AC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC624\uB958\uB77C\uACE0 \uC0DD\uAC01\uD558\uC2DC\uBA74 \uACE0\uAC1D \uC9C0\uC6D0\uC5D0 \uBB38\uC758\uD574 \uC8FC\uC138\uC694."
        },
        amount_below_minimum: {
          message: "\uACB0\uC81C \uAE08\uC561\uC774 \uCD5C\uC18C \uAE08\uC561\uBCF4\uB2E4 \uC801\uC2B5\uB2C8\uB2E4",
          action: "\uC694\uAD6C \uAE08\uC561\uC744 \uD655\uC778\uD55C \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        amount_mismatch: {
          message: "\uACB0\uC81C \uAE08\uC561\uC774 \uACAC\uC801\uACFC \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uAC00\uACA9\uC774 \uBCC0\uACBD\uB418\uC5C8\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC0C8\uB85C\uACE0\uCE68 \uD6C4 \uB2E4\uC2DC \uACB0\uC81C\uD574 \uC8FC\uC138\uC694."
        },
        insufficient_funds_sol: {
          message: "\uAC70\uB798 \uC218\uC218\uB8CC\uC5D0 \uD544\uC694\uD55C SOL\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4",
          action: "\uB124\uD2B8\uC6CC\uD06C \uC218\uC218\uB8CC\uB97C \uC704\uD574 \uC9C0\uAC11\uC5D0 \uCD5C\uC18C 0.001 SOL\uC744 \uCD94\uAC00\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        insufficient_funds_token: {
          message: "\uC9C0\uAC11 \uC794\uC561\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4",
          action: "\uC9C0\uAC11\uC5D0 \uC790\uAE08\uC744 \uCD94\uAC00\uD55C \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        invalid_token_mint: {
          message: "\uACB0\uC81C \uD1A0\uD070\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uACB0\uC81C \uC0C1\uC138\uC5D0 \uD45C\uC2DC\uB41C \uC62C\uBC14\uB978 \uD1A0\uD070\uC73C\uB85C \uACB0\uC81C\uD574 \uC8FC\uC138\uC694."
        },
        not_spl_transfer: {
          message: "\uAC70\uB798\uAC00 \uC720\uD6A8\uD55C \uD1A0\uD070 \uC804\uC1A1\uC774 \uC544\uB2D9\uB2C8\uB2E4",
          action: "\uC9C0\uAC11\uC5D0\uC11C \uC62C\uBC14\uB978 \uC720\uD615\uC758 \uD1A0\uD070\uC744 \uC804\uC1A1\uD558\uACE0 \uC788\uB294\uC9C0 \uD655\uC778\uD574 \uC8FC\uC138\uC694."
        },
        missing_token_account: {
          message: "\uD1A0\uD070 \uACC4\uC815\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
          action: "\uBA3C\uC800 \uD1A0\uD070 \uACC4\uC815\uC744 \uC0DD\uC131\uD574\uC57C \uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uAC70\uB098 \uB2E4\uB978 \uC9C0\uAC11\uC744 \uC0AC\uC6A9\uD574 \uBCF4\uC138\uC694."
        },
        invalid_token_program: {
          message: "\uD1A0\uD070 \uD504\uB85C\uADF8\uB7A8\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uB2E4\uC2DC \uACB0\uC81C\uD574 \uBCF4\uC138\uC694. \uACC4\uC18D\uB418\uBA74 \uB2E4\uB978 \uC9C0\uAC11\uC744 \uC0AC\uC6A9\uD574 \uBCF4\uC138\uC694."
        },
        missing_memo: {
          message: "\uACB0\uC81C \uBA54\uBAA8\uAC00 \uD544\uC694\uD558\uC9C0\uB9CC \uD3EC\uD568\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
          action: "\uB2E4\uC2DC \uACB0\uC81C\uD558\uC2DC\uACE0 \uC9C0\uAC11\uC5D0\uC11C \uAC70\uB798 \uC0C1\uC138\uB97C \uC2B9\uC778\uD574 \uC8FC\uC138\uC694."
        },
        invalid_memo: {
          message: "\uACB0\uC81C \uBA54\uBAA8 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uB2E4\uC2DC \uACB0\uC81C\uD574 \uC8FC\uC138\uC694."
        },
        payment_already_used: {
          message: "\uC774 \uACB0\uC81C\uB294 \uC774\uBBF8 \uCC98\uB9AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
          action: "\uAC70\uB798 \uB0B4\uC5ED\uC744 \uD655\uC778\uD558\uC138\uC694. \uB2E4\uB978 \uACB0\uC81C\uAC00 \uD544\uC694\uD558\uB2E4\uBA74 \uC0C8 \uAC70\uB798\uB97C \uC2DC\uC791\uD574 \uC8FC\uC138\uC694."
        },
        signature_reused: {
          message: "\uAC70\uB798 \uC11C\uBA85\uC774 \uC774\uBBF8 \uC0AC\uC6A9\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
          action: "\uC0C8 \uACB0\uC81C \uAC70\uB798\uB97C \uC0DD\uC131\uD574 \uC8FC\uC138\uC694."
        },
        quote_expired: {
          message: "\uACB0\uC81C \uACAC\uC801\uC758 \uC720\uD6A8\uAE30\uAC04\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
          action: "\uAC00\uACA9\uC740 \uC790\uC8FC \uC5C5\uB370\uC774\uD2B8\uB429\uB2C8\uB2E4. \uC0C8\uB85C\uACE0\uCE68 \uD6C4 \uB2E4\uC2DC \uACB0\uC81C\uD574 \uC8FC\uC138\uC694."
        },
        missing_field: {
          message: "\uD544\uC218 \uC815\uBCF4\uAC00 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
          action: "\uBAA8\uB4E0 \uD544\uC218 \uD56D\uBAA9\uC744 \uD655\uC778\uD55C \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        invalid_field: {
          message: "\uC77C\uBD80 \uC815\uBCF4\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uC785\uB825 \uB0B4\uC6A9\uC744 \uD655\uC778\uD558\uACE0 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        invalid_amount: {
          message: "\uACB0\uC81C \uAE08\uC561\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uAE08\uC561\uC744 \uD655\uC778\uD55C \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        invalid_wallet: {
          message: "\uC9C0\uAC11 \uC8FC\uC18C\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uC9C0\uAC11\uC744 \uB2E4\uC2DC \uC5F0\uACB0\uD55C \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        invalid_resource: {
          message: "\uC798\uBABB\uB41C \uD56D\uBAA9 \uC120\uD0DD\uC785\uB2C8\uB2E4",
          action: "\uD398\uC774\uC9C0\uB97C \uC0C8\uB85C\uACE0\uCE68\uD55C \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        invalid_coupon: {
          message: "\uCFE0\uD3F0 \uCF54\uB4DC\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uCFE0\uD3F0 \uCF54\uB4DC\uB97C \uD655\uC778\uD55C \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        invalid_cart_item: {
          message: "\uC7A5\uBC14\uAD6C\uB2C8\uC758 \uD56D\uBAA9 \uC911 \uC77C\uBD80\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uC7A5\uBC14\uAD6C\uB2C8\uB97C \uD655\uC778\uD55C \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        empty_cart: {
          message: "\uC7A5\uBC14\uAD6C\uB2C8\uAC00 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4",
          action: "\uACB0\uC81C \uC804\uC5D0 \uC0C1\uD488\uC744 \uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB2F4\uC544 \uC8FC\uC138\uC694."
        },
        resource_not_found: {
          message: "\uD56D\uBAA9\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
          action: "\uC774 \uD56D\uBAA9\uC740 \uB354 \uC774\uC0C1 \uC774\uC6A9\uD560 \uC218 \uC5C6\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC0C8\uB85C\uACE0\uCE68 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        cart_not_found: {
          message: "\uC7A5\uBC14\uAD6C\uB2C8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
          action: "\uC7A5\uBC14\uAD6C\uB2C8\uAC00 \uB9CC\uB8CC\uB418\uC5C8\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC0C8 \uC8FC\uBB38\uC744 \uC2DC\uC791\uD574 \uC8FC\uC138\uC694."
        },
        refund_not_found: {
          message: "\uD658\uBD88\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
          action: "\uD658\uBD88 \uCC38\uC870 \uBC88\uD638\uB97C \uD655\uC778\uD558\uAC70\uB098 \uACE0\uAC1D \uC9C0\uC6D0\uC5D0 \uBB38\uC758\uD574 \uC8FC\uC138\uC694."
        },
        product_not_found: {
          message: "\uC0C1\uD488\uC744 \uC774\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
          action: "\uC774 \uC0C1\uD488\uC740 \uB354 \uC774\uC0C1 \uC81C\uACF5\uB418\uC9C0 \uC54A\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uD604\uC7AC \uC0C1\uD488\uC744 \uB458\uB7EC\uBD10 \uC8FC\uC138\uC694."
        },
        coupon_not_found: {
          message: "\uCFE0\uD3F0 \uCF54\uB4DC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
          action: "\uCFE0\uD3F0 \uCF54\uB4DC\uB97C \uD655\uC778\uD558\uAC70\uB098 \uC81C\uAC70\uD558\uACE0 \uACC4\uC18D\uD574 \uC8FC\uC138\uC694."
        },
        session_not_found: {
          message: "\uACB0\uC81C \uC138\uC158\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
          action: "\uC0C8 \uACB0\uC81C\uB97C \uC2DC\uC791\uD574 \uC8FC\uC138\uC694."
        },
        cart_already_paid: {
          message: "\uC774 \uC8FC\uBB38\uC740 \uC774\uBBF8 \uACB0\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
          action: "\uC8FC\uBB38 \uB0B4\uC5ED\uC744 \uD655\uC778\uD558\uC138\uC694. \uB2E4\uB978 \uAD6C\uB9E4\uAC00 \uD544\uC694\uD558\uBA74 \uC0C8 \uC8FC\uBB38\uC744 \uC2DC\uC791\uD574 \uC8FC\uC138\uC694."
        },
        refund_already_processed: {
          message: "\uC774 \uD658\uBD88\uC740 \uC774\uBBF8 \uCC98\uB9AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
          action: "\uAC70\uB798 \uB0B4\uC5ED\uC744 \uD655\uC778\uD558\uAC70\uB098 \uC790\uC138\uD55C \uB0B4\uC6A9\uC740 \uACE0\uAC1D \uC9C0\uC6D0\uC5D0 \uBB38\uC758\uD574 \uC8FC\uC138\uC694."
        },
        coupon_expired: {
          message: "\uCFE0\uD3F0\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
          action: "\uCFE0\uD3F0 \uCF54\uB4DC\uB97C \uC81C\uAC70\uD558\uAC70\uB098 \uB2E4\uB978 \uCF54\uB4DC\uB97C \uC0AC\uC6A9\uD574 \uC8FC\uC138\uC694."
        },
        coupon_usage_limit_reached: {
          message: "\uCFE0\uD3F0 \uC0AC\uC6A9 \uD55C\uB3C4\uC5D0 \uB3C4\uB2EC\uD588\uC2B5\uB2C8\uB2E4",
          action: "\uC774 \uCFE0\uD3F0\uC740 \uC774\uBBF8 \uBAA8\uB450 \uC0AC\uC6A9\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uB978 \uCF54\uB4DC\uB97C \uC0AC\uC6A9\uD574 \uC8FC\uC138\uC694."
        },
        coupon_not_applicable: {
          message: "\uC774 \uAD6C\uB9E4\uC5D0\uB294 \uCFE0\uD3F0\uC744 \uC801\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
          action: "\uCFE0\uD3F0 \uC57D\uAD00\uC744 \uD655\uC778\uD558\uAC70\uB098 \uC81C\uAC70\uD558\uACE0 \uACC4\uC18D\uD574 \uC8FC\uC138\uC694."
        },
        coupon_wrong_payment_method: {
          message: "\uC774 \uACB0\uC81C \uC218\uB2E8\uC5D0\uB294 \uCFE0\uD3F0\uC774 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          action: "\uB2E4\uB978 \uACB0\uC81C \uC218\uB2E8\uC744 \uC0AC\uC6A9\uD558\uAC70\uB098 \uCFE0\uD3F0 \uCF54\uB4DC\uB97C \uC81C\uAC70\uD574 \uC8FC\uC138\uC694."
        },
        stripe_error: {
          message: "\uCE74\uB4DC \uACB0\uC81C \uC11C\uBE44\uC2A4\uAC00 \uC77C\uC2DC\uC801\uC73C\uB85C \uC911\uB2E8\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
          action: "\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC2DC\uAC70\uB098, \uB300\uC2E0 \uAC00\uC0C1\uC790\uC0B0 \uACB0\uC81C\uB97C \uC774\uC6A9\uD574 \uC8FC\uC138\uC694."
        },
        rpc_error: {
          message: "\uBE14\uB85D\uCCB4\uC778 \uB124\uD2B8\uC6CC\uD06C\uB97C \uC77C\uC2DC\uC801\uC73C\uB85C \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
          action: "\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC2DC\uAC70\uB098, \uB300\uC2E0 \uCE74\uB4DC \uACB0\uC81C\uB97C \uC774\uC6A9\uD574 \uC8FC\uC138\uC694."
        },
        network_error: {
          message: "\uB124\uD2B8\uC6CC\uD06C \uC5F0\uACB0 \uBB38\uC81C",
          action: "\uC778\uD130\uB137 \uC5F0\uACB0\uC744 \uD655\uC778\uD55C \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        internal_error: {
          message: "\uB2F9\uC0AC \uCE21 \uBB38\uC81C\uB85C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4",
          action: "\uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694. \uACC4\uC18D\uB418\uBA74 \uACE0\uAC1D \uC9C0\uC6D0\uC5D0 \uBB38\uC758\uD574 \uC8FC\uC138\uC694."
        },
        database_error: {
          message: "\uC11C\uBE44\uC2A4\uB97C \uC77C\uC2DC\uC801\uC73C\uB85C \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
          action: "\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        },
        config_error: {
          message: "\uC11C\uBE44\uC2A4 \uAD6C\uC131 \uC624\uB958",
          action: "\uB3C4\uC6C0\uC774 \uD544\uC694\uD558\uC2DC\uBA74 \uACE0\uAC1D \uC9C0\uC6D0\uC5D0 \uBB38\uC758\uD574 \uC8FC\uC138\uC694."
        },
        unknown_error: {
          message: "\uC608\uAE30\uCE58 \uC54A\uC740 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4",
          action: "\uB2E4\uC2DC \uC2DC\uB3C4\uD558\uAC70\uB098, \uACC4\uC18D\uB418\uBA74 \uACE0\uAC1D \uC9C0\uC6D0\uC5D0 \uBB38\uC758\uD574 \uC8FC\uC138\uC694."
        }
      },
      validation: {
        unknown_token_mint: "\uACBD\uACE0: \uC778\uC2DD\uB418\uC9C0 \uC54A\uC740 \uD1A0\uD070 \uBBFC\uD2B8 \uC8FC\uC18C\uC785\uB2C8\uB2E4. \uC790\uAE08 \uC190\uC2E4\uC744 \uD53C\uD558\uAE30 \uC704\uD574 \uC62C\uBC14\uB978 \uD1A0\uD070\uC778\uC9C0 \uB2E4\uC2DC \uD655\uC778\uD558\uC138\uC694.",
        token_typo_warning: "\uD1A0\uD070 \uC8FC\uC18C\uAC00 \uC54C\uB824\uC9C4 \uC2A4\uD14C\uC774\uBE14\uCF54\uC778(USDC, USDT, PYUSD, CASH)\uACFC \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uC601\uAD6C\uC801\uC778 \uC790\uAE08 \uC190\uC2E4\uC744 \uBC29\uC9C0\uD558\uB824\uBA74 \uC8FC\uC758 \uAE4A\uAC8C \uD655\uC778\uD558\uC138\uC694."
      },
      wallet: {
        no_wallet_detected: "Solana \uC9C0\uAC11\uC774 \uAC10\uC9C0\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
        install_wallet: "Phantom, Solflare, Backpack \uB4F1\uC758 Solana \uC9C0\uAC11\uC744 \uC124\uCE58\uD574 \uC8FC\uC138\uC694.",
        wallet_not_connected: "\uC9C0\uAC11\uC774 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
        connect_your_wallet: "\uACC4\uC18D\uD558\uB824\uBA74 \uC9C0\uAC11\uC744 \uC5F0\uACB0\uD574 \uC8FC\uC138\uC694.",
        wallet_connection_failed: "\uC9C0\uAC11 \uC5F0\uACB0\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4",
        try_again: "\uB2E4\uC2DC \uC5F0\uACB0\uC744 \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.",
        transaction_rejected: "\uAC70\uB798\uAC00 \uAC70\uBD80\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
        approve_in_wallet: "\uACC4\uC18D\uD558\uB824\uBA74 \uC9C0\uAC11\uC5D0\uC11C \uAC70\uB798\uB97C \uC2B9\uC778\uD574 \uC8FC\uC138\uC694.",
        select_wallet: "\uC9C0\uAC11 \uC120\uD0DD",
        change: "\uBCC0\uACBD"
      }
    };
  }
});

// src/i18n/translations/ms.json
var require_ms = __commonJS({
  "src/i18n/translations/ms.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - Fail Sumber Terjemahan (Bahasa Melayu)",
      version: "1.0.0",
      locale: "ms",
      ui: {
        pay_with_card: "Bayar dengan Kad",
        pay_with_crypto: "Bayar dengan USDC",
        pay_with_usdc: "Bayar dengan USDC",
        purchase: "Beli",
        card: "Kad",
        usdc_solana: "USDC (Solana)",
        crypto: "Kripto",
        connect_wallet: "Sambungkan Dompet",
        connecting: "Menyambung...",
        processing: "Memproses...",
        loading: "Memuatkan...",
        close: "Tutup",
        cancel: "Batal",
        confirm: "Sahkan",
        retry: "Cuba Lagi",
        go_back: "Kembali",
        contact_support: "Hubungi Sokongan",
        pay_with_credits: "Bayar dengan kredit",
        credits: "Kredit",
        disconnect: "Putuskan sambungan",
        payment_successful: "Pembayaran berjaya!",
        subscribe: "Langgan",
        subscribe_with_crypto: "Langgan dengan USDC",
        subscribe_with_credits: "Langgan dengan kredit",
        subscribed: "Dilanggan",
        subscribed_until: "Dilanggan hingga",
        subscription_active: "Langganan anda aktif!",
        redirecting_to_checkout: "Mengalihkan ke pembayaran..."
      },
      errors: {
        invalid_payment_proof: {
          message: "Pengesahan pembayaran gagal",
          action: "Sila cuba buat pembayaran semula. Jika masalah berterusan, hubungi sokongan."
        },
        invalid_signature: {
          message: "Tandatangan transaksi tidak sah",
          action: "Sila luluskan transaksi dalam dompet anda dan cuba lagi."
        },
        invalid_transaction: {
          message: "Format transaksi tidak sah",
          action: "Sila cuba pembayaran anda sekali lagi. Jika berterusan, cuba kemas kini aplikasi dompet anda."
        },
        transaction_not_found: {
          message: "Transaksi tidak ditemui pada rantaian blok",
          action: "Transaksi anda mungkin masih diproses. Tunggu sebentar dan semak dompet anda, atau cuba lagi."
        },
        transaction_not_confirmed: {
          message: "Transaksi masih diproses",
          action: "Sila tunggu sebentar untuk rantaian blok mengesahkan transaksi anda, kemudian cuba lagi."
        },
        transaction_failed: {
          message: "Transaksi gagal pada rantaian blok",
          action: "Semak dompet anda untuk butiran. Anda mungkin perlu melaraskan tetapan transaksi atau menambah lebih banyak SOL untuk yuran."
        },
        transaction_expired: {
          message: "Transaksi mengambil masa terlalu lama untuk diproses",
          action: "Sila cuba pembayaran anda sekali lagi. Pertimbangkan untuk meningkatkan keutamaan transaksi jika dompet anda menyokongnya."
        },
        invalid_recipient: {
          message: "Pembayaran dihantar ke alamat yang salah",
          action: "Sila cuba lagi dan pastikan anda meluluskan transaksi yang betul dalam dompet."
        },
        invalid_sender: {
          message: "Dompet penghantar pembayaran tidak sah",
          action: "Sila sambungkan semula dompet anda dan cuba lagi."
        },
        unauthorized_refund_issuer: {
          message: "Anda tidak dibenarkan mengeluarkan bayaran balik",
          action: "Hanya akaun yang diberi kuasa boleh memproses bayaran balik. Sila hubungi sokongan jika ini adalah ralat."
        },
        amount_below_minimum: {
          message: "Jumlah pembayaran terlalu rendah",
          action: "Sila semak jumlah yang diperlukan dan cuba lagi."
        },
        amount_mismatch: {
          message: "Jumlah pembayaran tidak sepadan dengan sebut harga",
          action: "Harga mungkin telah berubah. Sila segar semula dan cuba pembayaran anda semula."
        },
        insufficient_funds_sol: {
          message: "SOL tidak mencukupi untuk yuran transaksi",
          action: "Tambahkan sekurang-kurangnya 0.001 SOL ke dompet anda untuk menampung yuran rangkaian, kemudian cuba lagi."
        },
        insufficient_funds_token: {
          message: "Baki dalam dompet anda tidak mencukupi",
          action: "Tambah lebih banyak dana ke dompet anda dan cuba lagi."
        },
        invalid_token_mint: {
          message: "Token pembayaran tidak betul",
          action: "Sila bayar dengan token yang betul seperti yang ditunjukkan dalam butiran pembayaran."
        },
        not_spl_transfer: {
          message: "Transaksi bukan pemindahan token yang sah",
          action: "Pastikan anda menghantar jenis token yang betul daripada dompet anda."
        },
        missing_token_account: {
          message: "Akaun token tidak ditemui",
          action: "Dompet anda mungkin perlu mencipta akaun token terlebih dahulu. Cuba lagi atau gunakan dompet lain."
        },
        invalid_token_program: {
          message: "Program token tidak sah",
          action: "Sila cuba pembayaran anda sekali lagi. Jika berterusan, cuba gunakan dompet lain."
        },
        missing_memo: {
          message: "Memo pembayaran diperlukan tetapi tidak disertakan",
          action: "Sila cuba pembayaran anda semula dan pastikan butiran transaksi diluluskan dalam dompet anda."
        },
        invalid_memo: {
          message: "Format memo pembayaran tidak sah",
          action: "Sila cuba pembayaran anda semula."
        },
        payment_already_used: {
          message: "Pembayaran ini telah diproses",
          action: "Semak sejarah transaksi anda. Jika perlu membuat pembayaran lain, mulakan transaksi baharu."
        },
        signature_reused: {
          message: "Tandatangan transaksi telah digunakan",
          action: "Sila cipta transaksi pembayaran baharu."
        },
        quote_expired: {
          message: "Sebut harga pembayaran telah tamat tempoh",
          action: "Harga kerap dikemas kini. Sila segar semula dan cuba pembayaran anda semula."
        },
        missing_field: {
          message: "Maklumat yang diperlukan tiada",
          action: "Sila semak semua medan yang diperlukan dan cuba lagi."
        },
        invalid_field: {
          message: "Sesetengah maklumat tidak sah",
          action: "Sila semak input anda dan cuba lagi."
        },
        invalid_amount: {
          message: "Amaun pembayaran tidak sah",
          action: "Sila semak amaun dan cuba lagi."
        },
        invalid_wallet: {
          message: "Alamat dompet tidak sah",
          action: "Sila sambungkan semula dompet anda dan cuba lagi."
        },
        invalid_resource: {
          message: "Pilihan item tidak sah",
          action: "Sila segar semula halaman dan cuba lagi."
        },
        invalid_coupon: {
          message: "Kod kupon tidak sah",
          action: "Sila semak kod kupon dan cuba lagi."
        },
        invalid_cart_item: {
          message: "Satu atau lebih item dalam troli tidak sah",
          action: "Sila semak troli anda dan cuba lagi."
        },
        empty_cart: {
          message: "Troli anda kosong",
          action: "Sila tambah item ke troli sebelum membuat pembayaran."
        },
        resource_not_found: {
          message: "Item tidak ditemui",
          action: "Item ini mungkin tidak lagi tersedia. Sila segar semula dan cuba lagi."
        },
        cart_not_found: {
          message: "Troli beli-belah tidak ditemui",
          action: "Troli anda mungkin telah tamat tempoh. Sila mulakan pesanan baharu."
        },
        refund_not_found: {
          message: "Bayaran balik tidak ditemui",
          action: "Sila semak nombor rujukan bayaran balik anda atau hubungi sokongan."
        },
        product_not_found: {
          message: "Produk tidak tersedia",
          action: "Produk ini mungkin tidak lagi tersedia. Sila semak pilihan semasa kami."
        },
        coupon_not_found: {
          message: "Kod kupon tidak ditemui",
          action: "Sila semak kod kupon atau keluarkannya untuk meneruskan."
        },
        session_not_found: {
          message: "Sesi pembayaran telah tamat tempoh",
          action: "Sila mulakan pembayaran baharu."
        },
        cart_already_paid: {
          message: "Pesanan ini telah dibayar",
          action: "Semak sejarah pesanan anda. Jika perlu membuat pembelian lain, mulakan pesanan baharu."
        },
        refund_already_processed: {
          message: "Bayaran balik ini telah diproses",
          action: "Semak sejarah transaksi anda atau hubungi sokongan untuk butiran."
        },
        coupon_expired: {
          message: "Kupon telah tamat tempoh",
          action: "Sila keluarkan kod kupon atau gunakan kod lain."
        },
        coupon_usage_limit_reached: {
          message: "Had penggunaan kupon telah dicapai",
          action: "Kupon ini telah ditebus sepenuhnya. Sila cuba kod lain."
        },
        coupon_not_applicable: {
          message: "Kupon tidak boleh digunakan untuk pembelian ini",
          action: "Sila semak terma kupon atau keluarkannya untuk meneruskan."
        },
        coupon_wrong_payment_method: {
          message: "Kupon tidak sah untuk kaedah pembayaran ini",
          action: "Cuba kaedah pembayaran lain atau keluarkan kod kupon."
        },
        stripe_error: {
          message: "Perkhidmatan pembayaran kad tidak tersedia buat sementara",
          action: "Sila cuba lagi sebentar lagi, atau gunakan pembayaran kripto."
        },
        rpc_error: {
          message: "Rangkaian blockchain tidak tersedia buat sementara",
          action: "Sila cuba lagi sebentar lagi, atau gunakan pembayaran kad."
        },
        network_error: {
          message: "Masalah sambungan rangkaian",
          action: "Sila semak sambungan internet anda dan cuba lagi."
        },
        internal_error: {
          message: "Terdapat ralat di pihak kami",
          action: "Sila cuba lagi. Jika berterusan, hubungi sokongan."
        },
        database_error: {
          message: "Perkhidmatan tidak tersedia buat sementara",
          action: "Sila cuba lagi sebentar lagi."
        },
        config_error: {
          message: "Ralat konfigurasi perkhidmatan",
          action: "Sila hubungi sokongan untuk bantuan."
        },
        unknown_error: {
          message: "Ralat yang tidak dijangka berlaku",
          action: "Sila cuba lagi atau hubungi sokongan jika berterusan."
        }
      },
      validation: {
        unknown_token_mint: "Amaran: Alamat token mint tidak dikenali. Pastikan ini ialah token yang betul untuk mengelakkan kehilangan dana.",
        token_typo_warning: "Alamat token tidak sepadan dengan stablecoin yang diketahui (USDC, USDT, PYUSD, CASH). Sahkan dengan teliti bagi mengelakkan kehilangan dana secara kekal."
      },
      wallet: {
        no_wallet_detected: "Tiada dompet Solana dikesan",
        install_wallet: "Sila pasang dompet Solana seperti Phantom, Solflare, atau Backpack.",
        wallet_not_connected: "Dompet tidak disambungkan",
        connect_your_wallet: "Sila sambungkan dompet anda untuk meneruskan.",
        wallet_connection_failed: "Gagal menyambungkan dompet",
        try_again: "Sila cuba sambung semula.",
        transaction_rejected: "Transaksi telah ditolak",
        approve_in_wallet: "Sila luluskan transaksi dalam dompet anda untuk meneruskan.",
        select_wallet: "Pilih dompet",
        change: "Tukar"
      }
    };
  }
});

// src/i18n/translations/nl.json
var require_nl = __commonJS({
  "src/i18n/translations/nl.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - Vertaalbronbestand (Nederlands)",
      version: "1.0.0",
      locale: "nl",
      ui: {
        pay_with_card: "Betalen met kaart",
        pay_with_crypto: "Betalen met USDC",
        pay_with_usdc: "Betalen met USDC",
        purchase: "Aankoop",
        card: "Kaart",
        usdc_solana: "USDC (Solana)",
        crypto: "Crypto",
        connect_wallet: "Wallet verbinden",
        connecting: "Verbinden...",
        processing: "Verwerken...",
        loading: "Laden...",
        close: "Sluiten",
        cancel: "Annuleren",
        confirm: "Bevestigen",
        retry: "Opnieuw proberen",
        go_back: "Ga terug",
        contact_support: "Neem contact op met de ondersteuning",
        pay_with_credits: "Betalen met credits",
        credits: "Credits",
        disconnect: "Verbinding verbreken",
        payment_successful: "Betaling geslaagd!",
        subscribe: "Abonneren",
        subscribe_with_crypto: "Abonneren met USDC",
        subscribe_with_credits: "Abonneren met credits",
        subscribed: "Geabonneerd",
        subscribed_until: "Geabonneerd tot",
        subscription_active: "Je abonnement is actief!",
        redirecting_to_checkout: "Doorsturen naar afrekenen..."
      },
      errors: {
        invalid_payment_proof: {
          message: "Verificatie van betaling mislukt",
          action: "Probeer uw betaling opnieuw. Neem contact op met de ondersteuning als dit blijft gebeuren."
        },
        invalid_signature: {
          message: "Transactiehandtekening is ongeldig",
          action: "Keur de transactie in uw wallet goed en probeer het opnieuw."
        },
        invalid_transaction: {
          message: "Transactie-indeling is ongeldig",
          action: "Probeer uw betaling opnieuw. Als dit blijft gebeuren, werk dan uw wallet-app bij."
        },
        transaction_not_found: {
          message: "Transactie niet gevonden op de blockchain",
          action: "Uw transactie kan nog worden verwerkt. Wacht even en controleer uw wallet, of probeer het opnieuw."
        },
        transaction_not_confirmed: {
          message: "Transactie wordt nog verwerkt",
          action: "Wacht even tot de blockchain uw transactie bevestigt en probeer het dan opnieuw."
        },
        transaction_failed: {
          message: "Transactie is mislukt op de blockchain",
          action: "Controleer uw wallet voor details. Mogelijk moet u uw transactiesettings aanpassen of meer SOL toevoegen voor kosten."
        },
        transaction_expired: {
          message: "Het verwerken van de transactie duurde te lang",
          action: "Probeer uw betaling opnieuw. Overweeg de transactieprioriteit te verhogen als uw wallet dit ondersteunt."
        },
        invalid_recipient: {
          message: "Betaling is naar het verkeerde adres verzonden",
          action: "Probeer opnieuw en zorg dat u de juiste transactie in uw wallet goedkeurt."
        },
        invalid_sender: {
          message: "Wallet van betaler is ongeldig",
          action: "Verbind uw wallet opnieuw en probeer het opnieuw."
        },
        unauthorized_refund_issuer: {
          message: "U bent niet gemachtigd om terugbetalingen uit te voeren",
          action: "Alleen geautoriseerde accounts kunnen terugbetalingen verwerken. Neem contact op met de ondersteuning als dit onjuist is."
        },
        amount_below_minimum: {
          message: "Betalingsbedrag is te laag",
          action: "Controleer het vereiste bedrag en probeer opnieuw."
        },
        amount_mismatch: {
          message: "Betalingsbedrag komt niet overeen met de offerte",
          action: "De prijs kan zijn gewijzigd. Vernieuw de pagina en probeer uw betaling opnieuw."
        },
        insufficient_funds_sol: {
          message: "Onvoldoende SOL voor transactiekosten",
          action: "Voeg minimaal 0,001 SOL toe aan uw wallet om netwerkkosten te dekken en probeer opnieuw."
        },
        insufficient_funds_token: {
          message: "Onvoldoende saldo in uw wallet",
          action: "Voeg meer tegoeden toe aan uw wallet en probeer opnieuw."
        },
        invalid_token_mint: {
          message: "Onjuiste betalingstoken",
          action: "Betaal met de juiste token zoals aangegeven in de betalingsdetails."
        },
        not_spl_transfer: {
          message: "Transactie is geen geldige tokentransfer",
          action: "Zorg dat u het juiste tokentype vanuit uw wallet verzendt."
        },
        missing_token_account: {
          message: "Tokenaccount niet gevonden",
          action: "Uw wallet moet mogelijk eerst een tokenaccount aanmaken. Probeer opnieuw of gebruik een andere wallet."
        },
        invalid_token_program: {
          message: "Ongeldig tokenprogramma",
          action: "Probeer uw betaling opnieuw. Probeer anders een andere wallet."
        },
        missing_memo: {
          message: "Betalingsmemo is vereist maar ontbrak",
          action: "Probeer uw betaling opnieuw en zorg dat u de transactiedetails in uw wallet goedkeurt."
        },
        invalid_memo: {
          message: "Indeling van betalingsmemo is ongeldig",
          action: "Probeer uw betaling opnieuw."
        },
        payment_already_used: {
          message: "Deze betaling is al verwerkt",
          action: "Controleer uw transactiegeschiedenis. Als u opnieuw wilt betalen, start dan een nieuwe transactie."
        },
        signature_reused: {
          message: "Transactiehandtekening is al gebruikt",
          action: "Maak een nieuwe betalingstransactie."
        },
        quote_expired: {
          message: "Betalingsofferte is verlopen",
          action: "Prijzen worden vaak bijgewerkt. Vernieuw en probeer opnieuw."
        },
        missing_field: {
          message: "Vereiste informatie ontbreekt",
          action: "Controleer alle vereiste velden en probeer opnieuw."
        },
        invalid_field: {
          message: "Sommige informatie is ongeldig",
          action: "Controleer uw invoer en probeer opnieuw."
        },
        invalid_amount: {
          message: "Betalingsbedrag is ongeldig",
          action: "Controleer het bedrag en probeer opnieuw."
        },
        invalid_wallet: {
          message: "Walletadres is ongeldig",
          action: "Verbind uw wallet opnieuw en probeer het opnieuw."
        },
        invalid_resource: {
          message: "Ongeldige itemselectie",
          action: "Ververs de pagina en probeer opnieuw."
        },
        invalid_coupon: {
          message: "Ongeldige couponcode",
          action: "Controleer de couponcode en probeer opnieuw."
        },
        invalid_cart_item: {
          message: "Een of meer winkelwagenartikelen zijn ongeldig",
          action: "Controleer uw winkelwagen en probeer opnieuw."
        },
        empty_cart: {
          message: "Uw winkelwagen is leeg",
          action: "Voeg items toe aan uw winkelwagen voordat u afrekent."
        },
        resource_not_found: {
          message: "Item niet gevonden",
          action: "Dit item is mogelijk niet meer beschikbaar. Vernieuw en probeer opnieuw."
        },
        cart_not_found: {
          message: "Winkelwagen niet gevonden",
          action: "Uw winkelwagen is mogelijk verlopen. Start een nieuwe bestelling."
        },
        refund_not_found: {
          message: "Terugbetaling niet gevonden",
          action: "Controleer uw referentienummer voor de terugbetaling of neem contact op met de ondersteuning."
        },
        product_not_found: {
          message: "Product niet beschikbaar",
          action: "Dit product is mogelijk niet meer beschikbaar. Bekijk onze huidige selectie."
        },
        coupon_not_found: {
          message: "Couponcode niet gevonden",
          action: "Controleer de couponcode of verwijder deze om door te gaan."
        },
        session_not_found: {
          message: "Betalingssessie verlopen",
          action: "Start een nieuwe betaling."
        },
        cart_already_paid: {
          message: "Deze bestelling is al betaald",
          action: "Controleer uw bestelgeschiedenis. Voor een nieuwe aankoop start u een nieuwe bestelling."
        },
        refund_already_processed: {
          message: "Deze terugbetaling is al verwerkt",
          action: "Controleer uw transactiegeschiedenis of neem contact op met de ondersteuning."
        },
        coupon_expired: {
          message: "Coupon is verlopen",
          action: "Verwijder de couponcode of gebruik een andere code."
        },
        coupon_usage_limit_reached: {
          message: "Limiet voor gebruik van coupon bereikt",
          action: "Deze coupon is volledig verzilverd. Probeer een andere code."
        },
        coupon_not_applicable: {
          message: "Coupon kan niet op deze aankoop worden toegepast",
          action: "Controleer de couponentermen of verwijder deze om door te gaan."
        },
        coupon_wrong_payment_method: {
          message: "Coupon is niet geldig voor deze betaalmethode",
          action: "Probeer een andere betaalmethode of verwijder de couponcode."
        },
        stripe_error: {
          message: "Kaartbetalingsdienst tijdelijk niet beschikbaar",
          action: "Probeer het zo meteen opnieuw, of gebruik in plaats daarvan cryptobetalingen."
        },
        rpc_error: {
          message: "Blockchainnetwerk tijdelijk niet beschikbaar",
          action: "Probeer het zo meteen opnieuw, of gebruik in plaats daarvan kaartbetaling."
        },
        network_error: {
          message: "Netwerkverbindingsprobleem",
          action: "Controleer uw internetverbinding en probeer opnieuw."
        },
        internal_error: {
          message: "Er is iets misgegaan aan onze kant",
          action: "Probeer opnieuw. Neem contact op met de ondersteuning als dit blijft gebeuren."
        },
        database_error: {
          message: "Dienst tijdelijk niet beschikbaar",
          action: "Probeer het over een moment."
        },
        config_error: {
          message: "Configuratiefout van de dienst",
          action: "Neem contact op met de ondersteuning voor hulp."
        },
        unknown_error: {
          message: "Er is een onverwachte fout opgetreden",
          action: "Probeer opnieuw of neem contact op met de ondersteuning als dit blijft gebeuren."
        }
      },
      validation: {
        unknown_token_mint: "Waarschuwing: Onbekend token mint\u2011adres. Controleer goed of dit de juiste token is om verlies van geld te voorkomen.",
        token_typo_warning: "Tokenadres komt niet overeen met bekende stablecoins (USDC, USDT, PYUSD, CASH). Controleer zorgvuldig om permanent verlies van gelden te voorkomen."
      },
      wallet: {
        no_wallet_detected: "Geen Solana\u2011wallet gedetecteerd",
        install_wallet: "Installeer een Solana\u2011wallet zoals Phantom, Solflare of Backpack.",
        wallet_not_connected: "Wallet niet verbonden",
        connect_your_wallet: "Verbind uw wallet om door te gaan.",
        wallet_connection_failed: "Verbinden met wallet mislukt",
        try_again: "Probeer opnieuw verbinding te maken.",
        transaction_rejected: "Transactie is geweigerd",
        approve_in_wallet: "Keur de transactie in uw wallet goed om door te gaan.",
        select_wallet: "Wallet selecteren",
        change: "Wijzigen"
      }
    };
  }
});

// src/i18n/translations/pa.json
var require_pa = __commonJS({
  "src/i18n/translations/pa.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \u0A05\u0A28\u0A41\u0A35\u0A3E\u0A26 \u0A38\u0A30\u0A4B\u0A24 \u0A2B\u0A3C\u0A3E\u0A08\u0A32 (\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40)",
      version: "1.0.0",
      locale: "pa",
      ui: {
        pay_with_card: "\u0A15\u0A3E\u0A30\u0A21 \u0A28\u0A3E\u0A32 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A15\u0A30\u0A4B",
        pay_with_crypto: "USDC \u0A28\u0A3E\u0A32 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A15\u0A30\u0A4B",
        pay_with_usdc: "USDC \u0A28\u0A3E\u0A32 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A15\u0A30\u0A4B",
        purchase: "\u0A16\u0A30\u0A40\u0A26\u0A4B",
        card: "\u0A15\u0A3E\u0A30\u0A21",
        usdc_solana: "USDC (Solana)",
        crypto: "\u0A15\u0A4D\u0A30\u0A3F\u0A2A\u0A1F\u0A4B",
        connect_wallet: "\u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A1C\u0A4B\u0A5C\u0A4B",
        connecting: "\u0A1C\u0A41\u0A5C\u0A3F\u0A06 \u0A1C\u0A3E \u0A30\u0A3F\u0A39\u0A3E \u0A39\u0A48...",
        processing: "\u0A2A\u0A4D\u0A30\u0A15\u0A3F\u0A30\u0A3F\u0A06 \u0A1A\u0A71\u0A32 \u0A30\u0A39\u0A40 \u0A39\u0A48...",
        loading: "\u0A32\u0A4B\u0A21 \u0A39\u0A4B \u0A30\u0A3F\u0A39\u0A3E \u0A39\u0A48...",
        close: "\u0A2C\u0A70\u0A26 \u0A15\u0A30\u0A4B",
        cancel: "\u0A30\u0A71\u0A26 \u0A15\u0A30\u0A4B",
        confirm: "\u0A2A\u0A41\u0A38\u0A3C\u0A1F\u0A40 \u0A15\u0A30\u0A4B",
        retry: "\u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B",
        go_back: "\u0A35\u0A3E\u0A2A\u0A38 \u0A1C\u0A3E\u0A13",
        contact_support: "\u0A38\u0A39\u0A3E\u0A07\u0A24\u0A3E \u0A28\u0A3E\u0A32 \u0A38\u0A70\u0A2A\u0A30\u0A15 \u0A15\u0A30\u0A4B",
        pay_with_credits: "\u0A15\u0A4D\u0A30\u0A48\u0A21\u0A3F\u0A1F \u0A28\u0A3E\u0A32 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A15\u0A30\u0A4B",
        credits: "\u0A15\u0A4D\u0A30\u0A48\u0A21\u0A3F\u0A1F",
        disconnect: "\u0A21\u0A3F\u0A38\u0A15\u0A28\u0A48\u0A15\u0A1F \u0A15\u0A30\u0A4B",
        payment_successful: "\u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A38\u0A2B\u0A32 \u0A39\u0A4B\u0A07\u0A06!",
        subscribe: "\u0A38\u0A2C\u0A38\u0A15\u0A4D\u0A30\u0A3E\u0A08\u0A2C \u0A15\u0A30\u0A4B",
        subscribe_with_crypto: "USDC \u0A28\u0A3E\u0A32 \u0A38\u0A2C\u0A38\u0A15\u0A4D\u0A30\u0A3E\u0A08\u0A2C \u0A15\u0A30\u0A4B",
        subscribe_with_credits: "\u0A15\u0A4D\u0A30\u0A48\u0A21\u0A3F\u0A1F \u0A28\u0A3E\u0A32 \u0A38\u0A2C\u0A38\u0A15\u0A4D\u0A30\u0A3E\u0A08\u0A2C \u0A15\u0A30\u0A4B",
        subscribed: "\u0A38\u0A2C\u0A38\u0A15\u0A4D\u0A30\u0A3E\u0A08\u0A2C \u0A15\u0A40\u0A24\u0A3E",
        subscribed_until: "\u0A24\u0A71\u0A15 \u0A38\u0A2C\u0A38\u0A15\u0A4D\u0A30\u0A3E\u0A08\u0A2C \u0A15\u0A40\u0A24\u0A3E",
        subscription_active: "\u0A24\u0A41\u0A39\u0A3E\u0A21\u0A40 \u0A38\u0A2C\u0A38\u0A15\u0A4D\u0A30\u0A3F\u0A2A\u0A38\u0A3C\u0A28 \u0A38\u0A30\u0A17\u0A30\u0A2E \u0A39\u0A48!",
        redirecting_to_checkout: "\u0A1A\u0A48\u0A15\u0A06\u0A09\u0A1F \u0A35\u0A71\u0A32 \u0A2D\u0A47\u0A1C\u0A3F\u0A06 \u0A1C\u0A3E \u0A30\u0A3F\u0A39\u0A3E \u0A39\u0A48..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A26\u0A40 \u0A24\u0A38\u0A26\u0A40\u0A15 \u0A05\u0A38\u0A2B\u0A32 \u0A30\u0A39\u0A40",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A06\u0A2A\u0A23\u0A3E \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964 \u0A1C\u0A47 \u0A38\u0A2E\u0A71\u0A38\u0A3F\u0A06 \u0A1C\u0A3E\u0A30\u0A40 \u0A30\u0A39\u0A47, \u0A38\u0A39\u0A3E\u0A07\u0A24\u0A3E \u0A28\u0A3E\u0A32 \u0A38\u0A70\u0A2A\u0A30\u0A15 \u0A15\u0A30\u0A4B\u0964"
        },
        invalid_signature: {
          message: "\u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A38\u0A3F\u0A17\u0A28\u0A47\u0A1A\u0A30 \u0A17\u0A32\u0A24 \u0A39\u0A48",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A06\u0A2A\u0A23\u0A47 \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A35\u0A3F\u0A71\u0A1A \u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A2E\u0A28\u0A1C\u0A3C\u0A42\u0A30 \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        invalid_transaction: {
          message: "\u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A26\u0A3E \u0A2B\u0A3E\u0A30\u0A2E\u0A48\u0A1F \u0A17\u0A32\u0A24 \u0A39\u0A48",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A30\u0A4B\u0964 \u0A1C\u0A47 \u0A07\u0A39 \u0A1C\u0A3E\u0A30\u0A40 \u0A30\u0A39\u0A47, \u0A06\u0A2A\u0A23\u0A40 \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A10\u0A2A \u0A05\u0A71\u0A2A\u0A21\u0A47\u0A1F \u0A15\u0A30\u0A28 \u0A26\u0A40 \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        transaction_not_found: {
          message: "\u0A2C\u0A32\u0A4C\u0A15\u0A1A\u0A47\u0A28 \u2018\u0A24\u0A47 \u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A28\u0A39\u0A40\u0A02 \u0A2E\u0A3F\u0A32\u0A40",
          action: "\u0A24\u0A41\u0A39\u0A3E\u0A21\u0A40 \u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A39\u0A3E\u0A32\u0A47 \u0A35\u0A40 \u0A2A\u0A4D\u0A30\u0A15\u0A3F\u0A30\u0A3F\u0A06 \u0A35\u0A3F\u0A71\u0A1A \u0A39\u0A4B \u0A38\u0A15\u0A26\u0A40 \u0A39\u0A48\u0964 \u0A15\u0A41\u0A1D \u0A38\u0A2E\u0A3E\u0A02 \u0A09\u0A21\u0A40\u0A15 \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B, \u0A1C\u0A3E\u0A02 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        transaction_not_confirmed: {
          message: "\u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A39\u0A3E\u0A32\u0A47 \u0A2A\u0A4D\u0A30\u0A15\u0A3F\u0A30\u0A3F\u0A06 \u0A35\u0A3F\u0A71\u0A1A \u0A39\u0A48",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A2C\u0A32\u0A4C\u0A15\u0A1A\u0A47\u0A28 \u0A35\u0A71\u0A32\u0A4B\u0A02 \u0A2A\u0A41\u0A38\u0A3C\u0A1F\u0A40 \u0A32\u0A08 \u0A15\u0A41\u0A1D \u0A38\u0A2E\u0A3E\u0A02 \u0A09\u0A21\u0A40\u0A15 \u0A15\u0A30\u0A4B, \u0A2B\u0A3F\u0A30 \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        transaction_failed: {
          message: "\u0A2C\u0A32\u0A4C\u0A15\u0A1A\u0A47\u0A28 \u2018\u0A24\u0A47 \u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A05\u0A38\u0A2B\u0A32 \u0A30\u0A39\u0A40",
          action: "\u0A35\u0A47\u0A30\u0A35\u0A3F\u0A06\u0A02 \u0A32\u0A08 \u0A06\u0A2A\u0A23\u0A3E \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B\u0964 \u0A24\u0A41\u0A39\u0A3E\u0A28\u0A42\u0A70 \u0A38\u0A48\u0A1F\u0A3F\u0A70\u0A17\u0A3E\u0A02 \u0A38\u0A4B\u0A27\u0A23\u0A40\u0A06\u0A02 \u0A1C\u0A3E\u0A02 \u0A2B\u0A40\u0A38\u0A3E\u0A02 \u0A32\u0A08 \u0A39\u0A4B\u0A30 SOL \u0A1C\u0A4B\u0A5C\u0A23 \u0A26\u0A40 \u0A32\u0A4B\u0A5C \u0A39\u0A4B \u0A38\u0A15\u0A26\u0A40 \u0A39\u0A48\u0964"
        },
        transaction_expired: {
          message: "\u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A28\u0A42\u0A70 \u0A2A\u0A4D\u0A30\u0A15\u0A3F\u0A30\u0A3F\u0A06 \u0A15\u0A30\u0A23 \u0A35\u0A3F\u0A71\u0A1A \u0A2C\u0A39\u0A41\u0A24 \u0A38\u0A2E\u0A3E\u0A02 \u0A32\u0A71\u0A17 \u0A17\u0A3F\u0A06",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A30\u0A4B\u0964 \u0A1C\u0A47 \u0A38\u0A70\u0A2D\u0A35 \u0A39\u0A4B\u0A35\u0A47, \u0A06\u0A2A\u0A23\u0A47 \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A35\u0A3F\u0A71\u0A1A \u0A2A\u0A4D\u0A30\u0A3E\u0A25\u0A2E\u0A3F\u0A15\u0A24\u0A3E \u0A35\u0A27\u0A3E\u0A13\u0964"
        },
        invalid_recipient: {
          message: "\u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A17\u0A32\u0A24 \u0A2A\u0A24\u0A47 \u2018\u0A24\u0A47 \u0A2D\u0A47\u0A1C\u0A3F\u0A06 \u0A17\u0A3F\u0A06",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A2F\u0A15\u0A40\u0A28\u0A40 \u0A2C\u0A23\u0A3E\u0A13 \u0A15\u0A3F \u0A24\u0A41\u0A38\u0A40\u0A02 \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A35\u0A3F\u0A71\u0A1A \u0A38\u0A39\u0A40 \u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A2E\u0A28\u0A1C\u0A3C\u0A42\u0A30 \u0A15\u0A30 \u0A30\u0A39\u0A47 \u0A39\u0A4B\u0964"
        },
        invalid_sender: {
          message: "\u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A2D\u0A47\u0A1C\u0A23 \u0A35\u0A3E\u0A32\u0A3E \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A17\u0A32\u0A24 \u0A39\u0A48",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A06\u0A2A\u0A23\u0A3E \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A2E\u0A41\u0A5C \u0A1C\u0A4B\u0A5C\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        unauthorized_refund_issuer: {
          message: "\u0A24\u0A41\u0A39\u0A3E\u0A28\u0A42\u0A70 \u0A30\u0A3F\u0A2B\u0A70\u0A21 \u0A1C\u0A3E\u0A30\u0A40 \u0A15\u0A30\u0A28 \u0A26\u0A40 \u0A07\u0A1C\u0A3E\u0A1C\u0A3C\u0A24 \u0A28\u0A39\u0A40\u0A02",
          action: "\u0A15\u0A47\u0A35\u0A32 \u0A05\u0A27\u0A3F\u0A15\u0A4D\u0A30\u0A24 \u0A16\u0A3E\u0A24\u0A47 \u0A39\u0A40 \u0A30\u0A3F\u0A2B\u0A70\u0A21 \u0A15\u0A30 \u0A38\u0A15\u0A26\u0A47 \u0A39\u0A28\u0964 \u0A1C\u0A47 \u0A07\u0A39 \u0A17\u0A32\u0A24\u0A40 \u0A32\u0A71\u0A17\u0A47 \u0A24\u0A3E\u0A02 \u0A38\u0A39\u0A3E\u0A07\u0A24\u0A3E \u0A28\u0A3E\u0A32 \u0A38\u0A70\u0A2A\u0A30\u0A15 \u0A15\u0A30\u0A4B\u0964"
        },
        amount_below_minimum: {
          message: "\u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A30\u0A15\u0A2E \u0A2C\u0A39\u0A41\u0A24 \u0A18\u0A71\u0A1F \u0A39\u0A48",
          action: "\u0A32\u0A4B\u0A5C\u0A40\u0A02\u0A26\u0A40 \u0A30\u0A15\u0A2E \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        amount_mismatch: {
          message: "\u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A30\u0A15\u0A2E \u0A15\u0A4B\u0A1F\u0A47 \u0A28\u0A3E\u0A32 \u0A2E\u0A47\u0A32 \u0A28\u0A39\u0A40\u0A02 \u0A16\u0A3E\u0A02\u0A26\u0A40",
          action: "\u0A15\u0A40\u0A2E\u0A24 \u0A2C\u0A26\u0A32\u0A40 \u0A39\u0A4B \u0A38\u0A15\u0A26\u0A40 \u0A39\u0A48\u0964 \u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A30\u0A3F\u0A2B\u0A4D\u0A30\u0A48\u0A38\u0A3C \u0A15\u0A30\u0A15\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A15\u0A30\u0A4B\u0964"
        },
        insufficient_funds_sol: {
          message: "\u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A2B\u0A40\u0A38\u0A3E\u0A02 \u0A32\u0A08 SOL \u0A15\u0A3E\u0A2B\u0A3C\u0A40 \u0A28\u0A39\u0A40\u0A02",
          action: "\u0A28\u0A48\u0A1F\u0A35\u0A30\u0A15 \u0A2B\u0A40\u0A38\u0A3E\u0A02 \u0A32\u0A08 \u0A18\u0A71\u0A1F\u0A4B-\u0A18\u0A71\u0A1F 0.001 SOL \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A35\u0A3F\u0A71\u0A1A \u0A1C\u0A4B\u0A5C\u0A4B, \u0A2B\u0A3F\u0A30 \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        insufficient_funds_token: {
          message: "\u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A35\u0A3F\u0A71\u0A1A \u0A2C\u0A15\u0A3E\u0A07\u0A06 \u0A15\u0A3E\u0A2B\u0A3C\u0A40 \u0A28\u0A39\u0A40\u0A02",
          action: "\u0A39\u0A4B\u0A30 \u0A30\u0A15\u0A2E \u0A1C\u0A4B\u0A5C\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        invalid_token_mint: {
          message: "\u0A17\u0A32\u0A24 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A1F\u0A4B\u0A15\u0A28",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A35\u0A47\u0A30\u0A35\u0A3F\u0A06\u0A02 \u0A35\u0A3F\u0A71\u0A1A \u0A26\u0A3F\u0A16\u0A3E\u0A0F \u0A17\u0A0F \u0A38\u0A39\u0A40 \u0A1F\u0A4B\u0A15\u0A28 \u0A28\u0A3E\u0A32 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A15\u0A30\u0A4B\u0964"
        },
        not_spl_transfer: {
          message: "\u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A35\u0A48\u0A27 \u0A1F\u0A4B\u0A15\u0A28 \u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A38\u0A2B\u0A30 \u0A28\u0A39\u0A40\u0A02",
          action: "\u0A2F\u0A15\u0A40\u0A28\u0A40 \u0A2C\u0A23\u0A3E\u0A13 \u0A15\u0A3F \u0A24\u0A41\u0A38\u0A40\u0A02 \u0A06\u0A2A\u0A23\u0A47 \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A24\u0A4B\u0A02 \u0A38\u0A39\u0A40 \u0A1F\u0A4B\u0A15\u0A28 \u0A15\u0A3F\u0A38\u0A2E \u0A2D\u0A47\u0A1C \u0A30\u0A39\u0A47 \u0A39\u0A4B\u0964"
        },
        missing_token_account: {
          message: "\u0A1F\u0A4B\u0A15\u0A28 \u0A16\u0A3E\u0A24\u0A3E \u0A28\u0A39\u0A40\u0A02 \u0A2E\u0A3F\u0A32\u0A3F\u0A06",
          action: "\u0A24\u0A41\u0A39\u0A3E\u0A21\u0A47 \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A28\u0A42\u0A70 \u0A2A\u0A39\u0A3F\u0A32\u0A3E\u0A02 \u0A1F\u0A4B\u0A15\u0A28 \u0A16\u0A3E\u0A24\u0A3E \u0A2C\u0A23\u0A3E\u0A09\u0A23 \u0A26\u0A40 \u0A32\u0A4B\u0A5C \u0A39\u0A4B \u0A38\u0A15\u0A26\u0A40 \u0A39\u0A48\u0964 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B \u0A1C\u0A3E\u0A02 \u0A39\u0A4B\u0A30 \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A35\u0A30\u0A24\u0A4B\u0A02\u0964"
        },
        invalid_token_program: {
          message: "\u0A17\u0A32\u0A24 \u0A1F\u0A4B\u0A15\u0A28 \u0A2A\u0A4D\u0A30\u0A4B\u0A17\u0A30\u0A3E\u0A2E",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A15\u0A30\u0A4B\u0964 \u0A1C\u0A47 \u0A07\u0A39 \u0A1C\u0A3E\u0A30\u0A40 \u0A30\u0A39\u0A47, \u0A35\u0A71\u0A16\u0A30\u0A3E \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A05\u0A1C\u0A3C\u0A2E\u0A3E\u0A13\u0964"
        },
        missing_memo: {
          message: "\u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A2E\u0A48\u0A2E\u0A4B \u0A32\u0A3E\u0A1C\u0A3C\u0A2E\u0A40 \u0A39\u0A48 \u0A2A\u0A30 \u0A38\u0A3C\u0A3E\u0A2E\u0A32 \u0A28\u0A39\u0A40\u0A02",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A35\u0A3F\u0A71\u0A1A \u0A35\u0A47\u0A30\u0A35\u0A47 \u0A2E\u0A28\u0A1C\u0A3C\u0A42\u0A30 \u0A15\u0A30\u0A4B\u0964"
        },
        invalid_memo: {
          message: "\u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A2E\u0A48\u0A2E\u0A4B \u0A2B\u0A3E\u0A30\u0A2E\u0A48\u0A1F \u0A17\u0A32\u0A24 \u0A39\u0A48",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A30\u0A4B\u0964"
        },
        payment_already_used: {
          message: "\u0A07\u0A39 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A2A\u0A39\u0A3F\u0A32\u0A3E\u0A02 \u0A39\u0A40 \u0A2A\u0A4D\u0A30\u0A15\u0A3F\u0A30\u0A3F\u0A06 \u0A15\u0A40\u0A24\u0A3E \u0A1C\u0A3E \u0A1A\u0A41\u0A71\u0A15\u0A3E \u0A39\u0A48",
          action: "\u0A06\u0A2A\u0A23\u0A3E \u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A07\u0A24\u0A3F\u0A39\u0A3E\u0A38 \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B\u0964 \u0A39\u0A4B\u0A30 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A32\u0A08 \u0A28\u0A35\u0A40\u0A02 \u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A15\u0A30\u0A4B\u0964"
        },
        signature_reused: {
          message: "\u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A38\u0A3F\u0A17\u0A28\u0A47\u0A1A\u0A30 \u0A2A\u0A39\u0A3F\u0A32\u0A3E\u0A02 \u0A39\u0A40 \u0A35\u0A30\u0A24\u0A40 \u0A1C\u0A3E \u0A1A\u0A41\u0A71\u0A15\u0A40 \u0A39\u0A48",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A28\u0A35\u0A40\u0A02 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A2C\u0A23\u0A3E\u0A13\u0964"
        },
        quote_expired: {
          message: "\u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A15\u0A4B\u0A1F\u0A3E \u0A2E\u0A3F\u0A06\u0A26 \u0A24\u0A4B\u0A02 \u0A2C\u0A3E\u0A39\u0A30 \u0A39\u0A4B \u0A17\u0A3F\u0A06",
          action: "\u0A15\u0A40\u0A2E\u0A24\u0A3E\u0A02 \u0A05\u0A15\u0A38\u0A30 \u0A05\u0A71\u0A2A\u0A21\u0A47\u0A1F \u0A39\u0A41\u0A70\u0A26\u0A40\u0A06\u0A02 \u0A39\u0A28\u0964 \u0A30\u0A3F\u0A2B\u0A4D\u0A30\u0A48\u0A38\u0A3C \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A15\u0A30\u0A4B\u0964"
        },
        missing_field: {
          message: "\u0A32\u0A4B\u0A5C\u0A40\u0A02\u0A26\u0A40 \u0A1C\u0A3E\u0A23\u0A15\u0A3E\u0A30\u0A40 \u0A17\u0A41\u0A70\u0A2E \u0A39\u0A48",
          action: "\u0A38\u0A2D \u0A32\u0A4B\u0A5C\u0A40\u0A02\u0A26\u0A47 \u0A16\u0A47\u0A24\u0A30 \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        invalid_field: {
          message: "\u0A15\u0A41\u0A1D \u0A1C\u0A3E\u0A23\u0A15\u0A3E\u0A30\u0A40 \u0A17\u0A32\u0A24 \u0A39\u0A48",
          action: "\u0A06\u0A2A\u0A23\u0A3E \u0A07\u0A28\u0A2A\u0A41\u0A1F \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        invalid_amount: {
          message: "\u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A30\u0A15\u0A2E \u0A17\u0A32\u0A24 \u0A39\u0A48",
          action: "\u0A30\u0A15\u0A2E \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        invalid_wallet: {
          message: "\u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A2A\u0A24\u0A3E \u0A17\u0A32\u0A24 \u0A39\u0A48",
          action: "\u0A06\u0A2A\u0A23\u0A3E \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A2E\u0A41\u0A5C \u0A1C\u0A4B\u0A5C\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        invalid_resource: {
          message: "\u0A17\u0A32\u0A24 \u0A06\u0A08\u0A1F\u0A2E \u0A1A\u0A4B\u0A23",
          action: "\u0A38\u0A2B\u0A3C\u0A3E \u0A30\u0A3F\u0A2B\u0A4D\u0A30\u0A48\u0A38\u0A3C \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        invalid_coupon: {
          message: "\u0A17\u0A32\u0A24 \u0A15\u0A42\u0A2A\u0A28 \u0A15\u0A4B\u0A21",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A15\u0A42\u0A2A\u0A28 \u0A15\u0A4B\u0A21 \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        invalid_cart_item: {
          message: "\u0A15\u0A3E\u0A30\u0A1F \u0A35\u0A3F\u0A71\u0A1A \u0A07\u0A71\u0A15 \u0A1C\u0A3E\u0A02 \u0A35\u0A71\u0A27 \u0A06\u0A08\u0A1F\u0A2E \u0A17\u0A32\u0A24 \u0A39\u0A28",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A06\u0A2A\u0A23\u0A3E \u0A15\u0A3E\u0A30\u0A1F \u0A38\u0A2E\u0A40\u0A16\u0A3F\u0A06 \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        empty_cart: {
          message: "\u0A24\u0A41\u0A39\u0A3E\u0A21\u0A3E \u0A15\u0A3E\u0A30\u0A1F \u0A16\u0A3E\u0A32\u0A40 \u0A39\u0A48",
          action: "\u0A1A\u0A48\u0A15\u0A06\u0A09\u0A1F \u0A24\u0A4B\u0A02 \u0A2A\u0A39\u0A3F\u0A32\u0A3E\u0A02 \u0A06\u0A08\u0A1F\u0A2E \u0A1C\u0A4B\u0A5C\u0A4B\u0964"
        },
        resource_not_found: {
          message: "\u0A06\u0A08\u0A1F\u0A2E \u0A28\u0A39\u0A40\u0A02 \u0A2E\u0A3F\u0A32\u0A40",
          action: "\u0A07\u0A39 \u0A06\u0A08\u0A1F\u0A2E \u0A39\u0A41\u0A23 \u0A09\u0A2A\u0A32\u0A2C\u0A27 \u0A28\u0A3E \u0A39\u0A4B\u0A35\u0A47\u0964 \u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A30\u0A3F\u0A2B\u0A4D\u0A30\u0A48\u0A38\u0A3C \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        cart_not_found: {
          message: "\u0A38\u0A3C\u0A3E\u0A2A\u0A3F\u0A70\u0A17 \u0A15\u0A3E\u0A30\u0A1F \u0A28\u0A39\u0A40\u0A02 \u0A2E\u0A3F\u0A32\u0A3F\u0A06",
          action: "\u0A24\u0A41\u0A39\u0A3E\u0A21\u0A3E \u0A15\u0A3E\u0A30\u0A1F \u0A38\u0A3C\u0A3E\u0A07\u0A26 \u0A38\u0A2E\u0A3E\u0A2A\u0A24 \u0A39\u0A4B \u0A17\u0A3F\u0A06 \u0A39\u0A48\u0964 \u0A28\u0A35\u0A3E\u0A02 \u0A06\u0A30\u0A21\u0A30 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A15\u0A30\u0A4B\u0964"
        },
        refund_not_found: {
          message: "\u0A30\u0A3F\u0A2B\u0A70\u0A21 \u0A28\u0A39\u0A40\u0A02 \u0A2E\u0A3F\u0A32\u0A3F\u0A06",
          action: "\u0A06\u0A2A\u0A23\u0A3E \u0A30\u0A3F\u0A2B\u0A30\u0A48\u0A02\u0A38 \u0A28\u0A70\u0A2C\u0A30 \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B \u0A1C\u0A3E\u0A02 \u0A38\u0A39\u0A3E\u0A07\u0A24\u0A3E \u0A28\u0A3E\u0A32 \u0A38\u0A70\u0A2A\u0A30\u0A15 \u0A15\u0A30\u0A4B\u0964"
        },
        product_not_found: {
          message: "\u0A09\u0A24\u0A2A\u0A3E\u0A26 \u0A09\u0A2A\u0A32\u0A2C\u0A27 \u0A28\u0A39\u0A40\u0A02",
          action: "\u0A07\u0A39 \u0A09\u0A24\u0A2A\u0A3E\u0A26 \u0A39\u0A41\u0A23 \u0A09\u0A2A\u0A32\u0A2C\u0A27 \u0A28\u0A3E \u0A39\u0A4B\u0A35\u0A47\u0964 \u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A2E\u0A4C\u0A1C\u0A42\u0A26\u0A3E \u0A1A\u0A4B\u0A23 \u0A35\u0A47\u0A16\u0A4B\u0964"
        },
        coupon_not_found: {
          message: "\u0A15\u0A42\u0A2A\u0A28 \u0A15\u0A4B\u0A21 \u0A28\u0A39\u0A40\u0A02 \u0A2E\u0A3F\u0A32\u0A3F\u0A06",
          action: "\u0A15\u0A42\u0A2A\u0A28 \u0A15\u0A4B\u0A21 \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B \u0A1C\u0A3E\u0A02 \u0A39\u0A1F\u0A3E \u0A15\u0A47 \u0A05\u0A71\u0A17\u0A47 \u0A35\u0A27\u0A4B\u0964"
        },
        session_not_found: {
          message: "\u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A38\u0A48\u0A38\u0A3C\u0A28 \u0A38\u0A2E\u0A3E\u0A2A\u0A24 \u0A39\u0A4B \u0A17\u0A3F\u0A06",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A28\u0A35\u0A3E\u0A02 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A15\u0A30\u0A4B\u0964"
        },
        cart_already_paid: {
          message: "\u0A07\u0A38 \u0A06\u0A30\u0A21\u0A30 \u0A26\u0A40 \u0A2D\u0A41\u0A17\u0A24\u0A40 \u0A2A\u0A39\u0A3F\u0A32\u0A3E\u0A02 \u0A39\u0A40 \u0A39\u0A4B \u0A1A\u0A41\u0A71\u0A15\u0A40 \u0A39\u0A48",
          action: "\u0A06\u0A30\u0A21\u0A30 \u0A07\u0A24\u0A3F\u0A39\u0A3E\u0A38 \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B\u0964 \u0A28\u0A35\u0A40\u0A02 \u0A16\u0A30\u0A40\u0A26 \u0A32\u0A08 \u0A28\u0A35\u0A3E\u0A02 \u0A06\u0A30\u0A21\u0A30 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A15\u0A30\u0A4B\u0964"
        },
        refund_already_processed: {
          message: "\u0A07\u0A39 \u0A30\u0A3F\u0A2B\u0A70\u0A21 \u0A2A\u0A39\u0A3F\u0A32\u0A3E\u0A02 \u0A39\u0A40 \u0A2A\u0A4D\u0A30\u0A15\u0A3F\u0A30\u0A3F\u0A06 \u0A15\u0A40\u0A24\u0A40 \u0A1C\u0A3E \u0A1A\u0A41\u0A71\u0A15\u0A40 \u0A39\u0A48",
          action: "\u0A06\u0A2A\u0A23\u0A3E \u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A07\u0A24\u0A3F\u0A39\u0A3E\u0A38 \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B \u0A1C\u0A3E\u0A02 \u0A38\u0A39\u0A3E\u0A07\u0A24\u0A3E \u0A28\u0A3E\u0A32 \u0A38\u0A70\u0A2A\u0A30\u0A15 \u0A15\u0A30\u0A4B\u0964"
        },
        coupon_expired: {
          message: "\u0A15\u0A42\u0A2A\u0A28 \u0A38\u0A2E\u0A3E\u0A2A\u0A24 \u0A39\u0A4B \u0A17\u0A3F\u0A06 \u0A39\u0A48",
          action: "\u0A15\u0A42\u0A2A\u0A28 \u0A39\u0A1F\u0A3E\u0A13 \u0A1C\u0A3E\u0A02 \u0A15\u0A4B\u0A08 \u0A39\u0A4B\u0A30 \u0A15\u0A4B\u0A21 \u0A35\u0A30\u0A24\u0A4B\u0964"
        },
        coupon_usage_limit_reached: {
          message: "\u0A15\u0A42\u0A2A\u0A28 \u0A26\u0A40 \u0A35\u0A30\u0A24\u0A4B\u0A02 \u0A38\u0A40\u0A2E\u0A3E \u0A2A\u0A42\u0A30\u0A40 \u0A39\u0A4B \u0A1A\u0A41\u0A71\u0A15\u0A40 \u0A39\u0A48",
          action: "\u0A07\u0A39 \u0A15\u0A42\u0A2A\u0A28 \u0A2A\u0A42\u0A30\u0A40 \u0A24\u0A30\u0A4D\u0A39\u0A3E\u0A02 \u0A35\u0A30\u0A24\u0A3F\u0A06 \u0A1C\u0A3E \u0A1A\u0A41\u0A71\u0A15\u0A3E \u0A39\u0A48\u0964 \u0A39\u0A4B\u0A30 \u0A15\u0A4B\u0A21 \u0A05\u0A1C\u0A3C\u0A2E\u0A3E\u0A13\u0964"
        },
        coupon_not_applicable: {
          message: "\u0A07\u0A39 \u0A15\u0A42\u0A2A\u0A28 \u0A07\u0A38 \u0A16\u0A30\u0A40\u0A26 \u2018\u0A24\u0A47 \u0A32\u0A3E\u0A17\u0A42 \u0A28\u0A39\u0A40\u0A02 \u0A39\u0A41\u0A70\u0A26\u0A3E",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A15\u0A42\u0A2A\u0A28 \u0A26\u0A40\u0A06\u0A02 \u0A38\u0A3C\u0A30\u0A24\u0A3E\u0A02 \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B \u0A1C\u0A3E\u0A02 \u0A39\u0A1F\u0A3E \u0A15\u0A47 \u0A05\u0A71\u0A17\u0A47 \u0A35\u0A27\u0A4B\u0964"
        },
        coupon_wrong_payment_method: {
          message: "\u0A07\u0A38 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A22\u0A70\u0A17 \u0A32\u0A08 \u0A15\u0A42\u0A2A\u0A28 \u0A35\u0A48\u0A27 \u0A28\u0A39\u0A40\u0A02",
          action: "\u0A35\u0A71\u0A16\u0A30\u0A3E \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A22\u0A70\u0A17 \u0A05\u0A1C\u0A3C\u0A2E\u0A3E\u0A13 \u0A1C\u0A3E\u0A02 \u0A15\u0A42\u0A2A\u0A28 \u0A39\u0A1F\u0A3E\u0A13\u0964"
        },
        stripe_error: {
          message: "\u0A15\u0A3E\u0A30\u0A21 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A38\u0A47\u0A35\u0A3E \u0A05\u0A38\u0A25\u0A3E\u0A08 \u0A24\u0A4C\u0A30 \u2018\u0A24\u0A47 \u0A09\u0A2A\u0A32\u0A2C\u0A27 \u0A28\u0A39\u0A40\u0A02",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A15\u0A41\u0A1D \u0A35\u0A47\u0A32\u0A47 \u0A2C\u0A3E\u0A05\u0A26 \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B, \u0A1C\u0A3E\u0A02 \u0A15\u0A4D\u0A30\u0A3F\u0A2A\u0A1F\u0A4B \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A35\u0A30\u0A24\u0A4B\u0964"
        },
        rpc_error: {
          message: "\u0A2C\u0A32\u0A4C\u0A15\u0A1A\u0A47\u0A28 \u0A28\u0A48\u0A1F\u0A35\u0A30\u0A15 \u0A05\u0A38\u0A25\u0A3E\u0A08 \u0A24\u0A4C\u0A30 \u2018\u0A24\u0A47 \u0A09\u0A2A\u0A32\u0A2C\u0A27 \u0A28\u0A39\u0A40\u0A02",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A15\u0A41\u0A1D \u0A35\u0A47\u0A32\u0A47 \u0A2C\u0A3E\u0A05\u0A26 \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B, \u0A1C\u0A3E\u0A02 \u0A15\u0A3E\u0A30\u0A21 \u0A2D\u0A41\u0A17\u0A24\u0A3E\u0A28 \u0A35\u0A30\u0A24\u0A4B\u0964"
        },
        network_error: {
          message: "\u0A28\u0A48\u0A1F\u0A35\u0A30\u0A15 \u0A15\u0A28\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A38\u0A2E\u0A71\u0A38\u0A3F\u0A06",
          action: "\u0A06\u0A2A\u0A23\u0A3E \u0A07\u0A70\u0A1F\u0A30\u0A28\u0A48\u0A71\u0A1F \u0A15\u0A28\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A1A\u0A48\u0A15 \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        internal_error: {
          message: "\u0A38\u0A3E\u0A21\u0A40 \u0A2A\u0A71\u0A16\u0A4B\u0A02 \u0A15\u0A41\u0A1D \u0A17\u0A32\u0A24 \u0A39\u0A4B \u0A17\u0A3F\u0A06",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964 \u0A1C\u0A47 \u0A38\u0A2E\u0A71\u0A38\u0A3F\u0A06 \u0A1C\u0A3E\u0A30\u0A40 \u0A30\u0A39\u0A47, \u0A38\u0A39\u0A3E\u0A07\u0A24\u0A3E \u0A28\u0A3E\u0A32 \u0A38\u0A70\u0A2A\u0A30\u0A15 \u0A15\u0A30\u0A4B\u0964"
        },
        database_error: {
          message: "\u0A38\u0A47\u0A35\u0A3E \u0A05\u0A38\u0A25\u0A3E\u0A08 \u0A24\u0A4C\u0A30 \u2018\u0A24\u0A47 \u0A09\u0A2A\u0A32\u0A2C\u0A27 \u0A28\u0A39\u0A40\u0A02",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A15\u0A41\u0A1D \u0A35\u0A47\u0A32\u0A47 \u0A2C\u0A3E\u0A05\u0A26 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964"
        },
        config_error: {
          message: "\u0A38\u0A47\u0A35\u0A3E \u0A38\u0A70\u0A30\u0A1A\u0A28\u0A3E \u0A17\u0A32\u0A24\u0A40",
          action: "\u0A2E\u0A26\u0A26 \u0A32\u0A08 \u0A38\u0A39\u0A3E\u0A07\u0A24\u0A3E \u0A28\u0A3E\u0A32 \u0A38\u0A70\u0A2A\u0A30\u0A15 \u0A15\u0A30\u0A4B\u0964"
        },
        unknown_error: {
          message: "\u0A05\u0A23\u0A09\u0A2E\u0A40\u0A26 \u0A17\u0A32\u0A24\u0A40 \u0A06 \u0A17\u0A08",
          action: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B \u0A1C\u0A3E\u0A02 \u0A1C\u0A3E\u0A30\u0A40 \u0A30\u0A39\u0A3F\u0A23 \u2018\u0A24\u0A47 \u0A38\u0A39\u0A3E\u0A07\u0A24\u0A3E \u0A28\u0A3E\u0A32 \u0A38\u0A70\u0A2A\u0A30\u0A15 \u0A15\u0A30\u0A4B\u0964"
        }
      },
      validation: {
        unknown_token_mint: "\u0A1A\u0A47\u0A24\u0A3E\u0A35\u0A28\u0A40: \u0A1F\u0A4B\u0A15\u0A28 \u0A2E\u0A3F\u0A70\u0A1F \u0A2A\u0A24\u0A3E \u0A05\u0A23\u0A2A\u0A1B\u0A3E\u0A24\u0A3E \u0A39\u0A48\u0964 \u0A30\u0A15\u0A2E \u0A26\u0A47 \u0A28\u0A41\u0A15\u0A38\u0A3E\u0A28 \u0A24\u0A4B\u0A02 \u0A2C\u0A1A\u0A23 \u0A32\u0A08 \u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A07\u0A39 \u0A38\u0A39\u0A40 \u0A1F\u0A4B\u0A15\u0A28 \u0A39\u0A48 \u0A15\u0A3F \u0A28\u0A39\u0A40\u0A02 \u0A26\u0A41\u0A2C\u0A3E\u0A30\u0A3E \u0A1C\u0A3E\u0A02\u0A1A\u0A4B\u0964",
        token_typo_warning: "\u0A1F\u0A4B\u0A15\u0A28 \u0A2A\u0A24\u0A3E \u0A1C\u0A3E\u0A23\u0A47-\u0A2A\u0A1B\u0A3E\u0A23\u0A47 \u0A38\u0A1F\u0A47\u0A2C\u0A32\u0A15\u0A4B\u0A07\u0A28 (USDC, USDT, PYUSD, CASH) \u0A28\u0A3E\u0A32 \u0A2E\u0A47\u0A32 \u0A28\u0A39\u0A40\u0A02 \u0A16\u0A3E\u0A02\u0A26\u0A3E\u0964 \u0A38\u0A25\u0A3E\u0A08 \u0A28\u0A41\u0A15\u0A38\u0A3E\u0A28 \u0A24\u0A4B\u0A02 \u0A2C\u0A1A\u0A23 \u0A32\u0A08 \u0A27\u0A3F\u0A06\u0A28 \u0A28\u0A3E\u0A32 \u0A24\u0A38\u0A26\u0A40\u0A15 \u0A15\u0A30\u0A4B\u0964"
      },
      wallet: {
        no_wallet_detected: "\u0A15\u0A4B\u0A08 Solana \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A28\u0A39\u0A40\u0A02 \u0A2E\u0A3F\u0A32\u0A3F\u0A06",
        install_wallet: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 Phantom, Solflare \u0A1C\u0A3E\u0A02 Backpack \u0A35\u0A30\u0A17\u0A3E Solana \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A07\u0A70\u0A38\u0A1F\u0A3E\u0A32 \u0A15\u0A30\u0A4B\u0964",
        wallet_not_connected: "\u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A15\u0A28\u0A48\u0A15\u0A1F \u0A28\u0A39\u0A40\u0A02",
        connect_your_wallet: "\u0A1C\u0A3E\u0A30\u0A40 \u0A30\u0A71\u0A16\u0A23 \u0A32\u0A08 \u0A06\u0A2A\u0A23\u0A3E \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A1C\u0A4B\u0A5C\u0A4B\u0964",
        wallet_connection_failed: "\u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A1C\u0A4B\u0A5C\u0A23 \u0A35\u0A3F\u0A71\u0A1A \u0A05\u0A38\u0A2B\u0A32",
        try_again: "\u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A2E\u0A41\u0A5C \u0A1C\u0A4B\u0A5C\u0A28 \u0A26\u0A40 \u0A15\u0A4B\u0A38\u0A3C\u0A3F\u0A38\u0A3C \u0A15\u0A30\u0A4B\u0964",
        transaction_rejected: "\u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A30\u0A71\u0A26 \u0A15\u0A30 \u0A26\u0A3F\u0A71\u0A24\u0A40 \u0A17\u0A08",
        approve_in_wallet: "\u0A1C\u0A3E\u0A30\u0A40 \u0A30\u0A71\u0A16\u0A23 \u0A32\u0A08 \u0A15\u0A3F\u0A30\u0A2A\u0A3E \u0A15\u0A30\u0A15\u0A47 \u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A35\u0A3F\u0A71\u0A1A \u0A1F\u0A4D\u0A30\u0A3E\u0A02\u0A1C\u0A3C\u0A48\u0A15\u0A38\u0A3C\u0A28 \u0A2E\u0A28\u0A1C\u0A3C\u0A42\u0A30 \u0A15\u0A30\u0A4B\u0964",
        select_wallet: "\u0A35\u0A3E\u0A32\u0A3F\u0A1F \u0A1A\u0A41\u0A23\u0A4B",
        change: "\u0A2C\u0A26\u0A32\u0A4B"
      }
    };
  }
});

// src/i18n/translations/pl.json
var require_pl = __commonJS({
  "src/i18n/translations/pl.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - Plik \u017Ar\xF3d\u0142owy t\u0142umacze\u0144 (polski)",
      version: "1.0.0",
      locale: "pl",
      ui: {
        pay_with_card: "Zap\u0142a\u0107 kart\u0105",
        pay_with_crypto: "Zap\u0142a\u0107 USDC",
        pay_with_usdc: "Zap\u0142a\u0107 USDC",
        purchase: "Zakup",
        card: "Karta",
        usdc_solana: "USDC (Solana)",
        crypto: "Krypto",
        connect_wallet: "Po\u0142\u0105cz portfel",
        connecting: "\u0141\u0105czenie...",
        processing: "Przetwarzanie...",
        loading: "Wczytywanie...",
        close: "Zamknij",
        cancel: "Anuluj",
        confirm: "Potwierd\u017A",
        retry: "Spr\xF3buj ponownie",
        go_back: "Wr\xF3\u0107",
        contact_support: "Skontaktuj si\u0119 z pomoc\u0105",
        pay_with_credits: "Zap\u0142a\u0107 kredytami",
        credits: "Kredyty",
        disconnect: "Roz\u0142\u0105cz",
        payment_successful: "P\u0142atno\u015B\u0107 zako\u0144czona sukcesem!",
        subscribe: "Subskrybuj",
        subscribe_with_crypto: "Subskrybuj za pomoc\u0105 USDC",
        subscribe_with_credits: "Subskrybuj za pomoc\u0105 kredyt\xF3w",
        subscribed: "Subskrybowano",
        subscribed_until: "Subskrybowano do",
        subscription_active: "Twoja subskrypcja jest aktywna!",
        redirecting_to_checkout: "Przekierowywanie do kasy..."
      },
      errors: {
        invalid_payment_proof: {
          message: "Weryfikacja p\u0142atno\u015Bci nie powiod\u0142a si\u0119",
          action: "Spr\xF3buj ponownie. Je\u015Bli problem si\u0119 powtarza, skontaktuj si\u0119 z pomoc\u0105 techniczn\u0105."
        },
        invalid_signature: {
          message: "Podpis transakcji jest nieprawid\u0142owy",
          action: "Zatwierd\u017A transakcj\u0119 w swoim portfelu i spr\xF3buj ponownie."
        },
        invalid_transaction: {
          message: "Format transakcji jest nieprawid\u0142owy",
          action: "Spr\xF3buj ponownie. Je\u015Bli problem wraca, zaktualizuj aplikacj\u0119 portfela."
        },
        transaction_not_found: {
          message: "Nie znaleziono transakcji w blockchainie",
          action: "Twoja transakcja mo\u017Ce by\u0107 nadal przetwarzana. Poczekaj chwil\u0119 i sprawd\u017A portfel lub spr\xF3buj ponownie."
        },
        transaction_not_confirmed: {
          message: "Transakcja jest nadal przetwarzana",
          action: "Poczekaj na potwierdzenie w sieci blockchain, a nast\u0119pnie spr\xF3buj ponownie."
        },
        transaction_failed: {
          message: "Transakcja nie powiod\u0142a si\u0119 w blockchainie",
          action: "Sprawd\u017A szczeg\xF3\u0142y w portfelu. Mo\u017Ce by\u0107 konieczna zmiana ustawie\u0144 transakcji lub dodanie SOL na op\u0142aty."
        },
        transaction_expired: {
          message: "Przetwarzanie transakcji trwa\u0142o zbyt d\u0142ugo",
          action: "Spr\xF3buj ponownie. Rozwa\u017C zwi\u0119kszenie priorytetu transakcji, je\u015Bli portfel to wspiera."
        },
        invalid_recipient: {
          message: "P\u0142atno\u015B\u0107 wys\u0142ano na nieprawid\u0142owy adres",
          action: "Spr\xF3buj ponownie i upewnij si\u0119, \u017Ce zatwierdzasz w\u0142a\u015Bciw\u0105 transakcj\u0119 w portfelu."
        },
        invalid_sender: {
          message: "Portfel nadawcy p\u0142atno\u015Bci jest nieprawid\u0142owy",
          action: "Po\u0142\u0105cz portfel ponownie i spr\xF3buj jeszcze raz."
        },
        unauthorized_refund_issuer: {
          message: "Nie masz uprawnie\u0144 do wystawiania zwrot\xF3w",
          action: "Tylko autoryzowane konta mog\u0105 przetwarza\u0107 zwroty. Skontaktuj si\u0119 z pomoc\u0105, je\u015Bli to b\u0142\u0105d."
        },
        amount_below_minimum: {
          message: "Kwota p\u0142atno\u015Bci jest zbyt niska",
          action: "Sprawd\u017A wymagan\u0105 kwot\u0119 i spr\xF3buj ponownie."
        },
        amount_mismatch: {
          message: "Kwota p\u0142atno\u015Bci nie zgadza si\u0119 z wycen\u0105",
          action: "Cena mog\u0142a si\u0119 zmieni\u0107. Od\u015Bwie\u017C i spr\xF3buj zap\u0142aci\u0107 ponownie."
        },
        insufficient_funds_sol: {
          message: "Za ma\u0142o SOL na op\u0142aty transakcyjne",
          action: "Dodaj co najmniej 0,001 SOL do portfela, aby pokry\u0107 op\u0142aty, i spr\xF3buj ponownie."
        },
        insufficient_funds_token: {
          message: "Niewystarczaj\u0105ce \u015Brodki w portfelu",
          action: "Dodaj \u015Brodki do portfela i spr\xF3buj ponownie."
        },
        invalid_token_mint: {
          message: "Nieprawid\u0142owy token p\u0142atno\u015Bci",
          action: "Zap\u0142a\u0107 w\u0142a\u015Bciwym tokenem wskazanym w szczeg\xF3\u0142ach p\u0142atno\u015Bci."
        },
        not_spl_transfer: {
          message: "Transakcja nie jest prawid\u0142owym transferem tokena",
          action: "Upewnij si\u0119, \u017Ce wysy\u0142asz w\u0142a\u015Bciwy typ tokena ze swojego portfela."
        },
        missing_token_account: {
          message: "Nie znaleziono konta tokena",
          action: "Tw\xF3j portfel mo\u017Ce wymaga\u0107 utworzenia konta tokena. Spr\xF3buj ponownie lub u\u017Cyj innego portfela."
        },
        invalid_token_program: {
          message: "Nieprawid\u0142owy program token\xF3w",
          action: "Spr\xF3buj zap\u0142aci\u0107 ponownie. Je\u015Bli problem wraca, u\u017Cyj innego portfela."
        },
        missing_memo: {
          message: "Wymagany memo p\u0142atno\u015Bci nie zosta\u0142 do\u0142\u0105czony",
          action: "Spr\xF3buj ponownie i upewnij si\u0119, \u017Ce zatwierdzasz szczeg\xF3\u0142y transakcji w portfelu."
        },
        invalid_memo: {
          message: "Nieprawid\u0142owy format memo p\u0142atno\u015Bci",
          action: "Spr\xF3buj dokona\u0107 p\u0142atno\u015Bci ponownie."
        },
        payment_already_used: {
          message: "Ta p\u0142atno\u015B\u0107 zosta\u0142a ju\u017C przetworzona",
          action: "Sprawd\u017A histori\u0119 transakcji. Je\u015Bli chcesz zap\u0142aci\u0107 ponownie, utw\xF3rz now\u0105 transakcj\u0119."
        },
        signature_reused: {
          message: "Podpis transakcji zosta\u0142 ju\u017C u\u017Cyty",
          action: "Utw\xF3rz now\u0105 transakcj\u0119 p\u0142atnicz\u0105."
        },
        quote_expired: {
          message: "Oferta p\u0142atno\u015Bci wygas\u0142a",
          action: "Ceny s\u0105 cz\u0119sto aktualizowane. Od\u015Bwie\u017C i spr\xF3buj ponownie."
        },
        missing_field: {
          message: "Brak wymaganych informacji",
          action: "Sprawd\u017A wszystkie wymagane pola i spr\xF3buj ponownie."
        },
        invalid_field: {
          message: "Niekt\xF3re informacje s\u0105 nieprawid\u0142owe",
          action: "Sprawd\u017A wprowadzone dane i spr\xF3buj ponownie."
        },
        invalid_amount: {
          message: "Nieprawid\u0142owa kwota p\u0142atno\u015Bci",
          action: "Sprawd\u017A kwot\u0119 i spr\xF3buj ponownie."
        },
        invalid_wallet: {
          message: "Nieprawid\u0142owy adres portfela",
          action: "Po\u0142\u0105cz portfel ponownie i spr\xF3buj jeszcze raz."
        },
        invalid_resource: {
          message: "Nieprawid\u0142owy wyb\xF3r pozycji",
          action: "Od\u015Bwie\u017C stron\u0119 i spr\xF3buj ponownie."
        },
        invalid_coupon: {
          message: "Nieprawid\u0142owy kod kuponu",
          action: "Sprawd\u017A kod i spr\xF3buj ponownie."
        },
        invalid_cart_item: {
          message: "Jedna lub wi\u0119cej pozycji w koszyku jest nieprawid\u0142owa",
          action: "Przejrzyj koszyk i spr\xF3buj ponownie."
        },
        empty_cart: {
          message: "Tw\xF3j koszyk jest pusty",
          action: "Dodaj produkty do koszyka przed finalizacj\u0105 zakupu."
        },
        resource_not_found: {
          message: "Nie znaleziono pozycji",
          action: "Ta pozycja mo\u017Ce by\u0107 niedost\u0119pna. Od\u015Bwie\u017C i spr\xF3buj ponownie."
        },
        cart_not_found: {
          message: "Nie znaleziono koszyka",
          action: "Tw\xF3j koszyk m\xF3g\u0142 wygasn\u0105\u0107. Rozpocznij nowe zam\xF3wienie."
        },
        refund_not_found: {
          message: "Nie znaleziono zwrotu",
          action: "Sprawd\u017A numer referencyjny zwrotu lub skontaktuj si\u0119 z pomoc\u0105."
        },
        product_not_found: {
          message: "Produkt niedost\u0119pny",
          action: "Produkt m\xF3g\u0142 zosta\u0107 wycofany. Przejrzyj nasz\u0105 aktualn\u0105 ofert\u0119."
        },
        coupon_not_found: {
          message: "Nie znaleziono kodu kuponu",
          action: "Sprawd\u017A kod lub usu\u0144 go, aby kontynuowa\u0107."
        },
        session_not_found: {
          message: "Sesja p\u0142atno\u015Bci wygas\u0142a",
          action: "Rozpocznij now\u0105 p\u0142atno\u015B\u0107."
        },
        cart_already_paid: {
          message: "To zam\xF3wienie zosta\u0142o ju\u017C op\u0142acone",
          action: "Sprawd\u017A histori\u0119 zam\xF3wie\u0144. Aby kupi\u0107 ponownie, rozpocznij nowe zam\xF3wienie."
        },
        refund_already_processed: {
          message: "Ten zwrot zosta\u0142 ju\u017C przetworzony",
          action: "Sprawd\u017A histori\u0119 transakcji lub skontaktuj si\u0119 z pomoc\u0105."
        },
        coupon_expired: {
          message: "Kupon wygas\u0142",
          action: "Usu\u0144 kod kuponu lub u\u017Cyj innego."
        },
        coupon_usage_limit_reached: {
          message: "Osi\u0105gni\u0119to limit u\u017Cy\u0107 kuponu",
          action: "Ten kupon zosta\u0142 w pe\u0142ni wykorzystany. U\u017Cyj innego kodu."
        },
        coupon_not_applicable: {
          message: "Kupon nie ma zastosowania do tego zakupu",
          action: "Sprawd\u017A warunki kuponu lub usu\u0144 go, aby kontynuowa\u0107."
        },
        coupon_wrong_payment_method: {
          message: "Kupon nie jest wa\u017Cny dla tej metody p\u0142atno\u015Bci",
          action: "Wybierz inn\u0105 metod\u0119 p\u0142atno\u015Bci lub usu\u0144 kupon."
        },
        stripe_error: {
          message: "Us\u0142uga p\u0142atno\u015Bci kart\u0105 jest tymczasowo niedost\u0119pna",
          action: "Spr\xF3buj ponownie za chwil\u0119 lub u\u017Cyj p\u0142atno\u015Bci kryptowalut\u0105."
        },
        rpc_error: {
          message: "Sie\u0107 blockchain jest tymczasowo niedost\u0119pna",
          action: "Spr\xF3buj ponownie za chwil\u0119 lub u\u017Cyj p\u0142atno\u015Bci kart\u0105."
        },
        network_error: {
          message: "Problem z po\u0142\u0105czeniem sieciowym",
          action: "Sprawd\u017A po\u0142\u0105czenie z Internetem i spr\xF3buj ponownie."
        },
        internal_error: {
          message: "Co\u015B posz\u0142o nie tak po naszej stronie",
          action: "Spr\xF3buj ponownie. Je\u015Bli problem si\u0119 powtarza, skontaktuj si\u0119 z pomoc\u0105."
        },
        database_error: {
          message: "Us\u0142uga tymczasowo niedost\u0119pna",
          action: "Spr\xF3buj ponownie za chwil\u0119."
        },
        config_error: {
          message: "B\u0142\u0105d konfiguracji us\u0142ugi",
          action: "Skontaktuj si\u0119 z pomoc\u0105 w celu uzyskania wsparcia."
        },
        unknown_error: {
          message: "Wyst\u0105pi\u0142 nieoczekiwany b\u0142\u0105d",
          action: "Spr\xF3buj ponownie lub skontaktuj si\u0119 z pomoc\u0105, je\u015Bli problem si\u0119 powtarza."
        }
      },
      validation: {
        unknown_token_mint: "Ostrze\u017Cenie: Nierozpoznany adres mintu tokena. Dok\u0142adnie sprawd\u017A, czy to w\u0142a\u015Bciwy token, aby unikn\u0105\u0107 utraty \u015Brodk\xF3w.",
        token_typo_warning: "Adres tokena nie odpowiada znanym stablecoinom (USDC, USDT, PYUSD, CASH). Zweryfikuj dok\u0142adnie, aby zapobiec trwa\u0142ej utracie \u015Brodk\xF3w."
      },
      wallet: {
        no_wallet_detected: "Nie wykryto portfela Solana",
        install_wallet: "Zainstaluj portfel Solana, np. Phantom, Solflare lub Backpack.",
        wallet_not_connected: "Portfel niepo\u0142\u0105czony",
        connect_your_wallet: "Po\u0142\u0105cz portfel, aby kontynuowa\u0107.",
        wallet_connection_failed: "Nie uda\u0142o si\u0119 po\u0142\u0105czy\u0107 portfela",
        try_again: "Spr\xF3buj po\u0142\u0105czy\u0107 ponownie.",
        transaction_rejected: "Transakcja zosta\u0142a odrzucona",
        approve_in_wallet: "Zatwierd\u017A transakcj\u0119 w portfelu, aby kontynuowa\u0107.",
        select_wallet: "Wybierz portfel",
        change: "Zmie\u0144"
      }
    };
  }
});

// src/i18n/translations/pt.json
var require_pt = __commonJS({
  "src/i18n/translations/pt.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - Arquivo-fonte de tradu\xE7\xE3o (Portugu\xEAs)",
      version: "1.0.0",
      locale: "pt",
      ui: {
        pay_with_card: "Pagar com cart\xE3o",
        pay_with_crypto: "Pagar com USDC",
        pay_with_usdc: "Pagar com USDC",
        purchase: "Comprar",
        card: "Cart\xE3o",
        usdc_solana: "USDC (Solana)",
        crypto: "Cripto",
        connect_wallet: "Conectar carteira",
        connecting: "Conectando...",
        processing: "Processando...",
        loading: "Carregando...",
        close: "Fechar",
        cancel: "Cancelar",
        confirm: "Confirmar",
        retry: "Tentar novamente",
        go_back: "Voltar",
        contact_support: "Contatar o suporte",
        pay_with_credits: "Pagar com cr\xE9ditos",
        credits: "Cr\xE9ditos",
        disconnect: "Desconectar",
        payment_successful: "Pagamento realizado com sucesso!",
        subscribe: "Assinar",
        subscribe_with_crypto: "Assinar com USDC",
        subscribe_with_credits: "Assinar com cr\xE9ditos",
        subscribed: "Assinado",
        subscribed_until: "Assinado at\xE9",
        subscription_active: "Sua assinatura est\xE1 ativa!",
        redirecting_to_checkout: "Redirecionando para o checkout..."
      },
      errors: {
        invalid_payment_proof: {
          message: "Falha na verifica\xE7\xE3o do pagamento",
          action: "Tente efetuar o pagamento novamente. Se o problema persistir, contate o suporte."
        },
        invalid_signature: {
          message: "A assinatura da transa\xE7\xE3o \xE9 inv\xE1lida",
          action: "Aprove a transa\xE7\xE3o na sua carteira e tente novamente."
        },
        invalid_transaction: {
          message: "O formato da transa\xE7\xE3o \xE9 inv\xE1lido",
          action: "Tente efetuar o pagamento novamente. Se continuar, tente atualizar o aplicativo da sua carteira."
        },
        transaction_not_found: {
          message: "Transa\xE7\xE3o n\xE3o encontrada na blockchain",
          action: "Sua transa\xE7\xE3o pode ainda estar em processamento. Aguarde um momento e verifique sua carteira, ou tente novamente."
        },
        transaction_not_confirmed: {
          message: "A transa\xE7\xE3o ainda est\xE1 em processamento",
          action: "Aguarde a confirma\xE7\xE3o da sua transa\xE7\xE3o pela blockchain e tente novamente."
        },
        transaction_failed: {
          message: "A transa\xE7\xE3o falhou na blockchain",
          action: "Verifique os detalhes na sua carteira. Voc\xEA pode precisar ajustar as configura\xE7\xF5es da transa\xE7\xE3o ou adicionar mais SOL para as taxas."
        },
        transaction_expired: {
          message: "A transa\xE7\xE3o demorou demais para processar",
          action: "Tente efetuar o pagamento novamente. Considere aumentar a prioridade da transa\xE7\xE3o se sua carteira oferecer essa op\xE7\xE3o."
        },
        invalid_recipient: {
          message: "O pagamento foi enviado para o endere\xE7o errado",
          action: "Tente novamente e certifique-se de aprovar a transa\xE7\xE3o correta na sua carteira."
        },
        invalid_sender: {
          message: "A carteira remetente do pagamento \xE9 inv\xE1lida",
          action: "Reconecte sua carteira e tente novamente."
        },
        unauthorized_refund_issuer: {
          message: "Voc\xEA n\xE3o est\xE1 autorizado(a) a emitir reembolsos",
          action: "Somente contas autorizadas podem processar reembolsos. Contate o suporte se voc\xEA acredita que isso \xE9 um erro."
        },
        amount_below_minimum: {
          message: "O valor do pagamento \xE9 muito baixo",
          action: "Verifique o valor exigido e tente novamente."
        },
        amount_mismatch: {
          message: "O valor do pagamento n\xE3o corresponde \xE0 cota\xE7\xE3o",
          action: "O pre\xE7o pode ter mudado. Atualize a p\xE1gina e tente pagar novamente."
        },
        insufficient_funds_sol: {
          message: "SOL insuficiente para taxas de transa\xE7\xE3o",
          action: "Adicione pelo menos 0,001 SOL \xE0 sua carteira para cobrir as taxas de rede e tente novamente."
        },
        insufficient_funds_token: {
          message: "Saldo insuficiente na sua carteira",
          action: "Adicione mais fundos \xE0 sua carteira e tente novamente."
        },
        invalid_token_mint: {
          message: "Token de pagamento incorreto",
          action: "Pague com o token correto conforme mostrado nos detalhes do pagamento."
        },
        not_spl_transfer: {
          message: "A transa\xE7\xE3o n\xE3o \xE9 uma transfer\xEAncia de tokens v\xE1lida",
          action: "Certifique-se de enviar o tipo de token correto a partir da sua carteira."
        },
        missing_token_account: {
          message: "Conta de token n\xE3o encontrada",
          action: "Sua carteira pode precisar criar uma conta de token primeiro. Tente novamente ou use outra carteira."
        },
        invalid_token_program: {
          message: "Programa de token inv\xE1lido",
          action: "Tente efetuar o pagamento novamente. Se continuar, tente usar outra carteira."
        },
        missing_memo: {
          message: "Memo do pagamento \xE9 obrigat\xF3rio, mas n\xE3o foi inclu\xEDdo",
          action: "Tente efetuar o pagamento novamente e certifique-se de aprovar os detalhes da transa\xE7\xE3o na sua carteira."
        },
        invalid_memo: {
          message: "O formato do memo de pagamento \xE9 inv\xE1lido",
          action: "Tente efetuar o pagamento novamente."
        },
        payment_already_used: {
          message: "Este pagamento j\xE1 foi processado",
          action: "Verifique seu hist\xF3rico de transa\xE7\xF5es. Se precisar fazer outro pagamento, inicie uma nova transa\xE7\xE3o."
        },
        signature_reused: {
          message: "A assinatura da transa\xE7\xE3o j\xE1 foi utilizada",
          action: "Crie uma nova transa\xE7\xE3o de pagamento."
        },
        quote_expired: {
          message: "A cota\xE7\xE3o do pagamento expirou",
          action: "Os pre\xE7os s\xE3o atualizados com frequ\xEAncia. Atualize a p\xE1gina e tente pagar novamente."
        },
        missing_field: {
          message: "Faltam informa\xE7\xF5es obrigat\xF3rias",
          action: "Verifique todos os campos obrigat\xF3rios e tente novamente."
        },
        invalid_field: {
          message: "Algumas informa\xE7\xF5es s\xE3o inv\xE1lidas",
          action: "Verifique sua entrada e tente novamente."
        },
        invalid_amount: {
          message: "O valor do pagamento \xE9 inv\xE1lido",
          action: "Verifique o valor e tente novamente."
        },
        invalid_wallet: {
          message: "O endere\xE7o da carteira \xE9 inv\xE1lido",
          action: "Reconecte sua carteira e tente novamente."
        },
        invalid_resource: {
          message: "Sele\xE7\xE3o de item inv\xE1lida",
          action: "Atualize a p\xE1gina e tente novamente."
        },
        invalid_coupon: {
          message: "C\xF3digo de cupom inv\xE1lido",
          action: "Verifique o c\xF3digo do cupom e tente novamente."
        },
        invalid_cart_item: {
          message: "Um ou mais itens do carrinho s\xE3o inv\xE1lidos",
          action: "Revise seu carrinho e tente novamente."
        },
        empty_cart: {
          message: "Seu carrinho est\xE1 vazio",
          action: "Adicione itens ao carrinho antes de finalizar a compra."
        },
        resource_not_found: {
          message: "Item n\xE3o encontrado",
          action: "Este item pode n\xE3o estar mais dispon\xEDvel. Atualize e tente novamente."
        },
        cart_not_found: {
          message: "Carrinho de compras n\xE3o encontrado",
          action: "Seu carrinho pode ter expirado. Inicie um novo pedido."
        },
        refund_not_found: {
          message: "Reembolso n\xE3o encontrado",
          action: "Verifique o n\xFAmero de refer\xEAncia do reembolso ou contate o suporte."
        },
        product_not_found: {
          message: "Produto indispon\xEDvel",
          action: "Este produto pode n\xE3o estar mais dispon\xEDvel. Navegue por nossa sele\xE7\xE3o atual."
        },
        coupon_not_found: {
          message: "C\xF3digo de cupom n\xE3o encontrado",
          action: "Verifique o c\xF3digo do cupom ou remova-o para continuar."
        },
        session_not_found: {
          message: "Sess\xE3o de pagamento expirada",
          action: "Inicie um novo pagamento."
        },
        cart_already_paid: {
          message: "Este pedido j\xE1 foi pago",
          action: "Verifique seu hist\xF3rico de pedidos. Se precisar fazer outra compra, inicie um novo pedido."
        },
        refund_already_processed: {
          message: "Este reembolso j\xE1 foi processado",
          action: "Verifique seu hist\xF3rico de transa\xE7\xF5es ou contate o suporte para detalhes."
        },
        coupon_expired: {
          message: "O cupom expirou",
          action: "Remova o c\xF3digo do cupom ou use outro c\xF3digo."
        },
        coupon_usage_limit_reached: {
          message: "Limite de uso do cupom atingido",
          action: "Este cupom j\xE1 foi totalmente utilizado. Tente um c\xF3digo diferente."
        },
        coupon_not_applicable: {
          message: "O cupom n\xE3o pode ser aplicado a esta compra",
          action: "Verifique as regras do cupom ou remova-o para continuar."
        },
        coupon_wrong_payment_method: {
          message: "Cupom n\xE3o v\xE1lido para este m\xE9todo de pagamento",
          action: "Tente um m\xE9todo de pagamento diferente ou remova o cupom."
        },
        stripe_error: {
          message: "Servi\xE7o de pagamento com cart\xE3o temporariamente indispon\xEDvel",
          action: "Tente novamente em instantes ou use pagamento com criptomoeda."
        },
        rpc_error: {
          message: "Rede blockchain temporariamente indispon\xEDvel",
          action: "Tente novamente em instantes ou use pagamento com cart\xE3o."
        },
        network_error: {
          message: "Problema de conex\xE3o com a rede",
          action: "Verifique sua conex\xE3o com a internet e tente novamente."
        },
        internal_error: {
          message: "Algo deu errado do nosso lado",
          action: "Tente novamente. Se o problema continuar, contate o suporte."
        },
        database_error: {
          message: "Servi\xE7o temporariamente indispon\xEDvel",
          action: "Tente novamente em instantes."
        },
        config_error: {
          message: "Erro de configura\xE7\xE3o do servi\xE7o",
          action: "Entre em contato com o suporte para obter ajuda."
        },
        unknown_error: {
          message: "Ocorreu um erro inesperado",
          action: "Tente novamente ou contate o suporte se o problema continuar."
        }
      },
      validation: {
        unknown_token_mint: "Aviso: Endere\xE7o de mint do token n\xE3o reconhecido. Confira se este \xE9 o token correto para evitar perda de fundos.",
        token_typo_warning: "O endere\xE7o do token n\xE3o corresponde a stablecoins conhecidas (USDC, USDT, PYUSD, CASH). Verifique com aten\xE7\xE3o para evitar perda permanente de fundos."
      },
      wallet: {
        no_wallet_detected: "Nenhuma carteira Solana detectada",
        install_wallet: "Instale uma carteira Solana como Phantom, Solflare ou Backpack.",
        wallet_not_connected: "Carteira n\xE3o conectada",
        connect_your_wallet: "Conecte sua carteira para continuar.",
        wallet_connection_failed: "Falha ao conectar a carteira",
        try_again: "Tente conectar novamente.",
        transaction_rejected: "A transa\xE7\xE3o foi rejeitada",
        approve_in_wallet: "Aprove a transa\xE7\xE3o na sua carteira para continuar.",
        select_wallet: "Selecionar carteira",
        change: "Alterar"
      }
    };
  }
});

// src/i18n/translations/ru.json
var require_ru = __commonJS({
  "src/i18n/translations/ru.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u0444\u0430\u0439\u043B \u0434\u043B\u044F \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u0430 (\u0440\u0443\u0441\u0441\u043A\u0438\u0439)",
      version: "1.0.0",
      locale: "ru",
      ui: {
        pay_with_card: "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C \u043A\u0430\u0440\u0442\u043E\u0439",
        pay_with_crypto: "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C USDC",
        pay_with_usdc: "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C USDC",
        purchase: "\u041F\u043E\u043A\u0443\u043F\u043A\u0430",
        card: "\u041A\u0430\u0440\u0442\u0430",
        usdc_solana: "USDC (Solana)",
        crypto: "\u041A\u0440\u0438\u043F\u0442\u043E\u0432\u0430\u043B\u044E\u0442\u0430",
        connect_wallet: "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043A\u043E\u0448\u0435\u043B\u0451\u043A",
        connecting: "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435...",
        processing: "\u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430...",
        loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...",
        close: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
        cancel: "\u041E\u0442\u043C\u0435\u043D\u0430",
        confirm: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C",
        retry: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C",
        go_back: "\u041D\u0430\u0437\u0430\u0434",
        contact_support: "\u0421\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F \u0441\u043E \u0441\u043B\u0443\u0436\u0431\u043E\u0439 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0438",
        pay_with_credits: "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C \u043A\u0440\u0435\u0434\u0438\u0442\u0430\u043C\u0438",
        credits: "\u041A\u0440\u0435\u0434\u0438\u0442\u044B",
        disconnect: "\u041E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
        payment_successful: "\u041F\u043B\u0430\u0442\u0435\u0436 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D \u0443\u0441\u043F\u0435\u0448\u043D\u043E!",
        subscribe: "\u041E\u0444\u043E\u0440\u043C\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443",
        subscribe_with_crypto: "\u041F\u043E\u0434\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u0441 USDC",
        subscribe_with_credits: "\u041F\u043E\u0434\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u0437\u0430 \u043A\u0440\u0435\u0434\u0438\u0442\u044B",
        subscribed: "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0430",
        subscribed_until: "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0434\u043E",
        subscription_active: "\u0412\u0430\u0448\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0430\u043A\u0442\u0438\u0432\u043D\u0430!",
        redirecting_to_checkout: "\u041F\u0435\u0440\u0435\u0445\u043E\u0434 \u043A \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u044E \u043F\u043B\u0430\u0442\u0435\u0436\u0430..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043E\u043F\u043B\u0430\u0442\u0443",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u0443. \u0415\u0441\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F, \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443."
        },
        invalid_signature: {
          message: "\u041F\u043E\u0434\u043F\u0438\u0441\u044C \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438 \u043D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u0430",
          action: "\u041E\u0434\u043E\u0431\u0440\u0438\u0442\u0435 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044E \u0432 \u0432\u0430\u0448\u0435\u043C \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u043F\u044B\u0442\u043A\u0443."
        },
        invalid_transaction: {
          message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u0443. \u0415\u0441\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430."
        },
        transaction_not_found: {
          message: "\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0432 \u0431\u043B\u043E\u043A\u0447\u0435\u0439\u043D\u0435",
          action: "\u0412\u0430\u0448\u0430 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044F \u043C\u043E\u0436\u0435\u0442 \u0435\u0449\u0451 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0442\u044C\u0441\u044F. \u041F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435 \u043D\u0435\u043C\u043D\u043E\u0433\u043E \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u0448\u0435\u043B\u0451\u043A, \u043B\u0438\u0431\u043E \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430."
        },
        transaction_not_confirmed: {
          message: "\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044F \u0435\u0449\u0451 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F",
          action: "\u041F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432 \u0431\u043B\u043E\u043A\u0447\u0435\u0439\u043D\u0435, \u0437\u0430\u0442\u0435\u043C \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437."
        },
        transaction_failed: {
          message: "\u0421\u0431\u043E\u0439 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438 \u0432 \u0431\u043B\u043E\u043A\u0447\u0435\u0439\u043D\u0435",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u0435\u0442\u0430\u043B\u0438 \u0432 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435. \u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u043D\u0443\u0436\u043D\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438 \u0438\u043B\u0438 \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C SOL \u0434\u043B\u044F \u043E\u043F\u043B\u0430\u0442\u044B \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0439."
        },
        transaction_expired: {
          message: "\u0412\u0440\u0435\u043C\u044F \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438 \u0438\u0441\u0442\u0435\u043A\u043B\u043E",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u0443. \u041F\u0440\u0438 \u043D\u0430\u043B\u0438\u0447\u0438\u0438 \u0442\u0430\u043A\u043E\u0439 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0443\u0432\u0435\u043B\u0438\u0447\u044C\u0442\u0435 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438 \u0432 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435."
        },
        invalid_recipient: {
          message: "\u041F\u043B\u0430\u0442\u0451\u0436 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430 \u043D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441",
          action: "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430 \u0438 \u0443\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u0432\u044B \u043E\u0434\u043E\u0431\u0440\u044F\u0435\u0442\u0435 \u0432\u0435\u0440\u043D\u0443\u044E \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044E \u0432 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435."
        },
        invalid_sender: {
          message: "\u041A\u043E\u0448\u0435\u043B\u0451\u043A \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u0435\u043B\u044F \u043D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u0435\u043D",
          action: "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u043A\u043E\u0448\u0435\u043B\u0451\u043A \u0437\u0430\u043D\u043E\u0432\u043E \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u043F\u044B\u0442\u043A\u0443."
        },
        unauthorized_refund_issuer: {
          message: "\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u043D\u0430 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u043E\u0432",
          action: "\u0412\u043E\u0437\u0432\u0440\u0430\u0442\u044B \u043C\u043E\u0433\u0443\u0442 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u044B. \u041E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443, \u0435\u0441\u043B\u0438 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0435 \u044D\u0442\u043E \u043E\u0448\u0438\u0431\u043A\u043E\u0439."
        },
        amount_below_minimum: {
          message: "\u0421\u0443\u043C\u043C\u0430 \u043F\u043B\u0430\u0442\u0435\u0436\u0430 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0430",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u043C\u0443\u044E \u0441\u0443\u043C\u043C\u0443 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430."
        },
        amount_mismatch: {
          message: "\u0421\u0443\u043C\u043C\u0430 \u043F\u043B\u0430\u0442\u0435\u0436\u0430 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u0439",
          action: "\u0426\u0435\u043D\u0430 \u043C\u043E\u0433\u043B\u0430 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C\u0441\u044F. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u0443."
        },
        insufficient_funds_sol: {
          message: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E SOL \u0434\u043B\u044F \u043E\u043F\u043B\u0430\u0442\u044B \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0439",
          action: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043D\u0430 \u043A\u043E\u0448\u0435\u043B\u0451\u043A \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 0.001 SOL \u0434\u043B\u044F \u043E\u043F\u043B\u0430\u0442\u044B \u0441\u0435\u0442\u0435\u0432\u044B\u0445 \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0439 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u043F\u044B\u0442\u043A\u0443."
        },
        insufficient_funds_token: {
          message: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u044B\u0439 \u0431\u0430\u043B\u0430\u043D\u0441 \u0432 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435",
          action: "\u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043A\u043E\u0448\u0435\u043B\u0451\u043A \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430."
        },
        invalid_token_mint: {
          message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0442\u043E\u043A\u0435\u043D \u043E\u043F\u043B\u0430\u0442\u044B",
          action: "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u043C \u0442\u043E\u043A\u0435\u043D\u043E\u043C, \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u043C \u0432 \u0434\u0435\u0442\u0430\u043B\u044F\u0445 \u043F\u043B\u0430\u0442\u0435\u0436\u0430."
        },
        not_spl_transfer: {
          message: "\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044F \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u043C \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u043E\u043C \u0442\u043E\u043A\u0435\u043D\u043E\u0432",
          action: "\u0423\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u0432\u044B \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0435 \u0442\u043E\u043A\u0435\u043D \u043D\u0443\u0436\u043D\u043E\u0433\u043E \u0442\u0438\u043F\u0430 \u0438\u0437 \u0432\u0430\u0448\u0435\u0433\u043E \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430."
        },
        missing_token_account: {
          message: "\u0422\u043E\u043A\u0435\u043D-\u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D",
          action: "\u0412\u0430\u0448\u0435\u043C\u0443 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0443 \u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u0442\u0440\u0435\u0431\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0442\u043E\u043A\u0435\u043D-\u0430\u043A\u043A\u0430\u0443\u043D\u0442. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430 \u0438\u043B\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0439 \u043A\u043E\u0448\u0435\u043B\u0451\u043A."
        },
        invalid_token_program: {
          message: "\u041D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0442\u043E\u043A\u0435\u043D\u0430",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u0443. \u0415\u0441\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0439 \u043A\u043E\u0448\u0435\u043B\u0451\u043A."
        },
        missing_memo: {
          message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u0440\u0438\u043C\u0435\u0447\u0430\u043D\u0438\u0435 (memo) \u043A \u043F\u043B\u0430\u0442\u0435\u0436\u0443, \u043D\u043E \u043E\u043D\u043E \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u0443 \u0438 \u0443\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u0432 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u044B \u0432\u0441\u0435 \u0434\u0435\u0442\u0430\u043B\u0438 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438."
        },
        invalid_memo: {
          message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 memo \u043F\u043B\u0430\u0442\u0435\u0436\u0430",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u0443."
        },
        payment_already_used: {
          message: "\u042D\u0442\u043E\u0442 \u043F\u043B\u0430\u0442\u0451\u0436 \u0443\u0436\u0435 \u0431\u044B\u043B \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u0441\u0442\u043E\u0440\u0438\u044E \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0439. \u0415\u0441\u043B\u0438 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043D\u043E\u0432\u044B\u0439 \u043F\u043B\u0430\u0442\u0451\u0436, \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u0443\u044E \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044E."
        },
        signature_reused: {
          message: "\u041F\u043E\u0434\u043F\u0438\u0441\u044C \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438 \u0443\u0436\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043B\u0430\u0441\u044C",
          action: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u0443\u044E \u043F\u043B\u0430\u0442\u0451\u0436\u043D\u0443\u044E \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044E."
        },
        quote_expired: {
          message: "\u0421\u0440\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043A\u043E\u0442\u0438\u0440\u043E\u0432\u043A\u0438 \u043F\u043B\u0430\u0442\u0435\u0436\u0430 \u0438\u0441\u0442\u0451\u043A",
          action: "\u0426\u0435\u043D\u044B \u0447\u0430\u0441\u0442\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u044E\u0442\u0441\u044F. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u0443."
        },
        missing_field: {
          message: "\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0432\u0441\u0435 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043F\u043E\u043B\u044F \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430."
        },
        invalid_field: {
          message: "\u041D\u0435\u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B \u043D\u0435\u0432\u0435\u0440\u043D\u043E",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0432\u0432\u0435\u0434\u0451\u043D\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u043F\u044B\u0442\u043A\u0443."
        },
        invalid_amount: {
          message: "\u041D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0441\u0443\u043C\u043C\u0430 \u043F\u043B\u0430\u0442\u0435\u0436\u0430",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u0443\u043C\u043C\u0443 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430."
        },
        invalid_wallet: {
          message: "\u041D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430",
          action: "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u043A\u043E\u0448\u0435\u043B\u0451\u043A \u0437\u0430\u043D\u043E\u0432\u043E \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u043F\u044B\u0442\u043A\u0443."
        },
        invalid_resource: {
          message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u044B\u0431\u043E\u0440 \u0442\u043E\u0432\u0430\u0440\u0430",
          action: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430."
        },
        invalid_coupon: {
          message: "\u041D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430."
        },
        invalid_cart_item: {
          message: "\u041E\u0434\u0438\u043D \u0438\u043B\u0438 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0435 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u0440\u0437\u0438\u043D\u0443 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430."
        },
        empty_cart: {
          message: "\u0412\u0430\u0448\u0430 \u043A\u043E\u0440\u0437\u0438\u043D\u0430 \u043F\u0443\u0441\u0442\u0430",
          action: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0442\u043E\u0432\u0430\u0440\u044B \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0443 \u043F\u0435\u0440\u0435\u0434 \u043E\u043F\u043B\u0430\u0442\u043E\u0439."
        },
        resource_not_found: {
          message: "\u0422\u043E\u0432\u0430\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D",
          action: "\u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0442\u043E\u0432\u0430\u0440 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430."
        },
        cart_not_found: {
          message: "\u041A\u043E\u0440\u0437\u0438\u043D\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430",
          action: "\u0421\u0440\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043A\u043E\u0440\u0437\u0438\u043D\u044B \u043C\u043E\u0433 \u0438\u0441\u0442\u0435\u0447\u044C. \u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u0437\u0430\u043A\u0430\u0437."
        },
        refund_not_found: {
          message: "\u0412\u043E\u0437\u0432\u0440\u0430\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430 \u0438\u043B\u0438 \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443."
        },
        product_not_found: {
          message: "\u0422\u043E\u0432\u0430\u0440 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
          action: "\u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0442\u043E\u0432\u0430\u0440 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0438\u0442\u0435 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0430\u0441\u0441\u043E\u0440\u0442\u0438\u043C\u0435\u043D\u0442."
        },
        coupon_not_found: {
          message: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u0434 \u0438\u043B\u0438 \u0443\u0434\u0430\u043B\u0438\u0442\u0435 \u0435\u0433\u043E, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C."
        },
        session_not_found: {
          message: "\u0421\u0435\u0430\u043D\u0441 \u043E\u043F\u043B\u0430\u0442\u044B \u0438\u0441\u0442\u0451\u043A",
          action: "\u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u043F\u043B\u0430\u0442\u0451\u0436."
        },
        cart_already_paid: {
          message: "\u042D\u0442\u043E\u0442 \u0437\u0430\u043A\u0430\u0437 \u0443\u0436\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u0441\u0442\u043E\u0440\u0438\u044E \u0437\u0430\u043A\u0430\u0437\u043E\u0432. \u0415\u0441\u043B\u0438 \u043D\u0443\u0436\u043D\u0430 \u043D\u043E\u0432\u0430\u044F \u043F\u043E\u043A\u0443\u043F\u043A\u0430, \u043D\u0430\u0447\u043D\u0438\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u0437\u0430\u043A\u0430\u0437."
        },
        refund_already_processed: {
          message: "\u042D\u0442\u043E\u0442 \u0432\u043E\u0437\u0432\u0440\u0430\u0442 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u0441\u0442\u043E\u0440\u0438\u044E \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0439 \u0438\u043B\u0438 \u0441\u0432\u044F\u0436\u0438\u0442\u0435\u0441\u044C \u0441 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u043E\u0439 \u0434\u043B\u044F \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0441\u0442\u0435\u0439."
        },
        coupon_expired: {
          message: "\u0421\u0440\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u0430 \u0438\u0441\u0442\u0451\u043A",
          action: "\u0423\u0434\u0430\u043B\u0438\u0442\u0435 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u0438\u043B\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0439."
        },
        coupon_usage_limit_reached: {
          message: "\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u0430",
          action: "\u042D\u0442\u043E\u0442 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0439 \u043A\u043E\u0434."
        },
        coupon_not_applicable: {
          message: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u043D\u0435 \u043F\u0440\u0438\u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u043A \u044D\u0442\u043E\u0439 \u043F\u043E\u043A\u0443\u043F\u043A\u0435",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u0430 \u0438\u043B\u0438 \u0443\u0434\u0430\u043B\u0438\u0442\u0435 \u0435\u0433\u043E, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C."
        },
        coupon_wrong_payment_method: {
          message: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u043D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u0435\u043D \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0441\u043F\u043E\u0441\u043E\u0431\u0430 \u043E\u043F\u043B\u0430\u0442\u044B",
          action: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0439 \u0441\u043F\u043E\u0441\u043E\u0431 \u043E\u043F\u043B\u0430\u0442\u044B \u0438\u043B\u0438 \u0443\u0434\u0430\u043B\u0438\u0442\u0435 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434."
        },
        stripe_error: {
          message: "\u0421\u0435\u0440\u0432\u0438\u0441 \u043E\u043F\u043B\u0430\u0442\u044B \u043A\u0430\u0440\u0442\u043E\u0439 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
          action: "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435 \u0438\u043B\u0438 \u0432\u043E\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435\u0441\u044C \u043E\u043F\u043B\u0430\u0442\u043E\u0439 \u043A\u0440\u0438\u043F\u0442\u043E\u0432\u0430\u043B\u044E\u0442\u043E\u0439."
        },
        rpc_error: {
          message: "\u0421\u0435\u0442\u044C \u0431\u043B\u043E\u043A\u0447\u0435\u0439\u043D\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430",
          action: "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435 \u0438\u043B\u0438 \u043E\u043F\u043B\u0430\u0442\u0438\u0442\u0435 \u043A\u0430\u0440\u0442\u043E\u0439."
        },
        network_error: {
          message: "\u041F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u0441 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435\u043C \u043A \u0441\u0435\u0442\u0438",
          action: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043A \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442\u0443 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430."
        },
        internal_error: {
          message: "\u041D\u0430 \u043D\u0430\u0448\u0435\u0439 \u0441\u0442\u043E\u0440\u043E\u043D\u0435 \u0447\u0442\u043E-\u0442\u043E \u043F\u043E\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u043F\u044B\u0442\u043A\u0443. \u0415\u0441\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F, \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443."
        },
        database_error: {
          message: "\u0421\u0435\u0440\u0432\u0438\u0441 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
          action: "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435."
        },
        config_error: {
          message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438 \u0441\u0435\u0440\u0432\u0438\u0441\u0430",
          action: "\u041E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443 \u0437\u0430 \u043F\u043E\u043C\u043E\u0449\u044C\u044E."
        },
        unknown_error: {
          message: "\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043D\u0435\u043F\u0440\u0435\u0434\u0432\u0438\u0434\u0435\u043D\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u043F\u044B\u0442\u043A\u0443 \u0438\u043B\u0438 \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443, \u0435\u0441\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F."
        }
      },
      validation: {
        unknown_token_mint: "\u041F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u0435: \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 mint \u0442\u043E\u043A\u0435\u043D\u0430. \u0422\u0449\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435, \u0447\u0442\u043E \u044D\u0442\u043E \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u044B\u0439 \u0442\u043E\u043A\u0435\u043D, \u0447\u0442\u043E\u0431\u044B \u0438\u0437\u0431\u0435\u0436\u0430\u0442\u044C \u043F\u043E\u0442\u0435\u0440\u0438 \u0441\u0440\u0435\u0434\u0441\u0442\u0432.",
        token_typo_warning: "\u0410\u0434\u0440\u0435\u0441 \u0442\u043E\u043A\u0435\u043D\u0430 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u043C\u0438 \u0441\u0442\u0435\u0439\u0431\u043B\u043A\u043E\u0438\u043D\u0430\u043C\u0438 (USDC, USDT, PYUSD, CASH). \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0432\u043D\u0438\u043C\u0430\u0442\u0435\u043B\u044C\u043D\u043E, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u0435\u0434\u043E\u0442\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0431\u0435\u0437\u0432\u043E\u0437\u0432\u0440\u0430\u0442\u043D\u0443\u044E \u043F\u043E\u0442\u0435\u0440\u044E \u0441\u0440\u0435\u0434\u0441\u0442\u0432."
      },
      wallet: {
        no_wallet_detected: "\u041A\u043E\u0448\u0435\u043B\u0451\u043A Solana \u043D\u0435 \u043E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D",
        install_wallet: "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 \u043A\u043E\u0448\u0435\u043B\u0451\u043A Solana, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 Phantom, Solflare \u0438\u043B\u0438 Backpack.",
        wallet_not_connected: "\u041A\u043E\u0448\u0435\u043B\u0451\u043A \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D",
        connect_your_wallet: "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u043A\u043E\u0448\u0435\u043B\u0451\u043A, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C.",
        wallet_connection_failed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043A\u043E\u0448\u0435\u043B\u0451\u043A",
        try_again: "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F \u0435\u0449\u0451 \u0440\u0430\u0437.",
        transaction_rejected: "\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044F \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430",
        approve_in_wallet: "\u041E\u0434\u043E\u0431\u0440\u0438\u0442\u0435 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044E \u0432 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C.",
        select_wallet: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u043E\u0448\u0435\u043B\u0435\u043A",
        change: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C"
      }
    };
  }
});

// src/i18n/translations/ta.json
var require_ta = __commonJS({
  "src/i18n/translations/ta.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \u0BAE\u0BCA\u0BB4\u0BBF\u0BAA\u0BC6\u0BAF\u0BB0\u0BCD\u0BAA\u0BCD\u0BAA\u0BC1 \u0B95\u0BCB\u0BAA\u0BCD\u0BAA\u0BC1 (\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD)",
      version: "1.0.0",
      locale: "ta",
      ui: {
        pay_with_card: "\u0B95\u0BBE\u0BB0\u0BCD\u0B9F\u0BC1 \u0BAE\u0BC2\u0BB2\u0BAE\u0BCD \u0B9A\u0BC6\u0BB2\u0BC1\u0BA4\u0BCD\u0BA4\u0BB5\u0BC1\u0BAE\u0BCD",
        pay_with_crypto: "USDC \u0BAE\u0BC2\u0BB2\u0BAE\u0BCD \u0B9A\u0BC6\u0BB2\u0BC1\u0BA4\u0BCD\u0BA4\u0BB5\u0BC1\u0BAE\u0BCD",
        pay_with_usdc: "USDC \u0BAE\u0BC2\u0BB2\u0BAE\u0BCD \u0B9A\u0BC6\u0BB2\u0BC1\u0BA4\u0BCD\u0BA4\u0BB5\u0BC1\u0BAE\u0BCD",
        purchase: "\u0B95\u0BCA\u0BB3\u0BCD\u0BAE\u0BC1\u0BA4\u0BB2\u0BCD",
        card: "\u0B95\u0BBE\u0BB0\u0BCD\u0B9F\u0BC1",
        usdc_solana: "USDC (\u0B9A\u0BCB\u0BB2\u0BBE\u0BA9\u0BBE)",
        crypto: "\u0B95\u0BBF\u0BB0\u0BBF\u0BAA\u0BCD\u0B9F\u0BCB",
        connect_wallet: "\u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BC8 \u0B87\u0BA3\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD",
        connecting: "\u0B87\u0BA3\u0BC8\u0B95\u0BCD\u0B95\u0BBF\u0BB1\u0BA4\u0BC1...",
        processing: "\u0B9A\u0BC6\u0BAF\u0BB2\u0BBE\u0B95\u0BCD\u0B95\u0BAE\u0BCD \u0BA8\u0B9F\u0BC8\u0BAA\u0BC6\u0BB1\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1...",
        loading: "\u0B8F\u0BB1\u0BCD\u0BB1\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1...",
        close: "\u0BAE\u0BC2\u0B9F\u0BC1",
        cancel: "\u0BB0\u0BA4\u0BCD\u0BA4\u0BC1 \u0B9A\u0BC6\u0BAF\u0BCD",
        confirm: "\u0B89\u0BB1\u0BC1\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BB5\u0BC1\u0BAE\u0BCD",
        retry: "\u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF \u0B9A\u0BC6\u0BAF\u0BCD",
        go_back: "\u0BA4\u0BBF\u0BB0\u0BC1\u0BAE\u0BCD\u0BAA\u0BBF\u0B9A\u0BCD \u0B9A\u0BC6\u0BB2\u0BCD\u0BB2\u0BB5\u0BC1\u0BAE\u0BCD",
        contact_support: "\u0B89\u0BA4\u0BB5\u0BBF\u0BAF\u0BC8\u0BA4\u0BCD \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BAA\u0BC1\u0B95\u0BCA\u0BB3\u0BCD\u0BB3\u0BB5\u0BC1\u0BAE\u0BCD",
        pay_with_credits: "\u0B95\u0BBF\u0BB0\u0BC6\u0B9F\u0BBF\u0B9F\u0BCD\u0B95\u0BB3\u0BBE\u0BB2\u0BCD \u0B9A\u0BC6\u0BB2\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD",
        credits: "\u0B95\u0BBF\u0BB0\u0BC6\u0B9F\u0BBF\u0B9F\u0BCD\u0B95\u0BB3\u0BCD",
        disconnect: "\u0BA4\u0BC1\u0BA3\u0BCD\u0B9F\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD",
        payment_successful: "\u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BAE\u0BCD \u0BB5\u0BC6\u0BB1\u0BCD\u0BB1\u0BBF\u0B95\u0BB0\u0BAE\u0BBE\u0B95 \u0BAE\u0BC1\u0B9F\u0BBF\u0BA8\u0BCD\u0BA4\u0BA4\u0BC1!",
        subscribe: "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBE \u0B9A\u0BC6\u0BB2\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD",
        subscribe_with_crypto: "USDC \u0BAE\u0BC2\u0BB2\u0BAE\u0BCD \u0B9A\u0BA8\u0BCD\u0BA4\u0BBE \u0B9A\u0BC6\u0BB2\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD",
        subscribe_with_credits: "\u0B95\u0BBF\u0BB0\u0BC6\u0B9F\u0BBF\u0B9F\u0BCD\u0B95\u0BB3\u0BBE\u0BB2\u0BCD \u0B9A\u0BA8\u0BCD\u0BA4\u0BBE \u0B9A\u0BC6\u0BB2\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD",
        subscribed: "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBE \u0B89\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1",
        subscribed_until: "\u0BB5\u0BB0\u0BC8 \u0B9A\u0BA8\u0BCD\u0BA4\u0BBE \u0B89\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1",
        subscription_active: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B9A\u0BA8\u0BCD\u0BA4\u0BBE \u0B9A\u0BC6\u0BAF\u0BB2\u0BBF\u0BB2\u0BCD \u0B89\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1!",
        redirecting_to_checkout: "\u0B9A\u0BC6\u0B95\u0BCD\u0B85\u0BB5\u0BC1\u0B9F\u0BCD\u0B9F\u0BBF\u0BB1\u0BCD\u0B95\u0BC1 \u0BAE\u0BBE\u0BB1\u0BCD\u0BB1\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\u0B95\u0B9F\u0BCD\u0B9F\u0BA3 \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0BAA\u0BCD\u0BAA\u0BC1 \u0BA4\u0BCB\u0BB2\u0BCD\u0BB5\u0BBF\u0BAF\u0B9F\u0BC8\u0BA8\u0BCD\u0BA4\u0BA4\u0BC1",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD. \u0B87\u0BA4\u0BC1 \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BBE\u0BB2\u0BCD, \u0B89\u0BA4\u0BB5\u0BBF\u0BAF\u0BC8 \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BAA\u0BC1\u0B95\u0BCD\u0B95\u0BCA\u0BB3\u0BCD\u0BB3\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_signature: {
          message: "\u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0B95\u0BC8\u0BAF\u0BCA\u0BAA\u0BCD\u0BAA\u0BAE\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9\u0BA4\u0BC1",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BBF\u0BB2\u0BCD \u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8\u0BAF\u0BC8 \u0B85\u0B99\u0BCD\u0B95\u0BC0\u0B95\u0BB0\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_transaction: {
          message: "\u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BB5\u0B9F\u0BBF\u0BB5\u0BAE\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9\u0BA4\u0BC1",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD. \u0B87\u0BA4\u0BC1 \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BBE\u0BB2\u0BCD, \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD \u0B9A\u0BC6\u0BAF\u0BB2\u0BBF\u0BAF\u0BC8\u0BAA\u0BCD \u0BAA\u0BC1\u0BA4\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        transaction_not_found: {
          message: "\u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BAA\u0BBF\u0BB3\u0BBE\u0B95\u0BCD\u0B9A\u0BC6\u0BAF\u0BBF\u0BA9\u0BBF\u0BB2\u0BCD \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0B87\u0BA9\u0BCD\u0BA9\u0BC1\u0BAE\u0BCD \u0B9A\u0BC6\u0BAF\u0BB2\u0BBE\u0B95\u0BCD\u0B95\u0BA4\u0BCD\u0BA4\u0BBF\u0BB2\u0BCD \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BB2\u0BBE\u0BAE\u0BCD. \u0B92\u0BB0\u0BC1 \u0BA8\u0BBF\u0BAE\u0BBF\u0B9F\u0BAE\u0BCD \u0B95\u0BBE\u0BA4\u0BCD\u0BA4\u0BBF\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1 \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BBF\u0BB2\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD, \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        transaction_not_confirmed: {
          message: "\u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0B87\u0BA9\u0BCD\u0BA9\u0BC1\u0BAE\u0BCD \u0B9A\u0BC6\u0BAF\u0BB2\u0BBE\u0B95\u0BCD\u0B95\u0BA4\u0BCD\u0BA4\u0BBF\u0BB2\u0BCD \u0B89\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1",
          action: "\u0BAA\u0BBF\u0BB3\u0BBE\u0B95\u0BCD\u0B9A\u0BC6\u0BAF\u0BBF\u0BA9\u0BCD \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8\u0BAF\u0BC8 \u0B89\u0BB1\u0BC1\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4 \u0B92\u0BB0\u0BC1 \u0BA8\u0BBF\u0BAE\u0BBF\u0B9F\u0BAE\u0BCD \u0B95\u0BBE\u0BA4\u0BCD\u0BA4\u0BBF\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1 \u0BAA\u0BBF\u0BA9\u0BCD\u0BA9\u0BB0\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        transaction_failed: {
          message: "\u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BAA\u0BBF\u0BB3\u0BBE\u0B95\u0BCD\u0B9A\u0BC6\u0BAF\u0BBF\u0BA9\u0BBF\u0BB2\u0BCD \u0BA4\u0BCB\u0BB2\u0BCD\u0BB5\u0BBF\u0BAF\u0B9F\u0BC8\u0BA8\u0BCD\u0BA4\u0BA4\u0BC1",
          action: "\u0BB5\u0BBF\u0BB5\u0BB0\u0B99\u0BCD\u0B95\u0BB3\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BC8\u0B9A\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD. \u0BAA\u0BBF\u0BA3\u0BC8\u0BAF\u0B95\u0BCD \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0B99\u0BCD\u0B95\u0BB3\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0B95\u0BC2\u0B9F\u0BC1\u0BA4\u0BB2\u0BCD SOL \u0B9A\u0BC7\u0BB0\u0BCD\u0B95\u0BCD\u0B95 \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0B85\u0BAE\u0BC8\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BC8 \u0BAE\u0BBE\u0BB1\u0BCD\u0BB1 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BBF\u0BAF\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BC1\u0BAE\u0BCD."
        },
        transaction_expired: {
          message: "\u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0B9A\u0BC6\u0BAF\u0BB2\u0BBE\u0B95\u0BCD\u0B95\u0BA4\u0BCD\u0BA4\u0BBF\u0BB1\u0BCD\u0B95\u0BC1 \u0B85\u0BA4\u0BBF\u0B95 \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD \u0B8E\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BCD \u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BA4\u0BC1",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD. \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD \u0B86\u0BA4\u0BB0\u0BBF\u0BA4\u0BCD\u0BA4\u0BBE\u0BB2\u0BCD \u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BAE\u0BC1\u0BA9\u0BCD\u0BA9\u0BC1\u0BB0\u0BBF\u0BAE\u0BC8\u0BAF\u0BC8 \u0B89\u0BAF\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BBF\u0BAA\u0BCD \u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_recipient: {
          message: "\u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BAE\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BC1 \u0B85\u0BA9\u0BC1\u0BAA\u0BCD\u0BAA\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BC1\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1",
          action: "\u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BBF\u0BB2\u0BCD \u0B9A\u0BB0\u0BBF\u0BAF\u0BBE\u0BA9 \u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8\u0BAF\u0BC8 \u0B85\u0B99\u0BCD\u0B95\u0BC0\u0B95\u0BB0\u0BBF\u0B95\u0BCD\u0B95 \u0B89\u0BB1\u0BC1\u0BA4\u0BBF\u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_sender: {
          message: "\u0B95\u0B9F\u0BCD\u0B9F\u0BA3 \u0B85\u0BA9\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0BA8\u0BB0\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9\u0BA4\u0BC1",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BC8 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0B87\u0BA3\u0BC8\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        unauthorized_refund_issuer: {
          message: "\u0BAA\u0BA3\u0BAE\u0BCD \u0BA4\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF \u0B85\u0BB3\u0BBF\u0B95\u0BCD\u0B95 \u0BA8\u0BC0\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B85\u0BA9\u0BC1\u0BAE\u0BA4\u0BBF\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BB5\u0BB0\u0BCD \u0B85\u0BB2\u0BCD\u0BB2",
          action: "\u0B85\u0B99\u0BCD\u0B95\u0BC0\u0B95\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F \u0B95\u0BA3\u0B95\u0BCD\u0B95\u0BC1\u0B95\u0BB3\u0BCD \u0BAE\u0B9F\u0BCD\u0B9F\u0BC1\u0BAE\u0BC7 \u0BAA\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8 \u0BA4\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF \u0B85\u0BB3\u0BBF\u0B95\u0BCD\u0B95 \u0BAE\u0BC1\u0B9F\u0BBF\u0BAF\u0BC1\u0BAE\u0BCD. \u0B87\u0BA4\u0BC1 \u0BA4\u0BB5\u0BB1\u0BC1 \u0B8E\u0BA9\u0BCD\u0BB1\u0BC1 \u0BA8\u0BBF\u0BA9\u0BC8\u0BA4\u0BCD\u0BA4\u0BBE\u0BB2\u0BCD, \u0B89\u0BA4\u0BB5\u0BBF\u0BAF\u0BC8 \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BAA\u0BC1\u0B95\u0BCD\u0B95\u0BCA\u0BB3\u0BCD\u0BB3\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        amount_below_minimum: {
          message: "\u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD \u0BA4\u0BCA\u0B95\u0BC8 \u0BAE\u0BBF\u0B95\u0BB5\u0BC1\u0BAE\u0BCD \u0B95\u0BC1\u0BB1\u0BC8\u0BB5\u0BC1",
          action: "\u0BA4\u0BC7\u0BB5\u0BC8\u0BAF\u0BBE\u0BA9 \u0BA4\u0BCA\u0B95\u0BC8\u0BAF\u0BC8\u0B9A\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        amount_mismatch: {
          message: "\u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD \u0BA4\u0BCA\u0B95\u0BC8 \u0B95\u0BC2\u0BB1\u0BBF\u0BAF \u0BB5\u0BBF\u0BB2\u0BC8\u0BAF\u0BBF\u0BB2\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0BB5\u0BBF\u0BB2\u0BC8 \u0BAE\u0BBE\u0BB1\u0BCD\u0BB1\u0BBF\u0BAF\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BB2\u0BBE\u0BAE\u0BCD. \u0BAA\u0BC1\u0BA4\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1 \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        insufficient_funds_sol: {
          message: "\u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0B99\u0BCD\u0B95\u0BB3\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0BAA\u0BCB\u0BA4\u0BC1\u0BAE\u0BBE\u0BA9 SOL \u0B87\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0BAA\u0BBF\u0BA3\u0BC8\u0BAF\u0B95\u0BCD \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0B99\u0BCD\u0B95\u0BB3\u0BC8\u0B9A\u0BCD \u0B9A\u0BC6\u0BB2\u0BC1\u0BA4\u0BCD\u0BA4 \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BBF\u0BB2\u0BCD \u0B95\u0BC1\u0BB1\u0BC8\u0BA8\u0BCD\u0BA4\u0BA4\u0BC1 0.001 SOL \u0B9A\u0BC7\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BC1, \u0BAA\u0BBF\u0BA9\u0BCD\u0BA9\u0BB0\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        insufficient_funds_token: {
          message: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BBF\u0BB2\u0BCD \u0BAA\u0BCB\u0BA4\u0BC1\u0BAE\u0BBE\u0BA9 \u0B87\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1 \u0B87\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0B95\u0BC2\u0B9F\u0BC1\u0BA4\u0BB2\u0BCD \u0BA8\u0BBF\u0BA4\u0BBF\u0BAF\u0BC8\u0B9A\u0BCD \u0B9A\u0BC7\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_token_mint: {
          message: "\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B95\u0B9F\u0BCD\u0B9F\u0BA3 \u0B9F\u0BCB\u0B95\u0BCD\u0B95\u0BA9\u0BCD",
          action: "\u0B95\u0B9F\u0BCD\u0B9F\u0BA3 \u0BB5\u0BBF\u0BB5\u0BB0\u0B99\u0BCD\u0B95\u0BB3\u0BBF\u0BB2\u0BCD \u0B95\u0BBE\u0B9F\u0BCD\u0B9F\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F \u0B9A\u0BB0\u0BBF\u0BAF\u0BBE\u0BA9 \u0B9F\u0BCB\u0B95\u0BCD\u0B95\u0BA9\u0BC1\u0B9F\u0BA9\u0BCD \u0B9A\u0BC6\u0BB2\u0BC1\u0BA4\u0BCD\u0BA4\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        not_spl_transfer: {
          message: "\u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0B9A\u0BC6\u0BB2\u0BCD\u0BB2\u0BC1\u0BAA\u0B9F\u0BBF\u0BAF\u0BBE\u0B95\u0BC1\u0BAE\u0BCD \u0B9F\u0BCB\u0B95\u0BCD\u0B95\u0BA9\u0BCD \u0BAA\u0BB0\u0BBF\u0BAE\u0BBE\u0BB1\u0BCD\u0BB1\u0BAE\u0BCD \u0B85\u0BB2\u0BCD\u0BB2",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BBF\u0BB2\u0BBF\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1 \u0B9A\u0BB0\u0BBF\u0BAF\u0BBE\u0BA9 \u0B9F\u0BCB\u0B95\u0BCD\u0B95\u0BA9\u0BCD \u0BB5\u0B95\u0BC8\u0BAF\u0BC8 \u0B85\u0BA9\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BBF\u0BB1\u0BC0\u0BB0\u0BCD\u0B95\u0BB3\u0BCD \u0B8E\u0BA9\u0BCD\u0BAA\u0BA4\u0BC8 \u0B89\u0BB1\u0BC1\u0BA4\u0BBF\u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        missing_token_account: {
          message: "\u0B9F\u0BCB\u0B95\u0BCD\u0B95\u0BA9\u0BCD \u0B95\u0BA3\u0B95\u0BCD\u0B95\u0BC1 \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0BAE\u0BC1\u0BA4\u0BB2\u0BBF\u0BB2\u0BCD \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD \u0B92\u0BB0\u0BC1 \u0B9F\u0BCB\u0B95\u0BCD\u0B95\u0BA9\u0BCD \u0B95\u0BA3\u0B95\u0BCD\u0B95\u0BC8 \u0B89\u0BB0\u0BC1\u0BB5\u0BBE\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BBF\u0BAF\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BC1\u0BAE\u0BCD. \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BCB \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BB5\u0BC7\u0BB1\u0BC1 \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BC8 \u0BAA\u0BAF\u0BA9\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BB5\u0BCB \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_token_program: {
          message: "\u0B9F\u0BCB\u0B95\u0BCD\u0B95\u0BA9\u0BCD \u0BA8\u0BBF\u0BB0\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9\u0BA4\u0BC1",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD. \u0B87\u0BA4\u0BC1 \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BBE\u0BB2\u0BCD, \u0BB5\u0BC7\u0BB1\u0BC1 \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BC8 \u0BAA\u0BAF\u0BA9\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BBF\u0BAA\u0BCD \u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        missing_memo: {
          message: "\u0B95\u0B9F\u0BCD\u0B9F\u0BA3 \u0BAE\u0BC6\u0BAE\u0BCB \u0BA4\u0BC7\u0BB5\u0BC8\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1 \u0B86\u0BA9\u0BBE\u0BB2\u0BCD \u0B9A\u0BC7\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1, \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BBF\u0BB2\u0BCD \u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BB5\u0BBF\u0BB5\u0BB0\u0B99\u0BCD\u0B95\u0BB3\u0BC8 \u0B85\u0B99\u0BCD\u0B95\u0BC0\u0B95\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_memo: {
          message: "\u0B95\u0B9F\u0BCD\u0B9F\u0BA3 \u0BAE\u0BC6\u0BAE\u0BCB\u0BB5\u0BBF\u0BA9\u0BCD \u0BB5\u0B9F\u0BBF\u0BB5\u0BAE\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9\u0BA4\u0BC1",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        payment_already_used: {
          message: "\u0B87\u0BA8\u0BCD\u0BA4 \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BAE\u0BCD \u0B8F\u0BB1\u0BCD\u0B95\u0BA9\u0BB5\u0BC7 \u0B9A\u0BC6\u0BAF\u0BB2\u0BBE\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BB5\u0BB0\u0BB2\u0BBE\u0BB1\u0BCD\u0BB1\u0BC8\u0B9A\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD. \u0BAE\u0BB1\u0BCD\u0BB1\u0BCA\u0BB0\u0BC1 \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BAE\u0BCD \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BC6\u0BA9\u0BBF\u0BB2\u0BCD \u0BAA\u0BC1\u0BA4\u0BBF\u0BAF \u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8\u0BAF\u0BC8 \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        signature_reused: {
          message: "\u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8\u0B95\u0BCD \u0B95\u0BC8\u0BAF\u0BCA\u0BAA\u0BCD\u0BAA\u0BAE\u0BCD \u0B8F\u0BB1\u0BCD\u0B95\u0BA9\u0BB5\u0BC7 \u0BAA\u0BAF\u0BA9\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BC1\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1",
          action: "\u0BAA\u0BC1\u0BA4\u0BBF\u0BAF \u0B95\u0B9F\u0BCD\u0B9F\u0BA3 \u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8\u0BAF\u0BC8 \u0B89\u0BB0\u0BC1\u0BB5\u0BBE\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        quote_expired: {
          message: "\u0BB5\u0BBF\u0BB2\u0BC8 \u0BAE\u0BC7\u0BB1\u0BCD\u0B95\u0BCB\u0BB3\u0BCD \u0B95\u0BBE\u0BB2\u0BBE\u0BB5\u0BA4\u0BBF\u0BAF\u0BBE\u0BA9\u0BA4\u0BC1",
          action: "\u0BB5\u0BBF\u0BB2\u0BC8\u0B95\u0BB3\u0BCD \u0B85\u0B9F\u0BBF\u0B95\u0BCD\u0B95\u0B9F\u0BBF \u0BAA\u0BC1\u0BA4\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0B95\u0BBF\u0BA9\u0BCD\u0BB1\u0BA9. \u0BAA\u0BC1\u0BA4\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1 \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        missing_field: {
          message: "\u0BA4\u0BC7\u0BB5\u0BC8\u0BAF\u0BBE\u0BA9 \u0BA4\u0B95\u0BB5\u0BB2\u0BCD \u0B95\u0BBE\u0BA3\u0BAA\u0BCD\u0BAA\u0B9F\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0B85\u0BA9\u0BC8\u0BA4\u0BCD\u0BA4\u0BC1 \u0BA4\u0BC7\u0BB5\u0BC8\u0BAF\u0BBE\u0BA9 \u0BAA\u0BC1\u0BB2\u0B99\u0BCD\u0B95\u0BB3\u0BC8\u0BAF\u0BC1\u0BAE\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_field: {
          message: "\u0B9A\u0BBF\u0BB2 \u0BA4\u0B95\u0BB5\u0BB2\u0BCD\u0B95\u0BB3\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9\u0BB5\u0BC8",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BCD\u0B9F\u0BC8\u0BAA\u0BCD \u0BAA\u0BB0\u0BBF\u0B9A\u0BC0\u0BB2\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_amount: {
          message: "\u0B95\u0B9F\u0BCD\u0B9F\u0BA3 \u0BA4\u0BCA\u0B95\u0BC8 \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9\u0BA4\u0BC1",
          action: "\u0BA4\u0BCA\u0B95\u0BC8\u0BAF\u0BC8\u0B9A\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_wallet: {
          message: "\u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9\u0BA4\u0BC1",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BC8 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0B87\u0BA3\u0BC8\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_resource: {
          message: "\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0B9F\u0BBF \u0BA4\u0BC7\u0BB0\u0BCD\u0BB5\u0BC1",
          action: "\u0BAA\u0B95\u0BCD\u0B95\u0BA4\u0BCD\u0BA4\u0BC8 \u0BAA\u0BC1\u0BA4\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_coupon: {
          message: "\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B95\u0BC2\u0BAA\u0BCD\u0BAA\u0BA9\u0BCD \u0B95\u0BC1\u0BB1\u0BBF\u0BAF\u0BC0\u0B9F\u0BC1",
          action: "\u0B95\u0BC2\u0BAA\u0BCD\u0BAA\u0BA9\u0BCD \u0B95\u0BC1\u0BB1\u0BBF\u0BAF\u0BC0\u0B9F\u0BCD\u0B9F\u0BC8\u0B9A\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        invalid_cart_item: {
          message: "\u0B92\u0BB0\u0BC1 \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0B85\u0BA4\u0BB1\u0BCD\u0B95\u0BC1 \u0BAE\u0BC7\u0BB1\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F \u0B95\u0BBE\u0BB0\u0BCD\u0B9F\u0BCD \u0B89\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0B9F\u0BBF\u0B95\u0BB3\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9\u0BB5\u0BC8",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0BBE\u0BB0\u0BCD\u0B9F\u0BC8 \u0BAA\u0BB0\u0BBF\u0B9A\u0BC0\u0BB2\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        empty_cart: {
          message: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0BBE\u0BB0\u0BCD\u0B9F\u0BCD \u0B95\u0BBE\u0BB2\u0BBF\u0BAF\u0BBE\u0B95 \u0B89\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1",
          action: "\u0B95\u0BBE\u0B9A\u0BC7\u0BBE\u0BB2\u0BC8 \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BA9\u0BCD \u0B89\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0B9F\u0BBF\u0B95\u0BB3\u0BC8\u0B9A\u0BCD \u0B9A\u0BC7\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        resource_not_found: {
          message: "\u0B89\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0B9F\u0BBF \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0B87\u0BA8\u0BCD\u0BA4 \u0B89\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0B9F\u0BBF \u0B87\u0BA9\u0BBF \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BBE\u0BAE\u0BB2\u0BCD \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BB2\u0BBE\u0BAE\u0BCD. \u0BAA\u0BC1\u0BA4\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        cart_not_found: {
          message: "\u0BB7\u0BBE\u0BAA\u0BCD\u0BAA\u0BBF\u0B99\u0BCD \u0B95\u0BBE\u0BB0\u0BCD\u0B9F\u0BCD \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0BBE\u0BB0\u0BCD\u0B9F\u0BCD \u0B95\u0BBE\u0BB2\u0BBE\u0BB5\u0BA4\u0BBF\u0BAF\u0BBE\u0B95\u0BBF\u0BAF\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BB2\u0BBE\u0BAE\u0BCD. \u0BAA\u0BC1\u0BA4\u0BBF\u0BAF \u0B86\u0BB0\u0BCD\u0B9F\u0BB0\u0BC8\u0BA4\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        refund_not_found: {
          message: "\u0BAA\u0BA3\u0BAE\u0BCD \u0BA4\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF\u0B9A\u0BCD \u0B9A\u0BC6\u0BB2\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BA4\u0BB2\u0BCD \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BA4\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1 \u0B95\u0BC1\u0BB1\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1 \u0B8E\u0BA3\u0BCD\u0BA3\u0BC8\u0B9A\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BCB \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0B89\u0BA4\u0BB5\u0BBF\u0BAF\u0BC8\u0BA4\u0BCD \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BAA\u0BC1\u0B95\u0BCA\u0BB3\u0BCD\u0BB3\u0BB5\u0BCB \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        product_not_found: {
          message: "\u0BA4\u0BAF\u0BBE\u0BB0\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1 \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0B87\u0BA8\u0BCD\u0BA4 \u0BA4\u0BAF\u0BBE\u0BB0\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1 \u0B87\u0BA9\u0BBF \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BBE\u0BAE\u0BB2\u0BCD \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BB2\u0BBE\u0BAE\u0BCD. \u0B8E\u0B99\u0BCD\u0B95\u0BB3\u0BBF\u0BA9\u0BCD \u0BA4\u0BB1\u0BCD\u0BAA\u0BCB\u0BA4\u0BC8\u0BAF \u0BA4\u0BC6\u0BB0\u0BBF\u0BB5\u0BC1\u0B95\u0BB3\u0BC8 \u0B89\u0BB2\u0BBE\u0BB5\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        coupon_not_found: {
          message: "\u0B95\u0BC2\u0BAA\u0BCD\u0BAA\u0BA9\u0BCD \u0B95\u0BC1\u0BB1\u0BBF\u0BAF\u0BC0\u0B9F\u0BC1 \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0B95\u0BC2\u0BAA\u0BCD\u0BAA\u0BA9\u0BCD \u0B95\u0BC1\u0BB1\u0BBF\u0BAF\u0BC0\u0B9F\u0BCD\u0B9F\u0BC8\u0B9A\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BCB \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0B85\u0BA4\u0BC8 \u0BA8\u0BC0\u0B95\u0BCD\u0B95\u0BBF \u0BA4\u0BCA\u0B9F\u0BB0\u0BB5\u0BCB \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        session_not_found: {
          message: "\u0B95\u0B9F\u0BCD\u0B9F\u0BA3 \u0B85\u0BAE\u0BB0\u0BCD\u0BB5\u0BC1 \u0B95\u0BBE\u0BB2\u0BBE\u0BB5\u0BA4\u0BBF\u0BAF\u0BBE\u0BA9\u0BA4\u0BC1",
          action: "\u0BAA\u0BC1\u0BA4\u0BBF\u0BAF \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8\u0BA4\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        cart_already_paid: {
          message: "\u0B87\u0BA8\u0BCD\u0BA4 \u0B86\u0BB0\u0BCD\u0B9F\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0B8F\u0BB1\u0BCD\u0B95\u0BA9\u0BB5\u0BC7 \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BAE\u0BCD \u0B9A\u0BC6\u0BB2\u0BC1\u0BA4\u0BCD\u0BA4\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BC1\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B86\u0BB0\u0BCD\u0B9F\u0BB0\u0BCD \u0BB5\u0BB0\u0BB2\u0BBE\u0BB1\u0BCD\u0BB1\u0BC8\u0B9A\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD. \u0BAE\u0BB1\u0BCD\u0BB1\u0BCA\u0BB0\u0BC1 \u0B95\u0BCA\u0BB3\u0BCD\u0BAE\u0BC1\u0BA4\u0BB2\u0BCD \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BC6\u0BA9\u0BBF\u0BB2\u0BCD \u0BAA\u0BC1\u0BA4\u0BBF\u0BAF \u0B86\u0BB0\u0BCD\u0B9F\u0BB0\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        refund_already_processed: {
          message: "\u0B87\u0BA8\u0BCD\u0BA4 \u0BAA\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8\u0BA4\u0BCD \u0BA4\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BBF\u0B9A\u0BCD \u0B9A\u0BC6\u0BB2\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BA4\u0BB2\u0BCD \u0B8F\u0BB1\u0BCD\u0B95\u0BA9\u0BB5\u0BC7 \u0B9A\u0BC6\u0BAF\u0BB2\u0BBE\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BC1\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BB5\u0BB0\u0BB2\u0BBE\u0BB1\u0BC8\u0B9A\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BCB \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BB5\u0BBF\u0BB5\u0BB0\u0B99\u0BCD\u0B95\u0BB3\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0B89\u0BA4\u0BB5\u0BBF\u0BAF\u0BC8\u0BA4\u0BCD \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BAA\u0BC1\u0B95\u0BCA\u0BB3\u0BCD\u0BB3\u0BB5\u0BCB \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        coupon_expired: {
          message: "\u0B95\u0BC2\u0BAA\u0BCD\u0BAA\u0BA9\u0BCD \u0B95\u0BBE\u0BB2\u0BBE\u0BB5\u0BA4\u0BBF\u0BAF\u0BBE\u0BA9\u0BA4\u0BC1",
          action: "\u0B95\u0BC2\u0BAA\u0BCD\u0BAA\u0BA9\u0BCD \u0B95\u0BC1\u0BB1\u0BBF\u0BAF\u0BC0\u0B9F\u0BCD\u0B9F\u0BC8 \u0B85\u0B95\u0BB1\u0BCD\u0BB1\u0BB5\u0BCB \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BB5\u0BC7\u0BB1\u0BCA\u0BB0\u0BC1 \u0B95\u0BC1\u0BB1\u0BBF\u0BAF\u0BC0\u0B9F\u0BCD\u0B9F\u0BC8 \u0BAA\u0BAF\u0BA9\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BB5\u0BCB \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        coupon_usage_limit_reached: {
          message: "\u0B95\u0BC2\u0BAA\u0BCD\u0BAA\u0BA9\u0BCD \u0BAA\u0BAF\u0BA9\u0BCD\u0BAA\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1 \u0B8E\u0B9F\u0BCD\u0B9F\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BC1\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1",
          action: "\u0B87\u0BA8\u0BCD\u0BA4 \u0B95\u0BC2\u0BAA\u0BCD\u0BAA\u0BA9\u0BCD \u0BAE\u0BC1\u0BB4\u0BC1\u0BAE\u0BC8\u0BAF\u0BBE\u0B95 \u0BAA\u0BAF\u0BA9\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BC1\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1. \u0BB5\u0BC7\u0BB1\u0BC1 \u0B95\u0BC1\u0BB1\u0BBF\u0BAF\u0BC0\u0B9F\u0BCD\u0B9F\u0BC8 \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        coupon_not_applicable: {
          message: "\u0B87\u0BA8\u0BCD\u0BA4 \u0B95\u0BCA\u0BB3\u0BCD\u0BAE\u0BC1\u0BA4\u0BB2\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0B95\u0BC2\u0BAA\u0BCD\u0BAA\u0BA9\u0BCD \u0BAA\u0BAF\u0BA9\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4 \u0BAE\u0BC1\u0B9F\u0BBF\u0BAF\u0BBE\u0BA4\u0BC1",
          action: "\u0B95\u0BC2\u0BAA\u0BCD\u0BAA\u0BA9\u0BCD \u0BA8\u0BBF\u0BAA\u0BA8\u0BCD\u0BA4\u0BA9\u0BC8\u0B95\u0BB3\u0BC8\u0B9A\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BCB \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0B85\u0BA4\u0BC8 \u0BA8\u0BC0\u0B95\u0BCD\u0B95\u0BBF \u0BA4\u0BCA\u0B9F\u0BB0\u0BB5\u0BCB \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        coupon_wrong_payment_method: {
          message: "\u0B87\u0BA8\u0BCD\u0BA4 \u0B95\u0B9F\u0BCD\u0B9F\u0BA3 \u0BAE\u0BC1\u0BB1\u0BC8\u0B95\u0BCD\u0B95\u0BC1 \u0B95\u0BC2\u0BAA\u0BCD\u0BAA\u0BA9\u0BCD \u0B9A\u0BC6\u0BB2\u0BCD\u0BB2\u0BBE\u0BA4\u0BC1",
          action: "\u0BB5\u0BC7\u0BB1\u0BC1 \u0B95\u0B9F\u0BCD\u0B9F\u0BA3 \u0BAE\u0BC1\u0BB1\u0BC8\u0BAF\u0BC8 \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BCB \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0B95\u0BC2\u0BAA\u0BCD\u0BAA\u0BA9\u0BCD \u0B95\u0BC1\u0BB1\u0BBF\u0BAF\u0BC0\u0B9F\u0BCD\u0B9F\u0BC8 \u0BA8\u0BC0\u0B95\u0BCD\u0B95\u0BB5\u0BCB \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        stripe_error: {
          message: "\u0B95\u0BBE\u0BB0\u0BCD\u0B9F\u0BC1 \u0B95\u0B9F\u0BCD\u0B9F\u0BA3 \u0B9A\u0BC7\u0BB5\u0BC8 \u0BA4\u0BB1\u0BCD\u0B95\u0BBE\u0BB2\u0BBF\u0B95\u0BAE\u0BBE\u0B95 \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0B9A\u0BBF\u0BB1\u0BBF\u0BA4\u0BC1 \u0BA8\u0BC7\u0BB0\u0BA4\u0BCD\u0BA4\u0BBF\u0BB2\u0BCD \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BCB, \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BAE\u0BBE\u0BB1\u0BCD\u0BB1\u0BBE\u0B95 \u0B95\u0BBF\u0BB0\u0BBF\u0BAA\u0BCD\u0B9F\u0BCB\u0B95\u0BB0\u0BA9\u0BCD\u0B9A\u0BBF \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8\u0BAA\u0BCD \u0BAA\u0BAF\u0BA9\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BB5\u0BCB \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        rpc_error: {
          message: "\u0BAA\u0BBF\u0BB3\u0BBE\u0B95\u0BCD\u0B9A\u0BC6\u0BAF\u0BBF\u0BA9\u0BCD \u0BA8\u0BC6\u0B9F\u0BCD\u0BB5\u0BCA\u0BB0\u0BCD\u0B95\u0BCD \u0BA4\u0BB1\u0BCD\u0B95\u0BBE\u0BB2\u0BBF\u0B95\u0BAE\u0BBE\u0B95 \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0B9A\u0BBF\u0BB1\u0BBF\u0BA4\u0BC1 \u0BA8\u0BC7\u0BB0\u0BA4\u0BCD\u0BA4\u0BBF\u0BB2\u0BCD \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BCB, \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BAE\u0BBE\u0BB1\u0BCD\u0BB1\u0BBE\u0B95 \u0B95\u0BBE\u0BB0\u0BCD\u0B9F\u0BC1 \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8\u0BAA\u0BCD \u0BAA\u0BAF\u0BA9\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BB5\u0BCB \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        network_error: {
          message: "\u0BA8\u0BC6\u0B9F\u0BCD\u0BB5\u0BCA\u0BB0\u0BCD\u0B95\u0BCD \u0B87\u0BA3\u0BC8\u0BAA\u0BCD\u0BAA\u0BC1 \u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB2\u0BCD",
          action: "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B87\u0BA9\u0BCD\u0B9F\u0BB0\u0BCD\u0BA8\u0BC6\u0B9F\u0BCD \u0B87\u0BA3\u0BC8\u0BAA\u0BCD\u0BAA\u0BC8\u0B9A\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        internal_error: {
          message: "\u0B8E\u0B99\u0BCD\u0B95\u0BB3\u0BBF\u0BA9\u0BCD \u0BAA\u0B95\u0BCD\u0B95\u0BA4\u0BCD\u0BA4\u0BBF\u0BB2\u0BCD \u0B8F\u0BA4\u0BCB \u0BA4\u0BB5\u0BB1\u0BC1 \u0B8F\u0BB1\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1",
          action: "\u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD. \u0B87\u0BA4\u0BC1 \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BBE\u0BB2\u0BCD, \u0B89\u0BA4\u0BB5\u0BBF\u0BAF\u0BC8\u0BA4\u0BCD \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BAA\u0BC1\u0B95\u0BCA\u0BB3\u0BCD\u0BB3\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        database_error: {
          message: "\u0B9A\u0BC7\u0BB5\u0BC8 \u0BA4\u0BB1\u0BCD\u0B95\u0BBE\u0BB2\u0BBF\u0B95\u0BAE\u0BBE\u0B95 \u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
          action: "\u0B9A\u0BBF\u0BB1\u0BBF\u0BA4\u0BC1 \u0BA8\u0BC7\u0BB0\u0BA4\u0BCD\u0BA4\u0BBF\u0BB2\u0BCD \u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        config_error: {
          message: "\u0B9A\u0BC7\u0BB5\u0BC8 \u0B95\u0B9F\u0BCD\u0B9F\u0BAE\u0BC8\u0BAA\u0BCD\u0BAA\u0BC1 \u0BAA\u0BBF\u0BB4\u0BC8",
          action: "\u0B89\u0BA4\u0BB5\u0BBF\u0BAF\u0BC8\u0BA4\u0BCD \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BAA\u0BC1\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BC1 \u0BB5\u0BB4\u0BBF\u0B95\u0BBE\u0B9F\u0BCD\u0B9F\u0BB2\u0BC8\u0BAA\u0BCD \u0BAA\u0BC6\u0BB1\u0BB5\u0BC1\u0BAE\u0BCD."
        },
        unknown_error: {
          message: "\u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BBE\u0BA4 \u0BAA\u0BBF\u0BB4\u0BC8 \u0B8F\u0BB1\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1",
          action: "\u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BCB \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0B87\u0BA4\u0BC1 \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BBE\u0BB2\u0BCD \u0B89\u0BA4\u0BB5\u0BBF\u0BAF\u0BC8\u0BA4\u0BCD \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BAA\u0BC1\u0B95\u0BCA\u0BB3\u0BCD\u0BB3\u0BB5\u0BCB \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD."
        }
      },
      validation: {
        unknown_token_mint: "\u0B8E\u0B9A\u0BCD\u0B9A\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BC8: \u0B85\u0BB1\u0BBF\u0BAF\u0BAA\u0BCD\u0BAA\u0B9F\u0BBE\u0BA4 \u0B9F\u0BCB\u0B95\u0BCD\u0B95\u0BA9\u0BCD \u0BAE\u0BBF\u0BA9\u0BCD\u0B9F\u0BCD \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF. \u0BA8\u0BBF\u0BA4\u0BBF \u0B87\u0BB4\u0BAA\u0BCD\u0BAA\u0BC8\u0BA4\u0BCD \u0BA4\u0BB5\u0BBF\u0BB0\u0BCD\u0B95\u0BCD\u0B95 \u0B87\u0BA4\u0BC1 \u0B9A\u0BB0\u0BBF\u0BAF\u0BBE\u0BA9 \u0B9F\u0BCB\u0B95\u0BCD\u0B95\u0BA9\u0BCD \u0B8E\u0BA9\u0BCD\u0BAA\u0BA4\u0BC8 \u0B87\u0BB0\u0BC1\u0BAE\u0BC1\u0BB1\u0BC8\u0BAF\u0BC1\u0BAE\u0BCD \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.",
        token_typo_warning: "\u0B9F\u0BCB\u0B95\u0BCD\u0B95\u0BA9\u0BCD \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF \u0B85\u0BB1\u0BBF\u0BAF\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F \u0BB8\u0BCD\u0B9F\u0BC7\u0BAA\u0BBF\u0BB3\u0BCD\u0B95\u0BBE\u0BAF\u0BBF\u0BA9\u0BCD\u0B95\u0BB3\u0BC1\u0B9F\u0BA9\u0BCD (USDC, USDT, PYUSD, CASH) \u0BAA\u0BCA\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8. \u0BA8\u0BBF\u0BB0\u0BA8\u0BCD\u0BA4\u0BB0 \u0BA8\u0BBF\u0BA4\u0BBF \u0B87\u0BB4\u0BAA\u0BCD\u0BAA\u0BC8\u0BA4\u0BCD \u0BA4\u0BB5\u0BBF\u0BB0\u0BCD\u0B95\u0BCD\u0B95 \u0B95\u0BB5\u0BA9\u0BAE\u0BBE\u0B95 \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD."
      },
      wallet: {
        no_wallet_detected: "\u0B9A\u0BCB\u0BB2\u0BBE\u0BA9\u0BBE \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD \u0B95\u0BA3\u0BCD\u0B9F\u0BB1\u0BBF\u0BAF\u0BAA\u0BCD\u0BAA\u0B9F\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
        install_wallet: "Phantom, Solflare, Backpack \u0BAA\u0BCB\u0BA9\u0BCD\u0BB1 \u0B9A\u0BCB\u0BB2\u0BBE\u0BA9\u0BBE \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BC8 \u0BA8\u0BBF\u0BB1\u0BC1\u0BB5\u0BB5\u0BC1\u0BAE\u0BCD.",
        wallet_not_connected: "\u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD \u0B87\u0BA3\u0BC8\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
        connect_your_wallet: "\u0BA4\u0BCA\u0B9F\u0BB0 \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BC8 \u0B87\u0BA3\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.",
        wallet_connection_failed: "\u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BC8 \u0B87\u0BA3\u0BC8\u0B95\u0BCD\u0B95 \u0BAE\u0BC1\u0B9F\u0BBF\u0BAF\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8",
        try_again: "\u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0B87\u0BA3\u0BC8\u0B95\u0BCD\u0B95 \u0BAE\u0BC1\u0BAF\u0BB1\u0BCD\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.",
        transaction_rejected: "\u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BA8\u0BBF\u0BB0\u0BBE\u0B95\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1",
        approve_in_wallet: "\u0BA4\u0BCA\u0B9F\u0BB0 \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BB5\u0BBE\u0BB2\u0BC6\u0B9F\u0BCD\u0B9F\u0BBF\u0BB2\u0BCD \u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8\u0BAF\u0BC8 \u0B85\u0B99\u0BCD\u0B95\u0BC0\u0B95\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.",
        select_wallet: "\u0BB5\u0BBE\u0BB2\u0B9F\u0BCD\u0B9F\u0BC8\u0BA4\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD",
        change: "\u0BAE\u0BBE\u0BB1\u0BCD\u0BB1\u0BC1"
      }
    };
  }
});

// src/i18n/translations/th.json
var require_th = __commonJS({
  "src/i18n/translations/th.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \u0E44\u0E1F\u0E25\u0E4C\u0E15\u0E49\u0E19\u0E09\u0E1A\u0E31\u0E1A\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E41\u0E1B\u0E25 (\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22)",
      version: "1.0.0",
      locale: "th",
      ui: {
        pay_with_card: "\u0E0A\u0E33\u0E23\u0E30\u0E14\u0E49\u0E27\u0E22\u0E1A\u0E31\u0E15\u0E23",
        pay_with_crypto: "\u0E0A\u0E33\u0E23\u0E30\u0E14\u0E49\u0E27\u0E22 USDC",
        pay_with_usdc: "\u0E0A\u0E33\u0E23\u0E30\u0E14\u0E49\u0E27\u0E22 USDC",
        purchase: "\u0E2A\u0E31\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D",
        card: "\u0E1A\u0E31\u0E15\u0E23",
        usdc_solana: "USDC (Solana)",
        crypto: "\u0E04\u0E23\u0E34\u0E1B\u0E42\u0E15",
        connect_wallet: "\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15",
        connecting: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D...",
        processing: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E30\u0E21\u0E27\u0E25\u0E1C\u0E25...",
        loading: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14...",
        close: "\u0E1B\u0E34\u0E14",
        cancel: "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01",
        confirm: "\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19",
        retry: "\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07",
        go_back: "\u0E22\u0E49\u0E2D\u0E19\u0E01\u0E25\u0E31\u0E1A",
        contact_support: "\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1D\u0E48\u0E32\u0E22\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19",
        pay_with_credits: "\u0E0A\u0E33\u0E23\u0E30\u0E14\u0E49\u0E27\u0E22\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15",
        credits: "\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15",
        disconnect: "\u0E15\u0E31\u0E14\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D",
        payment_successful: "\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08!",
        subscribe: "\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01",
        subscribe_with_crypto: "\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E14\u0E49\u0E27\u0E22 USDC",
        subscribe_with_credits: "\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E14\u0E49\u0E27\u0E22\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15",
        subscribed: "\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E41\u0E25\u0E49\u0E27",
        subscribed_until: "\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E16\u0E36\u0E07",
        subscription_active: "\u0E01\u0E32\u0E23\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2D\u0E22\u0E39\u0E48!",
        redirecting_to_checkout: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E44\u0E1B\u0E22\u0E31\u0E07\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E25\u0E49\u0E21\u0E40\u0E2B\u0E25\u0E27",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07 \u0E2B\u0E32\u0E01\u0E22\u0E31\u0E07\u0E40\u0E01\u0E34\u0E14\u0E02\u0E36\u0E49\u0E19\u0E2D\u0E35\u0E01 \u0E42\u0E1B\u0E23\u0E14\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1D\u0E48\u0E32\u0E22\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19"
        },
        invalid_signature: {
          message: "\u0E25\u0E32\u0E22\u0E40\u0E0B\u0E47\u0E19\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E43\u0E19\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        invalid_transaction: {
          message: "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07 \u0E2B\u0E32\u0E01\u0E22\u0E31\u0E07\u0E40\u0E01\u0E34\u0E14\u0E02\u0E36\u0E49\u0E19 \u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E41\u0E2D\u0E1B\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13"
        },
        transaction_not_found: {
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E1A\u0E19\u0E1A\u0E25\u0E47\u0E2D\u0E01\u0E40\u0E0A\u0E19",
          action: "\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E2D\u0E32\u0E08\u0E01\u0E33\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E30\u0E21\u0E27\u0E25\u0E1C\u0E25 \u0E42\u0E1B\u0E23\u0E14\u0E23\u0E2D\u0E2A\u0E31\u0E01\u0E04\u0E23\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15 \u0E2B\u0E23\u0E37\u0E2D\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        transaction_not_confirmed: {
          message: "\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E22\u0E31\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E21\u0E27\u0E25\u0E1C\u0E25",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E23\u0E2D\u0E43\u0E2B\u0E49\u0E1A\u0E25\u0E47\u0E2D\u0E01\u0E40\u0E0A\u0E19\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21 \u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        transaction_failed: {
          message: "\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E25\u0E49\u0E21\u0E40\u0E2B\u0E25\u0E27\u0E1A\u0E19\u0E1A\u0E25\u0E47\u0E2D\u0E01\u0E40\u0E0A\u0E19",
          action: "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E43\u0E19\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13 \u0E2D\u0E32\u0E08\u0E15\u0E49\u0E2D\u0E07\u0E1B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E15\u0E34\u0E21 SOL \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21"
        },
        transaction_expired: {
          message: "\u0E43\u0E0A\u0E49\u0E40\u0E27\u0E25\u0E32\u0E1B\u0E23\u0E30\u0E21\u0E27\u0E25\u0E1C\u0E25\u0E19\u0E32\u0E19\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07 \u0E1E\u0E34\u0E08\u0E32\u0E23\u0E13\u0E32\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E02\u0E2D\u0E07\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E2B\u0E32\u0E01\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A"
        },
        invalid_recipient: {
          message: "\u0E2A\u0E48\u0E07\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E44\u0E1B\u0E22\u0E31\u0E07\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E25\u0E30\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E43\u0E2B\u0E49\u0E41\u0E19\u0E48\u0E43\u0E08\u0E27\u0E48\u0E32\u0E04\u0E38\u0E13\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15"
        },
        invalid_sender: {
          message: "\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E1C\u0E39\u0E49\u0E2A\u0E48\u0E07\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48"
        },
        unauthorized_refund_issuer: {
          message: "\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E17\u0E33\u0E01\u0E32\u0E23\u0E04\u0E37\u0E19\u0E40\u0E07\u0E34\u0E19",
          action: "\u0E21\u0E35\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E17\u0E35\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1B\u0E23\u0E30\u0E21\u0E27\u0E25\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E04\u0E37\u0E19\u0E40\u0E07\u0E34\u0E19 \u0E2B\u0E32\u0E01\u0E04\u0E34\u0E14\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E27\u0E32\u0E21\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14 \u0E42\u0E1B\u0E23\u0E14\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1D\u0E48\u0E32\u0E22\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19"
        },
        amount_below_minimum: {
          message: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E0A\u0E33\u0E23\u0E30\u0E15\u0E48\u0E33\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E0A\u0E33\u0E23\u0E30\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        amount_mismatch: {
          message: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E0A\u0E33\u0E23\u0E30\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E43\u0E1A\u0E40\u0E2A\u0E19\u0E2D\u0E23\u0E32\u0E04\u0E32",
          action: "\u0E23\u0E32\u0E04\u0E32\u0E2D\u0E32\u0E08\u0E21\u0E35\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E41\u0E1B\u0E25\u0E07 \u0E42\u0E1B\u0E23\u0E14\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E41\u0E25\u0E30\u0E25\u0E2D\u0E07\u0E0A\u0E33\u0E23\u0E30\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        insufficient_funds_sol: {
          message: "SOL \u0E44\u0E21\u0E48\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E1E\u0E2D\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21",
          action: "\u0E40\u0E15\u0E34\u0E21 SOL \u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 0.001 \u0E43\u0E19\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E04\u0E23\u0E2D\u0E1A\u0E04\u0E25\u0E38\u0E21\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21 \u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        insufficient_funds_token: {
          message: "\u0E22\u0E2D\u0E14\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E43\u0E19\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E44\u0E21\u0E48\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E1E\u0E2D",
          action: "\u0E40\u0E15\u0E34\u0E21\u0E40\u0E07\u0E34\u0E19\u0E43\u0E19\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        invalid_token_mint: {
          message: "\u0E42\u0E17\u0E40\u0E04\u0E47\u0E19\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E0A\u0E33\u0E23\u0E30\u0E14\u0E49\u0E27\u0E22\u0E42\u0E17\u0E40\u0E04\u0E47\u0E19\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E32\u0E21\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19"
        },
        not_spl_transfer: {
          message: "\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E01\u0E32\u0E23\u0E42\u0E2D\u0E19\u0E42\u0E17\u0E40\u0E04\u0E47\u0E19\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E04\u0E38\u0E13\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2A\u0E48\u0E07\u0E42\u0E17\u0E40\u0E04\u0E47\u0E19\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15"
        },
        missing_token_account: {
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E42\u0E17\u0E40\u0E04\u0E47\u0E19",
          action: "\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E2D\u0E32\u0E08\u0E15\u0E49\u0E2D\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E42\u0E17\u0E40\u0E04\u0E47\u0E19\u0E01\u0E48\u0E2D\u0E19 \u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E43\u0E0A\u0E49\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E2D\u0E37\u0E48\u0E19"
        },
        invalid_token_program: {
          message: "\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21\u0E42\u0E17\u0E40\u0E04\u0E47\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07 \u0E2B\u0E32\u0E01\u0E22\u0E31\u0E07\u0E40\u0E01\u0E34\u0E14\u0E02\u0E36\u0E49\u0E19 \u0E43\u0E2B\u0E49\u0E25\u0E2D\u0E07\u0E43\u0E0A\u0E49\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E2D\u0E37\u0E48\u0E19"
        },
        missing_memo: {
          message: "\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E40\u0E21\u0E42\u0E21\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E41\u0E15\u0E48\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E41\u0E19\u0E1A\u0E21\u0E32",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E25\u0E30\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E43\u0E2B\u0E49\u0E41\u0E19\u0E48\u0E43\u0E08\u0E27\u0E48\u0E32\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E43\u0E19\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15"
        },
        invalid_memo: {
          message: "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E40\u0E21\u0E42\u0E21\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        payment_already_used: {
          message: "\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E21\u0E27\u0E25\u0E1C\u0E25\u0E41\u0E25\u0E49\u0E27",
          action: "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21 \u0E2B\u0E32\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E43\u0E2B\u0E21\u0E48 \u0E42\u0E1B\u0E23\u0E14\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E43\u0E2B\u0E21\u0E48"
        },
        signature_reused: {
          message: "\u0E25\u0E32\u0E22\u0E40\u0E0B\u0E47\u0E19\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E43\u0E2B\u0E21\u0E48"
        },
        quote_expired: {
          message: "\u0E43\u0E1A\u0E40\u0E2A\u0E19\u0E2D\u0E23\u0E32\u0E04\u0E32\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38",
          action: "\u0E23\u0E32\u0E04\u0E32\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E1A\u0E48\u0E2D\u0E22\u0E04\u0E23\u0E31\u0E49\u0E07 \u0E42\u0E1B\u0E23\u0E14\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        missing_field: {
          message: "\u0E02\u0E32\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E17\u0E38\u0E01\u0E0A\u0E48\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        invalid_field: {
          message: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1A\u0E32\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E01\u0E23\u0E2D\u0E01\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        invalid_amount: {
          message: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E0A\u0E33\u0E23\u0E30\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        invalid_wallet: {
          message: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48"
        },
        invalid_resource: {
          message: "\u0E01\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        invalid_coupon: {
          message: "\u0E23\u0E2B\u0E31\u0E2A\u0E04\u0E39\u0E1B\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        invalid_cart_item: {
          message: "\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E19\u0E15\u0E30\u0E01\u0E23\u0E49\u0E32\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E15\u0E30\u0E01\u0E23\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        empty_cart: {
          message: "\u0E15\u0E30\u0E01\u0E23\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E27\u0E48\u0E32\u0E07\u0E40\u0E1B\u0E25\u0E48\u0E32",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E43\u0E19\u0E15\u0E30\u0E01\u0E23\u0E49\u0E32\u0E01\u0E48\u0E2D\u0E19\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19"
        },
        resource_not_found: {
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32",
          action: "\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E2D\u0E32\u0E08\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E08\u0E33\u0E2B\u0E19\u0E48\u0E32\u0E22\u0E41\u0E25\u0E49\u0E27 \u0E42\u0E1B\u0E23\u0E14\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E41\u0E25\u0E30\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        cart_not_found: {
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E15\u0E30\u0E01\u0E23\u0E49\u0E32\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32",
          action: "\u0E15\u0E30\u0E01\u0E23\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E2D\u0E32\u0E08\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38 \u0E42\u0E1B\u0E23\u0E14\u0E40\u0E23\u0E34\u0E48\u0E21\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D\u0E43\u0E2B\u0E21\u0E48"
        },
        refund_not_found: {
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E04\u0E37\u0E19\u0E40\u0E07\u0E34\u0E19",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07\u0E01\u0E32\u0E23\u0E04\u0E37\u0E19\u0E40\u0E07\u0E34\u0E19\u0E2B\u0E23\u0E37\u0E2D \u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1D\u0E48\u0E32\u0E22\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19"
        },
        product_not_found: {
          message: "\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E08\u0E33\u0E2B\u0E19\u0E48\u0E32\u0E22",
          action: "\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E2D\u0E32\u0E08\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E41\u0E25\u0E49\u0E27 \u0E42\u0E1B\u0E23\u0E14\u0E14\u0E39\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E17\u0E35\u0E48\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E15\u0E2D\u0E19\u0E19\u0E35\u0E49"
        },
        coupon_not_found: {
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E04\u0E39\u0E1B\u0E2D\u0E07",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E2D\u0E32\u0E2D\u0E2D\u0E01\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D"
        },
        session_not_found: {
          message: "\u0E40\u0E0B\u0E2A\u0E0A\u0E31\u0E19\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E40\u0E23\u0E34\u0E48\u0E21\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E43\u0E2B\u0E21\u0E48"
        },
        cart_already_paid: {
          message: "\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D\u0E19\u0E35\u0E49\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E41\u0E25\u0E49\u0E27",
          action: "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D \u0E2B\u0E32\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E0B\u0E37\u0E49\u0E2D\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07 \u0E42\u0E1B\u0E23\u0E14\u0E40\u0E23\u0E34\u0E48\u0E21\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D\u0E43\u0E2B\u0E21\u0E48"
        },
        refund_already_processed: {
          message: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E04\u0E37\u0E19\u0E40\u0E07\u0E34\u0E19\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E41\u0E25\u0E49\u0E27",
          action: "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E2B\u0E23\u0E37\u0E2D \u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1D\u0E48\u0E32\u0E22\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19"
        },
        coupon_expired: {
          message: "\u0E04\u0E39\u0E1B\u0E2D\u0E07\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E04\u0E39\u0E1B\u0E2D\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E43\u0E0A\u0E49\u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E37\u0E48\u0E19"
        },
        coupon_usage_limit_reached: {
          message: "\u0E16\u0E36\u0E07\u0E02\u0E35\u0E14\u0E08\u0E33\u0E01\u0E31\u0E14\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E04\u0E39\u0E1B\u0E2D\u0E07\u0E41\u0E25\u0E49\u0E27",
          action: "\u0E04\u0E39\u0E1B\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E04\u0E23\u0E1A\u0E41\u0E25\u0E49\u0E27 \u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E37\u0E48\u0E19"
        },
        coupon_not_applicable: {
          message: "\u0E04\u0E39\u0E1B\u0E2D\u0E07\u0E43\u0E0A\u0E49\u0E01\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E0B\u0E37\u0E49\u0E2D\u0E04\u0E23\u0E31\u0E49\u0E07\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u0E04\u0E39\u0E1B\u0E2D\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E2D\u0E32\u0E2D\u0E2D\u0E01\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D"
        },
        coupon_wrong_payment_method: {
          message: "\u0E04\u0E39\u0E1B\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E43\u0E0A\u0E49\u0E01\u0E31\u0E1A\u0E27\u0E34\u0E18\u0E35\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E19\u0E35\u0E49",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E43\u0E0A\u0E49\u0E27\u0E34\u0E18\u0E35\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E2D\u0E32\u0E04\u0E39\u0E1B\u0E2D\u0E07\u0E2D\u0E2D\u0E01"
        },
        stripe_error: {
          message: "\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E14\u0E49\u0E27\u0E22\u0E1A\u0E31\u0E15\u0E23\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E43\u0E19\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07 \u0E2B\u0E23\u0E37\u0E2D\u0E43\u0E0A\u0E49\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E14\u0E49\u0E27\u0E22\u0E04\u0E23\u0E34\u0E1B\u0E42\u0E15\u0E41\u0E17\u0E19"
        },
        rpc_error: {
          message: "\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E02\u0E48\u0E32\u0E22\u0E1A\u0E25\u0E47\u0E2D\u0E01\u0E40\u0E0A\u0E19\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E43\u0E19\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07 \u0E2B\u0E23\u0E37\u0E2D\u0E43\u0E0A\u0E49\u0E01\u0E32\u0E23\u0E0A\u0E33\u0E23\u0E30\u0E40\u0E07\u0E34\u0E19\u0E14\u0E49\u0E27\u0E22\u0E1A\u0E31\u0E15\u0E23\u0E41\u0E17\u0E19"
        },
        network_error: {
          message: "\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E02\u0E48\u0E32\u0E22",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E2D\u0E34\u0E19\u0E40\u0E17\u0E2D\u0E23\u0E4C\u0E40\u0E19\u0E47\u0E15\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
        },
        internal_error: {
          message: "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E02\u0E2D\u0E07\u0E40\u0E23\u0E32",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07 \u0E2B\u0E32\u0E01\u0E22\u0E31\u0E07\u0E40\u0E01\u0E34\u0E14\u0E02\u0E36\u0E49\u0E19 \u0E42\u0E1B\u0E23\u0E14\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1D\u0E48\u0E32\u0E22\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19"
        },
        database_error: {
          message: "\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E43\u0E19\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07"
        },
        config_error: {
          message: "\u0E01\u0E32\u0E23\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E04\u0E48\u0E32\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1D\u0E48\u0E32\u0E22\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E02\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E0A\u0E48\u0E27\u0E22\u0E40\u0E2B\u0E25\u0E37\u0E2D"
        },
        unknown_error: {
          message: "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E04\u0E32\u0E14\u0E04\u0E34\u0E14",
          action: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07 \u0E2B\u0E23\u0E37\u0E2D \u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1D\u0E48\u0E32\u0E22\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19\u0E2B\u0E32\u0E01\u0E22\u0E31\u0E07\u0E40\u0E01\u0E34\u0E14\u0E02\u0E36\u0E49\u0E19"
        }
      },
      validation: {
        unknown_token_mint: "\u0E04\u0E33\u0E40\u0E15\u0E37\u0E2D\u0E19: \u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E21\u0E34\u0E19\u0E15\u0E4C\u0E02\u0E2D\u0E07\u0E42\u0E17\u0E40\u0E04\u0E47\u0E19 \u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E42\u0E17\u0E40\u0E04\u0E47\u0E19\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2B\u0E25\u0E35\u0E01\u0E40\u0E25\u0E35\u0E48\u0E22\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E39\u0E0D\u0E40\u0E2A\u0E35\u0E22",
        token_typo_warning: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E42\u0E17\u0E40\u0E04\u0E47\u0E19\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E2A\u0E40\u0E15\u0E40\u0E1A\u0E34\u0E25\u0E04\u0E2D\u0E22\u0E19\u0E4C\u0E17\u0E35\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01 (USDC, USDT, PYUSD, CASH) \u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E23\u0E2D\u0E1A\u0E04\u0E2D\u0E1A\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19\u0E01\u0E32\u0E23\u0E2A\u0E39\u0E0D\u0E40\u0E2A\u0E35\u0E22\u0E16\u0E32\u0E27\u0E23"
      },
      wallet: {
        no_wallet_detected: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15 Solana",
        install_wallet: "\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15 Solana \u0E40\u0E0A\u0E48\u0E19 Phantom, Solflare \u0E2B\u0E23\u0E37\u0E2D Backpack",
        wallet_not_connected: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15",
        connect_your_wallet: "\u0E42\u0E1B\u0E23\u0E14\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D",
        wallet_connection_failed: "\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
        try_again: "\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E2D\u0E07\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07",
        transaction_rejected: "\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E16\u0E39\u0E01\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18",
        approve_in_wallet: "\u0E42\u0E1B\u0E23\u0E14\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E43\u0E19\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D",
        select_wallet: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E2D\u0E25\u0E40\u0E25\u0E47\u0E15",
        change: "\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19"
      }
    };
  }
});

// src/i18n/translations/tr.json
var require_tr = __commonJS({
  "src/i18n/translations/tr.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \xC7eviri Kaynak Dosyas\u0131 (T\xFCrk\xE7e)",
      version: "1.0.0",
      locale: "tr",
      ui: {
        pay_with_card: "Kart ile \xD6de",
        pay_with_crypto: "USDC ile \xD6de",
        pay_with_usdc: "USDC ile \xD6de",
        purchase: "Sat\u0131n Al",
        card: "Kart",
        usdc_solana: "USDC (Solana)",
        crypto: "Kripto",
        connect_wallet: "C\xFCzdan\u0131 Ba\u011Fla",
        connecting: "Ba\u011Flan\u0131l\u0131yor...",
        processing: "\u0130\u015Fleniyor...",
        loading: "Y\xFCkleniyor...",
        close: "Kapat",
        cancel: "\u0130ptal",
        confirm: "Onayla",
        retry: "Tekrar Dene",
        go_back: "Geri D\xF6n",
        contact_support: "Destek ile \u0130leti\u015Fime Ge\xE7",
        pay_with_credits: "Kredilerle \xF6de",
        credits: "Krediler",
        disconnect: "Ba\u011Flant\u0131y\u0131 kes",
        payment_successful: "\xD6deme ba\u015Far\u0131l\u0131!",
        subscribe: "Abone ol",
        subscribe_with_crypto: "USDC ile abone ol",
        subscribe_with_credits: "Kredilerle abone ol",
        subscribed: "Abone olundu",
        subscribed_until: "Abonelik biti\u015Fi",
        subscription_active: "Aboneli\u011Finiz aktif!",
        redirecting_to_checkout: "\xD6deme sayfas\u0131na y\xF6nlendiriliyor..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\xD6deme do\u011Frulamas\u0131 ba\u015Far\u0131s\u0131z",
          action: "L\xFCtfen \xF6demenizi yeniden deneyin. Bu devam ederse destekle ileti\u015Fime ge\xE7in."
        },
        invalid_signature: {
          message: "\u0130\u015Flem imzas\u0131 ge\xE7ersiz",
          action: "L\xFCtfen i\u015Flemi c\xFCzdan\u0131n\u0131zda onaylay\u0131p tekrar deneyin."
        },
        invalid_transaction: {
          message: "\u0130\u015Flem bi\xE7imi ge\xE7ersiz",
          action: "L\xFCtfen \xF6demenizi yeniden deneyin. Bu devam ederse c\xFCzdan uygulaman\u0131z\u0131 g\xFCncellemeyi deneyin."
        },
        transaction_not_found: {
          message: "\u0130\u015Flem blok zincirinde bulunamad\u0131",
          action: "\u0130\u015Fleminiz h\xE2l\xE2 i\u015Fleniyor olabilir. L\xFCtfen biraz bekleyip c\xFCzdan\u0131n\u0131z\u0131 kontrol edin veya tekrar deneyin."
        },
        transaction_not_confirmed: {
          message: "\u0130\u015Flem h\xE2l\xE2 i\u015Fleniyor",
          action: "L\xFCtfen blok zincirinin i\u015Fleminizi onaylamas\u0131 i\xE7in bir s\xFCre bekleyin, ard\u0131ndan tekrar deneyin."
        },
        transaction_failed: {
          message: "\u0130\u015Flem blok zincirinde ba\u015Far\u0131s\u0131z oldu",
          action: "Ayr\u0131nt\u0131lar i\xE7in c\xFCzdan\u0131n\u0131z\u0131 kontrol edin. \u0130\u015Flem ayarlar\u0131n\u0131z\u0131 de\u011Fi\u015Ftirmeniz veya \xFCcretler i\xE7in daha fazla SOL eklemeniz gerekebilir."
        },
        transaction_expired: {
          message: "\u0130\u015Flemin i\u015Flenmesi \xE7ok uzun s\xFCrd\xFC",
          action: "L\xFCtfen \xF6demenizi yeniden deneyin. C\xFCzdan\u0131n\u0131z destekliyorsa i\u015Flem \xF6nceli\u011Fini art\u0131rmay\u0131 d\xFC\u015F\xFCn\xFCn."
        },
        invalid_recipient: {
          message: "\xD6deme yanl\u0131\u015F adrese g\xF6nderildi",
          action: "L\xFCtfen tekrar deneyin ve c\xFCzdan\u0131n\u0131zda do\u011Fru i\u015Flemi onaylad\u0131\u011F\u0131n\u0131zdan emin olun."
        },
        invalid_sender: {
          message: "\xD6deme g\xF6nderen c\xFCzdan ge\xE7ersiz",
          action: "L\xFCtfen c\xFCzdan\u0131n\u0131z\u0131 yeniden ba\u011Flay\u0131p tekrar deneyin."
        },
        unauthorized_refund_issuer: {
          message: "\u0130ade i\u015Flemi i\xE7in yetkiniz yok",
          action: "Yaln\u0131zca yetkili hesaplar iade yapabilir. Bunun bir hata oldu\u011Funu d\xFC\u015F\xFCn\xFCyorsan\u0131z l\xFCtfen destekle ileti\u015Fime ge\xE7in."
        },
        amount_below_minimum: {
          message: "\xD6deme tutar\u0131 \xE7ok d\xFC\u015F\xFCk",
          action: "L\xFCtfen gerekli tutar\u0131 kontrol edip tekrar deneyin."
        },
        amount_mismatch: {
          message: "\xD6deme tutar\u0131 teklifle e\u015Fle\u015Fmiyor",
          action: "Fiyat de\u011Fi\u015Fmi\u015F olabilir. L\xFCtfen yenileyip \xF6demenizi yeniden deneyin."
        },
        insufficient_funds_sol: {
          message: "\u0130\u015Flem \xFCcretleri i\xE7in yeterli SOL yok",
          action: "A\u011F \xFCcretlerini kar\u015F\u0131lamak i\xE7in c\xFCzdan\u0131n\u0131za en az 0.001 SOL ekleyin, ard\u0131ndan tekrar deneyin."
        },
        insufficient_funds_token: {
          message: "C\xFCzdan\u0131n\u0131zda yetersiz bakiye",
          action: "L\xFCtfen c\xFCzdan\u0131n\u0131za daha fazla bakiye ekleyip tekrar deneyin."
        },
        invalid_token_mint: {
          message: "Yanl\u0131\u015F \xF6deme tokeni",
          action: "L\xFCtfen \xF6deme ayr\u0131nt\u0131lar\u0131nda g\xF6sterilen do\u011Fru token ile \xF6deme yap\u0131n."
        },
        not_spl_transfer: {
          message: "\u0130\u015Flem ge\xE7erli bir token transferi de\u011Fil",
          action: "L\xFCtfen c\xFCzdan\u0131n\u0131zdan do\u011Fru token t\xFCr\xFCn\xFC g\xF6nderdi\u011Finizden emin olun."
        },
        missing_token_account: {
          message: "Token hesab\u0131 bulunamad\u0131",
          action: "C\xFCzdan\u0131n\u0131z \xF6nce bir token hesab\u0131 olu\u015Fturmay\u0131 gerektirebilir. Tekrar deneyin veya farkl\u0131 bir c\xFCzdan kullan\u0131n."
        },
        invalid_token_program: {
          message: "Ge\xE7ersiz token program\u0131",
          action: "L\xFCtfen \xF6demenizi yeniden deneyin. Bu devam ederse farkl\u0131 bir c\xFCzdan kullanmay\u0131 deneyin."
        },
        missing_memo: {
          message: "\xD6deme notu gerekliydi ancak eklenmemi\u015F",
          action: "L\xFCtfen \xF6demenizi yeniden deneyin ve c\xFCzdan\u0131n\u0131zda i\u015Flem ayr\u0131nt\u0131lar\u0131n\u0131 onaylad\u0131\u011F\u0131n\u0131zdan emin olun."
        },
        invalid_memo: {
          message: "\xD6deme notu bi\xE7imi ge\xE7ersiz",
          action: "L\xFCtfen \xF6demenizi yeniden deneyin."
        },
        payment_already_used: {
          message: "Bu \xF6deme zaten i\u015Flendi",
          action: "\u0130\u015Flem ge\xE7mi\u015Finizi kontrol edin. Yeni bir \xF6deme yapman\u0131z gerekiyorsa l\xFCtfen yeni bir i\u015Flem ba\u015Flat\u0131n."
        },
        signature_reused: {
          message: "\u0130\u015Flem imzas\u0131 zaten kullan\u0131lm\u0131\u015F",
          action: "L\xFCtfen yeni bir \xF6deme i\u015Flemi olu\u015Fturun."
        },
        quote_expired: {
          message: "\xD6deme teklifi s\xFCresi doldu",
          action: "Fiyatlar s\u0131k s\u0131k g\xFCncellenir. L\xFCtfen yenileyip \xF6demenizi yeniden deneyin."
        },
        missing_field: {
          message: "Gerekli bilgi eksik",
          action: "L\xFCtfen t\xFCm gerekli alanlar\u0131 kontrol edip tekrar deneyin."
        },
        invalid_field: {
          message: "Baz\u0131 bilgiler ge\xE7ersiz",
          action: "L\xFCtfen girdilerinizi kontrol edip tekrar deneyin."
        },
        invalid_amount: {
          message: "\xD6deme tutar\u0131 ge\xE7ersiz",
          action: "L\xFCtfen tutar\u0131 kontrol edip tekrar deneyin."
        },
        invalid_wallet: {
          message: "C\xFCzdan adresi ge\xE7ersiz",
          action: "L\xFCtfen c\xFCzdan\u0131n\u0131z\u0131 yeniden ba\u011Flay\u0131p tekrar deneyin."
        },
        invalid_resource: {
          message: "Ge\xE7ersiz \xF6\u011Fe se\xE7imi",
          action: "L\xFCtfen sayfay\u0131 yenileyip tekrar deneyin."
        },
        invalid_coupon: {
          message: "Ge\xE7ersiz kupon kodu",
          action: "L\xFCtfen kupon kodunu kontrol edip tekrar deneyin."
        },
        invalid_cart_item: {
          message: "Sepetteki bir veya daha fazla \xFCr\xFCn ge\xE7ersiz",
          action: "L\xFCtfen sepetinizi g\xF6zden ge\xE7irip tekrar deneyin."
        },
        empty_cart: {
          message: "Sepetiniz bo\u015F",
          action: "L\xFCtfen \xF6deme yapmadan \xF6nce sepetinize \xFCr\xFCn ekleyin."
        },
        resource_not_found: {
          message: "\xD6\u011Fe bulunamad\u0131",
          action: "Bu \xF6\u011Fe art\u0131k mevcut olmayabilir. L\xFCtfen yenileyip tekrar deneyin."
        },
        cart_not_found: {
          message: "Al\u0131\u015Fveri\u015F sepeti bulunamad\u0131",
          action: "Sepetinizin s\xFCresi dolmu\u015F olabilir. L\xFCtfen yeni bir sipari\u015F ba\u015Flat\u0131n."
        },
        refund_not_found: {
          message: "\u0130ade bulunamad\u0131",
          action: "L\xFCtfen iade referans numaran\u0131z\u0131 kontrol edin veya destekle ileti\u015Fime ge\xE7in."
        },
        product_not_found: {
          message: "\xDCr\xFCn mevcut de\u011Fil",
          action: "Bu \xFCr\xFCn art\u0131k mevcut olmayabilir. L\xFCtfen g\xFCncel se\xE7eneklerimize g\xF6z at\u0131n."
        },
        coupon_not_found: {
          message: "Kupon kodu bulunamad\u0131",
          action: "L\xFCtfen kupon kodunu kontrol edin veya devam etmek i\xE7in kald\u0131r\u0131n."
        },
        session_not_found: {
          message: "\xD6deme oturumu sona erdi",
          action: "L\xFCtfen yeni bir \xF6deme ba\u015Flat\u0131n."
        },
        cart_already_paid: {
          message: "Bu sipari\u015F zaten \xF6dendi",
          action: "Sipari\u015F ge\xE7mi\u015Finizi kontrol edin. Ba\u015Fka bir sat\u0131n alma yapman\u0131z gerekiyorsa l\xFCtfen yeni bir sipari\u015F ba\u015Flat\u0131n."
        },
        refund_already_processed: {
          message: "Bu iade zaten i\u015Flendi",
          action: "\u0130\u015Flem ge\xE7mi\u015Finizi kontrol edin veya ayr\u0131nt\u0131lar i\xE7in destekle ileti\u015Fime ge\xE7in."
        },
        coupon_expired: {
          message: "Kuponun s\xFCresi doldu",
          action: "L\xFCtfen kuponu kald\u0131r\u0131n veya farkl\u0131 bir kod kullan\u0131n."
        },
        coupon_usage_limit_reached: {
          message: "Kupon kullan\u0131m limiti doldu",
          action: "Bu kupon tamamen kullan\u0131ld\u0131. L\xFCtfen farkl\u0131 bir kod deneyin."
        },
        coupon_not_applicable: {
          message: "Kupon bu sat\u0131n alma i\xE7in uygulanamaz",
          action: "L\xFCtfen kupon ko\u015Fullar\u0131n\u0131 kontrol edin veya devam etmek i\xE7in kald\u0131r\u0131n."
        },
        coupon_wrong_payment_method: {
          message: "Kupon bu \xF6deme y\xF6ntemi i\xE7in ge\xE7erli de\u011Fil",
          action: "Farkl\u0131 bir \xF6deme y\xF6ntemi deneyin veya kuponu kald\u0131r\u0131n."
        },
        stripe_error: {
          message: "Kart \xF6deme servisi ge\xE7ici olarak kullan\u0131lam\u0131yor",
          action: "L\xFCtfen k\u0131sa bir s\xFCre sonra tekrar deneyin veya kripto \xF6demesini kullan\u0131n."
        },
        rpc_error: {
          message: "Blok zinciri a\u011F\u0131 ge\xE7ici olarak kullan\u0131lam\u0131yor",
          action: "L\xFCtfen k\u0131sa bir s\xFCre sonra tekrar deneyin veya kartla \xF6demeyi kullan\u0131n."
        },
        network_error: {
          message: "A\u011F ba\u011Flant\u0131 sorunu",
          action: "L\xFCtfen internet ba\u011Flant\u0131n\u0131z\u0131 kontrol edip tekrar deneyin."
        },
        internal_error: {
          message: "Bizim taraf\u0131m\u0131zda bir \u015Feyler ters gitti",
          action: "L\xFCtfen tekrar deneyin. Bu devam ederse destekle ileti\u015Fime ge\xE7in."
        },
        database_error: {
          message: "Hizmet ge\xE7ici olarak kullan\u0131lam\u0131yor",
          action: "L\xFCtfen k\u0131sa bir s\xFCre sonra tekrar deneyin."
        },
        config_error: {
          message: "Hizmet yap\u0131land\u0131rma hatas\u0131",
          action: "Yard\u0131m i\xE7in l\xFCtfen destekle ileti\u015Fime ge\xE7in."
        },
        unknown_error: {
          message: "Beklenmeyen bir hata olu\u015Ftu",
          action: "L\xFCtfen tekrar deneyin veya bu devam ederse destekle ileti\u015Fime ge\xE7in."
        }
      },
      validation: {
        unknown_token_mint: "Uyar\u0131: Tan\u0131nmayan token mint adresi. Fon kayb\u0131n\u0131 \xF6nlemek i\xE7in bunun do\u011Fru token oldu\u011Fundan emin olun.",
        token_typo_warning: "Token adresi bilinen stablecoinlerle (USDC, USDT, PYUSD, CASH) e\u015Fle\u015Fmiyor. Kal\u0131c\u0131 fon kayb\u0131n\u0131 \xF6nlemek i\xE7in dikkatle do\u011Frulay\u0131n."
      },
      wallet: {
        no_wallet_detected: "Solana c\xFCzdan\u0131 alg\u0131lanmad\u0131",
        install_wallet: "L\xFCtfen Phantom, Solflare veya Backpack gibi bir Solana c\xFCzdan\u0131 y\xFCkleyin.",
        wallet_not_connected: "C\xFCzdan ba\u011Fl\u0131 de\u011Fil",
        connect_your_wallet: "Devam etmek i\xE7in l\xFCtfen c\xFCzdan\u0131n\u0131z\u0131 ba\u011Flay\u0131n.",
        wallet_connection_failed: "C\xFCzdan ba\u011Flanamad\u0131",
        try_again: "L\xFCtfen tekrar ba\u011Flanmay\u0131 deneyin.",
        transaction_rejected: "\u0130\u015Flem reddedildi",
        approve_in_wallet: "Devam etmek i\xE7in l\xFCtfen i\u015Flemi c\xFCzdan\u0131n\u0131zda onaylay\u0131n.",
        select_wallet: "C\xFCzdan se\xE7",
        change: "De\u011Fi\u015Ftir"
      }
    };
  }
});

// src/i18n/translations/uk.json
var require_uk = __commonJS({
  "src/i18n/translations/uk.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \u041F\u043E\u0447\u0430\u0442\u043A\u043E\u0432\u0438\u0439 \u0444\u0430\u0439\u043B \u043F\u0435\u0440\u0435\u043A\u043B\u0430\u0434\u0443 (\u0443\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430)",
      version: "1.0.0",
      locale: "uk",
      ui: {
        pay_with_card: "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u0438 \u043A\u0430\u0440\u0442\u043A\u043E\u044E",
        pay_with_crypto: "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u0438 USDC",
        pay_with_usdc: "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u0438 USDC",
        purchase: "\u041A\u0443\u043F\u0456\u0432\u043B\u044F",
        card: "\u041A\u0430\u0440\u0442\u043A\u0430",
        usdc_solana: "USDC (Solana)",
        crypto: "\u041A\u0440\u0438\u043F\u0442\u043E\u0432\u0430\u043B\u044E\u0442\u0430",
        connect_wallet: "\u041F\u0456\u0434\u2019\u0454\u0434\u043D\u0430\u0442\u0438 \u0433\u0430\u043C\u0430\u043D\u0435\u0446\u044C",
        connecting: "\u041F\u0456\u0434\u2019\u0454\u0434\u043D\u0430\u043D\u043D\u044F...",
        processing: "\u041E\u0431\u0440\u043E\u0431\u043A\u0430...",
        loading: "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F...",
        close: "\u0417\u0430\u043A\u0440\u0438\u0442\u0438",
        cancel: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438",
        confirm: "\u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438",
        retry: "\u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0449\u0435 \u0440\u0430\u0437",
        go_back: "\u041D\u0430\u0437\u0430\u0434",
        contact_support: "\u0417\u0432\u2019\u044F\u0437\u0430\u0442\u0438\u0441\u044F \u0437 \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u043A\u043E\u044E",
        pay_with_credits: "\u0421\u043F\u043B\u0430\u0442\u0438\u0442\u0438 \u043A\u0440\u0435\u0434\u0438\u0442\u0430\u043C\u0438",
        credits: "\u041A\u0440\u0435\u0434\u0438\u0442\u0438",
        disconnect: "\u0412\u0456\u0434\u2019\u0454\u0434\u043D\u0430\u0442\u0438",
        payment_successful: "\u041F\u043B\u0430\u0442\u0456\u0436 \u0443\u0441\u043F\u0456\u0448\u043D\u0438\u0439!",
        subscribe: "\u041E\u0444\u043E\u0440\u043C\u0438\u0442\u0438 \u043F\u0456\u0434\u043F\u0438\u0441\u043A\u0443",
        subscribe_with_crypto: "\u041F\u0456\u0434\u043F\u0438\u0441\u0430\u0442\u0438\u0441\u044F \u0437\u0430 USDC",
        subscribe_with_credits: "\u041F\u0456\u0434\u043F\u0438\u0441\u0430\u0442\u0438\u0441\u044F \u0437\u0430 \u043A\u0440\u0435\u0434\u0438\u0442\u0438",
        subscribed: "\u041F\u0456\u0434\u043F\u0438\u0441\u0430\u043D\u043E",
        subscribed_until: "\u041F\u0456\u0434\u043F\u0438\u0441\u0430\u043D\u043E \u0434\u043E",
        subscription_active: "\u0412\u0430\u0448\u0430 \u043F\u0456\u0434\u043F\u0438\u0441\u043A\u0430 \u0430\u043A\u0442\u0438\u0432\u043D\u0430!",
        redirecting_to_checkout: "\u041F\u0435\u0440\u0435\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u044F \u0434\u043E \u043E\u043F\u043B\u0430\u0442\u0438..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438 \u043E\u043F\u043B\u0430\u0442\u0443",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0456\u0442\u044C \u0441\u043F\u0440\u043E\u0431\u0443 \u043E\u043F\u043B\u0430\u0442\u0438. \u042F\u043A\u0449\u043E \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u043D\u0435 \u0437\u043D\u0438\u043A\u0430\u0454, \u0437\u0432\u0435\u0440\u043D\u0456\u0442\u044C\u0441\u044F \u0434\u043E \u0441\u043B\u0443\u0436\u0431\u0438 \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u043A\u0438."
        },
        invalid_signature: {
          message: "\u041F\u0456\u0434\u043F\u0438\u0441 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u0457 \u043D\u0435\u0434\u0456\u0439\u0441\u043D\u0438\u0439",
          action: "\u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u044C\u0442\u0435 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u044E \u0443 \u0432\u0430\u0448\u043E\u043C\u0443 \u0433\u0430\u043C\u0430\u043D\u0446\u0456 \u0442\u0430 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        invalid_transaction: {
          message: "\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u0457",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0456\u0442\u044C \u0441\u043F\u0440\u043E\u0431\u0443 \u043E\u043F\u043B\u0430\u0442\u0438. \u042F\u043A\u0449\u043E \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u0442\u0440\u0438\u0432\u0430\u0454, \u043E\u043D\u043E\u0432\u0456\u0442\u044C \u0437\u0430\u0441\u0442\u043E\u0441\u0443\u043D\u043E\u043A \u0433\u0430\u043C\u0430\u043D\u0446\u044F."
        },
        transaction_not_found: {
          message: "\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u044E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0432 \u0431\u043B\u043E\u043A\u0447\u0435\u0439\u043D\u0456",
          action: "\u0412\u0430\u0448\u0430 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u044F \u043C\u043E\u0436\u0435 \u0449\u0435 \u043E\u0431\u0440\u043E\u0431\u043B\u044F\u0442\u0438\u0441\u044F. \u0417\u0430\u0447\u0435\u043A\u0430\u0439\u0442\u0435 \u0442\u0440\u043E\u0445\u0438 \u0442\u0430 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0433\u0430\u043C\u0430\u043D\u0435\u0446\u044C \u0430\u0431\u043E \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        transaction_not_confirmed: {
          message: "\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u044F \u0449\u0435 \u043E\u0431\u0440\u043E\u0431\u043B\u044F\u0454\u0442\u044C\u0441\u044F",
          action: "\u0417\u0430\u0447\u0435\u043A\u0430\u0439\u0442\u0435 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F \u0432 \u0431\u043B\u043E\u043A\u0447\u0435\u0439\u043D\u0456, \u043F\u043E\u0442\u0456\u043C \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        transaction_failed: {
          message: "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u0457 \u0432 \u0431\u043B\u043E\u043A\u0447\u0435\u0439\u043D\u0456",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0434\u0435\u0442\u0430\u043B\u0456 \u0443 \u0433\u0430\u043C\u0430\u043D\u0446\u0456. \u041C\u043E\u0436\u043B\u0438\u0432\u043E, \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u043E \u0437\u043C\u0456\u043D\u0438\u0442\u0438 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u0438 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u0457 \u0430\u0431\u043E \u0434\u043E\u0434\u0430\u0442\u0438 SOL \u0434\u043B\u044F \u043A\u043E\u043C\u0456\u0441\u0456\u0439."
        },
        transaction_expired: {
          message: "\u0427\u0430\u0441 \u043E\u0431\u0440\u043E\u0431\u043A\u0438 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u0457 \u0432\u0438\u0447\u0435\u0440\u043F\u0430\u043D\u043E",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0456\u0442\u044C \u0441\u043F\u0440\u043E\u0431\u0443 \u043E\u043F\u043B\u0430\u0442\u0438. \u0417\u0430 \u043C\u043E\u0436\u043B\u0438\u0432\u043E\u0441\u0442\u0456 \u043F\u0456\u0434\u0432\u0438\u0449\u0442\u0435 \u043F\u0440\u0456\u043E\u0440\u0438\u0442\u0435\u0442 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u0457 \u0443 \u0432\u0430\u0448\u043E\u043C\u0443 \u0433\u0430\u043C\u0430\u043D\u0446\u0456."
        },
        invalid_recipient: {
          message: "\u041F\u043B\u0430\u0442\u0456\u0436 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E \u043D\u0430 \u043D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0443 \u0430\u0434\u0440\u0435\u0441\u0443",
          action: "\u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437 \u0456 \u043F\u0435\u0440\u0435\u043A\u043E\u043D\u0430\u0439\u0442\u0435\u0441\u044F, \u0449\u043E \u0432\u0438 \u0441\u0445\u0432\u0430\u043B\u044E\u0454\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0443 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u044E \u0443 \u0433\u0430\u043C\u0430\u043D\u0446\u0456."
        },
        invalid_sender: {
          message: "\u0413\u0430\u043C\u0430\u043D\u0435\u0446\u044C \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043D\u0438\u043A\u0430 \u043D\u0435\u0434\u0456\u0439\u0441\u043D\u0438\u0439",
          action: "\u041F\u0456\u0434\u2019\u0454\u0434\u043D\u0430\u0439\u0442\u0435 \u0433\u0430\u043C\u0430\u043D\u0435\u0446\u044C \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E \u0442\u0430 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        unauthorized_refund_issuer: {
          message: "\u0423 \u0432\u0430\u0441 \u043D\u0435\u043C\u0430\u0454 \u043F\u0440\u0430\u0432 \u043E\u0444\u043E\u0440\u043C\u043B\u044E\u0432\u0430\u0442\u0438 \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F",
          action: "\u041F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F \u043C\u043E\u0436\u0443\u0442\u044C \u043E\u0431\u0440\u043E\u0431\u043B\u044F\u0442\u0438 \u043B\u0438\u0448\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D\u0456 \u043E\u0431\u043B\u0456\u043A\u043E\u0432\u0456 \u0437\u0430\u043F\u0438\u0441\u0438. \u0417\u0432\u0435\u0440\u043D\u0456\u0442\u044C\u0441\u044F \u0434\u043E \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u043A\u0438, \u044F\u043A\u0449\u043E \u0446\u0435 \u043F\u043E\u043C\u0438\u043B\u043A\u0430."
        },
        amount_below_minimum: {
          message: "\u0421\u0443\u043C\u0430 \u043F\u043B\u0430\u0442\u0435\u0436\u0443 \u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0430",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u0443 \u0441\u0443\u043C\u0443 \u0442\u0430 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        amount_mismatch: {
          message: "\u0421\u0443\u043C\u0430 \u043F\u043B\u0430\u0442\u0435\u0436\u0443 \u043D\u0435 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0454 \u0440\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043A\u043E\u0432\u0456\u0439 \u0441\u0443\u043C\u0456",
          action: "\u0426\u0456\u043D\u0430 \u043C\u043E\u0433\u043B\u0430 \u0437\u043C\u0456\u043D\u0438\u0442\u0438\u0441\u044F. \u041E\u043D\u043E\u0432\u0456\u0442\u044C \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443 \u0442\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u0456\u0442\u044C \u043E\u043F\u043B\u0430\u0442\u0443."
        },
        insufficient_funds_sol: {
          message: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043D\u044C\u043E SOL \u0434\u043B\u044F \u043C\u0435\u0440\u0435\u0436\u0435\u0432\u0438\u0445 \u043A\u043E\u043C\u0456\u0441\u0456\u0439",
          action: "\u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u0449\u043E\u043D\u0430\u0439\u043C\u0435\u043D\u0448\u0435 0.001 SOL \u043D\u0430 \u0433\u0430\u043C\u0430\u043D\u0435\u0446\u044C \u0434\u043B\u044F \u043E\u043F\u043B\u0430\u0442\u0438 \u043A\u043E\u043C\u0456\u0441\u0456\u0439 \u0456 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        insufficient_funds_token: {
          message: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043D\u0456\u0439 \u0431\u0430\u043B\u0430\u043D\u0441 \u0443 \u0433\u0430\u043C\u0430\u043D\u0446\u0456",
          action: "\u041F\u043E\u043F\u043E\u0432\u043D\u0456\u0442\u044C \u0433\u0430\u043C\u0430\u043D\u0435\u0446\u044C \u0456 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        invalid_token_mint: {
          message: "\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0442\u043E\u043A\u0435\u043D \u043E\u043F\u043B\u0430\u0442\u0438",
          action: "\u041E\u043F\u043B\u0430\u0442\u0456\u0442\u044C \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u043C \u0442\u043E\u043A\u0435\u043D\u043E\u043C, \u0432\u043A\u0430\u0437\u0430\u043D\u0438\u043C \u0443 \u0434\u0435\u0442\u0430\u043B\u044F\u0445 \u043F\u043B\u0430\u0442\u0435\u0436\u0443."
        },
        not_spl_transfer: {
          message: "\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u044F \u043D\u0435 \u0454 \u043A\u043E\u0440\u0435\u043A\u0442\u043D\u0438\u043C \u043F\u0435\u0440\u0435\u043A\u0430\u0437\u043E\u043C \u0442\u043E\u043A\u0435\u043D\u0456\u0432",
          action: "\u041F\u0435\u0440\u0435\u043A\u043E\u043D\u0430\u0439\u0442\u0435\u0441\u044F, \u0449\u043E \u043D\u0430\u0434\u0441\u0438\u043B\u0430\u0454\u0442\u0435 \u0442\u043E\u043A\u0435\u043D \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u043E\u0433\u043E \u0442\u0438\u043F\u0443 \u0437\u0456 \u0441\u0432\u043E\u0433\u043E \u0433\u0430\u043C\u0430\u043D\u0446\u044F."
        },
        missing_token_account: {
          message: "\u0422\u043E\u043A\u0435\u043D-\u0440\u0430\u0445\u0443\u043D\u043E\u043A \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E",
          action: "\u0412\u0430\u0448\u043E\u043C\u0443 \u0433\u0430\u043C\u0430\u043D\u0446\u044E \u043C\u043E\u0436\u0435 \u0437\u043D\u0430\u0434\u043E\u0431\u0438\u0442\u0438\u0441\u044F \u0441\u043F\u0435\u0440\u0448\u0443 \u0441\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u0442\u043E\u043A\u0435\u043D-\u0440\u0430\u0445\u0443\u043D\u043E\u043A. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437 \u0430\u0431\u043E \u0432\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u0430\u0439\u0442\u0435 \u0456\u043D\u0448\u0438\u0439 \u0433\u0430\u043C\u0430\u043D\u0435\u0446\u044C."
        },
        invalid_token_program: {
          message: "\u041D\u0435\u0434\u0456\u0439\u0441\u043D\u0430 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430 \u0442\u043E\u043A\u0435\u043D\u0430",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0456\u0442\u044C \u0441\u043F\u0440\u043E\u0431\u0443 \u043E\u043F\u043B\u0430\u0442\u0438. \u042F\u043A\u0449\u043E \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u0442\u0440\u0438\u0432\u0430\u0454, \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0456\u043D\u0448\u0438\u0439 \u0433\u0430\u043C\u0430\u043D\u0435\u0446\u044C."
        },
        missing_memo: {
          message: "\u041F\u043E\u0442\u0440\u0456\u0431\u043D\u0430 \u043F\u0440\u0438\u043C\u0456\u0442\u043A\u0430 (memo) \u0434\u043E \u043F\u043B\u0430\u0442\u0435\u0436\u0443, \u0430\u043B\u0435 \u0457\u0457 \u043D\u0435 \u0434\u043E\u0434\u0430\u043D\u043E",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0456\u0442\u044C \u043E\u043F\u043B\u0430\u0442\u0443 \u0442\u0430 \u043F\u0435\u0440\u0435\u043A\u043E\u043D\u0430\u0439\u0442\u0435\u0441\u044F, \u0449\u043E \u0443 \u0433\u0430\u043C\u0430\u043D\u0446\u0456 \u0441\u0445\u0432\u0430\u043B\u0435\u043D\u0456 \u0432\u0441\u0456 \u0434\u0435\u0442\u0430\u043B\u0456 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u0457."
        },
        invalid_memo: {
          message: "\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043F\u0440\u0438\u043C\u0456\u0442\u043A\u0438 (memo)",
          action: "\u041F\u043E\u0432\u0442\u043E\u0440\u0456\u0442\u044C \u0441\u043F\u0440\u043E\u0431\u0443 \u043E\u043F\u043B\u0430\u0442\u0438."
        },
        payment_already_used: {
          message: "\u0426\u0435\u0439 \u043F\u043B\u0430\u0442\u0456\u0436 \u0443\u0436\u0435 \u043E\u0431\u0440\u043E\u0431\u043B\u0435\u043D\u043E",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0456\u0441\u0442\u043E\u0440\u0456\u044E \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u0439. \u042F\u043A\u0449\u043E \u043F\u043E\u0442\u0440\u0456\u0431\u0435\u043D \u043D\u043E\u0432\u0438\u0439 \u043F\u043B\u0430\u0442\u0456\u0436, \u0441\u0442\u0432\u043E\u0440\u0456\u0442\u044C \u043D\u043E\u0432\u0443 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u044E."
        },
        signature_reused: {
          message: "\u041F\u0456\u0434\u043F\u0438\u0441 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u0457 \u0432\u0436\u0435 \u0432\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u0430\u043D\u043E",
          action: "\u0421\u0442\u0432\u043E\u0440\u0456\u0442\u044C \u043D\u043E\u0432\u0443 \u043F\u043B\u0430\u0442\u0456\u0436\u043D\u0443 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u044E."
        },
        quote_expired: {
          message: "\u0421\u0442\u0440\u043E\u043A \u0434\u0456\u0457 \u0446\u0456\u043D\u043E\u0432\u043E\u0457 \u043F\u0440\u043E\u043F\u043E\u0437\u0438\u0446\u0456\u0457 \u0437\u0430\u043A\u0456\u043D\u0447\u0438\u0432\u0441\u044F",
          action: "\u0426\u0456\u043D\u0438 \u0447\u0430\u0441\u0442\u043E \u043E\u043D\u043E\u0432\u043B\u044E\u044E\u0442\u044C\u0441\u044F. \u041E\u043D\u043E\u0432\u0456\u0442\u044C \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443 \u0442\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u0456\u0442\u044C \u043E\u043F\u043B\u0430\u0442\u0443."
        },
        missing_field: {
          message: "\u0412\u0456\u0434\u0441\u0443\u0442\u043D\u044F \u043E\u0431\u043E\u0432\u2019\u044F\u0437\u043A\u043E\u0432\u0430 \u0456\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0456\u044F",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0432\u0441\u0456 \u043E\u0431\u043E\u0432\u2019\u044F\u0437\u043A\u043E\u0432\u0456 \u043F\u043E\u043B\u044F \u0439 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        invalid_field: {
          message: "\u0414\u0435\u044F\u043A\u0456 \u0434\u0430\u043D\u0456 \u0432\u043A\u0430\u0437\u0430\u043D\u043E \u043D\u0435\u043A\u043E\u0440\u0435\u043A\u0442\u043D\u043E",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0432\u0432\u0435\u0434\u0435\u043D\u0456 \u0434\u0430\u043D\u0456 \u0442\u0430 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        invalid_amount: {
          message: "\u041D\u0435\u043A\u043E\u0440\u0435\u043A\u0442\u043D\u0430 \u0441\u0443\u043C\u0430 \u043F\u043B\u0430\u0442\u0435\u0436\u0443",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0441\u0443\u043C\u0443 \u0442\u0430 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        invalid_wallet: {
          message: "\u041D\u0435\u0434\u0456\u0439\u0441\u043D\u0430 \u0430\u0434\u0440\u0435\u0441\u0430 \u0433\u0430\u043C\u0430\u043D\u0446\u044F",
          action: "\u041F\u0456\u0434\u2019\u0454\u0434\u043D\u0430\u0439\u0442\u0435 \u0433\u0430\u043C\u0430\u043D\u0435\u0446\u044C \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E \u0442\u0430 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        invalid_resource: {
          message: "\u041D\u0435\u043A\u043E\u0440\u0435\u043A\u0442\u043D\u0438\u0439 \u0432\u0438\u0431\u0456\u0440 \u0442\u043E\u0432\u0430\u0440\u0443",
          action: "\u041E\u043D\u043E\u0432\u0456\u0442\u044C \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443 \u0442\u0430 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        invalid_coupon: {
          message: "\u041D\u0435\u0434\u0456\u0439\u0441\u043D\u0438\u0439 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u0456 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        invalid_cart_item: {
          message: "\u041E\u0434\u0438\u043D \u0430\u0431\u043E \u043A\u0456\u043B\u044C\u043A\u0430 \u0442\u043E\u0432\u0430\u0440\u0456\u0432 \u0443 \u043A\u043E\u0448\u0438\u043A\u0443 \u043D\u0435\u043A\u043E\u0440\u0435\u043A\u0442\u043D\u0456",
          action: "\u041F\u0435\u0440\u0435\u0433\u043B\u044F\u043D\u044C\u0442\u0435 \u043A\u043E\u0448\u0438\u043A \u0456 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        empty_cart: {
          message: "\u0412\u0430\u0448 \u043A\u043E\u0448\u0438\u043A \u043F\u043E\u0440\u043E\u0436\u043D\u0456\u0439",
          action: "\u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u0442\u043E\u0432\u0430\u0440\u0438 \u0434\u043E \u043A\u043E\u0448\u0438\u043A\u0430 \u043F\u0435\u0440\u0435\u0434 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u043D\u044F\u043C."
        },
        resource_not_found: {
          message: "\u0422\u043E\u0432\u0430\u0440 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E",
          action: "\u041C\u043E\u0436\u043B\u0438\u0432\u043E, \u0442\u043E\u0432\u0430\u0440 \u0431\u0456\u043B\u044C\u0448\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439. \u041E\u043D\u043E\u0432\u0456\u0442\u044C \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443 \u0442\u0430 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        cart_not_found: {
          message: "\u041A\u043E\u0448\u0438\u043A \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E",
          action: "\u0421\u0442\u0440\u043E\u043A \u0434\u0456\u0457 \u043A\u043E\u0448\u0438\u043A\u0430 \u043C\u0456\u0433 \u0437\u0430\u043A\u0456\u043D\u0447\u0438\u0442\u0438\u0441\u044F. \u041F\u043E\u0447\u043D\u0456\u0442\u044C \u043D\u043E\u0432\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F."
        },
        refund_not_found: {
          message: "\u041F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F \u043A\u043E\u0448\u0442\u0456\u0432 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F \u0430\u0431\u043E \u0437\u0432\u0435\u0440\u043D\u0456\u0442\u044C\u0441\u044F \u0434\u043E \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u043A\u0438."
        },
        product_not_found: {
          message: "\u0422\u043E\u0432\u0430\u0440 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439",
          action: "\u041C\u043E\u0436\u043B\u0438\u0432\u043E, \u0442\u043E\u0432\u0430\u0440 \u0431\u0456\u043B\u044C\u0448\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439. \u041F\u0435\u0440\u0435\u0433\u043B\u044F\u043D\u044C\u0442\u0435 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0438\u0439 \u0430\u0441\u043E\u0440\u0442\u0438\u043C\u0435\u043D\u0442."
        },
        coupon_not_found: {
          message: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043A\u043E\u0434 \u0430\u0431\u043E \u0432\u0438\u0434\u0430\u043B\u0456\u0442\u044C \u0439\u043E\u0433\u043E, \u0449\u043E\u0431 \u043F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438."
        },
        session_not_found: {
          message: "\u0421\u0435\u0430\u043D\u0441 \u043E\u043F\u043B\u0430\u0442\u0438 \u0437\u0430\u043A\u0456\u043D\u0447\u0438\u0432\u0441\u044F",
          action: "\u041F\u043E\u0447\u043D\u0456\u0442\u044C \u043D\u043E\u0432\u0438\u0439 \u043F\u043B\u0430\u0442\u0456\u0436."
        },
        cart_already_paid: {
          message: "\u0426\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F \u0432\u0436\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0456\u0441\u0442\u043E\u0440\u0456\u044E \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u044C. \u042F\u043A\u0449\u043E \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u0430 \u043D\u043E\u0432\u0430 \u043F\u043E\u043A\u0443\u043F\u043A\u0430, \u043F\u043E\u0447\u043D\u0456\u0442\u044C \u043D\u043E\u0432\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F."
        },
        refund_already_processed: {
          message: "\u0426\u0435 \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F \u0432\u0436\u0435 \u043E\u0431\u0440\u043E\u0431\u043B\u0435\u043D\u043E",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0456\u0441\u0442\u043E\u0440\u0456\u044E \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u0439 \u0430\u0431\u043E \u0437\u0432\u0435\u0440\u043D\u0456\u0442\u044C\u0441\u044F \u0434\u043E \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u043A\u0438 \u0434\u043B\u044F \u0434\u0435\u0442\u0430\u043B\u0435\u0439."
        },
        coupon_expired: {
          message: "\u0421\u0442\u0440\u043E\u043A \u0434\u0456\u0457 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u0443 \u043C\u0438\u043D\u0443\u0432",
          action: "\u0412\u0438\u0434\u0430\u043B\u0456\u0442\u044C \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u0430\u0431\u043E \u0432\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u0430\u0439\u0442\u0435 \u0456\u043D\u0448\u0438\u0439."
        },
        coupon_usage_limit_reached: {
          message: "\u0414\u043E\u0441\u044F\u0433\u043D\u0443\u0442\u043E \u043B\u0456\u043C\u0456\u0442 \u0432\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u0430\u043D\u043D\u044F \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u0443",
          action: "\u0426\u0435\u0439 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u0443\u0436\u0435 \u0432\u0438\u0447\u0435\u0440\u043F\u0430\u043D\u043E. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0456\u043D\u0448\u0438\u0439 \u043A\u043E\u0434."
        },
        coupon_not_applicable: {
          message: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u043D\u0435 \u0437\u0430\u0441\u0442\u043E\u0441\u043E\u0432\u0443\u0454\u0442\u044C\u0441\u044F \u0434\u043E \u0446\u0456\u0454\u0457 \u043F\u043E\u043A\u0443\u043F\u043A\u0438",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0443\u043C\u043E\u0432\u0438 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u0443 \u0430\u0431\u043E \u0432\u0438\u0434\u0430\u043B\u0456\u0442\u044C \u0439\u043E\u0433\u043E, \u0449\u043E\u0431 \u043F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438."
        },
        coupon_wrong_payment_method: {
          message: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u043D\u0435\u0434\u0456\u0439\u0441\u043D\u0438\u0439 \u0434\u043B\u044F \u0446\u044C\u043E\u0433\u043E \u0441\u043F\u043E\u0441\u043E\u0431\u0443 \u043E\u043F\u043B\u0430\u0442\u0438",
          action: "\u0412\u0438\u0431\u0435\u0440\u0456\u0442\u044C \u0456\u043D\u0448\u0438\u0439 \u0441\u043F\u043E\u0441\u0456\u0431 \u043E\u043F\u043B\u0430\u0442\u0438 \u0430\u0431\u043E \u0432\u0438\u0434\u0430\u043B\u0456\u0442\u044C \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434."
        },
        stripe_error: {
          message: "\u0421\u0435\u0440\u0432\u0456\u0441 \u043E\u043F\u043B\u0430\u0442\u0438 \u043A\u0430\u0440\u0442\u043A\u043E\u044E \u0442\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439",
          action: "\u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0442\u0440\u043E\u0445\u0438 \u043F\u0456\u0437\u043D\u0456\u0448\u0435 \u0430\u0431\u043E \u0441\u043A\u043E\u0440\u0438\u0441\u0442\u0430\u0439\u0442\u0435\u0441\u044F \u043E\u043F\u043B\u0430\u0442\u043E\u044E \u043A\u0440\u0438\u043F\u0442\u043E\u0432\u0430\u043B\u044E\u0442\u043E\u044E."
        },
        rpc_error: {
          message: "\u041C\u0435\u0440\u0435\u0436\u0430 \u0431\u043B\u043E\u043A\u0447\u0435\u0439\u043D\u0443 \u0442\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430",
          action: "\u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0442\u0440\u043E\u0445\u0438 \u043F\u0456\u0437\u043D\u0456\u0448\u0435 \u0430\u0431\u043E \u043E\u043F\u043B\u0430\u0442\u0456\u0442\u044C \u043A\u0430\u0440\u0442\u043A\u043E\u044E."
        },
        network_error: {
          message: "\u041F\u0440\u043E\u0431\u043B\u0435\u043C\u0438 \u0437 \u043C\u0435\u0440\u0435\u0436\u0435\u0432\u0438\u043C \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043D\u044F\u043C",
          action: "\u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043D\u044F \u0434\u043E \u0456\u043D\u0442\u0435\u0440\u043D\u0435\u0442\u0443 \u0442\u0430 \u0441\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437."
        },
        internal_error: {
          message: "\u0421\u0442\u0430\u043B\u0430\u0441\u044F \u043F\u043E\u043C\u0438\u043B\u043A\u0430 \u043D\u0430 \u043D\u0430\u0448\u043E\u043C\u0443 \u0431\u043E\u0446\u0456",
          action: "\u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437. \u042F\u043A\u0449\u043E \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u043D\u0435 \u0437\u043D\u0438\u043A\u0430\u0454, \u0437\u0432\u0435\u0440\u043D\u0456\u0442\u044C\u0441\u044F \u0434\u043E \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u043A\u0438."
        },
        database_error: {
          message: "\u0421\u0435\u0440\u0432\u0456\u0441 \u0442\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439",
          action: "\u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0442\u0440\u043E\u0445\u0438 \u043F\u0456\u0437\u043D\u0456\u0448\u0435."
        },
        config_error: {
          message: "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043A\u043E\u043D\u0444\u0456\u0433\u0443\u0440\u0430\u0446\u0456\u0457 \u0441\u0435\u0440\u0432\u0456\u0441\u0443",
          action: "\u0417\u0432\u0435\u0440\u043D\u0456\u0442\u044C\u0441\u044F \u0434\u043E \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u043A\u0438 \u0437\u0430 \u0434\u043E\u043F\u043E\u043C\u043E\u0433\u043E\u044E."
        },
        unknown_error: {
          message: "\u0421\u0442\u0430\u043B\u0430\u0441\u044F \u043D\u0435\u043F\u0435\u0440\u0435\u0434\u0431\u0430\u0447\u0435\u043D\u0430 \u043F\u043E\u043C\u0438\u043B\u043A\u0430",
          action: "\u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437 \u0430\u0431\u043E \u0437\u0432\u0435\u0440\u043D\u0456\u0442\u044C\u0441\u044F \u0434\u043E \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u043A\u0438, \u044F\u043A\u0449\u043E \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u044E\u0454\u0442\u044C\u0441\u044F."
        }
      },
      validation: {
        unknown_token_mint: "\u041F\u043E\u043F\u0435\u0440\u0435\u0434\u0436\u0435\u043D\u043D\u044F: \u041D\u0435\u0432\u0456\u0434\u043E\u043C\u0430 \u0430\u0434\u0440\u0435\u0441\u0430 mint \u0442\u043E\u043A\u0435\u043D\u0430. \u0420\u0435\u0442\u0435\u043B\u044C\u043D\u043E \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435, \u0449\u043E \u0446\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0442\u043E\u043A\u0435\u043D, \u0449\u043E\u0431 \u0443\u043D\u0438\u043A\u043D\u0443\u0442\u0438 \u0432\u0442\u0440\u0430\u0442\u0438 \u043A\u043E\u0448\u0442\u0456\u0432.",
        token_typo_warning: "\u0410\u0434\u0440\u0435\u0441\u0430 \u0442\u043E\u043A\u0435\u043D\u0430 \u043D\u0435 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0454 \u0432\u0456\u0434\u043E\u043C\u0438\u043C \u0441\u0442\u0435\u0439\u0431\u043B\u043A\u043E\u0457\u043D\u0430\u043C (USDC, USDT, PYUSD, CASH). \u041F\u0435\u0440\u0435\u0432\u0456\u0440\u044F\u0439\u0442\u0435 \u0443\u0432\u0430\u0436\u043D\u043E, \u0449\u043E\u0431 \u0437\u0430\u043F\u043E\u0431\u0456\u0433\u0442\u0438 \u0431\u0435\u0437\u043F\u043E\u0432\u043E\u0440\u043E\u0442\u043D\u0456\u0439 \u0432\u0442\u0440\u0430\u0442\u0456 \u043A\u043E\u0448\u0442\u0456\u0432."
      },
      wallet: {
        no_wallet_detected: "\u0413\u0430\u043C\u0430\u043D\u0435\u0446\u044C Solana \u043D\u0435 \u0432\u0438\u044F\u0432\u043B\u0435\u043D\u043E",
        install_wallet: "\u0412\u0441\u0442\u0430\u043D\u043E\u0432\u0456\u0442\u044C \u0433\u0430\u043C\u0430\u043D\u0435\u0446\u044C Solana, \u043D\u0430\u043F\u0440\u0438\u043A\u043B\u0430\u0434 Phantom, Solflare \u0430\u0431\u043E Backpack.",
        wallet_not_connected: "\u0413\u0430\u043C\u0430\u043D\u0435\u0446\u044C \u043D\u0435 \u043F\u0456\u0434\u2019\u0454\u0434\u043D\u0430\u043D\u0438\u0439",
        connect_your_wallet: "\u041F\u0456\u0434\u2019\u0454\u0434\u043D\u0430\u0439\u0442\u0435 \u0433\u0430\u043C\u0430\u043D\u0435\u0446\u044C, \u0449\u043E\u0431 \u043F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438.",
        wallet_connection_failed: "\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u043F\u0456\u0434\u2019\u0454\u0434\u043D\u0430\u0442\u0438 \u0433\u0430\u043C\u0430\u043D\u0435\u0446\u044C",
        try_again: "\u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u0456\u0434\u2019\u0454\u0434\u043D\u0430\u0442\u0438\u0441\u044F \u0449\u0435 \u0440\u0430\u0437.",
        transaction_rejected: "\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u044E \u0432\u0456\u0434\u0445\u0438\u043B\u0435\u043D\u043E",
        approve_in_wallet: "\u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0456\u0442\u044C \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0456\u044E \u0443 \u0441\u0432\u043E\u0454\u043C\u0443 \u0433\u0430\u043C\u0430\u043D\u0446\u0456, \u0449\u043E\u0431 \u043F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438.",
        select_wallet: "\u0412\u0438\u0431\u0435\u0440\u0456\u0442\u044C \u0433\u0430\u043C\u0430\u043D\u0435\u0446\u044C",
        change: "\u0417\u043C\u0456\u043D\u0438\u0442\u0438"
      }
    };
  }
});

// src/i18n/translations/ur.json
var require_ur = __commonJS({
  "src/i18n/translations/ur.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \u062A\u0631\u062C\u0645\u06C1 \u0645\u0627\u062E\u0630 \u0641\u0627\u0626\u0644 (\u0627\u0631\u062F\u0648)",
      version: "1.0.0",
      locale: "ur",
      ui: {
        pay_with_card: "\u06A9\u0627\u0631\u0688 \u06A9\u06D2 \u0630\u0631\u06CC\u0639\u06D2 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC",
        pay_with_crypto: "USDC \u06A9\u06D2 \u0630\u0631\u06CC\u0639\u06D2 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC",
        pay_with_usdc: "USDC \u06A9\u06D2 \u0630\u0631\u06CC\u0639\u06D2 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC",
        purchase: "\u062E\u0631\u06CC\u062F\u0627\u0631\u06CC",
        card: "\u06A9\u0627\u0631\u0688",
        usdc_solana: "USDC (Solana)",
        crypto: "\u06A9\u0631\u067E\u0679\u0648",
        connect_wallet: "\u0648\u0627\u0644\u06CC\u0679 \u0645\u0646\u0633\u0644\u06A9 \u06A9\u0631\u06CC\u06BA",
        connecting: "\u0645\u0646\u0633\u0644\u06A9 \u06A9\u06CC\u0627 \u062C\u0627 \u0631\u06C1\u0627 \u06C1\u06D2...",
        processing: "\u06A9\u0627\u0631\u0631\u0648\u0627\u0626\u06CC \u062C\u0627\u0631\u06CC \u06C1\u06D2...",
        loading: "\u0644\u0648\u0688 \u06C1\u0648 \u0631\u06C1\u0627 \u06C1\u06D2...",
        close: "\u0628\u0646\u062F \u06A9\u0631\u06CC\u06BA",
        cancel: "\u0645\u0646\u0633\u0648\u062E \u06A9\u0631\u06CC\u06BA",
        confirm: "\u062A\u0635\u062F\u06CC\u0642 \u06A9\u0631\u06CC\u06BA",
        retry: "\u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA",
        go_back: "\u0648\u0627\u067E\u0633 \u062C\u0627\u0626\u06CC\u06BA",
        contact_support: "\u0633\u067E\u0648\u0631\u0679 \u0633\u06D2 \u0631\u0627\u0628\u0637\u06C1 \u06A9\u0631\u06CC\u06BA",
        pay_with_credits: "\u06A9\u0631\u06CC\u0688\u0679\u0633 \u0633\u06D2 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u0631\u06CC\u06BA",
        credits: "\u06A9\u0631\u06CC\u0688\u0679\u0633",
        disconnect: "\u0645\u0646\u0642\u0637\u0639 \u06A9\u0631\u06CC\u06BA",
        payment_successful: "\u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u0627\u0645\u06CC\u0627\u0628 \u0631\u06C1\u06CC!",
        subscribe: "\u0633\u0628\u0633\u06A9\u0631\u0627\u0626\u0628 \u06A9\u0631\u06CC\u06BA",
        subscribe_with_crypto: "USDC \u0633\u06D2 \u0633\u0628\u0633\u06A9\u0631\u0627\u0626\u0628 \u06A9\u0631\u06CC\u06BA",
        subscribe_with_credits: "\u06A9\u0631\u06CC\u0688\u0679\u0633 \u0633\u06D2 \u0633\u0628\u0633\u06A9\u0631\u0627\u0626\u0628 \u06A9\u0631\u06CC\u06BA",
        subscribed: "\u0633\u0628\u0633\u06A9\u0631\u0627\u0626\u0628 \u0634\u062F\u06C1",
        subscribed_until: "\u0633\u0628\u0633\u06A9\u0631\u0627\u0626\u0628 \u06C1\u06D2 \u062A\u0627",
        subscription_active: "\u0622\u067E \u06A9\u06CC \u0633\u0628\u0633\u06A9\u0631\u067E\u0634\u0646 \u0641\u0639\u0627\u0644 \u06C1\u06D2!",
        redirecting_to_checkout: "\u0686\u06CC\u06A9 \u0622\u0624\u0679 \u067E\u0631 \u0645\u0646\u062A\u0642\u0644 \u06A9\u06CC\u0627 \u062C\u0627 \u0631\u06C1\u0627 \u06C1\u06D2..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u06CC \u062A\u0635\u062F\u06CC\u0642 \u0646\u0627\u06A9\u0627\u0645 \u0631\u06C1\u06CC",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4 \u0645\u0633\u0626\u0644\u06C1 \u0628\u0631\u0642\u0631\u0627\u0631 \u0631\u06C1\u06D2 \u062A\u0648 \u0633\u067E\u0648\u0631\u0679 \u0633\u06D2 \u0631\u0627\u0628\u0637\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        invalid_signature: {
          message: "\u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u06A9\u0627 \u062F\u0633\u062A\u062E\u0637 \u063A\u06CC\u0631 \u0645\u0639\u062A\u0628\u0631 \u06C1\u06D2",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u067E\u0646\u06D2 \u0648\u0627\u0644\u06CC\u0679 \u0645\u06CC\u06BA \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0645\u0646\u0638\u0648\u0631 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        invalid_transaction: {
          message: "\u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0641\u0627\u0631\u0645\u06CC\u0679 \u063A\u06CC\u0631 \u0645\u0639\u062A\u0628\u0631 \u06C1\u06D2",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4 \u0645\u0633\u0626\u0644\u06C1 \u0628\u0631\u0642\u0631\u0627\u0631 \u0631\u06C1\u06D2 \u062A\u0648 \u0627\u067E\u0646\u06D2 \u0648\u0627\u0644\u06CC\u0679 \u0627\u06CC\u067E \u06A9\u0648 \u0627\u067E\u0688\u06CC\u0679 \u06A9\u0631\u0646\u06D2 \u06A9\u06CC \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        transaction_not_found: {
          message: "\u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0628\u0644\u0627\u06A9 \u0686\u06CC\u0646 \u067E\u0631 \u0646\u06C1\u06CC\u06BA \u0645\u0644\u06CC",
          action: "\u0622\u067E \u06A9\u06CC \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0627\u0628\u06BE\u06CC \u067E\u0631\u0648\u0633\u06CC\u0633\u0646\u06AF \u0645\u06CC\u06BA \u06C1\u0648 \u0633\u06A9\u062A\u06CC \u06C1\u06D2\u06D4 \u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u06A9\u0686\u06BE \u0644\u0645\u062D\u06C1 \u0627\u0646\u062A\u0638\u0627\u0631 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u0627\u067E\u0646\u06D2 \u0648\u0627\u0644\u06CC\u0679 \u06A9\u0648 \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA\u060C \u06CC\u0627 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        transaction_not_confirmed: {
          message: "\u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0627\u0628\u06BE\u06CC \u067E\u0631\u0648\u0633\u06CC\u0633\u0646\u06AF \u0645\u06CC\u06BA \u06C1\u06D2",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0628\u0644\u0627\u06A9 \u0686\u06CC\u0646 \u0633\u06D2 \u062A\u0635\u062F\u06CC\u0642 \u06A9\u0627 \u0627\u0646\u062A\u0638\u0627\u0631 \u06A9\u0631\u06CC\u06BA\u060C \u067E\u06BE\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        transaction_failed: {
          message: "\u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0628\u0644\u0627\u06A9 \u0686\u06CC\u0646 \u067E\u0631 \u0646\u0627\u06A9\u0627\u0645 \u06C1\u0648 \u06AF\u0626\u06CC",
          action: "\u062A\u0641\u0635\u06CC\u0644\u0627\u062A \u06A9\u06D2 \u0644\u06CC\u06D2 \u0627\u067E\u0646\u0627 \u0648\u0627\u0644\u06CC\u0679 \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA\u06D4 \u06C1\u0648 \u0633\u06A9\u062A\u0627 \u06C1\u06D2 \u0622\u067E \u06A9\u0648 \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0633\u06CC\u0679\u0646\u06AF\u0632 \u0627\u06CC\u0688\u062C\u0633\u0679 \u06A9\u0631\u0646\u06CC \u06C1\u0648\u06BA \u06CC\u0627 \u0641\u06CC\u0633 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0645\u0632\u06CC\u062F SOL \u0634\u0627\u0645\u0644 \u06A9\u0631\u0646\u0627 \u06C1\u0648\u06D4"
        },
        transaction_expired: {
          message: "\u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0645\u06CC\u06BA \u0632\u06CC\u0627\u062F\u06C1 \u0648\u0642\u062A \u0644\u06AF \u06AF\u06CC\u0627",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4 \u0627\u06AF\u0631 \u0622\u067E \u06A9\u06D2 \u0648\u0627\u0644\u06CC\u0679 \u0645\u06CC\u06BA \u062F\u0633\u062A\u06CC\u0627\u0628 \u06C1\u0648 \u062A\u0648 \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u06A9\u06CC \u062A\u0631\u062C\u06CC\u062D \u0628\u0691\u06BE\u0627\u0646\u06D2 \u067E\u0631 \u063A\u0648\u0631 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        invalid_recipient: {
          message: "\u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u063A\u0644\u0637 \u067E\u062A\u06D2 \u067E\u0631 \u0628\u06BE\u06CC\u062C\u06CC \u06AF\u0626\u06CC",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u06CC\u0642\u06CC\u0646\u06CC \u0628\u0646\u0627\u0626\u06CC\u06BA \u06A9\u06C1 \u0622\u067E \u0627\u067E\u0646\u06D2 \u0648\u0627\u0644\u06CC\u0679 \u0645\u06CC\u06BA \u062F\u0631\u0633\u062A \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0645\u0646\u0638\u0648\u0631 \u06A9\u0631 \u0631\u06C1\u06D2 \u06C1\u06CC\u06BA\u06D4"
        },
        invalid_sender: {
          message: "\u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u0628\u06BE\u06CC\u062C\u0646\u06D2 \u0648\u0627\u0644\u0627 \u0648\u0627\u0644\u06CC\u0679 \u063A\u06CC\u0631 \u0645\u0639\u062A\u0628\u0631 \u06C1\u06D2",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u067E\u0646\u0627 \u0648\u0627\u0644\u06CC\u0679 \u062F\u0648\u0628\u0627\u0631\u06C1 \u0645\u0646\u0633\u0644\u06A9 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        unauthorized_refund_issuer: {
          message: "\u0622\u067E \u0631\u06CC\u0641\u0646\u0688 \u062C\u0627\u0631\u06CC \u06A9\u0631\u0646\u06D2 \u06A9\u06D2 \u0645\u062C\u0627\u0632 \u0646\u06C1\u06CC\u06BA",
          action: "\u0631\u06CC\u0641\u0646\u0688 \u0635\u0631\u0641 \u0645\u062C\u0627\u0632 \u0627\u06A9\u0627\u0624\u0646\u0679\u0633 \u067E\u0631\u0648\u0633\u06CC\u0633 \u06A9\u0631 \u0633\u06A9\u062A\u06D2 \u06C1\u06CC\u06BA\u06D4 \u0627\u06AF\u0631 \u0622\u067E \u0627\u0633\u06D2 \u063A\u0644\u0637\u06CC \u0633\u0645\u062C\u06BE\u062A\u06D2 \u06C1\u06CC\u06BA \u062A\u0648 \u0633\u067E\u0648\u0631\u0679 \u0633\u06D2 \u0631\u0627\u0628\u0637\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        amount_below_minimum: {
          message: "\u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u06CC \u0631\u0642\u0645 \u0628\u06C1\u062A \u06A9\u0645 \u06C1\u06D2",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0645\u0637\u0644\u0648\u0628\u06C1 \u0631\u0642\u0645 \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        amount_mismatch: {
          message: "\u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u06CC \u0631\u0642\u0645 \u06A9\u0648\u0679 \u0633\u06D2 \u0645\u0637\u0627\u0628\u0642\u062A \u0646\u06C1\u06CC\u06BA \u0631\u06A9\u06BE\u062A\u06CC",
          action: "\u0642\u06CC\u0645\u062A \u062A\u0628\u062F\u06CC\u0644 \u06C1\u0648 \u0633\u06A9\u062A\u06CC \u06C1\u06D2\u06D4 \u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0631\u06CC\u0641\u0631\u06CC\u0634 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        insufficient_funds_sol: {
          message: "\u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0641\u06CC\u0633 \u06A9\u06D2 \u0644\u06CC\u06D2 SOL \u0646\u0627\u06A9\u0627\u0641\u06CC",
          action: "\u0646\u06CC\u0679 \u0648\u0631\u06A9 \u0641\u06CC\u0633 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0627\u067E\u0646\u06D2 \u0648\u0627\u0644\u06CC\u0679 \u0645\u06CC\u06BA \u06A9\u0645 \u0627\u0632 \u06A9\u0645 0.001 SOL \u0634\u0627\u0645\u0644 \u06A9\u0631\u06CC\u06BA\u060C \u067E\u06BE\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        insufficient_funds_token: {
          message: "\u0622\u067E \u06A9\u06D2 \u0648\u0627\u0644\u06CC\u0679 \u0645\u06CC\u06BA \u0628\u06CC\u0644\u0646\u0633 \u0646\u0627\u06A9\u0627\u0641\u06CC \u06C1\u06D2",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0645\u0632\u06CC\u062F \u0631\u0642\u0648\u0645 \u0634\u0627\u0645\u0644 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        invalid_token_mint: {
          message: "\u063A\u0644\u0637 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u0679\u0648\u06A9\u0646",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u06CC \u062A\u0641\u0635\u06CC\u0644\u0627\u062A \u06A9\u06D2 \u0645\u0637\u0627\u0628\u0642 \u062F\u0631\u0633\u062A \u0679\u0648\u06A9\u0646 \u0633\u06D2 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        not_spl_transfer: {
          message: "\u06CC\u06C1 \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u062F\u0631\u0633\u062A \u0679\u0648\u06A9\u0646 \u0679\u0631\u0627\u0646\u0633\u0641\u0631 \u0646\u06C1\u06CC\u06BA",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u06CC\u0642\u06CC\u0646\u06CC \u0628\u0646\u0627\u0626\u06CC\u06BA \u06A9\u06C1 \u0622\u067E \u0627\u067E\u0646\u06D2 \u0648\u0627\u0644\u06CC\u0679 \u0633\u06D2 \u062F\u0631\u0633\u062A \u0679\u0648\u06A9\u0646 \u0642\u0633\u0645 \u0628\u06BE\u06CC\u062C \u0631\u06C1\u06D2 \u06C1\u06CC\u06BA\u06D4"
        },
        missing_token_account: {
          message: "\u0679\u0648\u06A9\u0646 \u0627\u06A9\u0627\u0624\u0646\u0679 \u0646\u06C1\u06CC\u06BA \u0645\u0644\u0627",
          action: "\u0622\u067E \u06A9\u06D2 \u0648\u0627\u0644\u06CC\u0679 \u06A9\u0648 \u067E\u06C1\u0644\u06D2 \u0679\u0648\u06A9\u0646 \u0627\u06A9\u0627\u0624\u0646\u0679 \u0628\u0646\u0627\u0646\u06D2 \u06A9\u06CC \u0636\u0631\u0648\u0631\u062A \u06C1\u0648 \u0633\u06A9\u062A\u06CC \u06C1\u06D2\u06D4 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA \u06CC\u0627 \u062F\u0648\u0633\u0631\u0627 \u0648\u0627\u0644\u06CC\u0679 \u0627\u0633\u062A\u0639\u0645\u0627\u0644 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        invalid_token_program: {
          message: "\u063A\u0644\u0637 \u0679\u0648\u06A9\u0646 \u067E\u0631\u0648\u06AF\u0631\u0627\u0645",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4 \u0645\u0633\u0626\u0644\u06C1 \u0628\u0631\u0642\u0631\u0627\u0631 \u0631\u06C1\u06D2 \u062A\u0648 \u062F\u0648\u0633\u0631\u0627 \u0648\u0627\u0644\u06CC\u0679 \u0627\u0633\u062A\u0639\u0645\u0627\u0644 \u06A9\u0631\u0646\u06D2 \u06A9\u06CC \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        missing_memo: {
          message: "\u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u0645\u06CC\u0645\u0648 \u062F\u0631\u06A9\u0627\u0631 \u06C1\u06D2 \u0645\u06AF\u0631 \u0634\u0627\u0645\u0644 \u0646\u06C1\u06CC\u06BA \u06A9\u06CC\u0627 \u06AF\u06CC\u0627",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u06CC\u0642\u06CC\u0646\u06CC \u0628\u0646\u0627\u0626\u06CC\u06BA \u06A9\u06C1 \u0622\u067E \u0646\u06D2 \u0648\u0627\u0644\u06CC\u0679 \u0645\u06CC\u06BA \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u06A9\u06CC \u062A\u0641\u0635\u06CC\u0644\u0627\u062A \u0645\u0646\u0638\u0648\u0631 \u06A9\u06CC \u06C1\u06CC\u06BA\u06D4"
        },
        invalid_memo: {
          message: "\u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u0645\u06CC\u0645\u0648 \u06A9\u0627 \u0641\u0627\u0631\u0645\u06CC\u0679 \u063A\u0644\u0637 \u06C1\u06D2",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        payment_already_used: {
          message: "\u06CC\u06C1 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u067E\u06C1\u0644\u06D2 \u06C1\u06CC \u067E\u0631\u0648\u0633\u06CC\u0633 \u06A9\u06CC \u062C\u0627 \u0686\u06A9\u06CC \u06C1\u06D2",
          action: "\u0627\u067E\u0646\u06CC \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u06C1\u0633\u0679\u0631\u06CC \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA\u06D4 \u0627\u06AF\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u062F\u0631\u06A9\u0627\u0631 \u06C1\u0648 \u062A\u0648 \u0646\u0626\u06CC \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0634\u0631\u0648\u0639 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        signature_reused: {
          message: "\u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u062F\u0633\u062A\u062E\u0637 \u067E\u06C1\u0644\u06D2 \u06C1\u06CC \u0627\u0633\u062A\u0639\u0645\u0627\u0644 \u06C1\u0648 \u0686\u06A9\u0627 \u06C1\u06D2",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0646\u0626\u06CC \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u06CC \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0628\u0646\u0627\u0626\u06CC\u06BA\u06D4"
        },
        quote_expired: {
          message: "\u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u0627 \u06A9\u0648\u0679 \u062E\u062A\u0645 \u06C1\u0648 \u06AF\u06CC\u0627 \u06C1\u06D2",
          action: "\u0642\u06CC\u0645\u062A\u06CC\u06BA \u06A9\u062B\u0631\u062A \u0633\u06D2 \u0627\u067E\u0688\u06CC\u0679 \u06C1\u0648\u062A\u06CC \u06C1\u06CC\u06BA\u06D4 \u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0631\u06CC\u0641\u0631\u06CC\u0634 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        missing_field: {
          message: "\u0636\u0631\u0648\u0631\u06CC \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0645\u0648\u062C\u0648\u062F \u0646\u06C1\u06CC\u06BA",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u062A\u0645\u0627\u0645 \u0645\u0637\u0644\u0648\u0628\u06C1 \u0641\u06CC\u0644\u0688\u0632 \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        invalid_field: {
          message: "\u06A9\u0686\u06BE \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u063A\u0644\u0637 \u06C1\u06CC\u06BA",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u067E\u0646\u06CC \u0627\u0646 \u067E\u0679 \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        invalid_amount: {
          message: "\u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u06CC \u0631\u0642\u0645 \u063A\u0644\u0637 \u06C1\u06D2",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0631\u0642\u0645 \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        invalid_wallet: {
          message: "\u0648\u0627\u0644\u06CC\u0679 \u0627\u06CC\u0688\u0631\u06CC\u0633 \u063A\u0644\u0637 \u06C1\u06D2",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u067E\u0646\u0627 \u0648\u0627\u0644\u06CC\u0679 \u062F\u0648\u0628\u0627\u0631\u06C1 \u0645\u0646\u0633\u0644\u06A9 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        invalid_resource: {
          message: "\u063A\u0644\u0637 \u0622\u0626\u0679\u0645 \u06A9\u0627 \u0627\u0646\u062A\u062E\u0627\u0628",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0635\u0641\u062D\u06C1 \u0631\u06CC\u0641\u0631\u06CC\u0634 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        invalid_coupon: {
          message: "\u063A\u0644\u0637 \u06A9\u0648\u067E\u0646 \u06A9\u0648\u0688",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u06A9\u0648\u067E\u0646 \u06A9\u0648\u0688 \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        invalid_cart_item: {
          message: "\u06A9\u0627\u0631\u0679 \u0645\u06CC\u06BA \u0627\u06CC\u06A9 \u06CC\u0627 \u0632\u0627\u0626\u062F \u0622\u0626\u0679\u0645\u0632 \u063A\u0644\u0637 \u06C1\u06CC\u06BA",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u067E\u0646\u0627 \u06A9\u0627\u0631\u0679 \u062F\u06CC\u06A9\u06BE\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        empty_cart: {
          message: "\u0622\u067E \u06A9\u0627 \u06A9\u0627\u0631\u0679 \u062E\u0627\u0644\u06CC \u06C1\u06D2",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0686\u06CC\u06A9 \u0622\u0624\u0679 \u0633\u06D2 \u067E\u06C1\u0644\u06D2 \u0622\u0626\u0679\u0645\u0632 \u0634\u0627\u0645\u0644 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        resource_not_found: {
          message: "\u0622\u0626\u0679\u0645 \u0646\u06C1\u06CC\u06BA \u0645\u0644\u0627",
          action: "\u0645\u0645\u06A9\u0646 \u06C1\u06D2 \u06CC\u06C1 \u0622\u0626\u0679\u0645 \u062F\u0633\u062A\u06CC\u0627\u0628 \u0646\u06C1 \u06C1\u0648\u06D4 \u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0631\u06CC\u0641\u0631\u06CC\u0634 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        cart_not_found: {
          message: "\u0634\u0627\u067E\u0646\u06AF \u06A9\u0627\u0631\u0679 \u0646\u06C1\u06CC\u06BA \u0645\u0644\u0627",
          action: "\u0622\u067E \u06A9\u0627 \u06A9\u0627\u0631\u0679 \u0645\u06CC\u0639\u0627\u062F \u062E\u062A\u0645 \u06C1\u0648 \u0633\u06A9\u062A\u0627 \u06C1\u06D2\u06D4 \u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0646\u06CC\u0627 \u0622\u0631\u0688\u0631 \u0634\u0631\u0648\u0639 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        refund_not_found: {
          message: "\u0631\u06CC\u0641\u0646\u0688 \u0646\u06C1\u06CC\u06BA \u0645\u0644\u0627",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0631\u06CC\u0641\u0646\u0688 \u0631\u06CC\u0641\u0631\u0646\u0633 \u0646\u0645\u0628\u0631 \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA \u06CC\u0627 \u0633\u067E\u0648\u0631\u0679 \u0633\u06D2 \u0631\u0627\u0628\u0637\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        product_not_found: {
          message: "\u067E\u0631\u0648\u0688\u06A9\u0679 \u062F\u0633\u062A\u06CC\u0627\u0628 \u0646\u06C1\u06CC\u06BA",
          action: "\u0645\u0645\u06A9\u0646 \u06C1\u06D2 \u06CC\u06C1 \u067E\u0631\u0648\u0688\u06A9\u0679 \u0627\u0628 \u062F\u0633\u062A\u06CC\u0627\u0628 \u0646\u06C1 \u06C1\u0648\u06D4 \u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0645\u0648\u062C\u0648\u062F\u06C1 \u0627\u0646\u062A\u062E\u0627\u0628 \u062F\u06CC\u06A9\u06BE\u06CC\u06BA\u06D4"
        },
        coupon_not_found: {
          message: "\u06A9\u0648\u067E\u0646 \u06A9\u0648\u0688 \u0646\u06C1\u06CC\u06BA \u0645\u0644\u0627",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u06A9\u0648\u067E\u0646 \u06A9\u0648\u0688 \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA \u06CC\u0627 \u0627\u0633\u06D2 \u06C1\u0679\u0627 \u06A9\u0631 \u0622\u06AF\u06D2 \u0628\u0691\u06BE\u06CC\u06BA\u06D4"
        },
        session_not_found: {
          message: "\u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u0633\u06CC\u0634\u0646 \u06A9\u06CC \u0645\u06CC\u0639\u0627\u062F \u062E\u062A\u0645 \u06C1\u0648 \u06AF\u0626\u06CC",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0646\u0626\u06CC \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u0634\u0631\u0648\u0639 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        cart_already_paid: {
          message: "\u06CC\u06C1 \u0622\u0631\u0688\u0631 \u067E\u06C1\u0644\u06D2 \u06C1\u06CC \u0627\u062F\u0627 \u06A9\u06CC\u0627 \u062C\u0627 \u0686\u06A9\u0627 \u06C1\u06D2",
          action: "\u0627\u067E\u0646\u06CC \u0622\u0631\u0688\u0631 \u06C1\u0633\u0679\u0631\u06CC \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA\u06D4 \u0627\u06AF\u0631 \u0645\u0632\u06CC\u062F \u062E\u0631\u06CC\u062F\u0627\u0631\u06CC \u062F\u0631\u06A9\u0627\u0631 \u06C1\u0648 \u062A\u0648 \u0646\u06CC\u0627 \u0622\u0631\u0688\u0631 \u0634\u0631\u0648\u0639 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        refund_already_processed: {
          message: "\u06CC\u06C1 \u0631\u06CC\u0641\u0646\u0688 \u067E\u06C1\u0644\u06D2 \u06C1\u06CC \u067E\u0631\u0648\u0633\u06CC\u0633 \u06C1\u0648 \u0686\u06A9\u0627 \u06C1\u06D2",
          action: "\u0627\u067E\u0646\u06CC \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u06C1\u0633\u0679\u0631\u06CC \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA \u06CC\u0627 \u062A\u0641\u0635\u06CC\u0644\u0627\u062A \u06A9\u06D2 \u0644\u06CC\u06D2 \u0633\u067E\u0648\u0631\u0679 \u0633\u06D2 \u0631\u0627\u0628\u0637\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        coupon_expired: {
          message: "\u06A9\u0648\u067E\u0646 \u06A9\u06CC \u0645\u06CC\u0639\u0627\u062F \u062E\u062A\u0645 \u06C1\u0648 \u06AF\u0626\u06CC \u06C1\u06D2",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u06A9\u0648\u067E\u0646 \u06C1\u0679\u0627 \u062F\u06CC\u06BA \u06CC\u0627 \u062F\u0648\u0633\u0631\u0627 \u06A9\u0648\u0688 \u0627\u0633\u062A\u0639\u0645\u0627\u0644 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        coupon_usage_limit_reached: {
          message: "\u06A9\u0648\u067E\u0646 \u06A9\u06D2 \u0627\u0633\u062A\u0639\u0645\u0627\u0644 \u06A9\u06CC \u062D\u062F \u067E\u0648\u0631\u06CC \u06C1\u0648 \u06AF\u0626\u06CC \u06C1\u06D2",
          action: "\u06CC\u06C1 \u06A9\u0648\u067E\u0646 \u0645\u06A9\u0645\u0644 \u0637\u0648\u0631 \u067E\u0631 \u0631\u06CC \u0688\u06CC\u0645 \u06C1\u0648 \u0686\u06A9\u0627 \u06C1\u06D2\u06D4 \u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u062F\u0648\u0633\u0631\u0627 \u06A9\u0648\u0688 \u0622\u0632\u0645\u0627\u0626\u06CC\u06BA\u06D4"
        },
        coupon_not_applicable: {
          message: "\u06CC\u06C1 \u06A9\u0648\u067E\u0646 \u0627\u0633 \u062E\u0631\u06CC\u062F\u0627\u0631\u06CC \u067E\u0631 \u0644\u0627\u06AF\u0648 \u0646\u06C1\u06CC\u06BA \u06C1\u0648\u062A\u0627",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u06A9\u0648\u067E\u0646 \u06A9\u06CC \u0634\u0631\u0627\u0626\u0637 \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA \u06CC\u0627 \u0627\u0633\u06D2 \u06C1\u0679\u0627 \u06A9\u0631 \u0622\u06AF\u06D2 \u0628\u0691\u06BE\u06CC\u06BA\u06D4"
        },
        coupon_wrong_payment_method: {
          message: "\u06CC\u06C1 \u06A9\u0648\u067E\u0646 \u0627\u0633 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u06D2 \u0637\u0631\u06CC\u0642\u06D2 \u06A9\u06D2 \u0644\u06CC\u06D2 \u062F\u0631\u0633\u062A \u0646\u06C1\u06CC\u06BA",
          action: "\u06A9\u0648\u0626\u06CC \u0627\u0648\u0631 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u0637\u0631\u06CC\u0642\u06C1 \u0622\u0632\u0645\u0627\u0626\u06CC\u06BA \u06CC\u0627 \u06A9\u0648\u067E\u0646 \u06A9\u0648\u0688 \u06C1\u0679\u0627 \u062F\u06CC\u06BA\u06D4"
        },
        stripe_error: {
          message: "\u06A9\u0627\u0631\u0688 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u06CC \u0633\u0631\u0648\u0633 \u0639\u0627\u0631\u0636\u06CC \u0637\u0648\u0631 \u067E\u0631 \u062F\u0633\u062A\u06CC\u0627\u0628 \u0646\u06C1\u06CC\u06BA",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u06A9\u0686\u06BE \u062F\u06CC\u0631 \u0628\u0639\u062F \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u060C \u06CC\u0627 \u0627\u0633 \u06A9\u06D2 \u0628\u062C\u0627\u0626\u06D2 \u06A9\u0631\u067E\u0679\u0648 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u0627\u0633\u062A\u0639\u0645\u0627\u0644 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        rpc_error: {
          message: "\u0628\u0644\u0627\u06A9 \u0686\u06CC\u0646 \u0646\u06CC\u0679 \u0648\u0631\u06A9 \u0639\u0627\u0631\u0636\u06CC \u0637\u0648\u0631 \u067E\u0631 \u062F\u0633\u062A\u06CC\u0627\u0628 \u0646\u06C1\u06CC\u06BA",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u06A9\u0686\u06BE \u062F\u06CC\u0631 \u0628\u0639\u062F \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u060C \u06CC\u0627 \u06A9\u0627\u0631\u0688 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u0627\u0633\u062A\u0639\u0645\u0627\u0644 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        network_error: {
          message: "\u0646\u06CC\u0679 \u0648\u0631\u06A9 \u06A9\u0646\u06A9\u0634\u0646 \u06A9\u0627 \u0645\u0633\u0626\u0644\u06C1",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u067E\u0646\u06CC \u0627\u0646\u0679\u0631\u0646\u06CC\u0679 \u06A9\u0646\u06A9\u0634\u0646 \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        internal_error: {
          message: "\u06C1\u0645\u0627\u0631\u06CC \u062C\u0627\u0646\u0628 \u0633\u06D2 \u06A9\u0648\u0626\u06CC \u0645\u0633\u0626\u0644\u06C1 \u067E\u06CC\u0634 \u0622 \u06AF\u06CC\u0627",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4 \u0645\u0633\u0626\u0644\u06C1 \u0628\u0631\u0642\u0631\u0627\u0631 \u0631\u06C1\u06D2 \u062A\u0648 \u0633\u067E\u0648\u0631\u0679 \u0633\u06D2 \u0631\u0627\u0628\u0637\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        database_error: {
          message: "\u0633\u0631\u0648\u0633 \u0639\u0627\u0631\u0636\u06CC \u0637\u0648\u0631 \u067E\u0631 \u062F\u0633\u062A\u06CC\u0627\u0628 \u0646\u06C1\u06CC\u06BA",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u06A9\u0686\u06BE \u062F\u06CC\u0631 \u0628\u0639\u062F \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        config_error: {
          message: "\u0633\u0631\u0648\u0633 \u06A9\u0646\u0641\u06CC\u06AF\u0631\u06CC\u0634\u0646 \u0645\u06CC\u06BA \u062E\u0631\u0627\u0628\u06CC",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0645\u062F\u062F \u06A9\u06D2 \u0644\u06CC\u06D2 \u0633\u067E\u0648\u0631\u0679 \u0633\u06D2 \u0631\u0627\u0628\u0637\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4"
        },
        unknown_error: {
          message: "\u063A\u06CC\u0631 \u0645\u062A\u0648\u0642\u0639 \u062E\u0631\u0627\u0628\u06CC \u067E\u06CC\u0634 \u0622 \u06AF\u0626\u06CC",
          action: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA \u06CC\u0627 \u0645\u0633\u0626\u0644\u06C1 \u0628\u0631\u0642\u0631\u0627\u0631 \u0631\u06C1\u06D2 \u062A\u0648 \u0633\u067E\u0648\u0631\u0679 \u0633\u06D2 \u0631\u0627\u0628\u0637\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4"
        }
      },
      validation: {
        unknown_token_mint: "\u0627\u0646\u062A\u0628\u0627\u06C1: \u063A\u06CC\u0631 \u0645\u0639\u0631\u0648\u0641 \u0679\u0648\u06A9\u0646 \u0645\u0646\u0679 \u0627\u06CC\u0688\u0631\u06CC\u0633\u06D4 \u0641\u0646\u0688\u0632 \u06A9\u06D2 \u0646\u0642\u0635\u0627\u0646 \u0633\u06D2 \u0628\u0686\u0646\u06D2 \u06A9\u06D2 \u0644\u06CC\u06D2 \u062A\u0635\u062F\u06CC\u0642 \u06A9\u0631\u06CC\u06BA \u06A9\u06C1 \u06CC\u06C1 \u062F\u0631\u0633\u062A \u0679\u0648\u06A9\u0646 \u06C1\u06D2\u06D4",
        token_typo_warning: "\u0679\u0648\u06A9\u0646 \u0627\u06CC\u0688\u0631\u06CC\u0633 \u0645\u0639\u0631\u0648\u0641 \u0627\u0633\u0679\u06CC\u0628\u0644 \u06A9\u0648\u0627\u0626\u0646\u0632 (USDC\u060C USDT\u060C PYUSD\u060C CASH) \u0633\u06D2 \u0645\u0637\u0627\u0628\u0642\u062A \u0646\u06C1\u06CC\u06BA \u0631\u06A9\u06BE\u062A\u0627\u06D4 \u0645\u0633\u062A\u0642\u0644 \u0646\u0642\u0635\u0627\u0646 \u0633\u06D2 \u0628\u0686\u0646\u06D2 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0627\u062D\u062A\u06CC\u0627\u0637 \u0633\u06D2 \u062A\u0635\u062F\u06CC\u0642 \u06A9\u0631\u06CC\u06BA\u06D4"
      },
      wallet: {
        no_wallet_detected: "\u06A9\u0648\u0626\u06CC \u0633\u0648\u0644\u0627\u0646\u0627 \u0648\u0627\u0644\u06CC\u0679 \u0646\u06C1\u06CC\u06BA \u0645\u0644\u0627",
        install_wallet: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 Phantom\u060C Solflare \u06CC\u0627 Backpack \u062C\u06CC\u0633\u06D2 \u0633\u0648\u0644\u0627\u0646\u0627 \u0648\u0627\u0644\u06CC\u0679 \u0627\u0646\u0633\u0679\u0627\u0644 \u06A9\u0631\u06CC\u06BA\u06D4",
        wallet_not_connected: "\u0648\u0627\u0644\u06CC\u0679 \u0645\u0646\u0633\u0644\u06A9 \u0646\u06C1\u06CC\u06BA",
        connect_your_wallet: "\u062C\u0627\u0631\u06CC \u0631\u06A9\u06BE\u0646\u06D2 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0627\u067E\u0646\u0627 \u0648\u0627\u0644\u06CC\u0679 \u0645\u0646\u0633\u0644\u06A9 \u06A9\u0631\u06CC\u06BA\u06D4",
        wallet_connection_failed: "\u0648\u0627\u0644\u06CC\u0679 \u0645\u0646\u0633\u0644\u06A9 \u0646\u06C1\u06CC\u06BA \u06C1\u0648 \u0633\u06A9\u0627",
        try_again: "\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u062F\u0648\u0628\u0627\u0631\u06C1 \u0645\u0646\u0633\u0644\u06A9 \u06A9\u0631\u0646\u06D2 \u06A9\u06CC \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4",
        transaction_rejected: "\u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u0645\u0633\u062A\u0631\u062F \u06A9\u0631 \u062F\u06CC \u06AF\u0626\u06CC",
        approve_in_wallet: "\u062C\u0627\u0631\u06CC \u0631\u06A9\u06BE\u0646\u06D2 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0627\u067E\u0646\u06D2 \u0648\u0627\u0644\u06CC\u0679 \u0645\u06CC\u06BA \u0679\u0631\u0627\u0646\u0632\u06CC\u06A9\u0634\u0646 \u06A9\u06CC \u0645\u0646\u0638\u0648\u0631\u06CC \u062F\u06CC\u06BA\u06D4",
        select_wallet: "\u0648\u0627\u0644\u0679 \u0645\u0646\u062A\u062E\u0628 \u06A9\u0631\u06CC\u06BA",
        change: "\u062A\u0628\u062F\u06CC\u0644 \u06A9\u0631\u06CC\u06BA"
      }
    };
  }
});

// src/i18n/translations/vi.json
var require_vi = __commonJS({
  "src/i18n/translations/vi.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - T\u1EC7p ngu\u1ED3n d\u1ECBch (Ti\u1EBFng Vi\u1EC7t)",
      version: "1.0.0",
      locale: "vi",
      ui: {
        pay_with_card: "Thanh to\xE1n b\u1EB1ng th\u1EBB",
        pay_with_crypto: "Thanh to\xE1n b\u1EB1ng USDC",
        pay_with_usdc: "Thanh to\xE1n b\u1EB1ng USDC",
        purchase: "Mua h\xE0ng",
        card: "Th\u1EBB",
        usdc_solana: "USDC (Solana)",
        crypto: "Ti\u1EC1n m\xE3 ho\xE1",
        connect_wallet: "K\u1EBFt n\u1ED1i v\xED",
        connecting: "\u0110ang k\u1EBFt n\u1ED1i...",
        processing: "\u0110ang x\u1EED l\xFD...",
        loading: "\u0110ang t\u1EA3i...",
        close: "\u0110\xF3ng",
        cancel: "H\u1EE7y",
        confirm: "X\xE1c nh\u1EADn",
        retry: "Th\u1EED l\u1EA1i",
        go_back: "Quay l\u1EA1i",
        contact_support: "Li\xEAn h\u1EC7 h\u1ED7 tr\u1EE3",
        pay_with_credits: "Thanh to\xE1n b\u1EB1ng t\xEDn d\u1EE5ng",
        credits: "T\xEDn d\u1EE5ng",
        disconnect: "Ng\u1EAFt k\u1EBFt n\u1ED1i",
        payment_successful: "Thanh to\xE1n th\xE0nh c\xF4ng!",
        subscribe: "\u0110\u0103ng k\xFD",
        subscribe_with_crypto: "\u0110\u0103ng k\xFD b\u1EB1ng USDC",
        subscribe_with_credits: "\u0110\u0103ng k\xFD b\u1EB1ng t\xEDn d\u1EE5ng",
        subscribed: "\u0110\xE3 \u0111\u0103ng k\xFD",
        subscribed_until: "\u0110\xE3 \u0111\u0103ng k\xFD \u0111\u1EBFn",
        subscription_active: "G\xF3i \u0111\u0103ng k\xFD c\u1EE7a b\u1EA1n \u0111ang ho\u1EA1t \u0111\u1ED9ng!",
        redirecting_to_checkout: "\u0110ang chuy\u1EC3n \u0111\u1EBFn thanh to\xE1n..."
      },
      errors: {
        invalid_payment_proof: {
          message: "X\xE1c minh thanh to\xE1n kh\xF4ng th\xE0nh c\xF4ng",
          action: "Vui l\xF2ng th\u1EED thanh to\xE1n l\u1EA1i. N\u1EBFu v\u1EABn ti\u1EBFp di\u1EC5n, h\xE3y li\xEAn h\u1EC7 h\u1ED7 tr\u1EE3."
        },
        invalid_signature: {
          message: "Ch\u1EEF k\xFD giao d\u1ECBch kh\xF4ng h\u1EE3p l\u1EC7",
          action: "Vui l\xF2ng ph\xEA duy\u1EC7t giao d\u1ECBch trong v\xED c\u1EE7a b\u1EA1n r\u1ED3i th\u1EED l\u1EA1i."
        },
        invalid_transaction: {
          message: "\u0110\u1ECBnh d\u1EA1ng giao d\u1ECBch kh\xF4ng h\u1EE3p l\u1EC7",
          action: "Vui l\xF2ng th\u1EED thanh to\xE1n l\u1EA1i. N\u1EBFu v\u1EABn ti\u1EBFp di\u1EC5n, h\xE3y th\u1EED c\u1EADp nh\u1EADt \u1EE9ng d\u1EE5ng v\xED."
        },
        transaction_not_found: {
          message: "Kh\xF4ng t\xECm th\u1EA5y giao d\u1ECBch tr\xEAn blockchain",
          action: "Giao d\u1ECBch c\u1EE7a b\u1EA1n c\xF3 th\u1EC3 v\u1EABn \u0111ang \u0111\u01B0\u1EE3c x\u1EED l\xFD. Vui l\xF2ng \u0111\u1EE3i m\u1ED9t l\xFAc v\xE0 ki\u1EC3m tra v\xED, ho\u1EB7c th\u1EED l\u1EA1i."
        },
        transaction_not_confirmed: {
          message: "Giao d\u1ECBch v\u1EABn \u0111ang \u0111\u01B0\u1EE3c x\u1EED l\xFD",
          action: "Vui l\xF2ng \u0111\u1EE3i blockchain x\xE1c nh\u1EADn giao d\u1ECBch, sau \u0111\xF3 th\u1EED l\u1EA1i."
        },
        transaction_failed: {
          message: "Giao d\u1ECBch th\u1EA5t b\u1EA1i tr\xEAn blockchain",
          action: "Ki\u1EC3m tra chi ti\u1EBFt trong v\xED c\u1EE7a b\u1EA1n. B\u1EA1n c\xF3 th\u1EC3 c\u1EA7n \u0111i\u1EC1u ch\u1EC9nh c\xE0i \u0111\u1EB7t giao d\u1ECBch ho\u1EB7c n\u1EA1p th\xEAm SOL cho ph\xED."
        },
        transaction_expired: {
          message: "Giao d\u1ECBch m\u1EA5t qu\xE1 nhi\u1EC1u th\u1EDDi gian \u0111\u1EC3 x\u1EED l\xFD",
          action: "Vui l\xF2ng th\u1EED thanh to\xE1n l\u1EA1i. C\xE2n nh\u1EAFc t\u0103ng m\u1EE9c \u01B0u ti\xEAn giao d\u1ECBch n\u1EBFu v\xED c\u1EE7a b\u1EA1n h\u1ED7 tr\u1EE3."
        },
        invalid_recipient: {
          message: "Thanh to\xE1n \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi \u0111\u1EBFn \u0111\u1ECBa ch\u1EC9 sai",
          action: "Vui l\xF2ng th\u1EED l\u1EA1i v\xE0 \u0111\u1EA3m b\u1EA3o b\u1EA1n ph\xEA duy\u1EC7t \u0111\xFAng giao d\u1ECBch trong v\xED."
        },
        invalid_sender: {
          message: "V\xED ng\u01B0\u1EDDi g\u1EEDi thanh to\xE1n kh\xF4ng h\u1EE3p l\u1EC7",
          action: "Vui l\xF2ng k\u1EBFt n\u1ED1i l\u1EA1i v\xED v\xE0 th\u1EED l\u1EA1i."
        },
        unauthorized_refund_issuer: {
          message: "B\u1EA1n kh\xF4ng \u0111\u01B0\u1EE3c ph\xE9p th\u1EF1c hi\u1EC7n ho\xE0n ti\u1EC1n",
          action: "Ch\u1EC9 c\xE1c t\xE0i kho\u1EA3n \u0111\u01B0\u1EE3c \u1EE7y quy\u1EC1n m\u1EDBi c\xF3 th\u1EC3 x\u1EED l\xFD ho\xE0n ti\u1EC1n. Vui l\xF2ng li\xEAn h\u1EC7 h\u1ED7 tr\u1EE3 n\u1EBFu b\u1EA1n cho r\u1EB1ng \u0111\xE2y l\xE0 l\u1ED7i."
        },
        amount_below_minimum: {
          message: "S\u1ED1 ti\u1EC1n thanh to\xE1n qu\xE1 th\u1EA5p",
          action: "Vui l\xF2ng ki\u1EC3m tra s\u1ED1 ti\u1EC1n y\xEAu c\u1EA7u v\xE0 th\u1EED l\u1EA1i."
        },
        amount_mismatch: {
          message: "S\u1ED1 ti\u1EC1n thanh to\xE1n kh\xF4ng kh\u1EDBp v\u1EDBi b\xE1o gi\xE1",
          action: "Gi\xE1 c\xF3 th\u1EC3 \u0111\xE3 thay \u0111\u1ED5i. Vui l\xF2ng l\xE0m m\u1EDBi trang v\xE0 th\u1EED thanh to\xE1n l\u1EA1i."
        },
        insufficient_funds_sol: {
          message: "Kh\xF4ng \u0111\u1EE7 SOL \u0111\u1EC3 tr\u1EA3 ph\xED giao d\u1ECBch",
          action: "N\u1EA1p \xEDt nh\u1EA5t 0.001 SOL v\xE0o v\xED \u0111\u1EC3 chi tr\u1EA3 ph\xED m\u1EA1ng, sau \u0111\xF3 th\u1EED l\u1EA1i."
        },
        insufficient_funds_token: {
          message: "S\u1ED1 d\u01B0 trong v\xED c\u1EE7a b\u1EA1n kh\xF4ng \u0111\u1EE7",
          action: "Vui l\xF2ng n\u1EA1p th\xEAm ti\u1EC1n v\xE0o v\xED r\u1ED3i th\u1EED l\u1EA1i."
        },
        invalid_token_mint: {
          message: "Token thanh to\xE1n kh\xF4ng \u0111\xFAng",
          action: "Vui l\xF2ng thanh to\xE1n b\u1EB1ng token \u0111\xFAng nh\u01B0 hi\u1EC3n th\u1ECB trong chi ti\u1EBFt thanh to\xE1n."
        },
        not_spl_transfer: {
          message: "Giao d\u1ECBch kh\xF4ng ph\u1EA3i l\xE0 chuy\u1EC3n token h\u1EE3p l\u1EC7",
          action: "Vui l\xF2ng \u0111\u1EA3m b\u1EA3o b\u1EA1n \u0111ang g\u1EEDi \u0111\xFAng lo\u1EA1i token t\u1EEB v\xED c\u1EE7a m\xECnh."
        },
        missing_token_account: {
          message: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n token",
          action: "V\xED c\u1EE7a b\u1EA1n c\xF3 th\u1EC3 c\u1EA7n t\u1EA1o t\xE0i kho\u1EA3n token tr\u01B0\u1EDBc. H\xE3y th\u1EED l\u1EA1i ho\u1EB7c d\xF9ng v\xED kh\xE1c."
        },
        invalid_token_program: {
          message: "Ch\u01B0\u01A1ng tr\xECnh token kh\xF4ng h\u1EE3p l\u1EC7",
          action: "Vui l\xF2ng th\u1EED thanh to\xE1n l\u1EA1i. N\u1EBFu v\u1EABn ti\u1EBFp di\u1EC5n, h\xE3y th\u1EED d\xF9ng v\xED kh\xE1c."
        },
        missing_memo: {
          message: "C\u1EA7n c\xF3 memo thanh to\xE1n nh\u01B0ng ch\u01B0a \u0111\u01B0\u1EE3c \u0111\xEDnh k\xE8m",
          action: "Vui l\xF2ng th\u1EED thanh to\xE1n l\u1EA1i v\xE0 \u0111\u1EA3m b\u1EA3o ph\xEA duy\u1EC7t chi ti\u1EBFt giao d\u1ECBch trong v\xED."
        },
        invalid_memo: {
          message: "\u0110\u1ECBnh d\u1EA1ng memo thanh to\xE1n kh\xF4ng h\u1EE3p l\u1EC7",
          action: "Vui l\xF2ng th\u1EED thanh to\xE1n l\u1EA1i."
        },
        payment_already_used: {
          message: "Kho\u1EA3n thanh to\xE1n n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c x\u1EED l\xFD",
          action: "Ki\u1EC3m tra l\u1ECBch s\u1EED giao d\u1ECBch c\u1EE7a b\u1EA1n. N\u1EBFu c\u1EA7n thanh to\xE1n kh\xE1c, vui l\xF2ng b\u1EAFt \u0111\u1EA7u giao d\u1ECBch m\u1EDBi."
        },
        signature_reused: {
          message: "Ch\u1EEF k\xFD giao d\u1ECBch \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng",
          action: "Vui l\xF2ng t\u1EA1o giao d\u1ECBch thanh to\xE1n m\u1EDBi."
        },
        quote_expired: {
          message: "B\xE1o gi\xE1 thanh to\xE1n \u0111\xE3 h\u1EBFt h\u1EA1n",
          action: "Gi\xE1 \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt th\u01B0\u1EDDng xuy\xEAn. Vui l\xF2ng l\xE0m m\u1EDBi trang v\xE0 th\u1EED thanh to\xE1n l\u1EA1i."
        },
        missing_field: {
          message: "Thi\u1EBFu th\xF4ng tin b\u1EAFt bu\u1ED9c",
          action: "Vui l\xF2ng ki\u1EC3m tra t\u1EA5t c\u1EA3 c\xE1c tr\u01B0\u1EDDng b\u1EAFt bu\u1ED9c v\xE0 th\u1EED l\u1EA1i."
        },
        invalid_field: {
          message: "M\u1ED9t s\u1ED1 th\xF4ng tin kh\xF4ng h\u1EE3p l\u1EC7",
          action: "Vui l\xF2ng ki\u1EC3m tra l\u1EA1i d\u1EEF li\u1EC7u nh\u1EADp v\xE0 th\u1EED l\u1EA1i."
        },
        invalid_amount: {
          message: "S\u1ED1 ti\u1EC1n thanh to\xE1n kh\xF4ng h\u1EE3p l\u1EC7",
          action: "Vui l\xF2ng ki\u1EC3m tra s\u1ED1 ti\u1EC1n v\xE0 th\u1EED l\u1EA1i."
        },
        invalid_wallet: {
          message: "\u0110\u1ECBa ch\u1EC9 v\xED kh\xF4ng h\u1EE3p l\u1EC7",
          action: "Vui l\xF2ng k\u1EBFt n\u1ED1i l\u1EA1i v\xED v\xE0 th\u1EED l\u1EA1i."
        },
        invalid_resource: {
          message: "L\u1EF1a ch\u1ECDn m\u1EB7t h\xE0ng kh\xF4ng h\u1EE3p l\u1EC7",
          action: "Vui l\xF2ng l\xE0m m\u1EDBi trang v\xE0 th\u1EED l\u1EA1i."
        },
        invalid_coupon: {
          message: "M\xE3 gi\u1EA3m gi\xE1 kh\xF4ng h\u1EE3p l\u1EC7",
          action: "Vui l\xF2ng ki\u1EC3m tra m\xE3 gi\u1EA3m gi\xE1 v\xE0 th\u1EED l\u1EA1i."
        },
        invalid_cart_item: {
          message: "M\u1ED9t ho\u1EB7c nhi\u1EC1u m\u1EB7t h\xE0ng trong gi\u1ECF h\xE0ng kh\xF4ng h\u1EE3p l\u1EC7",
          action: "Vui l\xF2ng xem l\u1EA1i gi\u1ECF h\xE0ng v\xE0 th\u1EED l\u1EA1i."
        },
        empty_cart: {
          message: "Gi\u1ECF h\xE0ng c\u1EE7a b\u1EA1n \u0111ang tr\u1ED1ng",
          action: "Vui l\xF2ng th\xEAm m\u1EB7t h\xE0ng v\xE0o gi\u1ECF tr\u01B0\u1EDBc khi thanh to\xE1n."
        },
        resource_not_found: {
          message: "Kh\xF4ng t\xECm th\u1EA5y m\u1EB7t h\xE0ng",
          action: "M\u1EB7t h\xE0ng n\xE0y c\xF3 th\u1EC3 kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i. Vui l\xF2ng l\xE0m m\u1EDBi v\xE0 th\u1EED l\u1EA1i."
        },
        cart_not_found: {
          message: "Kh\xF4ng t\xECm th\u1EA5y gi\u1ECF h\xE0ng",
          action: "Gi\u1ECF h\xE0ng c\u1EE7a b\u1EA1n c\xF3 th\u1EC3 \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng b\u1EAFt \u0111\u1EA7u \u0111\u01A1n h\xE0ng m\u1EDBi."
        },
        refund_not_found: {
          message: "Kh\xF4ng t\xECm th\u1EA5y giao d\u1ECBch ho\xE0n ti\u1EC1n",
          action: "Vui l\xF2ng ki\u1EC3m tra s\u1ED1 tham chi\u1EBFu ho\xE0n ti\u1EC1n ho\u1EB7c li\xEAn h\u1EC7 h\u1ED7 tr\u1EE3."
        },
        product_not_found: {
          message: "S\u1EA3n ph\u1EA9m kh\xF4ng c\xF2n kh\u1EA3 d\u1EE5ng",
          action: "S\u1EA3n ph\u1EA9m n\xE0y c\xF3 th\u1EC3 \u0111\xE3 ng\u1EEBng b\xE1n. Vui l\xF2ng xem danh m\u1EE5c hi\u1EC7n c\xF3."
        },
        coupon_not_found: {
          message: "Kh\xF4ng t\xECm th\u1EA5y m\xE3 gi\u1EA3m gi\xE1",
          action: "Vui l\xF2ng ki\u1EC3m tra m\xE3 ho\u1EB7c x\xF3a \u0111\u1EC3 ti\u1EBFp t\u1EE5c."
        },
        session_not_found: {
          message: "Phi\xEAn thanh to\xE1n \u0111\xE3 h\u1EBFt h\u1EA1n",
          action: "Vui l\xF2ng b\u1EAFt \u0111\u1EA7u thanh to\xE1n m\u1EDBi."
        },
        cart_already_paid: {
          message: "\u0110\u01A1n h\xE0ng n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c thanh to\xE1n",
          action: "Ki\u1EC3m tra l\u1ECBch s\u1EED \u0111\u01A1n h\xE0ng c\u1EE7a b\u1EA1n. N\u1EBFu c\u1EA7n mua th\xEAm, vui l\xF2ng b\u1EAFt \u0111\u1EA7u \u0111\u01A1n h\xE0ng m\u1EDBi."
        },
        refund_already_processed: {
          message: "Kho\u1EA3n ho\xE0n ti\u1EC1n n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c x\u1EED l\xFD",
          action: "Ki\u1EC3m tra l\u1ECBch s\u1EED giao d\u1ECBch ho\u1EB7c li\xEAn h\u1EC7 h\u1ED7 tr\u1EE3 \u0111\u1EC3 bi\u1EBFt chi ti\u1EBFt."
        },
        coupon_expired: {
          message: "M\xE3 gi\u1EA3m gi\xE1 \u0111\xE3 h\u1EBFt h\u1EA1n",
          action: "Vui l\xF2ng x\xF3a m\xE3 gi\u1EA3m gi\xE1 ho\u1EB7c d\xF9ng m\xE3 kh\xE1c."
        },
        coupon_usage_limit_reached: {
          message: "\u0110\xE3 \u0111\u1EA1t gi\u1EDBi h\u1EA1n s\u1EED d\u1EE5ng m\xE3 gi\u1EA3m gi\xE1",
          action: "M\xE3 n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng h\u1EBFt. Vui l\xF2ng th\u1EED m\xE3 kh\xE1c."
        },
        coupon_not_applicable: {
          message: "Kh\xF4ng th\u1EC3 \xE1p d\u1EE5ng m\xE3 gi\u1EA3m gi\xE1 cho \u0111\u01A1n mua n\xE0y",
          action: "Vui l\xF2ng ki\u1EC3m tra \u0111i\u1EC1u kho\u1EA3n c\u1EE7a m\xE3 ho\u1EB7c x\xF3a \u0111\u1EC3 ti\u1EBFp t\u1EE5c."
        },
        coupon_wrong_payment_method: {
          message: "M\xE3 gi\u1EA3m gi\xE1 kh\xF4ng \xE1p d\u1EE5ng cho ph\u01B0\u01A1ng th\u1EE9c thanh to\xE1n n\xE0y",
          action: "Th\u1EED ph\u01B0\u01A1ng th\u1EE9c thanh to\xE1n kh\xE1c ho\u1EB7c x\xF3a m\xE3 gi\u1EA3m gi\xE1."
        },
        stripe_error: {
          message: "D\u1ECBch v\u1EE5 thanh to\xE1n th\u1EBB t\u1EA1m th\u1EDDi kh\xF4ng kh\u1EA3 d\u1EE5ng",
          action: "Vui l\xF2ng th\u1EED l\u1EA1i sau, ho\u1EB7c d\xF9ng thanh to\xE1n b\u1EB1ng ti\u1EC1n m\xE3 ho\xE1."
        },
        rpc_error: {
          message: "M\u1EA1ng blockchain t\u1EA1m th\u1EDDi kh\xF4ng kh\u1EA3 d\u1EE5ng",
          action: "Vui l\xF2ng th\u1EED l\u1EA1i sau, ho\u1EB7c d\xF9ng thanh to\xE1n b\u1EB1ng th\u1EBB."
        },
        network_error: {
          message: "S\u1EF1 c\u1ED1 k\u1EBFt n\u1ED1i m\u1EA1ng",
          action: "Vui l\xF2ng ki\u1EC3m tra k\u1EBFt n\u1ED1i internet v\xE0 th\u1EED l\u1EA1i."
        },
        internal_error: {
          message: "\u0110\xE3 x\u1EA3y ra l\u1ED7i t\u1EEB ph\xEDa ch\xFAng t\xF4i",
          action: "Vui l\xF2ng th\u1EED l\u1EA1i. N\u1EBFu v\u1EABn ti\u1EBFp di\u1EC5n, h\xE3y li\xEAn h\u1EC7 h\u1ED7 tr\u1EE3."
        },
        database_error: {
          message: "D\u1ECBch v\u1EE5 t\u1EA1m th\u1EDDi kh\xF4ng kh\u1EA3 d\u1EE5ng",
          action: "Vui l\xF2ng th\u1EED l\u1EA1i sau."
        },
        config_error: {
          message: "L\u1ED7i c\u1EA5u h\xECnh d\u1ECBch v\u1EE5",
          action: "Vui l\xF2ng li\xEAn h\u1EC7 h\u1ED7 tr\u1EE3 \u0111\u1EC3 \u0111\u01B0\u1EE3c tr\u1EE3 gi\xFAp."
        },
        unknown_error: {
          message: "\u0110\xE3 x\u1EA3y ra l\u1ED7i kh\xF4ng mong mu\u1ED1n",
          action: "Vui l\xF2ng th\u1EED l\u1EA1i ho\u1EB7c li\xEAn h\u1EC7 h\u1ED7 tr\u1EE3 n\u1EBFu t\xECnh tr\u1EA1ng ti\u1EBFp di\u1EC5n."
        }
      },
      validation: {
        unknown_token_mint: "C\u1EA3nh b\xE1o: \u0110\u1ECBa ch\u1EC9 mint c\u1EE7a token kh\xF4ng \u0111\u01B0\u1EE3c nh\u1EADn di\u1EC7n. H\xE3y ki\u1EC3m tra l\u1EA1i \u0111\xE2y c\xF3 ph\u1EA3i token \u0111\xFAng \u0111\u1EC3 tr\xE1nh m\u1EA5t ti\u1EC1n.",
        token_typo_warning: "\u0110\u1ECBa ch\u1EC9 token kh\xF4ng kh\u1EDBp v\u1EDBi c\xE1c stablecoin \u0111\xE3 bi\u1EBFt (USDC, USDT, PYUSD, CASH). H\xE3y ki\u1EC3m tra c\u1EA9n th\u1EADn \u0111\u1EC3 tr\xE1nh m\u1EA5t ti\u1EC1n v\u0129nh vi\u1EC5n."
      },
      wallet: {
        no_wallet_detected: "Kh\xF4ng ph\xE1t hi\u1EC7n v\xED Solana",
        install_wallet: "Vui l\xF2ng c\xE0i \u0111\u1EB7t v\xED Solana nh\u01B0 Phantom, Solflare ho\u1EB7c Backpack.",
        wallet_not_connected: "V\xED ch\u01B0a \u0111\u01B0\u1EE3c k\u1EBFt n\u1ED1i",
        connect_your_wallet: "Vui l\xF2ng k\u1EBFt n\u1ED1i v\xED \u0111\u1EC3 ti\u1EBFp t\u1EE5c.",
        wallet_connection_failed: "K\u1EBFt n\u1ED1i v\xED th\u1EA5t b\u1EA1i",
        try_again: "Vui l\xF2ng th\u1EED k\u1EBFt n\u1ED1i l\u1EA1i.",
        transaction_rejected: "Giao d\u1ECBch \u0111\xE3 b\u1ECB t\u1EEB ch\u1ED1i",
        approve_in_wallet: "Vui l\xF2ng ph\xEA duy\u1EC7t giao d\u1ECBch trong v\xED \u0111\u1EC3 ti\u1EBFp t\u1EE5c.",
        select_wallet: "Ch\u1ECDn v\xED",
        change: "Thay \u0111\u1ED5i"
      }
    };
  }
});

// src/i18n/translations/zh.json
var require_zh = __commonJS({
  "src/i18n/translations/zh.json"(exports, module) {
    module.exports = {
      comment: "CEDROS PAY - \u7FFB\u8BD1\u6E90\u6587\u4EF6\uFF08\u4E2D\u6587\uFF09",
      version: "1.0.0",
      locale: "zh",
      ui: {
        pay_with_card: "\u4F7F\u7528\u94F6\u884C\u5361\u652F\u4ED8",
        pay_with_crypto: "\u4F7F\u7528 USDC \u652F\u4ED8",
        pay_with_usdc: "\u4F7F\u7528 USDC \u652F\u4ED8",
        purchase: "\u8D2D\u4E70",
        card: "\u94F6\u884C\u5361",
        usdc_solana: "USDC\uFF08Solana\uFF09",
        crypto: "\u52A0\u5BC6\u8D27\u5E01",
        connect_wallet: "\u8FDE\u63A5\u94B1\u5305",
        connecting: "\u6B63\u5728\u8FDE\u63A5...",
        processing: "\u6B63\u5728\u5904\u7406...",
        loading: "\u6B63\u5728\u52A0\u8F7D...",
        close: "\u5173\u95ED",
        cancel: "\u53D6\u6D88",
        confirm: "\u786E\u8BA4",
        retry: "\u91CD\u8BD5",
        go_back: "\u8FD4\u56DE",
        contact_support: "\u8054\u7CFB\u652F\u6301",
        pay_with_credits: "\u4F7F\u7528\u79EF\u5206\u652F\u4ED8",
        credits: "\u79EF\u5206",
        disconnect: "\u65AD\u5F00\u8FDE\u63A5",
        payment_successful: "\u652F\u4ED8\u6210\u529F\uFF01",
        subscribe: "\u8BA2\u9605",
        subscribe_with_crypto: "\u4F7F\u7528 USDC \u8BA2\u9605",
        subscribe_with_credits: "\u4F7F\u7528\u79EF\u5206\u8BA2\u9605",
        subscribed: "\u5DF2\u8BA2\u9605",
        subscribed_until: "\u8BA2\u9605\u6709\u6548\u671F\u81F3",
        subscription_active: "\u60A8\u7684\u8BA2\u9605\u5DF2\u751F\u6548\uFF01",
        redirecting_to_checkout: "\u6B63\u5728\u8DF3\u8F6C\u5230\u7ED3\u8D26..."
      },
      errors: {
        invalid_payment_proof: {
          message: "\u652F\u4ED8\u9A8C\u8BC1\u5931\u8D25",
          action: "\u8BF7\u91CD\u8BD5\u652F\u4ED8\u3002\u5982\u679C\u95EE\u9898\u4ECD\u7136\u5B58\u5728\uFF0C\u8BF7\u8054\u7CFB\u652F\u6301\u3002"
        },
        invalid_signature: {
          message: "\u4EA4\u6613\u7B7E\u540D\u65E0\u6548",
          action: "\u8BF7\u5728\u60A8\u7684\u94B1\u5305\u4E2D\u6279\u51C6\u8BE5\u4EA4\u6613\uFF0C\u7136\u540E\u91CD\u8BD5\u3002"
        },
        invalid_transaction: {
          message: "\u4EA4\u6613\u683C\u5F0F\u65E0\u6548",
          action: "\u8BF7\u91CD\u8BD5\u652F\u4ED8\u3002\u5982\u679C\u4ECD\u7136\u51FA\u73B0\u95EE\u9898\uFF0C\u8BF7\u5C1D\u8BD5\u66F4\u65B0\u60A8\u7684\u94B1\u5305\u5E94\u7528\u3002"
        },
        transaction_not_found: {
          message: "\u533A\u5757\u94FE\u4E0A\u672A\u627E\u5230\u8BE5\u4EA4\u6613",
          action: "\u60A8\u7684\u4EA4\u6613\u53EF\u80FD\u4ECD\u5728\u5904\u7406\u4E2D\u3002\u8BF7\u7A0D\u5019\u5E76\u68C0\u67E5\u60A8\u7684\u94B1\u5305\uFF0C\u6216\u91CD\u8BD5\u3002"
        },
        transaction_not_confirmed: {
          message: "\u4EA4\u6613\u4ECD\u5728\u5904\u7406\u4E2D",
          action: "\u8BF7\u7A0D\u5019\u7B49\u5F85\u533A\u5757\u94FE\u786E\u8BA4\u60A8\u7684\u4EA4\u6613\uFF0C\u7136\u540E\u518D\u8BD5\u3002"
        },
        transaction_failed: {
          message: "\u533A\u5757\u94FE\u4E0A\u7684\u4EA4\u6613\u5931\u8D25",
          action: "\u8BF7\u5728\u94B1\u5305\u4E2D\u67E5\u770B\u8BE6\u60C5\u3002\u60A8\u53EF\u80FD\u9700\u8981\u8C03\u6574\u4EA4\u6613\u8BBE\u7F6E\u6216\u589E\u52A0\u7528\u4E8E\u624B\u7EED\u8D39\u7684 SOL\u3002"
        },
        transaction_expired: {
          message: "\u4EA4\u6613\u5904\u7406\u8017\u65F6\u8FC7\u957F",
          action: "\u8BF7\u91CD\u8BD5\u652F\u4ED8\u3002\u5982\u60A8\u7684\u94B1\u5305\u652F\u6301\uFF0C\u53EF\u8003\u8651\u63D0\u9AD8\u4EA4\u6613\u4F18\u5148\u7EA7\u3002"
        },
        invalid_recipient: {
          message: "\u4ED8\u6B3E\u88AB\u53D1\u9001\u5230\u9519\u8BEF\u5730\u5740",
          action: "\u8BF7\u91CD\u8BD5\uFF0C\u5E76\u786E\u4FDD\u60A8\u5728\u94B1\u5305\u4E2D\u6279\u51C6\u7684\u662F\u6B63\u786E\u7684\u4EA4\u6613\u3002"
        },
        invalid_sender: {
          message: "\u4ED8\u6B3E\u53D1\u9001\u65B9\u94B1\u5305\u65E0\u6548",
          action: "\u8BF7\u91CD\u65B0\u8FDE\u63A5\u60A8\u7684\u94B1\u5305\u540E\u518D\u8BD5\u3002"
        },
        unauthorized_refund_issuer: {
          message: "\u60A8\u65E0\u6743\u53D1\u8D77\u9000\u6B3E",
          action: "\u53EA\u6709\u6388\u6743\u8D26\u6237\u624D\u80FD\u5904\u7406\u9000\u6B3E\u3002\u5982\u60A8\u8BA4\u4E3A\u8FD9\u662F\u9519\u8BEF\uFF0C\u8BF7\u8054\u7CFB\u652F\u6301\u3002"
        },
        amount_below_minimum: {
          message: "\u652F\u4ED8\u91D1\u989D\u8FC7\u4F4E",
          action: "\u8BF7\u6838\u5BF9\u6240\u9700\u91D1\u989D\u5E76\u91CD\u8BD5\u3002"
        },
        amount_mismatch: {
          message: "\u652F\u4ED8\u91D1\u989D\u4E0E\u62A5\u4EF7\u4E0D\u4E00\u81F4",
          action: "\u4EF7\u683C\u53EF\u80FD\u5DF2\u53D1\u751F\u53D8\u5316\u3002\u8BF7\u5237\u65B0\u9875\u9762\u5E76\u91CD\u65B0\u652F\u4ED8\u3002"
        },
        insufficient_funds_sol: {
          message: "\u7528\u4E8E\u4EA4\u6613\u624B\u7EED\u8D39\u7684 SOL \u4F59\u989D\u4E0D\u8DB3",
          action: "\u8BF7\u5411\u94B1\u5305\u5145\u503C\u81F3\u5C11 0.001 SOL \u4EE5\u8986\u76D6\u7F51\u7EDC\u624B\u7EED\u8D39\uFF0C\u7136\u540E\u91CD\u8BD5\u3002"
        },
        insufficient_funds_token: {
          message: "\u94B1\u5305\u4F59\u989D\u4E0D\u8DB3",
          action: "\u8BF7\u5411\u94B1\u5305\u6DFB\u52A0\u66F4\u591A\u8D44\u91D1\u540E\u518D\u8BD5\u3002"
        },
        invalid_token_mint: {
          message: "\u4ED8\u6B3E\u4EE3\u5E01\u4E0D\u6B63\u786E",
          action: "\u8BF7\u6309\u7167\u652F\u4ED8\u8BE6\u60C5\u6240\u793A\u4F7F\u7528\u6B63\u786E\u7684\u4EE3\u5E01\u4ED8\u6B3E\u3002"
        },
        not_spl_transfer: {
          message: "\u8BE5\u4EA4\u6613\u4E0D\u662F\u6709\u6548\u7684\u4EE3\u5E01\u8F6C\u8D26",
          action: "\u8BF7\u786E\u4FDD\u60A8\u4ECE\u94B1\u5305\u53D1\u9001\u7684\u662F\u6B63\u786E\u7684\u4EE3\u5E01\u7C7B\u578B\u3002"
        },
        missing_token_account: {
          message: "\u672A\u627E\u5230\u4EE3\u5E01\u8D26\u6237",
          action: "\u60A8\u7684\u94B1\u5305\u53EF\u80FD\u9700\u8981\u5148\u521B\u5EFA\u4EE3\u5E01\u8D26\u6237\u3002\u8BF7\u91CD\u8BD5\u6216\u4F7F\u7528\u5176\u4ED6\u94B1\u5305\u3002"
        },
        invalid_token_program: {
          message: "\u4EE3\u5E01\u7A0B\u5E8F\u65E0\u6548",
          action: "\u8BF7\u91CD\u8BD5\u652F\u4ED8\u3002\u5982\u679C\u4ECD\u6709\u95EE\u9898\uFF0C\u8BF7\u5C1D\u8BD5\u4F7F\u7528\u5176\u4ED6\u94B1\u5305\u3002"
        },
        missing_memo: {
          message: "\u9700\u8981\u4ED8\u6B3E\u5907\u6CE8\uFF08memo\uFF09\uFF0C\u4F46\u672A\u5305\u542B",
          action: "\u8BF7\u91CD\u8BD5\u652F\u4ED8\uFF0C\u5E76\u786E\u4FDD\u60A8\u5728\u94B1\u5305\u4E2D\u6279\u51C6\u4EA4\u6613\u660E\u7EC6\u3002"
        },
        invalid_memo: {
          message: "\u4ED8\u6B3E\u5907\u6CE8\uFF08memo\uFF09\u683C\u5F0F\u65E0\u6548",
          action: "\u8BF7\u91CD\u8BD5\u652F\u4ED8\u3002"
        },
        payment_already_used: {
          message: "\u6B64\u4ED8\u6B3E\u5DF2\u88AB\u5904\u7406",
          action: "\u8BF7\u67E5\u770B\u4EA4\u6613\u5386\u53F2\u3002\u5982\u9700\u518D\u6B21\u652F\u4ED8\uFF0C\u8BF7\u53D1\u8D77\u65B0\u7684\u4EA4\u6613\u3002"
        },
        signature_reused: {
          message: "\u4EA4\u6613\u7B7E\u540D\u5DF2\u88AB\u4F7F\u7528",
          action: "\u8BF7\u521B\u5EFA\u4E00\u7B14\u65B0\u7684\u652F\u4ED8\u4EA4\u6613\u3002"
        },
        quote_expired: {
          message: "\u652F\u4ED8\u62A5\u4EF7\u5DF2\u8FC7\u671F",
          action: "\u4EF7\u683C\u66F4\u65B0\u9891\u7E41\u3002\u8BF7\u5237\u65B0\u9875\u9762\u5E76\u91CD\u65B0\u652F\u4ED8\u3002"
        },
        missing_field: {
          message: "\u7F3A\u5C11\u5FC5\u586B\u4FE1\u606F",
          action: "\u8BF7\u68C0\u67E5\u6240\u6709\u5FC5\u586B\u5B57\u6BB5\u5E76\u91CD\u8BD5\u3002"
        },
        invalid_field: {
          message: "\u90E8\u5206\u4FE1\u606F\u65E0\u6548",
          action: "\u8BF7\u68C0\u67E5\u8F93\u5165\u540E\u518D\u8BD5\u3002"
        },
        invalid_amount: {
          message: "\u652F\u4ED8\u91D1\u989D\u65E0\u6548",
          action: "\u8BF7\u6838\u5BF9\u91D1\u989D\u540E\u518D\u8BD5\u3002"
        },
        invalid_wallet: {
          message: "\u94B1\u5305\u5730\u5740\u65E0\u6548",
          action: "\u8BF7\u91CD\u65B0\u8FDE\u63A5\u60A8\u7684\u94B1\u5305\u540E\u518D\u8BD5\u3002"
        },
        invalid_resource: {
          message: "\u65E0\u6548\u7684\u5546\u54C1\u9009\u62E9",
          action: "\u8BF7\u5237\u65B0\u9875\u9762\u540E\u518D\u8BD5\u3002"
        },
        invalid_coupon: {
          message: "\u65E0\u6548\u7684\u4F18\u60E0\u7801",
          action: "\u8BF7\u68C0\u67E5\u4F18\u60E0\u7801\u540E\u518D\u8BD5\u3002"
        },
        invalid_cart_item: {
          message: "\u8D2D\u7269\u8F66\u4E2D\u4E00\u4E2A\u6216\u591A\u4E2A\u5546\u54C1\u65E0\u6548",
          action: "\u8BF7\u67E5\u770B\u60A8\u7684\u8D2D\u7269\u8F66\u540E\u518D\u8BD5\u3002"
        },
        empty_cart: {
          message: "\u60A8\u7684\u8D2D\u7269\u8F66\u4E3A\u7A7A",
          action: "\u8BF7\u5148\u5C06\u5546\u54C1\u52A0\u5165\u8D2D\u7269\u8F66\u540E\u518D\u7ED3\u8D26\u3002"
        },
        resource_not_found: {
          message: "\u672A\u627E\u5230\u8BE5\u5546\u54C1",
          action: "\u8BE5\u5546\u54C1\u53EF\u80FD\u5DF2\u4E0D\u53EF\u7528\u3002\u8BF7\u5237\u65B0\u9875\u9762\u540E\u518D\u8BD5\u3002"
        },
        cart_not_found: {
          message: "\u672A\u627E\u5230\u8D2D\u7269\u8F66",
          action: "\u60A8\u7684\u8D2D\u7269\u8F66\u53EF\u80FD\u5DF2\u8FC7\u671F\u3002\u8BF7\u53D1\u8D77\u65B0\u7684\u8BA2\u5355\u3002"
        },
        refund_not_found: {
          message: "\u672A\u627E\u5230\u9000\u6B3E\u8BB0\u5F55",
          action: "\u8BF7\u68C0\u67E5\u9000\u6B3E\u53C2\u8003\u7F16\u53F7\u6216\u8054\u7CFB\u652F\u6301\u3002"
        },
        product_not_found: {
          message: "\u5546\u54C1\u4E0D\u53EF\u7528",
          action: "\u8BE5\u5546\u54C1\u53EF\u80FD\u5DF2\u4E0D\u53EF\u7528\u3002\u8BF7\u6D4F\u89C8\u6211\u4EEC\u5F53\u524D\u7684\u5546\u54C1\u3002"
        },
        coupon_not_found: {
          message: "\u672A\u627E\u5230\u4F18\u60E0\u7801",
          action: "\u8BF7\u68C0\u67E5\u4F18\u60E0\u7801\u6216\u5C06\u5176\u79FB\u9664\u4EE5\u7EE7\u7EED\u3002"
        },
        session_not_found: {
          message: "\u652F\u4ED8\u4F1A\u8BDD\u5DF2\u8FC7\u671F",
          action: "\u8BF7\u53D1\u8D77\u65B0\u7684\u652F\u4ED8\u3002"
        },
        cart_already_paid: {
          message: "\u6B64\u8BA2\u5355\u5DF2\u5B8C\u6210\u652F\u4ED8",
          action: "\u8BF7\u67E5\u770B\u8BA2\u5355\u5386\u53F2\u3002\u5982\u9700\u518D\u6B21\u8D2D\u4E70\uFF0C\u8BF7\u53D1\u8D77\u65B0\u7684\u8BA2\u5355\u3002"
        },
        refund_already_processed: {
          message: "\u6B64\u9000\u6B3E\u5DF2\u5904\u7406",
          action: "\u8BF7\u67E5\u770B\u4EA4\u6613\u5386\u53F2\u6216\u8054\u7CFB\u652F\u6301\u4EE5\u83B7\u53D6\u8BE6\u60C5\u3002"
        },
        coupon_expired: {
          message: "\u4F18\u60E0\u5238\u5DF2\u8FC7\u671F",
          action: "\u8BF7\u79FB\u9664\u4F18\u60E0\u7801\u6216\u4F7F\u7528\u5176\u4ED6\u4F18\u60E0\u7801\u3002"
        },
        coupon_usage_limit_reached: {
          message: "\u4F18\u60E0\u5238\u4F7F\u7528\u6B21\u6570\u5DF2\u8FBE\u4E0A\u9650",
          action: "\u8BE5\u4F18\u60E0\u5238\u5DF2\u88AB\u5168\u90E8\u5151\u4ED8\u3002\u8BF7\u5C1D\u8BD5\u4F7F\u7528\u5176\u4ED6\u4EE3\u7801\u3002"
        },
        coupon_not_applicable: {
          message: "\u8BE5\u4F18\u60E0\u5238\u4E0D\u9002\u7528\u4E8E\u672C\u6B21\u8D2D\u4E70",
          action: "\u8BF7\u67E5\u770B\u4F18\u60E0\u5238\u6761\u6B3E\u6216\u5C06\u5176\u79FB\u9664\u4EE5\u7EE7\u7EED\u3002"
        },
        coupon_wrong_payment_method: {
          message: "\u8BE5\u4F18\u60E0\u5238\u4E0D\u9002\u7528\u4E8E\u6B64\u652F\u4ED8\u65B9\u5F0F",
          action: "\u8BF7\u5C1D\u8BD5\u5176\u4ED6\u652F\u4ED8\u65B9\u5F0F\u6216\u79FB\u9664\u4F18\u60E0\u7801\u3002"
        },
        stripe_error: {
          message: "\u94F6\u884C\u5361\u652F\u4ED8\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528",
          action: "\u8BF7\u7A0D\u540E\u91CD\u8BD5\uFF0C\u6216\u6539\u7528\u52A0\u5BC6\u8D27\u5E01\u652F\u4ED8\u3002"
        },
        rpc_error: {
          message: "\u533A\u5757\u94FE\u7F51\u7EDC\u6682\u65F6\u4E0D\u53EF\u7528",
          action: "\u8BF7\u7A0D\u540E\u91CD\u8BD5\uFF0C\u6216\u6539\u7528\u94F6\u884C\u5361\u652F\u4ED8\u3002"
        },
        network_error: {
          message: "\u7F51\u7EDC\u8FDE\u63A5\u95EE\u9898",
          action: "\u8BF7\u68C0\u67E5\u60A8\u7684\u7F51\u7EDC\u8FDE\u63A5\u5E76\u91CD\u8BD5\u3002"
        },
        internal_error: {
          message: "\u6211\u4EEC\u8FD9\u8FB9\u51FA\u73B0\u95EE\u9898",
          action: "\u8BF7\u91CD\u8BD5\u3002\u5982\u679C\u4ECD\u7136\u6301\u7EED\uFF0C\u8BF7\u8054\u7CFB\u652F\u6301\u3002"
        },
        database_error: {
          message: "\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528",
          action: "\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002"
        },
        config_error: {
          message: "\u670D\u52A1\u914D\u7F6E\u9519\u8BEF",
          action: "\u8BF7\u8054\u7CFB\u652F\u6301\u83B7\u53D6\u534F\u52A9\u3002"
        },
        unknown_error: {
          message: "\u53D1\u751F\u672A\u77E5\u9519\u8BEF",
          action: "\u8BF7\u91CD\u8BD5\uFF0C\u82E5\u95EE\u9898\u6301\u7EED\u8BF7\u8054\u7CFB\u652F\u6301\u3002"
        }
      },
      validation: {
        unknown_token_mint: "\u8B66\u544A\uFF1A\u672A\u8BC6\u522B\u7684\u4EE3\u5E01 mint \u5730\u5740\u3002\u8BF7\u4ED4\u7EC6\u786E\u8BA4\u8FD9\u662F\u6B63\u786E\u7684\u4EE3\u5E01\uFF0C\u4EE5\u907F\u514D\u8D44\u91D1\u635F\u5931\u3002",
        token_typo_warning: "\u4EE3\u5E01\u5730\u5740\u4E0E\u5DF2\u77E5\u7A33\u5B9A\u5E01\uFF08USDC\u3001USDT\u3001PYUSD\u3001CASH\uFF09\u4E0D\u5339\u914D\u3002\u8BF7\u4ED4\u7EC6\u6838\u5BF9\uFF0C\u4EE5\u9632\u8D44\u91D1\u6C38\u4E45\u4E22\u5931\u3002"
      },
      wallet: {
        no_wallet_detected: "\u672A\u68C0\u6D4B\u5230 Solana \u94B1\u5305",
        install_wallet: "\u8BF7\u5B89\u88C5 Phantom\u3001Solflare \u6216 Backpack \u7B49 Solana \u94B1\u5305\u3002",
        wallet_not_connected: "\u94B1\u5305\u672A\u8FDE\u63A5",
        connect_your_wallet: "\u8BF7\u8FDE\u63A5\u60A8\u7684\u94B1\u5305\u4EE5\u7EE7\u7EED\u3002",
        wallet_connection_failed: "\u8FDE\u63A5\u94B1\u5305\u5931\u8D25",
        try_again: "\u8BF7\u91CD\u8BD5\u8FDE\u63A5\u3002",
        transaction_rejected: "\u4EA4\u6613\u5DF2\u88AB\u62D2\u7EDD",
        approve_in_wallet: "\u8BF7\u5728\u94B1\u5305\u4E2D\u6279\u51C6\u8BE5\u4EA4\u6613\u4EE5\u7EE7\u7EED\u3002",
        select_wallet: "\u9009\u62E9\u94B1\u5305",
        change: "\u66F4\u6539"
      }
    };
  }
});

// src/components/NativeStoreButton.tsx
import React2, { useMemo as useMemo3, useState as useState3 } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// src/context/CedrosContext.tsx
import { createContext as createContext2, useContext as useContext2, useMemo as useMemo2, useEffect as useEffect2, useRef as useRef2, useState as useState2 } from "react";
import { Linking as Linking2 } from "react-native";
import { handleURLCallback } from "@stripe/stripe-react-native";

// src/managers/X402Manager.ts
import { Base64 } from "js-base64";

// src/utils/uuid.ts
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error("Secure UUID generation requires crypto.randomUUID or crypto.getRandomValues");
}

// src/utils/logger.ts
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 3] = "ERROR";
  LogLevel2[LogLevel2["SILENT"] = 4] = "SILENT";
  return LogLevel2;
})(LogLevel || {});
var Logger = class {
  constructor(config) {
    this.config = config;
  }
  /**
   * Update the log level dynamically
   */
  setLevel(level) {
    this.config.level = level;
  }
  /**
   * Get the current log level
   */
  getLevel() {
    return this.config.level;
  }
  /**
   * Debug-level logging (most verbose)
   * Use for detailed debugging information
   */
  debug(...args) {
    if (this.config.level <= 0 /* DEBUG */) {
      this.log("DEBUG", console.log, args);
    }
  }
  /**
   * Info-level logging
   * Use for general informational messages
   */
  info(...args) {
    if (this.config.level <= 1 /* INFO */) {
      this.log("INFO", console.info, args);
    }
  }
  /**
   * Warning-level logging
   * Use for potentially problematic situations
   */
  warn(...args) {
    if (this.config.level <= 2 /* WARN */) {
      this.log("WARN", console.warn, args);
    }
  }
  /**
   * Error-level logging
   * Use for error conditions
   */
  error(...args) {
    if (this.config.level <= 3 /* ERROR */) {
      this.log("ERROR", console.error, args);
    }
  }
  /**
   * Internal log method with formatting
   */
  log(level, consoleFn, args) {
    const prefix = this.config.prefix ? `${this.config.prefix} ` : "";
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    consoleFn(`[${timestamp}] ${prefix}[${level}]`, ...args);
  }
};
var getDefaultLogLevel = () => {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    return 0 /* DEBUG */;
  }
  return 2 /* WARN */;
};
var defaultLogger = null;
function getLogger() {
  if (!defaultLogger) {
    defaultLogger = new Logger({
      level: getDefaultLogLevel(),
      prefix: "[CedrosPay]"
    });
  }
  return defaultLogger;
}
function setLogger(logger) {
  defaultLogger = logger;
}
function createLogger(config) {
  return new Logger(config);
}

// src/utils/errorHandling.ts
function formatError(error, fallback) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}
var X402_ERROR_MAP = {
  service_unavailable: "Service temporarily unavailable. Please try again later or contact support.",
  server_insufficient_funds: "Service temporarily unavailable. Please try again later or contact support.",
  insufficient_funds_token: "Insufficient token balance in your wallet. Please add more tokens and try again.",
  insufficient_funds_sol: "Insufficient SOL for transaction fees. Please add some SOL to your wallet and try again.",
  insufficient_amount: "Payment amount is insufficient. Please check the required amount.",
  invalid_signature: "Transaction signature is invalid. Please try again.",
  send_failed: "Failed to send transaction. Please try again or contact support.",
  timeout: "Transaction timed out. Please check the blockchain explorer or try again."
};
async function parseErrorResponse(response, defaultMessage, parseVerificationError = false) {
  try {
    const errorData = await response.json();
    if (parseVerificationError && errorData.verificationError) {
      getLogger().debug(`Payment verification failed: ${errorData.verificationError.code}`);
      const code = errorData.verificationError.code;
      return X402_ERROR_MAP[code] || errorData.verificationError.message || defaultMessage;
    }
    if (typeof errorData.error === "string") {
      return errorData.error;
    } else if (errorData.error && typeof errorData.error === "object" && "message" in errorData.error) {
      return errorData.error.message;
    }
    return defaultMessage;
  } catch {
    return await response.text() || defaultMessage;
  }
}

// src/utils/fetchWithTimeout.ts
var DEFAULT_FETCH_TIMEOUT_MS = 15e3;
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const externalSignal = options.signal;
  if (externalSignal?.aborted) {
    controller.abort();
    throw new DOMException("The operation was aborted", "AbortError");
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let externalAbortHandler = null;
  if (externalSignal) {
    externalAbortHandler = () => controller.abort();
    externalSignal.addEventListener("abort", externalAbortHandler);
  }
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (externalSignal?.aborted) {
        throw error;
      }
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal && externalAbortHandler) {
      externalSignal.removeEventListener("abort", externalAbortHandler);
    }
  }
}

// src/utils/rateLimiter.ts
function createRateLimiter(config) {
  const { maxRequests, windowMs } = config;
  let tokens = maxRequests;
  let lastRefillTimestamp = Date.now();
  const refillRate = maxRequests / windowMs;
  function refillTokens() {
    const now = Date.now();
    const elapsedMs = now - lastRefillTimestamp;
    if (elapsedMs > 0) {
      const tokensToAdd = elapsedMs * refillRate;
      tokens = Math.min(maxRequests, tokens + tokensToAdd);
      lastRefillTimestamp = now;
    }
  }
  function tryConsume() {
    refillTokens();
    if (tokens >= 1) {
      tokens -= 1;
      return true;
    }
    return false;
  }
  function getAvailableTokens() {
    refillTokens();
    return Math.floor(tokens);
  }
  function getTimeUntilRefill() {
    refillTokens();
    if (tokens >= 1) {
      return 0;
    }
    const tokensNeeded = 1 - tokens;
    const msNeeded = tokensNeeded / refillRate;
    return Math.ceil(msNeeded);
  }
  function reset() {
    tokens = maxRequests;
    lastRefillTimestamp = Date.now();
  }
  return {
    tryConsume,
    getAvailableTokens,
    getTimeUntilRefill,
    reset
  };
}
var RATE_LIMITER_PRESETS = {
  /** 10 requests per minute - recommended for payment requests */
  PAYMENT: { maxRequests: 10, windowMs: 6e4 },
  /** 30 requests per minute - for quote fetching */
  QUOTE: { maxRequests: 30, windowMs: 6e4 },
  /** 5 requests per minute - strict limit for sensitive operations */
  STRICT: { maxRequests: 5, windowMs: 6e4 },
  /** 100 requests per minute - permissive for UI interactions */
  PERMISSIVE: { maxRequests: 100, windowMs: 6e4 }
};

// src/utils/circuitBreaker.ts
var CircuitState = /* @__PURE__ */ ((CircuitState2) => {
  CircuitState2["CLOSED"] = "CLOSED";
  CircuitState2["OPEN"] = "OPEN";
  CircuitState2["HALF_OPEN"] = "HALF_OPEN";
  return CircuitState2;
})(CircuitState || {});
var CircuitBreakerOpenError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
};
function createCircuitBreaker(config) {
  const { failureThreshold, timeout, name = "circuit-breaker" } = config;
  let state = "CLOSED" /* CLOSED */;
  let failureCount = 0;
  let successCount = 0;
  let rejectionCount = 0;
  let lastFailureTime = null;
  let lastSuccessTime = null;
  let nextAttemptTime = null;
  function checkStateTransition() {
    if (state === "OPEN" /* OPEN */ && nextAttemptTime !== null) {
      const now = Date.now();
      if (now >= nextAttemptTime) {
        getLogger().debug(`[CircuitBreaker:${name}] Transitioning OPEN \u2192 HALF_OPEN (timeout expired)`);
        state = "HALF_OPEN" /* HALF_OPEN */;
        nextAttemptTime = null;
      }
    }
  }
  function recordSuccess() {
    lastSuccessTime = Date.now();
    successCount++;
    if (state === "HALF_OPEN" /* HALF_OPEN */) {
      getLogger().debug(`[CircuitBreaker:${name}] Success in HALF_OPEN \u2192 CLOSED`);
      state = "CLOSED" /* CLOSED */;
      failureCount = 0;
    } else if (state === "CLOSED" /* CLOSED */) {
      failureCount = 0;
    }
  }
  function recordFailure(error) {
    lastFailureTime = Date.now();
    failureCount++;
    getLogger().warn(`[CircuitBreaker:${name}] Failure recorded (${failureCount}/${failureThreshold}):`, error.message);
    if (state === "HALF_OPEN" /* HALF_OPEN */) {
      getLogger().warn(`[CircuitBreaker:${name}] Failed in HALF_OPEN \u2192 OPEN`);
      state = "OPEN" /* OPEN */;
      nextAttemptTime = Date.now() + timeout;
    } else if (state === "CLOSED" /* CLOSED */ && failureCount >= failureThreshold) {
      getLogger().error(`[CircuitBreaker:${name}] Failure threshold reached (${failureCount}) \u2192 OPEN`);
      state = "OPEN" /* OPEN */;
      nextAttemptTime = Date.now() + timeout;
    }
  }
  async function execute(fn) {
    checkStateTransition();
    if (state === "OPEN" /* OPEN */) {
      rejectionCount++;
      const waitTime = nextAttemptTime ? Math.ceil((nextAttemptTime - Date.now()) / 1e3) : 0;
      throw new CircuitBreakerOpenError(
        `Circuit breaker is OPEN. Service is unavailable. Retry in ${waitTime}s.`
      );
    }
    try {
      const result = await fn();
      recordSuccess();
      return result;
    } catch (error) {
      recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  function getState() {
    checkStateTransition();
    return state;
  }
  function getStats() {
    checkStateTransition();
    return {
      state,
      failures: failureCount,
      successes: successCount,
      rejections: rejectionCount,
      lastFailureTime,
      lastSuccessTime
    };
  }
  function reset() {
    getLogger().debug(`[CircuitBreaker:${name}] Manual reset \u2192 CLOSED`);
    state = "CLOSED" /* CLOSED */;
    failureCount = 0;
    successCount = 0;
    rejectionCount = 0;
    lastFailureTime = null;
    lastSuccessTime = null;
    nextAttemptTime = null;
  }
  function trip() {
    getLogger().warn(`[CircuitBreaker:${name}] Manual trip \u2192 OPEN`);
    state = "OPEN" /* OPEN */;
    nextAttemptTime = Date.now() + timeout;
  }
  return {
    execute,
    getState,
    getStats,
    reset,
    trip
  };
}
var CIRCUIT_BREAKER_PRESETS = {
  /** Strict: Opens quickly (3 failures), long timeout (60s) */
  STRICT: { failureThreshold: 3, timeout: 6e4 },
  /** Standard: Balanced settings (5 failures, 30s timeout) */
  STANDARD: { failureThreshold: 5, timeout: 3e4 },
  /** Lenient: Tolerates more failures (10 failures, 15s timeout) */
  LENIENT: { failureThreshold: 10, timeout: 15e3 }
};

// src/managers/resilience.ts
function serviceUnavailableMessage(service) {
  return `${service} is temporarily unavailable. Please try again in a few moments.`;
}
function rateLimitExceededMessage(action) {
  return `Rate limit exceeded for ${action}. Please try again later.`;
}
async function withCircuitBreaker(breaker, service, fn) {
  try {
    return await breaker.execute(fn);
  } catch (error) {
    if (error instanceof CircuitBreakerOpenError) {
      throw new Error(serviceUnavailableMessage(service));
    }
    throw error;
  }
}

// src/utils/exponentialBackoff.ts
function defaultShouldRetry(error, attempt) {
  if (attempt >= 3) {
    return false;
  }
  const errorMessage = error.message.toLowerCase();
  if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("fetch failed") || errorMessage.includes("econnrefused")) {
    return true;
  }
  if (errorMessage.includes("503") || errorMessage.includes("502") || errorMessage.includes("500") || errorMessage.includes("429")) {
    return true;
  }
  if (errorMessage.includes("400") || errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("404")) {
    return false;
  }
  return false;
}
function calculateDelay(attempt, initialDelayMs, backoffFactor, maxDelayMs, jitter) {
  const exponentialDelay = initialDelayMs * Math.pow(backoffFactor, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  if (jitter) {
    const jitterAmount = Math.random() * cappedDelay;
    return Math.floor(jitterAmount);
  }
  return Math.floor(cappedDelay);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function retryWithBackoff(fn, config = {}) {
  const {
    maxRetries = 3,
    initialDelayMs = 1e3,
    backoffFactor = 2,
    maxDelayMs = 3e4,
    jitter = true,
    shouldRetry = defaultShouldRetry,
    name = "retry"
  } = config;
  let lastError = null;
  let totalDelay = 0;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0) {
        getLogger().debug(
          `[Retry:${name}] Succeeded on attempt ${attempt + 1}/${maxRetries + 1} after ${totalDelay}ms`
        );
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isLastAttempt = attempt === maxRetries;
      const shouldRetryError = shouldRetry(lastError, attempt);
      if (isLastAttempt || !shouldRetryError) {
        getLogger().warn(
          `[Retry:${name}] Failed on attempt ${attempt + 1}/${maxRetries + 1}. ${isLastAttempt ? "No more retries." : "Error not retryable."}`
        );
        throw lastError;
      }
      const delay2 = calculateDelay(attempt, initialDelayMs, backoffFactor, maxDelayMs, jitter);
      totalDelay += delay2;
      getLogger().warn(
        `[Retry:${name}] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${delay2}ms...`
      );
      await sleep(delay2);
    }
  }
  throw lastError || new Error("Retry failed with no error");
}
var RETRY_PRESETS = {
  /** Quick retries for transient errors (3 retries, 1s initial, 2x backoff) */
  QUICK: {
    maxRetries: 3,
    initialDelayMs: 1e3,
    backoffFactor: 2,
    maxDelayMs: 1e4
  },
  /** Standard retries (3 retries, 2s initial, 2x backoff) */
  STANDARD: {
    maxRetries: 3,
    initialDelayMs: 2e3,
    backoffFactor: 2,
    maxDelayMs: 3e4
  },
  /** Aggressive retries for critical operations (5 retries, 500ms initial) */
  AGGRESSIVE: {
    maxRetries: 5,
    initialDelayMs: 500,
    backoffFactor: 1.5,
    maxDelayMs: 15e3
  },
  /** Patient retries for slow backends (5 retries, 5s initial) */
  PATIENT: {
    maxRetries: 5,
    initialDelayMs: 5e3,
    backoffFactor: 2,
    maxDelayMs: 6e4
  }
};

// src/managers/X402Manager.ts
var X402Manager = class {
  constructor(routeDiscovery) {
    this.quoteRateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.QUOTE);
    this.verifyRateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.PAYMENT);
    this.circuitBreaker = createCircuitBreaker({
      failureThreshold: 5,
      timeout: 1e4,
      // 10 seconds for faster recovery in payment flows
      name: "x402-manager"
    });
    this.routeDiscovery = routeDiscovery;
  }
  /**
   * Request a protected resource and get x402 requirement
   * SECURITY: Resource ID and coupon codes sent in request body to prevent leakage
   * Prevents exposure of product IDs, SKUs, and business-sensitive identifiers in logs
   */
  async requestQuote(options) {
    const { resource, couponCode } = options;
    if (!this.quoteRateLimiter.tryConsume()) {
      throw new Error(rateLimitExceededMessage("quote requests"));
    }
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const urlPath = `/paywall/v1/quote`;
            getLogger().debug(
              "[X402Manager] Requesting quote",
              couponCode ? "with coupon" : "without coupon"
            );
            const url = await this.routeDiscovery.buildUrl(urlPath);
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                resource,
                couponCode: couponCode || null
              })
            });
            if (response.status !== 402) {
              throw new Error(`Expected 402 status, got ${response.status}`);
            }
            const data = await response.json();
            const requirement = data.accepts?.[0];
            if (!requirement) {
              throw new Error("Invalid x402 response: missing accepts field");
            }
            return requirement;
          },
          { ...RETRY_PRESETS.QUICK, name: "x402-quote" }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error("[X402Manager] Circuit breaker is OPEN - x402 service unavailable");
        throw new Error(serviceUnavailableMessage("Payment service"));
      }
      throw error;
    }
  }
  /**
   * Request a cart quote for multiple items
   */
  async requestCartQuote(options) {
    const { items, metadata, couponCode } = options;
    if (!this.quoteRateLimiter.tryConsume()) {
      throw new Error(rateLimitExceededMessage("cart quote requests"));
    }
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl("/paywall/v1/cart/quote");
            const cartRequest = {
              items,
              metadata,
              coupon: couponCode
            };
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Idempotency-Key": generateUUID()
              },
              body: JSON.stringify(cartRequest)
            });
            if (response.status !== 402 && !response.ok) {
              const errorMessage = await parseErrorResponse(response, "Failed to get cart quote");
              throw new Error(errorMessage);
            }
            return await response.json();
          },
          { ...RETRY_PRESETS.QUICK, name: "x402-cart-quote" }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error("[X402Manager] Circuit breaker is OPEN - cart quote service unavailable");
        throw new Error(serviceUnavailableMessage("Payment service"));
      }
      throw error;
    }
  }
  /**
   * Build X-PAYMENT header from payment payload (base64 encoded)
   */
  buildPaymentHeader(payload) {
    const jsonString = JSON.stringify(payload);
    return Base64.encode(jsonString);
  }
  /**
   * Parse X-PAYMENT-RESPONSE header (base64 encoded settlement response)
   */
  parseSettlementResponse(response) {
    const settlementHeader = response.headers.get("X-PAYMENT-RESPONSE");
    if (!settlementHeader) {
      return null;
    }
    try {
      const settlementJson = Base64.decode(settlementHeader);
      const settlement = JSON.parse(settlementJson);
      if (typeof settlement.success !== "boolean") {
        getLogger().error("Invalid settlement response: missing success field");
        return null;
      }
      return settlement;
    } catch (error) {
      getLogger().error("Failed to parse settlement response:", error);
      return null;
    }
  }
  /**
   * Retry request with payment proof
   * SECURITY: Coupon and metadata sent in X-PAYMENT header payload, NOT query strings
   */
  async submitPayment(options) {
    const {
      resource,
      payload,
      couponCode,
      metadata,
      resourceType = "regular"
    } = options;
    if (!this.verifyRateLimiter.tryConsume()) {
      return {
        success: false,
        error: rateLimitExceededMessage("payment verification")
      };
    }
    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const paymentPayloadWithResource = {
              ...payload,
              payload: {
                ...payload.payload,
                resource,
                resourceType,
                metadata: {
                  ...payload.payload.metadata || {},
                  ...metadata || {},
                  ...couponCode ? { couponCode } : {}
                }
              }
            };
            const paymentHeader = this.buildPaymentHeader(paymentPayloadWithResource);
            const urlPath = `/paywall/v1/verify`;
            getLogger().debug("[X402Manager] Submitting payment", {
              resourceType,
              hasCoupon: !!couponCode,
              hasMetadata: !!metadata
            });
            const url = await this.routeDiscovery.buildUrl(urlPath);
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-PAYMENT": paymentHeader,
                "Idempotency-Key": generateUUID()
              }
            });
            if (response.ok) {
              const { settlement, transactionId } = await this.handlePaymentVerification(
                response,
                payload.payload.signature
              );
              return {
                success: true,
                transactionId,
                settlement: settlement || void 0
              };
            }
            const errorMessage = await parseErrorResponse(response, "Payment verification failed", true);
            return {
              success: false,
              error: errorMessage
            };
          },
          { ...RETRY_PRESETS.STANDARD, name: "x402-verify" }
        );
      });
      return result;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          error: serviceUnavailableMessage("Payment verification service")
        };
      }
      return {
        success: false,
        error: formatError(error, "Unknown error")
      };
    }
  }
  /**
   * Build a complete gasless transaction on the backend
   * Returns an unsigned transaction with all instructions (compute budget, transfer, memo)
   */
  async buildGaslessTransaction(options) {
    const { resourceId, userWallet, feePayer, couponCode } = options;
    if (!this.quoteRateLimiter.tryConsume()) {
      throw new Error(rateLimitExceededMessage("gasless transaction requests"));
    }
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl(
              "/paywall/v1/gasless-transaction"
            );
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                resourceId,
                userWallet,
                feePayer,
                couponCode
              })
            });
            if (!response.ok) {
              const errorMessage = await parseErrorResponse(response, "Failed to build gasless transaction");
              throw new Error(errorMessage);
            }
            return await response.json();
          },
          { ...RETRY_PRESETS.QUICK, name: "x402-gasless-build" }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error("[X402Manager] Circuit breaker is OPEN - gasless transaction service unavailable");
        throw new Error(serviceUnavailableMessage("Gasless transaction service"));
      }
      throw error;
    }
  }
  /**
   * Submit gasless partial transaction for co-signing
   * Sends the partially-signed transaction in X-Payment header for backend co-signing
   * SECURITY: Coupon and metadata sent in X-PAYMENT header payload, NOT query strings
   */
  async submitGaslessTransaction(options) {
    const {
      resource,
      partialTx,
      couponCode,
      metadata,
      resourceType = "regular",
      requirement
    } = options;
    if (!this.verifyRateLimiter.tryConsume()) {
      return {
        success: false,
        error: rateLimitExceededMessage("gasless transaction verification")
      };
    }
    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const paymentPayload = {
              x402Version: 0,
              scheme: requirement?.scheme || "solana-spl-transfer",
              network: requirement?.network || "mainnet-beta",
              payload: {
                signature: "",
                // Backend fills this after co-signing.
                transaction: partialTx,
                feePayer: requirement?.extra?.feePayer || "",
                resource,
                resourceType,
                metadata: {
                  ...metadata || {},
                  ...couponCode ? { couponCode } : {}
                }
              }
            };
            const paymentHeader = this.buildPaymentHeader(paymentPayload);
            const urlPath = `/paywall/v1/verify`;
            const url = await this.routeDiscovery.buildUrl(urlPath);
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-PAYMENT": paymentHeader,
                "Idempotency-Key": generateUUID()
              }
            });
            if (response.ok) {
              const { settlement, transactionId } = await this.handlePaymentVerification(
                response,
                "gasless-tx"
              );
              return {
                success: true,
                transactionId,
                settlement: settlement || void 0
              };
            }
            const errorMessage = await parseErrorResponse(response, "Gasless transaction failed", true);
            return {
              success: false,
              error: errorMessage
            };
          },
          { ...RETRY_PRESETS.STANDARD, name: "x402-gasless-verify" }
        );
      });
      return result;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          error: serviceUnavailableMessage("Gasless transaction verification service")
        };
      }
      return {
        success: false,
        error: formatError(error, "Unknown error")
      };
    }
  }
  /**
   * Handle payment verification response (shared logic for both submitPayment and submitGaslessTransaction)
   * Parses settlement header and extracts transaction ID from response body
   * @param response - HTTP response from payment verification endpoint
   * @param defaultTxId - Fallback transaction ID if JSON parsing fails
   * @returns Settlement data and transaction ID
   */
  async handlePaymentVerification(response, defaultTxId) {
    const settlement = this.parseSettlementResponse(response);
    const contentType = response.headers.get("Content-Type") || "";
    let transactionId = defaultTxId;
    if (contentType.includes("application/json")) {
      try {
        const data = await response.json();
        transactionId = data.signature || defaultTxId;
      } catch (error) {
        getLogger().warn("Failed to parse JSON response body:", error);
      }
    }
    return { settlement, transactionId };
  }
  /**
   * Validate x402 requirement structure
   */
  validateRequirement(req) {
    return !!(req.scheme && req.network && req.maxAmountRequired && req.resource && req.payTo && req.asset && req.maxTimeoutSeconds > 0);
  }
  async requestRefund(input) {
    const { originalPurchaseId, recipientWallet, reason } = input;
    if (!originalPurchaseId || !recipientWallet) {
      throw new Error("originalPurchaseId and recipientWallet are required");
    }
    const url = await this.routeDiscovery.buildUrl("/paywall/v1/refunds/request");
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalPurchaseId, recipientWallet, reason })
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, "Failed to request refund"));
    }
    return await response.json();
  }
  async getRefundStatus(refundId) {
    if (!refundId) {
      throw new Error("refundId is required");
    }
    const url = await this.routeDiscovery.buildUrl(
      `/paywall/v1/refunds/${encodeURIComponent(refundId)}`
    );
    const response = await fetchWithTimeout(url, { method: "GET" });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, "Failed to fetch refund status"));
    }
    return await response.json();
  }
};

// src/managers/WalletManager.ts
import {
  Connection,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction
} from "@solana/spl-token";
import { Base64 as Base642 } from "js-base64";
import bs58 from "bs58";

// src/utils/tokenMintValidator.ts
var STABLECOIN_METADATA = {
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
    symbol: "USDC",
    decimals: 6
  },
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": {
    symbol: "USDT",
    decimals: 6
  },
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo": {
    symbol: "PYUSD",
    decimals: 6
  },
  "CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH": {
    symbol: "CASH",
    decimals: 6
  }
};
var KNOWN_STABLECOINS = Object.fromEntries(
  Object.entries(STABLECOIN_METADATA).map(([mint, meta]) => [mint, meta.symbol])
);
function isKnownStablecoin(tokenMint) {
  return tokenMint in KNOWN_STABLECOINS;
}
function validateTokenMint(tokenMint, context = "token mint", allowUnknown = false) {
  if (!tokenMint || tokenMint.trim().length === 0) {
    return {
      isValid: true,
      isKnownStablecoin: false
    };
  }
  const trimmedMint = tokenMint.trim();
  if (isKnownStablecoin(trimmedMint)) {
    const symbol = KNOWN_STABLECOINS[trimmedMint];
    return {
      isValid: true,
      isKnownStablecoin: true,
      symbol
    };
  }
  const knownMints = Object.entries(KNOWN_STABLECOINS).map(([mint, symbol]) => `  ${symbol}: ${mint}`).join("\n");
  if (!allowUnknown) {
    const error = [
      `SAFETY ERROR: Unrecognized token mint address in ${context}`,
      `  Provided: ${trimmedMint}`,
      "",
      "This token mint does not match any known stablecoin addresses.",
      "Using an unknown token mint can result in PERMANENT LOSS OF FUNDS if it's a typo.",
      "",
      "Known stablecoin mints (mainnet-beta):",
      knownMints,
      "",
      "If you are CERTAIN this is the correct mint address (custom token, testnet, or new stablecoin),",
      "set dangerouslyAllowUnknownMint={true} in your CedrosProvider config:",
      "",
      "  <CedrosProvider",
      "    config={{",
      "      ...",
      '      tokenMint: "' + trimmedMint + '",',
      "      dangerouslyAllowUnknownMint: true, // \u26A0\uFE0F I have verified this mint address",
      "    }}",
      "  />",
      "",
      "\u26A0\uFE0F WARNING: Only enable dangerouslyAllowUnknownMint if you have TRIPLE-CHECKED the mint address."
    ].join("\n");
    return {
      isValid: false,
      isKnownStablecoin: false,
      error
    };
  } else {
    const warning = [
      `Warning: Unrecognized token mint address in ${context}`,
      `  Provided: ${trimmedMint}`,
      "",
      "This token mint does not match any known stablecoin addresses.",
      "You have set dangerouslyAllowUnknownMint=true, so this will proceed.",
      "If this is a typo, payments will be sent to the wrong token and funds will be PERMANENTLY LOST.",
      "",
      "Known stablecoin mints (mainnet-beta):",
      knownMints,
      "",
      "Double-check your token mint address before deploying to production."
    ].join("\n");
    return {
      isValid: true,
      // Allow but warn
      isKnownStablecoin: false,
      warning
    };
  }
}
function validateX402Asset(asset, resource = "unknown", allowUnknown = false) {
  return validateTokenMint(asset, `X402Requirement (resource: ${resource})`, allowUnknown);
}

// src/managers/WalletManager.ts
var WalletManager = class {
  constructor(cluster = "mainnet-beta", endpoint, allowUnknownMint = false) {
    this.rpcRateLimiter = createRateLimiter({
      maxRequests: 50,
      windowMs: 6e4
      // 50 requests per minute for RPC calls
    });
    this.rpcCircuitBreaker = createCircuitBreaker({
      failureThreshold: 5,
      timeout: 1e4,
      // 10 seconds for faster recovery in payment flows
      name: "solana-rpc"
    });
    this.cluster = cluster;
    this.endpoint = endpoint;
    this.allowUnknownMint = allowUnknownMint;
    this.connection = this.createConnection();
  }
  /**
   * Create Solana RPC connection
   */
  createConnection() {
    const endpoint = this.endpoint ?? clusterApiUrl(this.cluster);
    return new Connection(endpoint, "confirmed");
  }
  /**
   * Transform RPC errors into user-friendly messages
   */
  transformRpcError(error) {
    const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
    if (errorMessage.includes("403") || errorMessage.includes("Access forbidden")) {
      return new Error(
        "Public Solana RPC access denied. Please configure a custom RPC endpoint (e.g., from Helius, QuickNode, or Alchemy) in your CedrosProvider config using the solanaEndpoint option."
      );
    }
    if (errorMessage.includes("429") || errorMessage.includes("Too Many Requests")) {
      return new Error(
        "Solana RPC rate limit exceeded. Please configure a custom RPC endpoint with higher limits in your CedrosProvider config using the solanaEndpoint option."
      );
    }
    return error instanceof Error ? error : new Error(errorMessage);
  }
  /**
   * Build transaction from x402 requirement
   */
  async buildTransaction(options) {
    const { requirement, payerPublicKey, blockhash } = options;
    if (!requirement || !requirement.payTo) {
      throw new Error("Invalid requirement: missing payTo");
    }
    getLogger().debug("[WalletManager] Building transaction for resource:", requirement.resource);
    const transaction = new Transaction();
    const amountInMinorUnits = this.resolveAmountInMinorUnits(requirement);
    const mintAddress = requirement.asset;
    if (!mintAddress) {
      throw new Error("asset is required in x402 requirement");
    }
    const assetValidation = validateX402Asset(mintAddress, requirement.resource, this.allowUnknownMint);
    if (!assetValidation.isValid && assetValidation.error) {
      throw new Error(assetValidation.error);
    }
    if (assetValidation.warning) {
      getLogger().warn(assetValidation.warning);
    }
    const mintPubkey = new PublicKey(mintAddress);
    const payerTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      payerPublicKey
    );
    if (!this.rpcRateLimiter.tryConsume()) {
      throw new Error("RPC rate limit exceeded. Please try again in a moment.");
    }
    let payerAccountInfo;
    try {
      payerAccountInfo = await this.rpcCircuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => await this.connection.getAccountInfo(payerTokenAccount),
          { ...RETRY_PRESETS.QUICK, name: "rpc-get-account-info" }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        throw new Error(serviceUnavailableMessage("Solana RPC service"));
      }
      throw this.transformRpcError(error);
    }
    if (!payerAccountInfo) {
      throw new Error("Payer is missing an associated token account for this mint");
    }
    let recipientTokenAccount;
    try {
      recipientTokenAccount = requirement.extra?.recipientTokenAccount ? new PublicKey(requirement.extra.recipientTokenAccount) : new PublicKey(requirement.payTo);
    } catch (error) {
      throw new Error("We are currently unable to process payment, please try again later");
    }
    transaction.add(
      createTransferInstruction(
        payerTokenAccount,
        recipientTokenAccount,
        payerPublicKey,
        amountInMinorUnits
      )
    );
    if (requirement.extra?.memo) {
      const { TransactionInstruction } = await import("@solana/web3.js");
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        data: Buffer.from(requirement.extra.memo, "utf8")
      });
      transaction.add(memoInstruction);
    }
    let recentBlockhash;
    if (blockhash) {
      recentBlockhash = blockhash;
    } else {
      if (!this.rpcRateLimiter.tryConsume()) {
        throw new Error("RPC rate limit exceeded. Please try again in a moment.");
      }
      try {
        const result = await this.rpcCircuitBreaker.execute(async () => {
          return await retryWithBackoff(
            async () => await this.connection.getLatestBlockhash(),
            { ...RETRY_PRESETS.QUICK, name: "rpc-get-blockhash" }
          );
        });
        recentBlockhash = result.blockhash;
      } catch (error) {
        if (error instanceof CircuitBreakerOpenError) {
          throw new Error(serviceUnavailableMessage("Solana RPC service"));
        }
        throw this.transformRpcError(error);
      }
    }
    transaction.recentBlockhash = recentBlockhash;
    if (requirement.extra?.feePayer) {
      transaction.feePayer = new PublicKey(requirement.extra.feePayer);
    } else {
      transaction.feePayer = payerPublicKey;
    }
    return transaction;
  }
  /**
   * Parse amount from x402 requirement (already in atomic units as string)
   */
  resolveAmountInMinorUnits(requirement) {
    const amount = parseInt(requirement.maxAmountRequired, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error("Invalid maxAmountRequired in requirement");
    }
    return amount;
  }
  /**
   * Build payment payload from signed transaction (x402 spec)
   */
  buildPaymentPayload(options) {
    const { requirement, signedTx, payerPublicKey } = options;
    return {
      x402Version: 0,
      scheme: requirement.scheme,
      network: requirement.network,
      payload: {
        signature: signedTx.signature,
        transaction: signedTx.serialized,
        payer: payerPublicKey.toString(),
        memo: requirement.extra?.memo,
        recipientTokenAccount: requirement.extra?.recipientTokenAccount
      }
    };
  }
  /**
   * Sign transaction using wallet adapter (fully signed for regular mode)
   */
  async signTransaction(options) {
    const { transaction, signTransaction } = options;
    getLogger().debug("[WalletManager] Requesting wallet to sign transaction");
    const signed = await signTransaction(transaction);
    const serialized = signed.serialize();
    const firstSignature = signed.signatures[0]?.signature;
    if (!firstSignature) {
      throw new Error("Signed transaction missing signature");
    }
    const signature = bs58.encode(new Uint8Array(firstSignature));
    getLogger().debug("[WalletManager] Transaction signed with signature:", signature.substring(0, 20) + "...");
    return {
      serialized: Base642.fromUint8Array(new Uint8Array(serialized)),
      signature
    };
  }
  /**
   * Deserialize a base64-encoded transaction from the backend
   * Used for gasless flow where backend builds the complete transaction
   */
  deserializeTransaction(base64Transaction) {
    try {
      const txBytes = Base642.toUint8Array(base64Transaction);
      return Transaction.from(txBytes);
    } catch (error) {
      throw new Error(
        `Failed to deserialize transaction: ${formatError(error, "Unknown error")}`
      );
    }
  }
  /**
   * Partially sign transaction for gasless mode
   * User signs their authority, server will co-sign as fee payer
   */
  async partiallySignTransaction(options) {
    const { transaction, signTransaction, blockhash } = options;
    if (blockhash && transaction.recentBlockhash !== blockhash) {
      transaction.recentBlockhash = blockhash;
    }
    const signed = await signTransaction(transaction);
    const firstSignature = signed.signatures[0]?.signature;
    if (firstSignature) {
      const sig = bs58.encode(new Uint8Array(firstSignature));
      getLogger().debug("[WalletManager] Partially signed with signature:", sig.substring(0, 20) + "...");
    }
    const serialized = signed.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });
    return Base642.fromUint8Array(new Uint8Array(serialized));
  }
  /**
   * Get wallet balance
   */
  async getBalance(publicKey) {
    if (!this.rpcRateLimiter.tryConsume()) {
      throw new Error("RPC rate limit exceeded. Please try again in a moment.");
    }
    try {
      const balance = await this.rpcCircuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => await this.connection.getBalance(publicKey),
          { ...RETRY_PRESETS.QUICK, name: "rpc-get-balance" }
        );
      });
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        throw new Error(serviceUnavailableMessage("Solana RPC service"));
      }
      throw this.transformRpcError(error);
    }
  }
  /**
   * Verify transaction on-chain
   */
  async verifyTransaction(signature) {
    if (!this.rpcRateLimiter.tryConsume()) {
      getLogger().warn("[WalletManager] RPC rate limit exceeded for transaction verification");
      return false;
    }
    try {
      const status = await this.rpcCircuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => await this.connection.getSignatureStatus(signature),
          { ...RETRY_PRESETS.QUICK, name: "rpc-verify-tx" }
        );
      });
      return !!status.value?.confirmationStatus;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().warn("[WalletManager] Circuit breaker OPEN - cannot verify transaction");
      }
      return false;
    }
  }
};

// src/managers/SubscriptionManager.ts
import {
  initStripe,
  initPaymentSheet,
  presentPaymentSheet
} from "@stripe/stripe-react-native";
import { Linking } from "react-native";
var SubscriptionManager = class {
  constructor(publicKey, routeDiscovery, options) {
    this.isStripeInitialized = false;
    // Separate rate limiters for different operation types
    this.sessionRateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.PAYMENT);
    this.statusRateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.QUOTE);
    this.circuitBreaker = createCircuitBreaker({
      failureThreshold: 5,
      timeout: 1e4,
      // 10 seconds for faster recovery
      name: "subscription-manager"
    });
    this.publicKey = publicKey;
    this.routeDiscovery = routeDiscovery;
    this.returnUrl = options?.returnUrl;
  }
  resolveSubscriptionSessionFlow(session) {
    const record = session;
    const flow = typeof record.flow === "string" ? record.flow : void 0;
    if (flow === "payment_sheet" || typeof record.paymentIntentClientSecret === "string" || typeof record.setupIntentClientSecret === "string") {
      return {
        flow: "payment_sheet",
        subscriptionId: typeof record.subscriptionId === "string" ? record.subscriptionId : void 0,
        paymentIntentClientSecret: typeof record.paymentIntentClientSecret === "string" ? record.paymentIntentClientSecret : void 0,
        setupIntentClientSecret: typeof record.setupIntentClientSecret === "string" ? record.setupIntentClientSecret : void 0,
        customerId: typeof record.customerId === "string" ? record.customerId : void 0,
        customerEphemeralKeySecret: typeof record.customerEphemeralKeySecret === "string" ? record.customerEphemeralKeySecret : void 0,
        sessionId: typeof record.sessionId === "string" ? record.sessionId : void 0,
        url: typeof record.url === "string" ? record.url : void 0,
        status: typeof record.status === "string" ? record.status : void 0
      };
    }
    if ((flow === void 0 || flow === "redirect_checkout") && typeof record.sessionId === "string" && typeof record.url === "string") {
      return {
        flow: "redirect_checkout",
        sessionId: record.sessionId,
        url: record.url
      };
    }
    return null;
  }
  /** Initialize Stripe React Native SDK */
  async initialize() {
    if (this.isStripeInitialized) return;
    await initStripe({
      publishableKey: this.publicKey
    });
    this.isStripeInitialized = true;
    getLogger().debug("[SubscriptionManager] Stripe React Native SDK initialized");
  }
  /** Internal helper: execute with rate limiting, circuit breaker, and retry */
  async executeWithResilience(rateLimiter, operation, retryName, errorContext) {
    if (!rateLimiter.tryConsume()) {
      throw new Error(`Rate limit exceeded. Please try again later.`);
    }
    try {
      return await this.circuitBreaker.execute(
        () => retryWithBackoff(operation, { ...RETRY_PRESETS.STANDARD, name: retryName })
      );
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error(`[SubscriptionManager] Circuit breaker OPEN for ${errorContext}`);
        throw new Error("Service temporarily unavailable. Please try again in a few moments.");
      }
      throw error;
    }
  }
  /**
   * Create a Stripe subscription checkout session
   */
  async createSubscriptionSession(request) {
    if (!this.sessionRateLimiter.tryConsume()) {
      throw new Error(rateLimitExceededMessage("subscription session creation"));
    }
    const idempotencyKey = generateUUID();
    const requestBody = JSON.stringify(request);
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/stripe-session");
            getLogger().debug("[SubscriptionManager] Creating subscription session:", {
              resource: request.resource,
              interval: request.interval,
              trialDays: request.trialDays
            });
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Idempotency-Key": idempotencyKey
              },
              body: requestBody
            });
            if (!response.ok) {
              const errorMessage = await parseErrorResponse(
                response,
                "Failed to create subscription session"
              );
              throw new Error(errorMessage);
            }
            return await response.json();
          },
          { ...RETRY_PRESETS.STANDARD, name: "subscription-create-session" }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error("[SubscriptionManager] Circuit breaker is OPEN - service unavailable");
        throw new Error(serviceUnavailableMessage("Subscription service"));
      }
      throw error;
    }
  }
  /**
   * Create a native Stripe PaymentSheet subscription session.
   */
  async createMobileSubscriptionSession(request) {
    if (!this.sessionRateLimiter.tryConsume()) {
      throw new Error(rateLimitExceededMessage("mobile subscription session creation"));
    }
    const idempotencyKey = generateUUID();
    const requestBody = JSON.stringify(request);
    try {
      const session = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/stripe-mobile-session");
            getLogger().debug("[SubscriptionManager] Creating mobile subscription session:", {
              resource: request.resource,
              interval: request.interval,
              trialDays: request.trialDays
            });
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Idempotency-Key": idempotencyKey
              },
              body: requestBody
            });
            if (!response.ok) {
              const errorMessage = await parseErrorResponse(
                response,
                "Failed to create mobile subscription session"
              );
              throw new Error(errorMessage);
            }
            return await response.json();
          },
          { ...RETRY_PRESETS.STANDARD, name: "subscription-create-mobile-session" }
        );
      });
      const resolvedSession = this.resolveSubscriptionSessionFlow(session);
      if (!resolvedSession || resolvedSession.flow !== "payment_sheet") {
        throw new Error("Mobile subscription session response was missing PaymentSheet fields.");
      }
      return resolvedSession;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error("[SubscriptionManager] Circuit breaker is OPEN - mobile subscription service unavailable");
        throw new Error(serviceUnavailableMessage("Mobile subscription service"));
      }
      throw error;
    }
  }
  /**
   * Redirect to Stripe checkout by session ID is not supported on React Native.
   * Use processSubscription(), which opens hosted checkout URLs directly when needed.
   */
  async redirectToCheckout(_sessionId) {
    getLogger().warn(
      "[SubscriptionManager] redirectToCheckout is not supported on React Native. Use processSubscription() instead."
    );
    return {
      success: false,
      error: "redirectToCheckout is not available on React Native. Use processSubscription() instead."
    };
  }
  /**
   * Initialize and present the native Payment Sheet for a subscription.
   */
  async presentPayment(options) {
    if (!this.isStripeInitialized) {
      await this.initialize();
    }
    try {
      const clientSecret = options.paymentIntentClientSecret ?? options.setupIntentClientSecret;
      if (!clientSecret) {
        if (options.subscriptionId) {
          return {
            success: true,
            transactionId: options.subscriptionId
          };
        }
        return {
          success: false,
          error: "Payment sheet client secret was missing from the subscription session."
        };
      }
      const sheetConfig = {
        paymentIntentClientSecret: options.paymentIntentClientSecret,
        setupIntentClientSecret: options.setupIntentClientSecret,
        customerId: options.customerId,
        allowsDelayedPaymentMethods: true
      };
      if (this.returnUrl) {
        sheetConfig.returnURL = this.returnUrl;
      }
      if (options.customerEphemeralKeySecret) {
        sheetConfig.customerEphemeralKeySecret = options.customerEphemeralKeySecret;
      }
      const { error: initError } = await initPaymentSheet(sheetConfig);
      if (initError) {
        getLogger().error("[SubscriptionManager] Payment sheet initialization failed:", initError);
        return { success: false, error: initError.message };
      }
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === "Canceled") {
          return { success: false, error: "Payment canceled by user" };
        }
        getLogger().error("[SubscriptionManager] Payment presentation failed:", presentError);
        return { success: false, error: presentError.message };
      }
      return {
        success: true,
        transactionId: options.subscriptionId ?? clientSecret.split("_secret_")[0]
      };
    } catch (error) {
      getLogger().error("[SubscriptionManager] Payment sheet error:", error);
      return { success: false, error: formatError(error, "Payment sheet failed") };
    }
  }
  async openCheckoutUrl(url, sessionId) {
    try {
      await Linking.openURL(url);
      return {
        success: true,
        transactionId: sessionId
      };
    } catch (error) {
      getLogger().error("[SubscriptionManager] Failed to open Stripe checkout URL:", error);
      return {
        success: false,
        error: formatError(error, "Failed to open Stripe checkout")
      };
    }
  }
  /**
   * Complete subscription flow for React Native.
   * Supports both hosted redirect checkout and native PaymentSheet session payloads.
   */
  async processSubscription(request) {
    try {
      const session = await this.createSubscriptionSession(request);
      const resolvedSession = this.resolveSubscriptionSessionFlow(session);
      if (!resolvedSession) {
        return {
          success: false,
          error: "Subscription session response was missing required checkout fields."
        };
      }
      if (resolvedSession.flow === "payment_sheet") {
        return await this.presentPayment({
          subscriptionId: resolvedSession.subscriptionId ?? resolvedSession.sessionId,
          paymentIntentClientSecret: resolvedSession.paymentIntentClientSecret,
          setupIntentClientSecret: resolvedSession.setupIntentClientSecret,
          customerId: resolvedSession.customerId,
          customerEphemeralKeySecret: resolvedSession.customerEphemeralKeySecret
        });
      }
      return await this.openCheckoutUrl(resolvedSession.url, resolvedSession.sessionId);
    } catch (error) {
      return {
        success: false,
        error: formatError(error, "Subscription failed")
      };
    }
  }
  /**
   * Complete the native PaymentSheet subscription flow.
   */
  async processMobileSubscription(request) {
    try {
      const session = await this.createMobileSubscriptionSession(request);
      return await this.presentPayment({
        subscriptionId: session.subscriptionId ?? session.sessionId,
        paymentIntentClientSecret: session.paymentIntentClientSecret,
        setupIntentClientSecret: session.setupIntentClientSecret,
        customerId: session.customerId,
        customerEphemeralKeySecret: session.customerEphemeralKeySecret
      });
    } catch (error) {
      return {
        success: false,
        error: formatError(error, "Mobile subscription failed")
      };
    }
  }
  /**
   * Check subscription status (for x402 gating)
   */
  async checkSubscriptionStatus(request) {
    if (!this.statusRateLimiter.tryConsume()) {
      throw new Error(rateLimitExceededMessage("subscription status check"));
    }
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const params = new URLSearchParams({
              resource: request.resource,
              userId: request.userId
            });
            const url = await this.routeDiscovery.buildUrl(
              `/paywall/v1/subscription/status?${params.toString()}`
            );
            getLogger().debug("[SubscriptionManager] Checking subscription status:", request);
            const response = await fetchWithTimeout(url, {
              method: "GET",
              headers: {
                "Content-Type": "application/json"
              }
            });
            if (!response.ok) {
              const errorMessage = await parseErrorResponse(
                response,
                "Failed to check subscription status"
              );
              throw new Error(errorMessage);
            }
            return await response.json();
          },
          { ...RETRY_PRESETS.STANDARD, name: "subscription-status-check" }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error("[SubscriptionManager] Circuit breaker is OPEN for status check");
        throw new Error(serviceUnavailableMessage("Subscription status service"));
      }
      throw error;
    }
  }
  /**
   * Request a subscription quote for x402 crypto payment
   */
  async requestSubscriptionQuote(resource, interval, options) {
    if (!this.statusRateLimiter.tryConsume()) {
      throw new Error(rateLimitExceededMessage("subscription quote"));
    }
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/quote");
            const requestBody = {
              resource,
              interval,
              couponCode: options?.couponCode,
              intervalDays: options?.intervalDays
            };
            getLogger().debug("[SubscriptionManager] Requesting subscription quote:", requestBody);
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(requestBody)
            });
            if (response.status !== 402 && !response.ok) {
              const errorMessage = await parseErrorResponse(
                response,
                "Failed to get subscription quote"
              );
              throw new Error(errorMessage);
            }
            return await response.json();
          },
          { ...RETRY_PRESETS.STANDARD, name: "subscription-quote" }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error("[SubscriptionManager] Circuit breaker is OPEN for quote");
        throw new Error(serviceUnavailableMessage("Subscription quote service"));
      }
      throw error;
    }
  }
  /** Cancel a subscription */
  async cancelSubscription(request) {
    return this.executeWithResilience(
      this.sessionRateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/cancel");
        getLogger().debug("[SubscriptionManager] Canceling subscription:", request);
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request)
        });
        if (!response.ok) throw new Error(await parseErrorResponse(response, "Failed to cancel"));
        return await response.json();
      },
      "subscription-cancel",
      "cancellation"
    );
  }
  /** Get Stripe billing portal URL for subscription management */
  async getBillingPortalUrl(request) {
    return this.executeWithResilience(
      this.statusRateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/portal");
        getLogger().debug("[SubscriptionManager] Getting billing portal URL:", request);
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request)
        });
        if (!response.ok) throw new Error(await parseErrorResponse(response, "Failed to get portal"));
        return await response.json();
      },
      "subscription-portal",
      "portal"
    );
  }
  /** Activate x402 subscription after payment verification */
  async activateX402Subscription(request) {
    return this.executeWithResilience(
      this.sessionRateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/x402/activate");
        getLogger().debug("[SubscriptionManager] Activating x402 subscription:", request);
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request)
        });
        if (!response.ok) throw new Error(await parseErrorResponse(response, "Failed to activate"));
        return await response.json();
      },
      "subscription-activate",
      "activation"
    );
  }
};

// src/managers/SubscriptionChangeManager.ts
var SubscriptionChangeManager = class {
  constructor(routeDiscovery) {
    this.rateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.PAYMENT);
    this.queryRateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.QUOTE);
    this.circuitBreaker = createCircuitBreaker({
      failureThreshold: 5,
      timeout: 1e4,
      name: "subscription-change-manager"
    });
    this.routeDiscovery = routeDiscovery;
  }
  /** Internal helper: execute with rate limiting, circuit breaker, and retry */
  async executeWithResilience(rateLimiter, operation, retryName, errorContext) {
    if (!rateLimiter.tryConsume()) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    try {
      return await this.circuitBreaker.execute(
        () => retryWithBackoff(operation, { ...RETRY_PRESETS.STANDARD, name: retryName })
      );
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error(`[SubscriptionChangeManager] Circuit breaker OPEN for ${errorContext}`);
        throw new Error("Service temporarily unavailable. Please try again in a few moments.");
      }
      throw error;
    }
  }
  /** Change subscription plan (upgrade or downgrade) */
  async changeSubscription(request) {
    return this.executeWithResilience(
      this.rateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/change");
        getLogger().debug("[SubscriptionChangeManager] Changing subscription:", request);
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": generateUUID() },
          body: JSON.stringify(request)
        });
        if (!response.ok) {
          throw new Error(await parseErrorResponse(response, "Failed to change subscription"));
        }
        return await response.json();
      },
      "subscription-change",
      "plan change"
    );
  }
  /** Preview subscription change (get proration details) */
  async previewChange(request) {
    return this.executeWithResilience(
      this.queryRateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/change/preview");
        getLogger().debug("[SubscriptionChangeManager] Previewing subscription change:", request);
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request)
        });
        if (!response.ok) {
          throw new Error(await parseErrorResponse(response, "Failed to preview change"));
        }
        return await response.json();
      },
      "subscription-preview",
      "change preview"
    );
  }
  /** Get full subscription details */
  async getDetails(resource, userId) {
    return this.executeWithResilience(
      this.queryRateLimiter,
      async () => {
        const params = new URLSearchParams({ resource, userId });
        const url = await this.routeDiscovery.buildUrl(`/paywall/v1/subscription/details?${params}`);
        getLogger().debug("[SubscriptionChangeManager] Getting subscription details:", { resource, userId });
        const response = await fetchWithTimeout(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        if (!response.ok) {
          throw new Error(await parseErrorResponse(response, "Failed to get subscription details"));
        }
        return await response.json();
      },
      "subscription-details",
      "details"
    );
  }
  /** Cancel a subscription */
  async cancel(request) {
    return this.executeWithResilience(
      this.rateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/cancel");
        getLogger().debug("[SubscriptionChangeManager] Canceling subscription:", request);
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request)
        });
        if (!response.ok) {
          throw new Error(await parseErrorResponse(response, "Failed to cancel subscription"));
        }
        return await response.json();
      },
      "subscription-cancel",
      "cancellation"
    );
  }
  /** Get Stripe billing portal URL */
  async getBillingPortalUrl(request) {
    return this.executeWithResilience(
      this.queryRateLimiter,
      async () => {
        const url = await this.routeDiscovery.buildUrl("/paywall/v1/subscription/portal");
        getLogger().debug("[SubscriptionChangeManager] Getting billing portal URL:", request);
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request)
        });
        if (!response.ok) {
          throw new Error(await parseErrorResponse(response, "Failed to get billing portal URL"));
        }
        return await response.json();
      },
      "subscription-portal",
      "portal"
    );
  }
};

// src/managers/CreditsManager.ts
var CreditsManager = class {
  constructor(routeDiscovery) {
    this.rateLimiter = createRateLimiter(RATE_LIMITER_PRESETS.PAYMENT);
    this.circuitBreaker = createCircuitBreaker({
      failureThreshold: 5,
      timeout: 1e4,
      name: "credits-manager"
    });
    this.routeDiscovery = routeDiscovery;
  }
  async requestQuote(resource, couponCode) {
    if (!this.rateLimiter.tryConsume()) {
      throw new Error(rateLimitExceededMessage("credits quote"));
    }
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl("/paywall/v1/quote");
            getLogger().debug("[CreditsManager] Requesting quote for resource:", resource);
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ resource, couponCode })
            });
            if (response.status === 402) {
              const data = await response.json();
              return data.credits || null;
            }
            if (!response.ok) {
              const errorMessage = await parseErrorResponse(response, "Failed to get credits quote");
              throw new Error(errorMessage);
            }
            return null;
          },
          { ...RETRY_PRESETS.STANDARD, name: "credits-quote" }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().error("[CreditsManager] Circuit breaker is OPEN - credits service unavailable");
        throw new Error(serviceUnavailableMessage("Credits service"));
      }
      throw error;
    }
  }
  async requestCartQuote(items, couponCode) {
    if (!this.rateLimiter.tryConsume()) {
      throw new Error(rateLimitExceededMessage("cart credits quote"));
    }
    return await withCircuitBreaker(this.circuitBreaker, "Credits service", async () => {
      return await retryWithBackoff(
        async () => {
          const url = await this.routeDiscovery.buildUrl("/paywall/v1/cart/quote");
          getLogger().debug("[CreditsManager] Requesting cart quote for items:", items.length);
          const response = await fetchWithTimeout(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items, couponCode })
          });
          if (!response.ok) {
            const errorMessage = await parseErrorResponse(response, "Failed to get cart credits quote");
            throw new Error(errorMessage);
          }
          const data = await response.json();
          if (!data.credits) {
            return null;
          }
          return {
            cartId: data.cartId,
            credits: data.credits
          };
        },
        { ...RETRY_PRESETS.STANDARD, name: "credits-cart-quote" }
      );
    });
  }
  /**
   * Create a hold on user's credits
   * Requires Authorization header with cedros-login JWT token
   */
  async createHold(options) {
    const { resource, couponCode, authToken } = options;
    if (!this.rateLimiter.tryConsume()) {
      throw new Error(rateLimitExceededMessage("credits hold"));
    }
    return await withCircuitBreaker(this.circuitBreaker, "Credits service", async () => {
      return await retryWithBackoff(
        async () => {
          const url = await this.routeDiscovery.buildUrl("/paywall/v1/credits/hold");
          getLogger().debug("[CreditsManager] Creating hold for resource:", resource);
          const response = await fetchWithTimeout(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
              "Idempotency-Key": generateUUID()
            },
            body: JSON.stringify({ resource, couponCode })
          });
          if (!response.ok) {
            const errorMessage = await parseErrorResponse(response, "Failed to create credits hold");
            throw new Error(errorMessage);
          }
          return await response.json();
        },
        { ...RETRY_PRESETS.STANDARD, name: "credits-create-hold" }
      );
    });
  }
  /**
   * Create a hold on user's credits for a cart
   * Requires Authorization header with cedros-login JWT token
   */
  async createCartHold(options) {
    const { cartId, authToken } = options;
    if (!this.rateLimiter.tryConsume()) {
      throw new Error(rateLimitExceededMessage("cart credits hold"));
    }
    return await withCircuitBreaker(this.circuitBreaker, "Credits service", async () => {
      return await retryWithBackoff(
        async () => {
          const url = await this.routeDiscovery.buildUrl(`/paywall/v1/cart/${cartId}/credits/hold`);
          getLogger().debug("[CreditsManager] Creating cart hold for cart:", cartId);
          const response = await fetchWithTimeout(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
              "Idempotency-Key": generateUUID()
            },
            body: JSON.stringify({})
          });
          if (!response.ok) {
            const errorMessage = await parseErrorResponse(response, "Failed to create cart credits hold");
            throw new Error(errorMessage);
          }
          return await response.json();
        },
        { ...RETRY_PRESETS.STANDARD, name: "credits-create-cart-hold" }
      );
    });
  }
  async authorizePayment(options) {
    const { resource, holdId, couponCode, authToken, metadata } = options;
    if (!this.rateLimiter.tryConsume()) {
      return {
        success: false,
        error: rateLimitExceededMessage("credits authorization"),
        errorCode: "rate_limit_exceeded"
      };
    }
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl("/paywall/v1/credits/authorize");
            getLogger().debug("[CreditsManager] Authorizing payment for resource:", resource);
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`,
                "Idempotency-Key": generateUUID()
              },
              body: JSON.stringify({
                resource,
                holdId,
                couponCode,
                ...metadata && { metadata }
              })
            });
            if (!response.ok) {
              const data2 = await response.json().catch((parseError) => {
                getLogger().error("[CreditsManager] Failed to parse error response JSON:", parseError, {
                  resource,
                  status: response.status,
                  statusText: response.statusText
                });
                return {};
              });
              return {
                success: false,
                error: data2.error?.message || "Credits authorization failed",
                errorCode: data2.error?.code || "authorization_failed"
              };
            }
            const data = await response.json();
            return {
              success: true,
              transactionId: data.transactionId
            };
          },
          { ...RETRY_PRESETS.STANDARD, name: "credits-authorize" }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          error: serviceUnavailableMessage("Credits service"),
          errorCode: "service_unavailable"
        };
      }
      return {
        success: false,
        error: formatError(error, "Credits authorization failed"),
        errorCode: "authorization_failed"
      };
    }
  }
  async authorizeCartPayment(options) {
    const { cartId, holdId, authToken, metadata } = options;
    if (!this.rateLimiter.tryConsume()) {
      return {
        success: false,
        error: rateLimitExceededMessage("cart credits authorization"),
        errorCode: "rate_limit_exceeded"
      };
    }
    try {
      return await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const url = await this.routeDiscovery.buildUrl(`/paywall/v1/cart/${cartId}/credits/authorize`);
            getLogger().debug("[CreditsManager] Authorizing cart payment for cart:", cartId);
            const response = await fetchWithTimeout(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`,
                "Idempotency-Key": generateUUID()
              },
              body: JSON.stringify({
                holdId,
                ...metadata && { metadata }
              })
            });
            if (!response.ok) {
              const data2 = await response.json().catch((parseError) => {
                getLogger().error("[CreditsManager] Failed to parse error response JSON:", parseError, {
                  cartId,
                  status: response.status,
                  statusText: response.statusText
                });
                return {};
              });
              return {
                success: false,
                error: data2.error?.message || "Cart credits authorization failed",
                errorCode: data2.error?.code || "authorization_failed"
              };
            }
            const data = await response.json();
            return {
              success: true,
              transactionId: data.transactionId
            };
          },
          { ...RETRY_PRESETS.STANDARD, name: "credits-cart-authorize" }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          error: serviceUnavailableMessage("Credits service"),
          errorCode: "service_unavailable"
        };
      }
      return {
        success: false,
        error: formatError(error, "Cart credits authorization failed"),
        errorCode: "authorization_failed"
      };
    }
  }
  async releaseHold(holdId, authToken) {
    if (!holdId) return;
    await withCircuitBreaker(this.circuitBreaker, "Credits service", async () => {
      const url = await this.routeDiscovery.buildUrl(`/paywall/v1/credits/hold/${holdId}/release`);
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Idempotency-Key": generateUUID()
        }
      });
      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response, "Failed to release credits hold");
        throw new Error(errorMessage);
      }
    });
  }
  /**
   * Process a complete credits payment (convenience method)
   * Combines createHold + authorizePayment in one call
   *
   * @param resource - Resource being purchased
   * @param authToken - JWT token from cedros-login
   * @param couponCode - Optional coupon code
   * @param metadata - Optional metadata
   */
  async processPayment(resource, authToken, couponCode, metadata) {
    let holdId = null;
    try {
      const hold = await this.createHold({ resource, couponCode, authToken });
      holdId = hold.holdId;
      const result = await this.authorizePayment({
        resource,
        holdId,
        couponCode,
        authToken,
        metadata
      });
      return {
        success: result.success,
        transactionId: result.transactionId,
        error: result.error
      };
    } catch (error) {
      if (holdId) {
        try {
          await this.releaseHold(holdId, authToken);
        } catch (releaseError) {
          getLogger().warn("[CreditsManager] Failed to release hold after payment failure:", releaseError);
        }
      }
      return {
        success: false,
        error: formatError(error, "Credits payment failed")
      };
    }
  }
};

// src/managers/StoreBillingManager.ts
import { Platform } from "react-native";
import {
  deepLinkToSubscriptions,
  endConnection,
  finishTransaction,
  flushFailedPurchasesCachedAsPendingAndroid,
  getAvailablePurchases,
  getProducts,
  getSubscriptions,
  initConnection,
  requestPurchase,
  requestSubscription,
  setup
} from "react-native-iap";

// src/policy/resolveStoreProductConfiguration.ts
function mergeStoreProduct(catalogStoreProduct, explicitStoreProduct) {
  if (!catalogStoreProduct && !explicitStoreProduct) {
    return void 0;
  }
  return {
    ...catalogStoreProduct,
    ...explicitStoreProduct,
    apple: {
      ...catalogStoreProduct?.apple,
      ...explicitStoreProduct?.apple
    },
    google: {
      ...catalogStoreProduct?.google,
      ...explicitStoreProduct?.google
    }
  };
}
function mergeCedrosProductDefinition({
  fallbackId,
  fallbackFulfillmentType,
  catalogProduct,
  explicitProduct
}) {
  const id = explicitProduct?.id ?? catalogProduct?.id ?? fallbackId;
  const fulfillmentType = explicitProduct?.fulfillmentType ?? fallbackFulfillmentType ?? catalogProduct?.fulfillmentType;
  if (!id || !fulfillmentType) {
    return void 0;
  }
  return {
    ...catalogProduct,
    ...explicitProduct,
    id,
    fulfillmentType,
    name: explicitProduct?.name ?? catalogProduct?.name,
    storeProduct: mergeStoreProduct(
      catalogProduct?.storeProduct,
      explicitProduct?.storeProduct
    )
  };
}
function resolveConfiguredStoreProductId(product, distributionChannel) {
  if (distributionChannel === "apple_app_store") {
    return product.storeProduct?.apple?.productId ?? product.id;
  }
  if (distributionChannel === "google_play_store") {
    return product.storeProduct?.google?.productId ?? product.id;
  }
  return product.id;
}
function resolveStoreProductConfiguration(product, distributionChannel) {
  if (distributionChannel !== "apple_app_store" && distributionChannel !== "google_play_store") {
    return null;
  }
  const kind = product.storeProduct?.kind ?? "non_consumable";
  return {
    productId: resolveConfiguredStoreProductId(product, distributionChannel),
    kind,
    usedDefaultKind: product.storeProduct?.kind === void 0,
    storeProduct: product.storeProduct ?? {}
  };
}
function selectGooglePlayOffer(subscription, config) {
  const offers = subscription.subscriptionOfferDetails ?? [];
  if (offers.length === 0) {
    return null;
  }
  if (config?.offerToken) {
    return offers.find((offer) => offer.offerToken === config.offerToken) ?? null;
  }
  const filteredByBasePlan = config?.basePlanId ? offers.filter((offer) => offer.basePlanId === config.basePlanId) : offers;
  const filteredByOfferId = config?.offerId ? filteredByBasePlan.filter((offer) => offer.offerId === config.offerId) : filteredByBasePlan;
  if (filteredByOfferId.length === 1) {
    return filteredByOfferId[0];
  }
  if (filteredByOfferId.length === 0) {
    return null;
  }
  return offers.length === 1 ? offers[0] : null;
}

// src/managers/StoreBillingManager.ts
function normalizePurchaseResult(purchase) {
  if (Array.isArray(purchase)) {
    if (purchase.length === 0) {
      throw new Error("Native store purchase completed without a transaction.");
    }
    return purchase[0];
  }
  if (!purchase) {
    throw new Error("Native store purchase completed without a transaction.");
  }
  return purchase;
}
function extractTransactionId(purchase) {
  return purchase.transactionId ?? purchase.purchaseToken ?? purchase.originalTransactionIdentifierIOS ?? purchase.productId;
}
function getCandidateRestoreProductIds(product) {
  return new Set(
    [
      product.id,
      product.storeProduct?.apple?.productId,
      product.storeProduct?.google?.productId
    ].filter((value) => typeof value === "string" && value.length > 0)
  );
}
function getPlatformMismatchError(method) {
  return method === "apple_iap" ? "Apple In-App Purchase can only run on iOS builds." : "Google Play Billing can only run on Android builds.";
}
function isRestoreOptions(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "product" in value || "products" in value || "distributionChannel" in value || "checkout" in value;
}
function normalizeRestoreOptions(value) {
  if (!value) {
    return {};
  }
  return isRestoreOptions(value) ? value : { product: value };
}
function normalizeRestoreProducts(options) {
  const combined = [
    ...options.products ?? [],
    ...options.product ? [options.product] : []
  ];
  const seen = /* @__PURE__ */ new Set();
  return combined.filter((product) => {
    if (!product?.id || seen.has(product.id)) {
      return false;
    }
    seen.add(product.id);
    return true;
  });
}
function inferCurrentStoreChannel() {
  if (Platform.OS === "ios") {
    return "apple_app_store";
  }
  if (Platform.OS === "android") {
    return "google_play_store";
  }
  return "unknown";
}
function resolveMethodForChannel(distributionChannel) {
  if (distributionChannel === "apple_app_store") {
    return "apple_iap";
  }
  if (distributionChannel === "google_play_store") {
    return "google_play_billing";
  }
  return null;
}
function isRestorableKind(kind) {
  return kind !== "consumable";
}
var StoreBillingManager = class {
  constructor(routeDiscovery, config) {
    this.initialized = false;
    this.productCache = /* @__PURE__ */ new Map();
    this.subscriptionCache = /* @__PURE__ */ new Map();
    this.routeDiscovery = routeDiscovery;
    this.config = config ?? {};
  }
  async initialize() {
    if (this.initialized) {
      return;
    }
    if (this.config.enabled === false) {
      throw new Error("Built-in store billing is disabled for this CedrosProvider.");
    }
    const storekitMode = this.config.storekitMode ?? "STOREKIT_HYBRID_MODE";
    setup({ storekitMode });
    const connected = await initConnection();
    if (!connected) {
      throw new Error("Failed to initialize native store billing.");
    }
    if (Platform.OS === "android") {
      try {
        await flushFailedPurchasesCachedAsPendingAndroid();
      } catch (error) {
        getLogger().warn(
          "[StoreBillingManager] Failed to flush pending Android purchases:",
          error
        );
      }
    }
    this.initialized = true;
  }
  isInitialized() {
    return this.initialized;
  }
  async purchase(request) {
    await this.initialize();
    this.assertPlatform(request.method);
    const resolvedProduct = resolveStoreProductConfiguration(
      request.product,
      request.distributionChannel
    );
    if (!resolvedProduct) {
      throw new Error(
        "Native store billing is only available for Apple App Store and Google Play Store channels."
      );
    }
    const kind = await this.resolveKind(request.product, resolvedProduct.productId);
    let purchase;
    if (request.method === "apple_iap") {
      purchase = await this.requestApplePurchase(
        resolvedProduct.productId,
        kind,
        request
      );
    } else {
      purchase = await this.requestGooglePlayPurchase(
        resolvedProduct.productId,
        kind,
        request
      );
    }
    const serverVerification = await this.verifyWithCedrosServer(
      request,
      resolvedProduct.productId,
      purchase
    );
    if (this.config.transactionHandling !== "manual") {
      await finishTransaction({
        purchase,
        isConsumable: kind === "consumable"
      });
    }
    const transactionId = serverVerification.transactionId || extractTransactionId(purchase);
    return {
      transactionId,
      rawResult: {
        purchase,
        kind,
        storeProductId: resolvedProduct.productId,
        serverVerification
      }
    };
  }
  async restorePurchases(value) {
    await this.initialize();
    const options = normalizeRestoreOptions(value);
    const restored = await getAvailablePurchases();
    const products = normalizeRestoreProducts(options);
    if (products.length === 0) {
      return restored.map((purchase) => ({
        transactionId: extractTransactionId(purchase),
        rawResult: purchase
      }));
    }
    const distributionChannel = options.distributionChannel ?? inferCurrentStoreChannel();
    const method = resolveMethodForChannel(distributionChannel);
    if (!method) {
      throw new Error(
        "Native store restore requires an Apple App Store or Google Play Store distribution channel."
      );
    }
    this.assertPlatform(method);
    const productsByStoreId = /* @__PURE__ */ new Map();
    products.forEach((product) => {
      getCandidateRestoreProductIds(product).forEach((candidateId) => {
        if (!productsByStoreId.has(candidateId)) {
          productsByStoreId.set(candidateId, product);
        }
      });
    });
    const matchedPurchases = restored.map((purchase) => ({
      purchase,
      product: productsByStoreId.get(purchase.productId)
    })).filter(
      (entry) => Boolean(entry.product)
    );
    const verifiedResults = [];
    for (const entry of matchedPurchases) {
      const kind = await this.resolveKind(entry.product, entry.purchase.productId);
      if (!isRestorableKind(kind)) {
        continue;
      }
      const request = {
        method,
        product: entry.product,
        distributionChannel,
        fulfillmentType: entry.product.fulfillmentType,
        checkout: options.checkout
      };
      const serverVerification = await this.verifyWithCedrosServer(
        request,
        entry.purchase.productId,
        entry.purchase
      );
      verifiedResults.push({
        transactionId: serverVerification.transactionId || extractTransactionId(entry.purchase),
        rawResult: {
          purchase: entry.purchase,
          kind,
          storeProductId: entry.purchase.productId,
          serverVerification,
          restored: true
        }
      });
    }
    return verifiedResults;
  }
  async openManageSubscriptions(options = {}) {
    await this.initialize();
    const distributionChannel = options.distributionChannel ?? inferCurrentStoreChannel();
    const method = resolveMethodForChannel(distributionChannel);
    if (!method) {
      throw new Error(
        "Native subscription management is only available for Apple App Store and Google Play Store channels."
      );
    }
    this.assertPlatform(method);
    if (method === "apple_iap") {
      if (options.product) {
        const resolvedProduct2 = resolveStoreProductConfiguration(
          options.product,
          distributionChannel
        );
        if (resolvedProduct2) {
          const kind2 = await this.resolveKind(
            options.product,
            resolvedProduct2.productId
          );
          if (kind2 !== "auto_renewable_subscription") {
            throw new Error(
              "Subscription management is only available for store-managed subscription products."
            );
          }
        }
      }
      await deepLinkToSubscriptions({});
      return;
    }
    if (!options.product) {
      throw new Error(
        "Google Play subscription management requires a subscription product so Cedros can open the correct Play Store page."
      );
    }
    const resolvedProduct = resolveStoreProductConfiguration(
      options.product,
      distributionChannel
    );
    if (!resolvedProduct) {
      throw new Error(
        "Google Play subscription management requires a store-managed Google Play product."
      );
    }
    const kind = await this.resolveKind(options.product, resolvedProduct.productId);
    if (kind !== "auto_renewable_subscription") {
      throw new Error(
        "Subscription management is only available for store-managed subscription products."
      );
    }
    await deepLinkToSubscriptions({ sku: resolvedProduct.productId });
  }
  async destroy() {
    if (!this.initialized) {
      return;
    }
    await endConnection();
    this.initialized = false;
    this.productCache.clear();
    this.subscriptionCache.clear();
  }
  assertPlatform(method) {
    if (method === "apple_iap" && Platform.OS !== "ios") {
      throw new Error(getPlatformMismatchError(method));
    }
    if (method === "google_play_billing" && Platform.OS !== "android") {
      throw new Error(getPlatformMismatchError(method));
    }
  }
  async resolveKind(product, productId) {
    if (product.storeProduct?.kind) {
      return product.storeProduct.kind;
    }
    const subscription = await this.lookupSubscription(productId).catch(() => null);
    if (subscription) {
      return "auto_renewable_subscription";
    }
    const inAppProduct = await this.lookupProduct(productId).catch(() => null);
    if (inAppProduct) {
      return "non_consumable";
    }
    throw new Error(
      `No App Store / Play Store product was found for "${productId}". Add a store product id or publish the matching store product first.`
    );
  }
  async lookupProduct(productId) {
    const cached = this.productCache.get(productId);
    if (cached) {
      return cached;
    }
    const products = await getProducts({ skus: [productId] });
    const product = products.find((entry) => entry.productId === productId) ?? null;
    if (product) {
      this.productCache.set(productId, product);
    }
    return product;
  }
  async lookupSubscription(productId) {
    const cached = this.subscriptionCache.get(productId);
    if (cached) {
      return cached;
    }
    const subscriptions = await getSubscriptions({ skus: [productId] });
    const subscription = subscriptions.find((entry) => entry.productId === productId) ?? null;
    if (subscription) {
      this.subscriptionCache.set(productId, subscription);
    }
    return subscription;
  }
  async requestApplePurchase(productId, kind, request) {
    const appleConfig = request.product.storeProduct?.apple;
    if (kind === "auto_renewable_subscription") {
      return normalizePurchaseResult(
        await requestSubscription({
          sku: productId,
          appAccountToken: appleConfig?.appAccountToken,
          andDangerouslyFinishTransactionAutomaticallyIOS: false
        })
      );
    }
    return normalizePurchaseResult(
      await requestPurchase({
        sku: productId,
        quantity: appleConfig?.quantity,
        appAccountToken: appleConfig?.appAccountToken,
        andDangerouslyFinishTransactionAutomaticallyIOS: false
      })
    );
  }
  async requestGooglePlayPurchase(productId, kind, request) {
    const googleConfig = request.product.storeProduct?.google;
    if (kind === "auto_renewable_subscription") {
      const subscription = await this.lookupSubscription(productId);
      if (!subscription) {
        throw new Error(
          `Google Play subscription "${productId}" was not found in the current build.`
        );
      }
      const offer = selectGooglePlayOffer(subscription, googleConfig);
      if (!offer) {
        throw new Error(
          `Google Play subscription "${productId}" has multiple offers or no matching offer token. Add basePlanId / offerId / offerToken to the Cedros product configuration.`
        );
      }
      return normalizePurchaseResult(
        await requestSubscription({
          subscriptionOffers: [{ sku: productId, offerToken: offer.offerToken }],
          purchaseTokenAndroid: googleConfig?.purchaseTokenAndroid,
          replacementModeAndroid: googleConfig?.replacementModeAndroid,
          obfuscatedAccountIdAndroid: googleConfig?.obfuscatedAccountIdAndroid,
          obfuscatedProfileIdAndroid: googleConfig?.obfuscatedProfileIdAndroid,
          isOfferPersonalized: googleConfig?.isOfferPersonalized
        })
      );
    }
    return normalizePurchaseResult(
      await requestPurchase({
        skus: [productId],
        obfuscatedAccountIdAndroid: googleConfig?.obfuscatedAccountIdAndroid,
        obfuscatedProfileIdAndroid: googleConfig?.obfuscatedProfileIdAndroid,
        isOfferPersonalized: googleConfig?.isOfferPersonalized
      })
    );
  }
  async verifyWithCedrosServer(request, storeProductId, purchase) {
    const url = await this.routeDiscovery.buildUrl("/paywall/v1/native-store/verify");
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": generateUUID(),
        ...request.checkout?.authToken ? { Authorization: `Bearer ${request.checkout.authToken}` } : {}
      },
      body: JSON.stringify({
        productId: request.product.id,
        method: request.method,
        storeProductId,
        transactionId: purchase.transactionId,
        originalTransactionId: purchase.originalTransactionIdentifierIOS,
        purchaseToken: purchase.purchaseToken,
        packageName: purchase.packageNameAndroid ?? request.product.storeProduct?.google?.packageName,
        metadata: request.checkout?.metadata ?? {}
      })
    });
    if (!response.ok) {
      const errorMessage = await parseErrorResponse(
        response,
        "Native store purchase verification failed"
      );
      throw new Error(errorMessage);
    }
    return await response.json();
  }
};

// src/shared/route-discovery-core.ts
var RouteDiscoveryManagerCore = class {
  constructor(serverUrl, deps) {
    this.routePrefix = null;
    this.discoveryPromise = null;
    this.failedDiscoveryAt = null;
    this.maxRetries = 2;
    this.baseDelayMs = 1e3;
    this.discoveryTimeoutMs = 2e3;
    this.failedDiscoveryTtlMs = 3e4;
    this.serverUrl = serverUrl.replace(/\/+$/, "");
    this.getLogger = deps.getLogger;
    this.fetchWithTimeout = deps.fetchWithTimeout;
  }
  async discoverPrefix() {
    if (this.routePrefix !== null) {
      return this.routePrefix;
    }
    if (this.discoveryPromise) {
      return this.discoveryPromise;
    }
    if (this.failedDiscoveryAt !== null && Date.now() - this.failedDiscoveryAt < this.failedDiscoveryTtlMs) {
      return "";
    }
    const discoveryTask = (async () => {
      let attempt = 0;
      while (attempt < this.maxRetries) {
        try {
          const response = await this.fetchWithTimeout(
            `${this.serverUrl}/cedros-health`,
            {},
            this.discoveryTimeoutMs
          );
          if (!response.ok) {
            if (response.status >= 400 && response.status < 500) {
              this.getLogger().warn(
                `Route discovery received ${response.status} - not retrying client error`
              );
              this.failedDiscoveryAt = Date.now();
              return "";
            }
            throw new Error(`Health check returned ${response.status}`);
          }
          const health = await response.json();
          const prefix = String(health.routePrefix ?? "");
          this.routePrefix = prefix;
          this.failedDiscoveryAt = null;
          this.getLogger().debug("Route discovery successful, prefix:", prefix || "(empty)");
          return prefix;
        } catch (error) {
          attempt++;
          if (attempt >= this.maxRetries) {
            this.getLogger().warn(
              `Route discovery failed after ${attempt} attempts, using empty prefix for this request:`,
              error
            );
            this.failedDiscoveryAt = Date.now();
            return "";
          }
          const delayMs = this.baseDelayMs * Math.pow(2, attempt - 1);
          this.getLogger().warn(
            `Route discovery failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delayMs}ms:`,
            error
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
      return "";
    })();
    this.discoveryPromise = discoveryTask;
    try {
      return await this.discoveryPromise;
    } finally {
      if (this.discoveryPromise === discoveryTask) {
        this.discoveryPromise = null;
      }
    }
  }
  async buildUrl(path) {
    const prefix = await this.discoverPrefix();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.serverUrl}${prefix}${cleanPath}`;
  }
  reset() {
    this.routePrefix = null;
    this.discoveryPromise = null;
    this.failedDiscoveryAt = null;
  }
};

// src/managers/RouteDiscoveryManager.ts
var RouteDiscoveryManager = class extends RouteDiscoveryManagerCore {
  constructor(serverUrl) {
    super(serverUrl, { getLogger, fetchWithTimeout });
  }
};

// src/managers/ManagerCache.ts
var managerCache = /* @__PURE__ */ new Map();
function getCacheKey(stripePublicKey, serverUrl, solanaCluster, stripeReturnUrl, solanaEndpoint, dangerouslyAllowUnknownMint, storeBillingConfig) {
  return JSON.stringify({
    stripePublicKey,
    serverUrl,
    solanaCluster,
    stripeReturnUrl: stripeReturnUrl || "",
    solanaEndpoint: solanaEndpoint || "",
    dangerouslyAllowUnknownMint: dangerouslyAllowUnknownMint || false,
    storeBillingEnabled: storeBillingConfig?.enabled ?? true,
    storekitMode: storeBillingConfig?.storekitMode ?? "STOREKIT_HYBRID_MODE",
    transactionHandling: storeBillingConfig?.transactionHandling ?? "auto_finish"
  });
}
function getOrCreateManagers(stripePublicKey, serverUrl, solanaCluster, stripeReturnUrl, solanaEndpoint, dangerouslyAllowUnknownMint, storeBillingConfig) {
  const cacheKey = getCacheKey(
    stripePublicKey,
    serverUrl,
    solanaCluster,
    stripeReturnUrl,
    solanaEndpoint,
    dangerouslyAllowUnknownMint,
    storeBillingConfig
  );
  let cached = managerCache.get(cacheKey);
  if (cached) {
    cached.refCount++;
    getLogger().debug(
      `[ManagerCache] Reusing cached managers (refCount: ${cached.refCount}):`,
      { stripePublicKey: stripePublicKey.slice(0, 10) + "...", serverUrl }
    );
    return cached;
  }
  getLogger().debug(
    "[ManagerCache] Creating new manager instances:",
    { stripePublicKey: stripePublicKey.slice(0, 10) + "...", serverUrl }
  );
  const routeDiscovery = new RouteDiscoveryManager(serverUrl);
  const checkoutClient = new CedrosPayCheckout({ serverUrl });
  const x402Manager = new X402Manager(routeDiscovery);
  const walletManager = new WalletManager(
    solanaCluster,
    solanaEndpoint,
    dangerouslyAllowUnknownMint ?? false
  );
  const subscriptionManager = new SubscriptionManager(stripePublicKey, routeDiscovery, {
    returnUrl: stripeReturnUrl
  });
  const subscriptionChangeManager = new SubscriptionChangeManager(routeDiscovery);
  const creditsManager = new CreditsManager(routeDiscovery);
  const storeBillingManager = new StoreBillingManager(
    routeDiscovery,
    storeBillingConfig
  );
  cached = {
    checkoutClient,
    x402Manager,
    walletManager,
    subscriptionManager,
    subscriptionChangeManager,
    creditsManager,
    storeBillingManager,
    routeDiscovery,
    refCount: 1
  };
  managerCache.set(cacheKey, cached);
  return cached;
}
function releaseManagers(stripePublicKey, serverUrl, solanaCluster, stripeReturnUrl, solanaEndpoint, dangerouslyAllowUnknownMint, storeBillingConfig) {
  const cacheKey = getCacheKey(
    stripePublicKey,
    serverUrl,
    solanaCluster,
    stripeReturnUrl,
    solanaEndpoint,
    dangerouslyAllowUnknownMint,
    storeBillingConfig
  );
  const cached = managerCache.get(cacheKey);
  if (!cached) {
    getLogger().warn("[ManagerCache] Attempted to release non-existent managers:", { cacheKey });
    return;
  }
  cached.refCount--;
  getLogger().debug(
    `[ManagerCache] Released manager reference (refCount: ${cached.refCount}):`,
    { stripePublicKey: stripePublicKey.slice(0, 10) + "...", serverUrl }
  );
  if (cached.refCount <= 0) {
    void cached.storeBillingManager.destroy().catch((error) => {
      getLogger().warn("[ManagerCache] Failed to destroy store billing manager:", error);
    });
    managerCache.delete(cacheKey);
    getLogger().debug("[ManagerCache] Removed managers from cache (refCount reached 0)");
  }
}

// src/i18n/locales.ts
var LEGACY_TO_CANONICAL_LOCALE = {
  in: "hi",
  jp: "ja",
  kr: "ko",
  vn: "vi",
  iw: "he"
};
var CANONICAL_TO_LEGACY_FILE = {
  hi: "in",
  ja: "jp",
  ko: "kr",
  vi: "vn"
};
var RTL_LOCALES = /* @__PURE__ */ new Set(["ar", "he", "ur"]);
function normalizeLocaleToken(locale) {
  return locale.trim().replace(/_/g, "-").toLowerCase();
}
function localeBase(locale) {
  return normalizeLocaleToken(locale).split("-")[0] || "en";
}
function normalizeLocale(locale) {
  if (!locale) {
    return "en";
  }
  const normalized = normalizeLocaleToken(locale);
  const base = localeBase(normalized);
  return LEGACY_TO_CANONICAL_LOCALE[normalized] ?? LEGACY_TO_CANONICAL_LOCALE[base] ?? base;
}
function getLocaleFileCandidates(locale) {
  const canonical = normalizeLocale(locale);
  const candidates = [
    canonical,
    CANONICAL_TO_LEGACY_FILE[canonical],
    locale ? normalizeLocaleToken(locale) : void 0,
    locale ? localeBase(locale) : void 0,
    "en"
  ];
  return candidates.filter((candidate, index) => {
    return Boolean(candidate) && candidates.indexOf(candidate) === index;
  });
}
function getLocaleDirection(locale) {
  return RTL_LOCALES.has(normalizeLocale(locale)) ? "rtl" : "ltr";
}
function getDeviceLocaleFallback() {
  const intlLocale = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().locale : void 0;
  return normalizeLocale(intlLocale);
}

// src/utils/validateConfig.ts
var REQUIRED_STRING_FIELDS = [
  "stripePublicKey"
];
var ALLOWED_SOLANA_CLUSTERS = /* @__PURE__ */ new Set(["mainnet-beta", "devnet", "testnet"]);
var ALLOWED_DISTRIBUTION_CHANNELS = /* @__PURE__ */ new Set([
  "apple_app_store",
  "google_play_store",
  "solana_dapp_store",
  "android_sideload",
  "web",
  "unknown"
]);
var ALLOWED_STOREFRONT_REGIONS = /* @__PURE__ */ new Set([
  "us",
  "eea",
  "south_korea",
  "other",
  "unknown"
]);
var ALLOWED_FULFILLMENT_TYPES = /* @__PURE__ */ new Set([
  "digital_in_app",
  "physical_goods",
  "real_world_service",
  "reader_content",
  "other"
]);
var ALLOWED_STORE_PRODUCT_KINDS = /* @__PURE__ */ new Set([
  "consumable",
  "non_consumable",
  "auto_renewable_subscription"
]);
var ALLOWED_STOREKIT_MODES = /* @__PURE__ */ new Set([
  "STOREKIT1_MODE",
  "STOREKIT_HYBRID_MODE",
  "STOREKIT2_MODE"
]);
var ALLOWED_TRANSACTION_HANDLING = /* @__PURE__ */ new Set(["auto_finish", "manual"]);
function validateOptionalStringField(issues, field, value) {
  if (value !== void 0 && typeof value !== "string") {
    issues.push({
      field,
      message: "must be a string when provided"
    });
  }
}
function validateProductCatalogEntry(issues, productId, entry) {
  if (typeof entry !== "object" || entry === null) {
    issues.push({
      field: `paymentPolicy.productCatalog.${productId}`,
      message: "must be a product definition object"
    });
    return;
  }
  const product = entry;
  if (product.fulfillmentType !== void 0 && !ALLOWED_FULFILLMENT_TYPES.has(String(product.fulfillmentType))) {
    issues.push({
      field: `paymentPolicy.productCatalog.${productId}.fulfillmentType`,
      message: `must be one of ${Array.from(ALLOWED_FULFILLMENT_TYPES).join(", ")}`
    });
  }
  validateOptionalStringField(
    issues,
    `paymentPolicy.productCatalog.${productId}.id`,
    product.id
  );
  validateOptionalStringField(
    issues,
    `paymentPolicy.productCatalog.${productId}.name`,
    product.name
  );
  if (product.storeProduct !== void 0) {
    if (typeof product.storeProduct !== "object" || product.storeProduct === null) {
      issues.push({
        field: `paymentPolicy.productCatalog.${productId}.storeProduct`,
        message: "must be an object when provided"
      });
      return;
    }
    const storeProduct = product.storeProduct;
    if (storeProduct.kind !== void 0 && !ALLOWED_STORE_PRODUCT_KINDS.has(String(storeProduct.kind))) {
      issues.push({
        field: `paymentPolicy.productCatalog.${productId}.storeProduct.kind`,
        message: `must be one of ${Array.from(ALLOWED_STORE_PRODUCT_KINDS).join(", ")}`
      });
    }
    if (storeProduct.apple !== void 0) {
      if (typeof storeProduct.apple !== "object" || storeProduct.apple === null) {
        issues.push({
          field: `paymentPolicy.productCatalog.${productId}.storeProduct.apple`,
          message: "must be an object when provided"
        });
      } else {
        const apple = storeProduct.apple;
        validateOptionalStringField(
          issues,
          `paymentPolicy.productCatalog.${productId}.storeProduct.apple.productId`,
          apple.productId
        );
        validateOptionalStringField(
          issues,
          `paymentPolicy.productCatalog.${productId}.storeProduct.apple.appAccountToken`,
          apple.appAccountToken
        );
        if (apple.quantity !== void 0 && typeof apple.quantity !== "number") {
          issues.push({
            field: `paymentPolicy.productCatalog.${productId}.storeProduct.apple.quantity`,
            message: "must be a number when provided"
          });
        }
      }
    }
    if (storeProduct.google !== void 0) {
      if (typeof storeProduct.google !== "object" || storeProduct.google === null) {
        issues.push({
          field: `paymentPolicy.productCatalog.${productId}.storeProduct.google`,
          message: "must be an object when provided"
        });
      } else {
        const google = storeProduct.google;
        [
          "productId",
          "packageName",
          "basePlanId",
          "offerId",
          "offerToken",
          "purchaseTokenAndroid",
          "obfuscatedAccountIdAndroid",
          "obfuscatedProfileIdAndroid"
        ].forEach((field) => {
          validateOptionalStringField(
            issues,
            `paymentPolicy.productCatalog.${productId}.storeProduct.google.${field}`,
            google[field]
          );
        });
        if (google.replacementModeAndroid !== void 0 && typeof google.replacementModeAndroid !== "number") {
          issues.push({
            field: `paymentPolicy.productCatalog.${productId}.storeProduct.google.replacementModeAndroid`,
            message: "must be a number when provided"
          });
        }
        if (google.isOfferPersonalized !== void 0 && typeof google.isOfferPersonalized !== "boolean") {
          issues.push({
            field: `paymentPolicy.productCatalog.${productId}.storeProduct.google.isOfferPersonalized`,
            message: "must be a boolean when provided"
          });
        }
      }
    }
  }
}
function getDefaultServerUrl() {
  throw new Error(
    'serverUrl is required. Please provide a serverUrl in your CedrosConfig. Example: { serverUrl: "https://api.example.com" }'
  );
}
function validateConfig(config) {
  const issues = [];
  REQUIRED_STRING_FIELDS.forEach((field) => {
    const value = config[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      issues.push({
        field,
        message: "must be a non-empty string"
      });
    }
  });
  let serverUrl;
  if (config.serverUrl !== void 0) {
    if (typeof config.serverUrl !== "string" || config.serverUrl.trim().length === 0) {
      issues.push({
        field: "serverUrl",
        message: "must be a non-empty string when provided"
      });
      serverUrl = "";
    } else {
      serverUrl = config.serverUrl;
    }
  } else {
    try {
      serverUrl = getDefaultServerUrl();
    } catch (error) {
      issues.push({
        field: "serverUrl",
        message: error instanceof Error ? error.message : "failed to determine default"
      });
      serverUrl = "";
    }
  }
  if (config.stripeReturnUrl !== void 0) {
    if (typeof config.stripeReturnUrl !== "string" || config.stripeReturnUrl.trim().length === 0) {
      issues.push({
        field: "stripeReturnUrl",
        message: "must be a non-empty string when provided"
      });
    }
  }
  if (!ALLOWED_SOLANA_CLUSTERS.has(config.solanaCluster)) {
    issues.push({
      field: "solanaCluster",
      message: `must be one of ${Array.from(ALLOWED_SOLANA_CLUSTERS).join(", ")}`
    });
  }
  if (config.solanaEndpoint !== void 0) {
    if (typeof config.solanaEndpoint !== "string") {
      issues.push({
        field: "solanaEndpoint",
        message: "must be a string when provided"
      });
    } else if (config.solanaEndpoint.trim().length === 0) {
      issues.push({
        field: "solanaEndpoint",
        message: 'must be a non-empty string when provided (e.g., "https://api.mainnet-beta.solana.com")'
      });
    } else if (!config.solanaEndpoint.startsWith("http://") && !config.solanaEndpoint.startsWith("https://")) {
      issues.push({
        field: "solanaEndpoint",
        message: 'must start with "http://" or "https://" (e.g., "https://api.mainnet-beta.solana.com")'
      });
    }
  }
  if (config.tokenMint && typeof config.tokenMint !== "string") {
    issues.push({
      field: "tokenMint",
      message: "must be a string when provided"
    });
  }
  if (config.locale !== void 0 && typeof config.locale !== "string") {
    issues.push({
      field: "locale",
      message: "must be a string when provided"
    });
  }
  if (config.paymentPolicy !== void 0) {
    if (typeof config.paymentPolicy !== "object" || config.paymentPolicy === null) {
      issues.push({
        field: "paymentPolicy",
        message: "must be an object when provided"
      });
    } else {
      const { paymentPolicy } = config;
      if (paymentPolicy.distributionChannel !== void 0 && !ALLOWED_DISTRIBUTION_CHANNELS.has(paymentPolicy.distributionChannel)) {
        issues.push({
          field: "paymentPolicy.distributionChannel",
          message: `must be one of ${Array.from(ALLOWED_DISTRIBUTION_CHANNELS).join(", ")}`
        });
      }
      if (paymentPolicy.distributionChannelResolver !== void 0 && typeof paymentPolicy.distributionChannelResolver !== "function") {
        issues.push({
          field: "paymentPolicy.distributionChannelResolver",
          message: "must be a function when provided"
        });
      }
      if (paymentPolicy.storefrontRegion !== void 0 && !ALLOWED_STOREFRONT_REGIONS.has(paymentPolicy.storefrontRegion)) {
        issues.push({
          field: "paymentPolicy.storefrontRegion",
          message: `must be one of ${Array.from(ALLOWED_STOREFRONT_REGIONS).join(", ")}`
        });
      }
      if (paymentPolicy.storefrontRegionResolver !== void 0 && typeof paymentPolicy.storefrontRegionResolver !== "function") {
        issues.push({
          field: "paymentPolicy.storefrontRegionResolver",
          message: "must be a function when provided"
        });
      }
      if (paymentPolicy.strictMode !== void 0 && typeof paymentPolicy.strictMode !== "boolean") {
        issues.push({
          field: "paymentPolicy.strictMode",
          message: "must be a boolean when provided"
        });
      }
      if (paymentPolicy.availableAdapters !== void 0) {
        if (typeof paymentPolicy.availableAdapters !== "object" || paymentPolicy.availableAdapters === null) {
          issues.push({
            field: "paymentPolicy.availableAdapters",
            message: "must be an object when provided"
          });
        } else {
          Object.entries(paymentPolicy.availableAdapters).forEach(([key, value]) => {
            if (typeof value !== "boolean") {
              issues.push({
                field: `paymentPolicy.availableAdapters.${key}`,
                message: "must be a boolean"
              });
            }
          });
        }
      }
      if (paymentPolicy.programs !== void 0) {
        if (typeof paymentPolicy.programs !== "object" || paymentPolicy.programs === null) {
          issues.push({
            field: "paymentPolicy.programs",
            message: "must be an object when provided"
          });
        } else {
          const programs = paymentPolicy.programs;
          if (programs.apple !== void 0) {
            if (typeof programs.apple !== "object" || programs.apple === null) {
              issues.push({
                field: "paymentPolicy.programs.apple",
                message: "must be an object when provided"
              });
            } else {
              const apple = programs.apple;
              ["usStorefrontExternalPurchaseLink", "readerExternalLinkAccount"].forEach(
                (field) => {
                  if (apple[field] !== void 0 && typeof apple[field] !== "boolean") {
                    issues.push({
                      field: `paymentPolicy.programs.apple.${field}`,
                      message: "must be a boolean when provided"
                    });
                  }
                }
              );
            }
          }
          if (programs.google !== void 0) {
            if (typeof programs.google !== "object" || programs.google === null) {
              issues.push({
                field: "paymentPolicy.programs.google",
                message: "must be an object when provided"
              });
            } else {
              const google = programs.google;
              [
                "userChoiceBilling",
                "alternativeBillingOnly",
                "externalOffers"
              ].forEach((field) => {
                if (google[field] !== void 0 && typeof google[field] !== "boolean") {
                  issues.push({
                    field: `paymentPolicy.programs.google.${field}`,
                    message: "must be a boolean when provided"
                  });
                }
              });
            }
          }
        }
      }
      if (paymentPolicy.productCatalog !== void 0) {
        if (typeof paymentPolicy.productCatalog !== "object" || paymentPolicy.productCatalog === null) {
          issues.push({
            field: "paymentPolicy.productCatalog",
            message: "must be an object when provided"
          });
        } else {
          Object.entries(paymentPolicy.productCatalog).forEach(([productId, entry]) => {
            validateProductCatalogEntry(issues, productId, entry);
          });
        }
      }
      if (paymentPolicy.productCatalogSync !== void 0) {
        if (typeof paymentPolicy.productCatalogSync !== "object" || paymentPolicy.productCatalogSync === null) {
          issues.push({
            field: "paymentPolicy.productCatalogSync",
            message: "must be an object when provided"
          });
        } else {
          const { productCatalogSync } = paymentPolicy;
          if (productCatalogSync.enabled !== void 0 && typeof productCatalogSync.enabled !== "boolean") {
            issues.push({
              field: "paymentPolicy.productCatalogSync.enabled",
              message: "must be a boolean when provided"
            });
          }
          if (productCatalogSync.limit !== void 0 && (!Number.isFinite(productCatalogSync.limit) || Number(productCatalogSync.limit) <= 0)) {
            issues.push({
              field: "paymentPolicy.productCatalogSync.limit",
              message: "must be a positive number when provided"
            });
          }
        }
      }
      if (paymentPolicy.storeBilling !== void 0) {
        if (typeof paymentPolicy.storeBilling !== "object" || paymentPolicy.storeBilling === null) {
          issues.push({
            field: "paymentPolicy.storeBilling",
            message: "must be an object when provided"
          });
        } else {
          const { storeBilling } = paymentPolicy;
          if (storeBilling.enabled !== void 0 && typeof storeBilling.enabled !== "boolean") {
            issues.push({
              field: "paymentPolicy.storeBilling.enabled",
              message: "must be a boolean when provided"
            });
          }
          if (storeBilling.storekitMode !== void 0 && !ALLOWED_STOREKIT_MODES.has(storeBilling.storekitMode)) {
            issues.push({
              field: "paymentPolicy.storeBilling.storekitMode",
              message: `must be one of ${Array.from(ALLOWED_STOREKIT_MODES).join(", ")}`
            });
          }
          if (storeBilling.transactionHandling !== void 0 && !ALLOWED_TRANSACTION_HANDLING.has(storeBilling.transactionHandling)) {
            issues.push({
              field: "paymentPolicy.storeBilling.transactionHandling",
              message: `must be one of ${Array.from(ALLOWED_TRANSACTION_HANDLING).join(", ")}`
            });
          }
        }
      }
      if (paymentPolicy.nativeHandlers !== void 0) {
        if (typeof paymentPolicy.nativeHandlers !== "object" || paymentPolicy.nativeHandlers === null) {
          issues.push({
            field: "paymentPolicy.nativeHandlers",
            message: "must be an object when provided"
          });
        } else {
          Object.entries(paymentPolicy.nativeHandlers).forEach(([key, handler]) => {
            if (handler === void 0) {
              return;
            }
            if (typeof handler !== "object" || handler === null) {
              issues.push({
                field: `paymentPolicy.nativeHandlers.${key}`,
                message: "must be an object with a purchase function"
              });
              return;
            }
            const maybeHandler = handler;
            if (typeof maybeHandler.purchase !== "function") {
              issues.push({
                field: `paymentPolicy.nativeHandlers.${key}.purchase`,
                message: "must be a function"
              });
            }
            if (maybeHandler.restorePurchases !== void 0 && typeof maybeHandler.restorePurchases !== "function") {
              issues.push({
                field: `paymentPolicy.nativeHandlers.${key}.restorePurchases`,
                message: "must be a function when provided"
              });
            }
            if (maybeHandler.openManageSubscriptions !== void 0 && typeof maybeHandler.openManageSubscriptions !== "function") {
              issues.push({
                field: `paymentPolicy.nativeHandlers.${key}.openManageSubscriptions`,
                message: "must be a function when provided"
              });
            }
          });
        }
      }
    }
  }
  if (issues.length > 0) {
    const details = issues.map((issue) => `- ${issue.field} ${issue.message}`).join("\n");
    throw new Error(`Invalid Cedros configuration:
${details}`);
  }
  if (config.tokenMint) {
    const allowUnknown = config.dangerouslyAllowUnknownMint === true;
    const mintValidation = validateTokenMint(config.tokenMint, "CedrosConfig.tokenMint", allowUnknown);
    if (!mintValidation.isValid && mintValidation.error) {
      throw new Error(mintValidation.error);
    }
    if (mintValidation.warning) {
      getLogger().warn(mintValidation.warning);
    }
  }
  const normalizedConfig = {
    ...config,
    serverUrl
  };
  if (config.locale) {
    normalizedConfig.locale = normalizeLocale(config.locale);
  }
  return normalizedConfig;
}

// src/utils/couponHelpers.ts
function parseCouponCodes(metadata) {
  if (!metadata || !metadata.coupon_codes) {
    return [];
  }
  return metadata.coupon_codes.split(",").map((code) => code.trim()).filter((code) => code.length > 0);
}
function formatCouponCodes(coupons, separator = ", ") {
  return coupons.join(separator);
}
function calculateDiscountPercentage(originalAmount, discountedAmount) {
  if (originalAmount <= 0) return 0;
  const discount = originalAmount - discountedAmount;
  return discount / originalAmount * 100;
}
function stackCheckoutCoupons(subtotal, checkoutCoupons) {
  if (!checkoutCoupons || checkoutCoupons.length === 0) {
    return subtotal;
  }
  let price = subtotal;
  let totalFixedDiscount = 0;
  for (const coupon of checkoutCoupons) {
    if (coupon.discountType === "percentage") {
      const discountMultiplier = 1 - coupon.discountValue / 100;
      price = price * discountMultiplier;
    } else if (coupon.discountType === "fixed") {
      totalFixedDiscount += coupon.discountValue;
    }
  }
  price = price - totalFixedDiscount;
  if (price < 0) {
    price = 0;
  }
  return Math.ceil(price * 100) / 100;
}

// src/utils/errorMessages.ts
var ERROR_MESSAGES = {
  // ===== PAYMENT VERIFICATION ERRORS (402) =====
  invalid_payment_proof: {
    message: "Payment verification failed",
    action: "Please try your payment again. If this continues, contact support.",
    technicalHint: "Invalid payment proof format"
  },
  invalid_signature: {
    message: "Transaction signature is invalid",
    action: "Please approve the transaction in your wallet and try again.",
    technicalHint: "Transaction signature verification failed"
  },
  invalid_transaction: {
    message: "Transaction format is invalid",
    action: "Please try your payment again. If this continues, try updating your wallet app.",
    technicalHint: "Malformed transaction structure"
  },
  transaction_not_found: {
    message: "Transaction not found on the blockchain",
    action: "Your transaction may still be processing. Please wait a moment and check your wallet, or try again.",
    technicalHint: "Transaction signature not found on-chain"
  },
  transaction_not_confirmed: {
    message: "Transaction is still processing",
    action: "Please wait a moment for the blockchain to confirm your transaction, then try again.",
    technicalHint: "Transaction not yet confirmed"
  },
  transaction_failed: {
    message: "Transaction failed on the blockchain",
    action: "Check your wallet for details. You may need to adjust your transaction settings or add more SOL for fees.",
    technicalHint: "On-chain transaction failure"
  },
  transaction_expired: {
    message: "Transaction took too long to process",
    action: "Please try your payment again. Consider increasing transaction priority if your wallet supports it.",
    technicalHint: "Transaction blockhash expired"
  },
  invalid_recipient: {
    message: "Payment was sent to the wrong address",
    action: "Please try again and ensure you approve the correct transaction in your wallet.",
    technicalHint: "Recipient address mismatch"
  },
  invalid_sender: {
    message: "Payment sender wallet is invalid",
    action: "Please reconnect your wallet and try again.",
    technicalHint: "Sender address validation failed"
  },
  unauthorized_refund_issuer: {
    message: "You are not authorized to issue refunds",
    action: "Only authorized accounts can process refunds. Please contact support if you believe this is an error.",
    technicalHint: "Refund issuer not in authorized list"
  },
  amount_below_minimum: {
    message: "Payment amount is too low",
    action: "Please check the required amount and try again.",
    technicalHint: "Amount below minimum threshold"
  },
  amount_mismatch: {
    message: "Payment amount does not match the quote",
    action: "The price may have changed. Please refresh and try your payment again.",
    technicalHint: "Amount does not match quote"
  },
  insufficient_funds_sol: {
    message: "Not enough SOL for transaction fees",
    action: "Add at least 0.001 SOL to your wallet to cover network fees, then try again.",
    technicalHint: "Insufficient SOL balance for fees"
  },
  insufficient_funds_token: {
    message: "Insufficient balance in your wallet",
    action: "Add more funds to your wallet and try again.",
    technicalHint: "Insufficient token balance"
  },
  invalid_token_mint: {
    message: "Incorrect payment token",
    action: "Please pay with the correct token as shown in the payment details.",
    technicalHint: "Token mint address mismatch"
  },
  not_spl_transfer: {
    message: "Transaction is not a valid token transfer",
    action: "Please ensure you are sending the correct token type from your wallet.",
    technicalHint: "Transaction is not an SPL token transfer"
  },
  missing_token_account: {
    message: "Token account not found",
    action: "Your wallet may need to create a token account first. Try again or use a different wallet.",
    technicalHint: "Associated token account does not exist"
  },
  invalid_token_program: {
    message: "Invalid token program",
    action: "Please try your payment again. If this continues, try using a different wallet.",
    technicalHint: "Token program ID mismatch"
  },
  missing_memo: {
    message: "Payment memo is required but was not included",
    action: "Please try your payment again and ensure transaction details are approved in your wallet.",
    technicalHint: "Required memo instruction missing"
  },
  invalid_memo: {
    message: "Payment memo format is invalid",
    action: "Please try your payment again.",
    technicalHint: "Memo does not match expected format"
  },
  payment_already_used: {
    message: "This payment has already been processed",
    action: "Check your transaction history. If you need to make another payment, please start a new transaction.",
    technicalHint: "Payment signature already recorded"
  },
  signature_reused: {
    message: "Transaction signature has already been used",
    action: "Please create a new payment transaction.",
    technicalHint: "Duplicate signature detected"
  },
  quote_expired: {
    message: "Payment quote has expired",
    action: "Prices are updated frequently. Please refresh and try your payment again.",
    technicalHint: "Quote timestamp expired"
  },
  // ===== VALIDATION ERRORS (400) =====
  missing_field: {
    message: "Required information is missing",
    action: "Please check all required fields and try again.",
    technicalHint: "Required field not provided"
  },
  invalid_field: {
    message: "Some information is invalid",
    action: "Please check your input and try again.",
    technicalHint: "Field validation failed"
  },
  invalid_amount: {
    message: "Payment amount is invalid",
    action: "Please check the amount and try again.",
    technicalHint: "Amount validation failed"
  },
  invalid_wallet: {
    message: "Wallet address is invalid",
    action: "Please reconnect your wallet and try again.",
    technicalHint: "Wallet address validation failed"
  },
  invalid_resource: {
    message: "Invalid item selection",
    action: "Please refresh the page and try again.",
    technicalHint: "Resource ID validation failed"
  },
  invalid_coupon: {
    message: "Invalid coupon code",
    action: "Please check the coupon code and try again.",
    technicalHint: "Coupon code format invalid"
  },
  invalid_cart_item: {
    message: "One or more cart items are invalid",
    action: "Please review your cart and try again.",
    technicalHint: "Cart item validation failed"
  },
  empty_cart: {
    message: "Your cart is empty",
    action: "Please add items to your cart before checking out.",
    technicalHint: "Cart contains no items"
  },
  // ===== RESOURCE/STATE ERRORS (404) =====
  resource_not_found: {
    message: "Item not found",
    action: "This item may no longer be available. Please refresh and try again.",
    technicalHint: "Resource not found in database"
  },
  cart_not_found: {
    message: "Shopping cart not found",
    action: "Your cart may have expired. Please start a new order.",
    technicalHint: "Cart ID not found"
  },
  refund_not_found: {
    message: "Refund not found",
    action: "Please check your refund reference number or contact support.",
    technicalHint: "Refund ID not found"
  },
  product_not_found: {
    message: "Product not available",
    action: "This product may no longer be available. Please browse our current selection.",
    technicalHint: "Product ID not found"
  },
  coupon_not_found: {
    message: "Coupon code not found",
    action: "Please check the coupon code or remove it to continue.",
    technicalHint: "Coupon code not in database"
  },
  session_not_found: {
    message: "Payment session expired",
    action: "Please start a new payment.",
    technicalHint: "Session ID not found or expired"
  },
  cart_already_paid: {
    message: "This order has already been paid",
    action: "Check your order history. If you need to make another purchase, please start a new order.",
    technicalHint: "Cart marked as paid"
  },
  refund_already_processed: {
    message: "This refund has already been processed",
    action: "Check your transaction history or contact support for details.",
    technicalHint: "Refund already completed"
  },
  // ===== COUPON-SPECIFIC ERRORS (409) =====
  coupon_expired: {
    message: "Coupon has expired",
    action: "Please remove the coupon code or use a different code.",
    technicalHint: "Coupon expiration date passed"
  },
  coupon_usage_limit_reached: {
    message: "Coupon usage limit reached",
    action: "This coupon has been fully redeemed. Please try a different code.",
    technicalHint: "Coupon max uses exceeded"
  },
  coupon_not_applicable: {
    message: "Coupon cannot be applied to this purchase",
    action: "Please check the coupon terms or remove it to continue.",
    technicalHint: "Coupon conditions not met"
  },
  coupon_wrong_payment_method: {
    message: "Coupon not valid for this payment method",
    action: "Try a different payment method or remove the coupon code.",
    technicalHint: "Coupon restricted to specific payment methods"
  },
  // ===== EXTERNAL SERVICE ERRORS (502) =====
  stripe_error: {
    message: "Card payment service temporarily unavailable",
    action: "Please try again in a moment, or use cryptocurrency payment instead.",
    technicalHint: "Stripe API error"
  },
  rpc_error: {
    message: "Blockchain network temporarily unavailable",
    action: "Please try again in a moment, or use card payment instead.",
    technicalHint: "Solana RPC error"
  },
  network_error: {
    message: "Network connection issue",
    action: "Please check your internet connection and try again.",
    technicalHint: "Network request failed"
  },
  // ===== INTERNAL/SYSTEM ERRORS (500) =====
  internal_error: {
    message: "Something went wrong on our end",
    action: "Please try again. If this continues, contact support.",
    technicalHint: "Internal server error"
  },
  database_error: {
    message: "Service temporarily unavailable",
    action: "Please try again in a moment.",
    technicalHint: "Database operation failed"
  },
  config_error: {
    message: "Service configuration error",
    action: "Please contact support for assistance.",
    technicalHint: "Server misconfiguration"
  }
};
function getUserFriendlyError(code) {
  return ERROR_MESSAGES[code] || {
    message: "An unexpected error occurred",
    action: "Please try again or contact support if this continues.",
    technicalHint: `Unknown error code: ${code}`
  };
}
function formatUserError(code, includeAction = true) {
  const error = getUserFriendlyError(code);
  if (includeAction && error.action) {
    return `${error.message} ${error.action}`;
  }
  return error.message;
}

// src/utils/requestDeduplication.ts
var requestCache = /* @__PURE__ */ new Map();
var inFlightRequests = /* @__PURE__ */ new Map();
var buttonCooldowns = /* @__PURE__ */ new Map();
var DEFAULT_COOLDOWN_MS = 200;
var DEFAULT_DEDUP_WINDOW_MS = 2e3;
function isButtonInCooldown(buttonId) {
  const cooldownExpiry = buttonCooldowns.get(buttonId);
  if (!cooldownExpiry) {
    return false;
  }
  const now = Date.now();
  if (now < cooldownExpiry) {
    return true;
  }
  buttonCooldowns.delete(buttonId);
  return false;
}
function setButtonCooldown(buttonId, cooldownMs = DEFAULT_COOLDOWN_MS) {
  const cooldownExpiry = Date.now() + cooldownMs;
  buttonCooldowns.set(buttonId, cooldownExpiry);
}
function isDuplicateRequest(requestId, windowMs = DEFAULT_DEDUP_WINDOW_MS) {
  const lastRequestTime = requestCache.get(requestId);
  if (!lastRequestTime) {
    return false;
  }
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < windowMs) {
    getLogger().debug(`[Deduplication] Duplicate request blocked: ${requestId} (${timeSinceLastRequest}ms ago)`);
    return true;
  }
  return false;
}
function markRequestProcessed(requestId) {
  requestCache.set(requestId, Date.now());
}
function getInFlightRequest(requestId) {
  return inFlightRequests.get(requestId) || null;
}
function trackInFlightRequest(requestId, promise) {
  inFlightRequests.set(requestId, promise);
  const cleanup = () => {
    inFlightRequests.delete(requestId);
    markRequestProcessed(requestId);
  };
  promise.then(cleanup, cleanup);
  return promise;
}
async function deduplicateRequest(requestId, executor, options = {}) {
  const { windowMs = DEFAULT_DEDUP_WINDOW_MS, throwOnDuplicate = true } = options;
  const inFlight = getInFlightRequest(requestId);
  if (inFlight) {
    getLogger().debug(`[Deduplication] Reusing in-flight request: ${requestId}`);
    return inFlight;
  }
  if (isDuplicateRequest(requestId, windowMs)) {
    if (throwOnDuplicate) {
      throw new Error(`Duplicate request blocked: ${requestId}`);
    }
    getLogger().warn(`[Deduplication] Duplicate request blocked but not throwing: ${requestId}`);
    return void 0;
  }
  const promise = executor();
  return trackInFlightRequest(requestId, promise);
}
function createDedupedClickHandler(buttonId, handler, options = {}) {
  const { cooldownMs = DEFAULT_COOLDOWN_MS, deduplicationWindowMs = DEFAULT_DEDUP_WINDOW_MS } = options;
  return async () => {
    if (isButtonInCooldown(buttonId)) {
      getLogger().debug(`[Deduplication] Button in cooldown: ${buttonId}`);
      return;
    }
    setButtonCooldown(buttonId, cooldownMs);
    await deduplicateRequest(
      buttonId,
      async () => {
        const result = handler();
        if (result instanceof Promise) {
          await result;
        }
      },
      { windowMs: deduplicationWindowMs, throwOnDuplicate: false }
    );
  };
}
function clearDeduplicationCache() {
  requestCache.clear();
  inFlightRequests.clear();
  buttonCooldowns.clear();
}
function getDeduplicationStats() {
  return {
    cachedRequests: requestCache.size,
    inFlightRequests: inFlightRequests.size,
    activeCooldowns: buttonCooldowns.size
  };
}

// src/utils/walletPool.ts
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
var WalletPool = class {
  constructor(poolId) {
    this.adapters = null;
    this.isCleanedUp = false;
    this.poolId = poolId ?? `pool_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    getLogger().debug(`[WalletPool] Created pool: ${this.poolId}`);
  }
  /**
   * Get wallet adapters for this pool
   *
   * Lazy initialization: adapters are created on first access.
   * Returns empty array in SSR environments.
   */
  getAdapters() {
    if (typeof window === "undefined") {
      return [];
    }
    if (this.isCleanedUp) {
      getLogger().warn(`[WalletPool] Attempted to use pool after cleanup: ${this.poolId}`);
      return [];
    }
    if (this.adapters !== null) {
      return this.adapters;
    }
    getLogger().debug(`[WalletPool] Initializing adapters for pool: ${this.poolId}`);
    this.adapters = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter()
    ];
    return this.adapters;
  }
  /**
   * Cleanup wallet adapters
   *
   * Disconnects all wallets and clears the adapter cache.
   * Called automatically when CedrosProvider unmounts.
   *
   * IMPORTANT: After cleanup, getAdapters() will return empty array.
   */
  async cleanup() {
    if (this.isCleanedUp) {
      getLogger().debug(`[WalletPool] Pool already cleaned up: ${this.poolId}`);
      return;
    }
    getLogger().debug(`[WalletPool] Cleaning up pool: ${this.poolId}`);
    this.isCleanedUp = true;
    if (this.adapters === null) {
      return;
    }
    const disconnectPromises = this.adapters.map(async (adapter) => {
      try {
        if (adapter.connected) {
          getLogger().debug(`[WalletPool] Disconnecting wallet: ${adapter.name}`);
          await adapter.disconnect();
        }
      } catch (error) {
        getLogger().warn(`[WalletPool] Failed to disconnect wallet ${adapter.name}:`, error);
      }
    });
    await Promise.allSettled(disconnectPromises);
    this.adapters = null;
    getLogger().debug(`[WalletPool] Pool cleanup complete: ${this.poolId}`);
  }
  /**
   * Check if this pool has been initialized
   *
   * Useful for testing or debugging.
   */
  isInitialized() {
    return this.adapters !== null;
  }
  /**
   * Get pool ID (for debugging/logging)
   */
  getId() {
    return this.poolId;
  }
};
function createWalletPool(poolId) {
  return new WalletPool(poolId);
}

// src/utils/eventEmitter.ts
var CEDROS_EVENTS = {
  PAYMENT_START: "cedros:payment:start",
  WALLET_CONNECT: "cedros:wallet:connect",
  WALLET_CONNECTED: "cedros:wallet:connected",
  WALLET_ERROR: "cedros:wallet:error",
  PAYMENT_PROCESSING: "cedros:payment:processing",
  PAYMENT_SUCCESS: "cedros:payment:success",
  PAYMENT_ERROR: "cedros:payment:error"
};
var eventListeners = /* @__PURE__ */ new Map();
function emitEvent(eventName, detail) {
  const listeners = eventListeners.get(eventName);
  if (listeners) {
    listeners.forEach((callback) => {
      try {
        callback(detail);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }
}
function emitPaymentStart(method, resource, itemCount) {
  emitEvent(CEDROS_EVENTS.PAYMENT_START, {
    timestamp: Date.now(),
    method,
    resource,
    itemCount
  });
}
function emitWalletConnect(wallet) {
  emitEvent(CEDROS_EVENTS.WALLET_CONNECT, {
    timestamp: Date.now(),
    wallet
  });
}
function emitWalletConnected(wallet, publicKey) {
  emitEvent(CEDROS_EVENTS.WALLET_CONNECTED, {
    timestamp: Date.now(),
    wallet,
    publicKey
  });
}
function emitWalletError(error, wallet) {
  emitEvent(CEDROS_EVENTS.WALLET_ERROR, {
    timestamp: Date.now(),
    wallet,
    error
  });
}
function emitPaymentProcessing(method, resource, itemCount) {
  emitEvent(CEDROS_EVENTS.PAYMENT_PROCESSING, {
    timestamp: Date.now(),
    method,
    resource,
    itemCount
  });
}
function emitPaymentSuccess(method, transactionId, resource, itemCount) {
  emitEvent(CEDROS_EVENTS.PAYMENT_SUCCESS, {
    timestamp: Date.now(),
    method,
    transactionId,
    resource,
    itemCount
  });
}
function emitPaymentError(method, error, resource, itemCount) {
  emitEvent(CEDROS_EVENTS.PAYMENT_ERROR, {
    timestamp: Date.now(),
    method,
    error,
    resource,
    itemCount
  });
}

// src/types/errors.ts
var PaymentError = class _PaymentError extends Error {
  constructor(code, message, retryable = false, details, httpStatus) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
    this.retryable = retryable;
    this.details = details;
    this.httpStatus = httpStatus;
    Object.setPrototypeOf(this, _PaymentError.prototype);
  }
  /**
   * Check if this error is retryable
   */
  canRetry() {
    return this.retryable;
  }
  /**
   * Check if this is a specific error code
   */
  is(code) {
    return this.code === code;
  }
  /**
   * Check if this error is in a specific category
   */
  isInCategory(codes) {
    return codes.includes(this.code);
  }
  /**
   * Get a user-friendly error message
   * Uses structured error messages with actionable guidance
   */
  getUserMessage() {
    const errorInfo = this.getErrorInfo();
    if (errorInfo.action) {
      return `${errorInfo.message} ${errorInfo.action}`;
    }
    return errorInfo.message;
  }
  /**
   * Get short error message without action guidance
   */
  getShortMessage() {
    return this.getErrorInfo().message;
  }
  /**
   * Get actionable guidance for this error
   */
  getAction() {
    return this.getErrorInfo().action;
  }
  /**
   * Get error info from error messages map
   * @private
   */
  getErrorInfo() {
    return getUserFriendlyError(this.code);
  }
  /**
   * Create PaymentError from API error response
   *
   * If `retryable` field is not present (Rust server), infers retryability
   * from error codes using ERROR_CATEGORIES.RETRYABLE.
   */
  static fromErrorResponse(response, httpStatus) {
    const isRetryable = response.error.retryable ?? ERROR_CATEGORIES.RETRYABLE.includes(response.error.code);
    return new _PaymentError(
      response.error.code,
      response.error.message,
      isRetryable,
      response.error.details,
      httpStatus
    );
  }
  /**
   * Create PaymentError from unknown error
   * Useful for catch blocks where error type is unknown
   */
  static fromUnknown(error) {
    if (error instanceof _PaymentError) {
      return error;
    }
    if (error instanceof Error) {
      return new _PaymentError(
        "internal_error" /* INTERNAL_ERROR */,
        error.message,
        false
      );
    }
    return new _PaymentError(
      "internal_error" /* INTERNAL_ERROR */,
      String(error),
      false
    );
  }
};
var ERROR_CATEGORIES = {
  /** Insufficient funds errors requiring user to add funds */
  INSUFFICIENT_FUNDS: [
    "insufficient_funds_sol" /* INSUFFICIENT_FUNDS_SOL */,
    "insufficient_funds_token" /* INSUFFICIENT_FUNDS_TOKEN */
  ],
  /** Transaction state errors that may resolve with time */
  TRANSACTION_PENDING: [
    "transaction_not_confirmed" /* TRANSACTION_NOT_CONFIRMED */,
    "transaction_not_found" /* TRANSACTION_NOT_FOUND */
  ],
  /** Validation errors requiring input correction */
  VALIDATION: [
    "missing_field" /* MISSING_FIELD */,
    "invalid_field" /* INVALID_FIELD */,
    "invalid_amount" /* INVALID_AMOUNT */,
    "invalid_wallet" /* INVALID_WALLET */,
    "invalid_resource" /* INVALID_RESOURCE */,
    "invalid_cart_item" /* INVALID_CART_ITEM */,
    "empty_cart" /* EMPTY_CART */
  ],
  /** Coupon-related errors */
  COUPON: [
    "invalid_coupon" /* INVALID_COUPON */,
    "coupon_not_found" /* COUPON_NOT_FOUND */,
    "coupon_expired" /* COUPON_EXPIRED */,
    "coupon_usage_limit_reached" /* COUPON_USAGE_LIMIT_REACHED */,
    "coupon_not_applicable" /* COUPON_NOT_APPLICABLE */,
    "coupon_wrong_payment_method" /* COUPON_WRONG_PAYMENT_METHOD */
  ],
  /** Retryable errors (temporary failures) */
  RETRYABLE: [
    "transaction_not_confirmed" /* TRANSACTION_NOT_CONFIRMED */,
    "rpc_error" /* RPC_ERROR */,
    "network_error" /* NETWORK_ERROR */,
    "stripe_error" /* STRIPE_ERROR */
  ],
  /** Resource not found errors */
  NOT_FOUND: [
    "resource_not_found" /* RESOURCE_NOT_FOUND */,
    "cart_not_found" /* CART_NOT_FOUND */,
    "refund_not_found" /* REFUND_NOT_FOUND */,
    "product_not_found" /* PRODUCT_NOT_FOUND */,
    "coupon_not_found" /* COUPON_NOT_FOUND */,
    "session_not_found" /* SESSION_NOT_FOUND */,
    "credits_hold_not_found" /* CREDITS_HOLD_NOT_FOUND */
  ],
  /** Credits-related errors */
  CREDITS: [
    "insufficient_credits" /* INSUFFICIENT_CREDITS */,
    "credits_hold_expired" /* CREDITS_HOLD_EXPIRED */,
    "credits_hold_not_found" /* CREDITS_HOLD_NOT_FOUND */
  ],
  /** Security/rate limit errors */
  SECURITY: [
    "invalid_redirect_url" /* INVALID_REDIRECT_URL */,
    "rate_limit_exceeded" /* RATE_LIMIT_EXCEEDED */,
    "nonce_already_used" /* NONCE_ALREADY_USED */
  ]
};

// src/utils/errorParser.ts
function isRetryableError(error) {
  return error instanceof PaymentError && error.canRetry();
}
function getUserErrorMessage(error) {
  if (error instanceof PaymentError) {
    return error.getUserMessage();
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// src/utils/cspHelper.ts
function getSolanaRpcUrl(cluster) {
  switch (cluster) {
    case "mainnet-beta":
      return "https://api.mainnet-beta.solana.com";
    case "devnet":
      return "https://api.devnet.solana.com";
    case "testnet":
      return "https://api.testnet.solana.com";
    default:
      return "https://api.mainnet-beta.solana.com";
  }
}
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return url;
  }
}
function generateCSPDirectives(config = {}) {
  const {
    solanaCluster = "mainnet-beta",
    solanaEndpoint,
    customRpcProviders = [],
    allowUnsafeScripts = false,
    additionalScriptSrc = [],
    additionalConnectSrc = [],
    additionalFrameSrc = [],
    includeStripe = true
  } = config;
  if (allowUnsafeScripts) {
    console.warn(
      "[CedrosPay] SECURITY WARNING: allowUnsafeScripts is enabled. This adds 'unsafe-inline' and 'unsafe-eval' to script-src, which significantly weakens CSP protection against XSS attacks. Only use this in development or if absolutely required by your framework."
    );
  }
  const scriptSrc = ["'self'"];
  if (allowUnsafeScripts) {
    scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
  }
  if (includeStripe) {
    scriptSrc.push("https://js.stripe.com");
  }
  scriptSrc.push(...additionalScriptSrc);
  const connectSrc = ["'self'"];
  if (includeStripe) {
    connectSrc.push("https://api.stripe.com", "https://*.stripe.com");
  }
  const solanaRpcUrl = getSolanaRpcUrl(solanaCluster);
  connectSrc.push(solanaRpcUrl);
  if (solanaEndpoint) {
    const customDomain = extractDomain(solanaEndpoint);
    if (!connectSrc.includes(customDomain)) {
      connectSrc.push(customDomain);
    }
  }
  customRpcProviders.forEach((provider) => {
    if (!connectSrc.includes(provider)) {
      connectSrc.push(provider);
    }
  });
  connectSrc.push(...additionalConnectSrc);
  const frameSrc = ["'self'"];
  if (includeStripe) {
    frameSrc.push("https://js.stripe.com", "https://checkout.stripe.com");
  }
  frameSrc.push(...additionalFrameSrc);
  return {
    scriptSrc,
    connectSrc,
    frameSrc
  };
}
function formatCSP(directives, format = "header") {
  const { scriptSrc, connectSrc, frameSrc } = directives;
  switch (format) {
    case "header":
    case "meta":
    case "nextjs":
    case "nginx": {
      const parts = [];
      if (scriptSrc.length > 0) {
        parts.push(`script-src ${scriptSrc.join(" ")}`);
      }
      if (connectSrc.length > 0) {
        parts.push(`connect-src ${connectSrc.join(" ")}`);
      }
      if (frameSrc.length > 0) {
        parts.push(`frame-src ${frameSrc.join(" ")}`);
      }
      return parts.join("; ");
    }
    case "helmet": {
      const helmetDirectives = {};
      if (scriptSrc.length > 0) {
        helmetDirectives.scriptSrc = scriptSrc;
      }
      if (connectSrc.length > 0) {
        helmetDirectives.connectSrc = connectSrc;
      }
      if (frameSrc.length > 0) {
        helmetDirectives.frameSrc = frameSrc;
      }
      return helmetDirectives;
    }
    case "directives":
      return { scriptSrc, connectSrc, frameSrc };
    default:
      throw new Error(`Unknown CSP format: ${format}`);
  }
}
function generateCSP(config = {}, format = "header") {
  const directives = generateCSPDirectives(config);
  return formatCSP(directives, format);
}
var RPC_PROVIDERS = {
  HELIUS: "https://*.helius-rpc.com",
  QUICKNODE: "https://*.quicknode.pro",
  ALCHEMY: "https://*.alchemy.com",
  ANKR: "https://rpc.ankr.com",
  TRITON: "https://*.rpcpool.com"
};
var CSP_PRESETS = {
  /**
   * Mainnet production with custom RPC (recommended)
   */
  MAINNET_CUSTOM_RPC: (rpcEndpoint) => ({
    solanaCluster: "mainnet-beta",
    solanaEndpoint: rpcEndpoint,
    allowUnsafeScripts: false
  }),
  /**
   * Mainnet with Next.js (may require unsafe-inline/eval for some setups)
   * Note: Modern Next.js supports strict CSP without unsafe directives.
   * Only enable allowUnsafeScripts if necessary and understand the security implications.
   */
  MAINNET_NEXTJS: (rpcEndpoint) => ({
    solanaCluster: "mainnet-beta",
    solanaEndpoint: rpcEndpoint,
    allowUnsafeScripts: false
  }),
  /**
   * Devnet for testing
   */
  DEVNET: () => ({
    solanaCluster: "devnet",
    allowUnsafeScripts: false
  }),
  /**
   * Crypto-only payments (no Stripe)
   */
  CRYPTO_ONLY: (rpcEndpoint) => ({
    solanaCluster: "mainnet-beta",
    solanaEndpoint: rpcEndpoint,
    includeStripe: false
  }),
  /**
   * Stripe-only payments (no Solana)
   */
  STRIPE_ONLY: () => ({
    solanaCluster: "mainnet-beta",
    includeStripe: true,
    // Don't include Solana RPC endpoints
    customRpcProviders: []
  })
};

// src/i18n/formatting.ts
function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function localeOrUndefined(locale) {
  return locale ? normalizeLocale(locale) : void 0;
}
function formatDateOnly(value, locale, options) {
  const date = toDate(value);
  if (!date) {
    return "";
  }
  return new Intl.DateTimeFormat(localeOrUndefined(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options
  }).format(date);
}
function formatDateTimeValue(value, locale, options) {
  const date = toDate(value);
  if (!date) {
    return "";
  }
  return new Intl.DateTimeFormat(localeOrUndefined(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    ...options
  }).format(date);
}
function formatNumberValue(value, locale, options) {
  return new Intl.NumberFormat(localeOrUndefined(locale), options).format(value);
}
function formatCurrencyAmount(value, currency = "USD", locale, options) {
  return formatNumberValue(value, locale, {
    style: "currency",
    currency,
    ...options
  });
}
function formatMinorCurrencyAmount(minorValue, currency = "USD", locale, options) {
  return formatCurrencyAmount(minorValue / 100, currency, locale, options);
}
function selectPlural(count, forms, locale) {
  const rule = new Intl.PluralRules(localeOrUndefined(locale)).select(count);
  return forms[rule] ?? forms.other;
}

// src/utils/dateHelpers.ts
function formatDate(isoDate, locale) {
  return formatDateOnly(isoDate, locale);
}
function formatDateTime(iso, locale) {
  return formatDateTimeValue(iso, locale);
}

// src/context/ThemeContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
var defaultLightTokens = Object.freeze({
  surfaceBackground: "rgba(255, 255, 255, 0)",
  surfaceText: "#111827",
  surfaceBorder: "rgba(15, 23, 42, 0.08)",
  stripeBackground: "linear-gradient(135deg, #635bff 0%, #4f46e5 100%)",
  stripeText: "#ffffff",
  stripeShadow: "rgba(79, 70, 229, 0.25)",
  cryptoBackground: "linear-gradient(135deg, #14f195 0%, #9945ff 100%)",
  cryptoText: "#ffffff",
  cryptoShadow: "rgba(99, 102, 241, 0.25)",
  errorBackground: "#fee2e2",
  errorBorder: "#fca5a5",
  errorText: "#b91c1c",
  successBackground: "#dcfce7",
  successBorder: "#86efac",
  successText: "#166534",
  modalOverlay: "rgba(0, 0, 0, 0.5)",
  modalBackground: "#ffffff",
  modalBorder: "rgba(15, 23, 42, 0.08)",
  buttonBorderRadius: "8px",
  buttonPadding: "0.75rem 1.5rem",
  buttonFontSize: "1rem",
  buttonFontWeight: "600"
});
var defaultDarkTokens = Object.freeze({
  surfaceBackground: "rgba(17, 24, 39, 0.6)",
  surfaceText: "#f9fafb",
  surfaceBorder: "rgba(148, 163, 184, 0.25)",
  stripeBackground: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
  stripeText: "#f5f3ff",
  stripeShadow: "rgba(99, 102, 241, 0.35)",
  cryptoBackground: "linear-gradient(135deg, #1dd4a6 0%, #6d28d9 100%)",
  cryptoText: "#ecfeff",
  cryptoShadow: "rgba(75, 85, 99, 0.35)",
  errorBackground: "#7f1d1d",
  errorBorder: "#fca5a5",
  errorText: "#fecaca",
  successBackground: "#14532d",
  successBorder: "#4ade80",
  successText: "#bbf7d0",
  modalOverlay: "rgba(0, 0, 0, 0.75)",
  modalBackground: "#1f2937",
  modalBorder: "rgba(148, 163, 184, 0.25)",
  buttonBorderRadius: "8px",
  buttonPadding: "0.75rem 1.5rem",
  buttonFontSize: "1rem",
  buttonFontWeight: "600"
});
var TOKEN_TO_VAR = {
  surfaceBackground: "--cedros-surface-bg",
  surfaceText: "--cedros-surface-text",
  surfaceBorder: "--cedros-surface-border",
  stripeBackground: "--cedros-stripe-bg",
  stripeText: "--cedros-stripe-text",
  stripeShadow: "--cedros-stripe-shadow",
  cryptoBackground: "--cedros-crypto-bg",
  cryptoText: "--cedros-crypto-text",
  cryptoShadow: "--cedros-crypto-shadow",
  errorBackground: "--cedros-error-bg",
  errorBorder: "--cedros-error-border",
  errorText: "--cedros-error-text",
  successBackground: "--cedros-success-bg",
  successBorder: "--cedros-success-border",
  successText: "--cedros-success-text",
  modalOverlay: "--cedros-modal-overlay",
  modalBackground: "--cedros-modal-bg",
  modalBorder: "--cedros-modal-border",
  buttonBorderRadius: "--cedros-button-radius",
  buttonPadding: "--cedros-button-padding",
  buttonFontSize: "--cedros-button-font-size",
  buttonFontWeight: "--cedros-button-font-weight"
};
var CedrosThemeContext = createContext(null);
function mergeTokens(mode, overrides) {
  const base = mode === "dark" ? defaultDarkTokens : defaultLightTokens;
  return {
    ...base,
    ...overrides
  };
}
function tokensToStyle(tokens) {
  const entries = Object.entries(tokens).map(([token, value]) => [
    TOKEN_TO_VAR[token],
    value
  ]);
  return Object.fromEntries(entries);
}
function CedrosThemeProvider({
  initialMode = "light",
  overrides,
  unstyled = false,
  children
}) {
  const [mode, setMode] = useState(initialMode);
  const [stableOverrides, setStableOverrides] = useState(overrides);
  const prevOverridesRef = useRef(overrides);
  useEffect(() => {
    if (overrides === prevOverridesRef.current) {
      return;
    }
    const valuesChanged = !overrides || !prevOverridesRef.current ? overrides !== prevOverridesRef.current : Object.keys({ ...overrides, ...prevOverridesRef.current }).some(
      (key) => overrides[key] !== prevOverridesRef.current?.[key]
    );
    if (valuesChanged) {
      prevOverridesRef.current = overrides;
      setStableOverrides(overrides);
    }
  }, [overrides]);
  const value = useMemo(() => {
    const tokens = mergeTokens(mode, stableOverrides);
    const style = unstyled ? {} : tokensToStyle(tokens);
    const className = unstyled ? "" : `cedros-theme-root cedros-theme cedros-theme--${mode}`;
    return {
      mode,
      setMode,
      tokens,
      className,
      style,
      unstyled
    };
  }, [mode, stableOverrides, unstyled]);
  return /* @__PURE__ */ React.createElement(CedrosThemeContext.Provider, { value }, children);
}
function useCedrosTheme() {
  const context = useContext(CedrosThemeContext);
  if (!context) {
    throw new Error("useCedrosTheme must be used within CedrosProvider");
  }
  return context;
}

// src/utils/solanaCheck.ts
var solanaChecked = false;
var solanaAvailable = false;
async function checkSolanaAvailability() {
  if (solanaChecked) {
    return solanaAvailable ? { available: true } : {
      available: false,
      error: getSolanaInstallError()
    };
  }
  try {
    await import("@solana/web3.js");
    solanaChecked = true;
    solanaAvailable = true;
    return { available: true };
  } catch {
    solanaChecked = true;
    solanaAvailable = false;
    return {
      available: false,
      error: getSolanaInstallError()
    };
  }
}
function getSolanaInstallError() {
  return "Solana dependencies not installed. To use crypto payments, install them with:\n\nnpm install @solana/web3.js @solana/spl-token @solana/wallet-adapter-react @solana/wallet-adapter-base @solana/wallet-adapter-phantom @solana/wallet-adapter-solflare\n\nOr if you only need Stripe payments, hide the crypto button with:\n<CedrosPay showCrypto={false} />";
}

// src/policy/paywallProductCatalog.ts
var VALID_POLICY_FULFILLMENT_TYPES = /* @__PURE__ */ new Set([
  "digital_in_app",
  "physical_goods",
  "real_world_service",
  "reader_content",
  "other"
]);
function extractProducts(response) {
  if (Array.isArray(response)) {
    return response;
  }
  return response.products ?? response.items ?? [];
}
function getMetadataPolicyFulfillmentType(metadata) {
  const explicit = metadata?.store_policy_fulfillment_type ?? metadata?.storePolicyFulfillmentType;
  if (typeof explicit === "string" && VALID_POLICY_FULFILLMENT_TYPES.has(explicit)) {
    return explicit;
  }
  return void 0;
}
function derivePolicyFulfillmentType(product) {
  const explicit = getMetadataPolicyFulfillmentType(product.metadata);
  if (explicit) {
    return explicit;
  }
  const fulfillmentType = product.fulfillment?.type ?? product.fulfillmentType;
  if (fulfillmentType === "shipping" || product.shippingProfile === "physical") {
    return "physical_goods";
  }
  if (fulfillmentType === "service") {
    return "real_world_service";
  }
  if (fulfillmentType === "digital_download" || product.shippingProfile === "digital") {
    return "digital_in_app";
  }
  return "other";
}
function mapPaywallProductToCedrosProductDefinition(product) {
  return {
    id: product.id,
    name: product.title ?? product.description ?? product.id,
    fulfillmentType: derivePolicyFulfillmentType(product),
    storeProduct: product.storeBilling ? {
      kind: product.storeBilling.kind,
      apple: product.storeBilling.apple,
      google: product.storeBilling.google
    } : void 0
  };
}
function createCedrosProductCatalogFromPaywallProducts(products) {
  return products.reduce((catalog, product) => {
    if (!product?.id) {
      return catalog;
    }
    catalog[product.id] = mapPaywallProductToCedrosProductDefinition(product);
    return catalog;
  }, {});
}
async function fetchCedrosProductCatalog(options) {
  const { serverUrl, apiKey, limit = 500, signal } = options;
  const headers = {};
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  const baseUrl = serverUrl.replace(/\/$/, "");
  const response = await fetch(
    `${baseUrl}/paywall/v1/products?limit=${encodeURIComponent(String(limit))}&offset=0`,
    {
      headers,
      signal
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to load paywall product catalog (${response.status})`);
  }
  const data = await response.json();
  return createCedrosProductCatalogFromPaywallProducts(extractProducts(data));
}

// src/context/CedrosContext.tsx
function getDefaultLogLevel2() {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    return 0;
  }
  return 2;
}
var CedrosContext = createContext2(null);
function CedrosProvider({ config, children }) {
  const validatedConfig = useMemo2(() => validateConfig(config), [config]);
  const [initError, setInitError] = useState2(null);
  const [syncedProductCatalog, setSyncedProductCatalog] = useState2(void 0);
  const walletPoolRef = useRef2(null);
  if (walletPoolRef.current === null) {
    walletPoolRef.current = createWalletPool();
  }
  const [solanaError, setSolanaError] = useState2(null);
  useEffect2(() => {
    let cancelled = false;
    checkSolanaAvailability().then((check) => {
      if (cancelled) return;
      if (!check.available) {
        setSolanaError(check.error || "Solana dependencies not available");
      } else {
        setSolanaError(void 0);
      }
    }).catch((error) => {
      if (cancelled) return;
      getLogger().error("[CedrosProvider] Solana availability check failed:", error);
      setInitError("Failed to initialize Cedros provider");
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect2(() => {
    const logLevel = validatedConfig.logLevel ?? getDefaultLogLevel2();
    const logger = createLogger({
      level: logLevel,
      prefix: "[CedrosPay]"
    });
    setLogger(logger);
  }, [validatedConfig.logLevel]);
  useEffect2(() => {
    const syncEnabled = validatedConfig.paymentPolicy?.productCatalogSync?.enabled !== false;
    if (!syncEnabled || !validatedConfig.serverUrl) {
      setSyncedProductCatalog(void 0);
      return;
    }
    const controller = new AbortController();
    void fetchCedrosProductCatalog({
      serverUrl: validatedConfig.serverUrl,
      limit: validatedConfig.paymentPolicy?.productCatalogSync?.limit,
      signal: controller.signal
    }).then((catalog) => {
      setSyncedProductCatalog(catalog);
    }).catch((error) => {
      if (controller.signal.aborted) {
        return;
      }
      getLogger().warn(
        "[CedrosProvider] Failed to sync payment policy product catalog from paywall products:",
        error
      );
      setSyncedProductCatalog(void 0);
    });
    return () => {
      controller.abort();
    };
  }, [
    validatedConfig.paymentPolicy?.productCatalogSync?.enabled,
    validatedConfig.paymentPolicy?.productCatalogSync?.limit,
    validatedConfig.serverUrl
  ]);
  useEffect2(() => {
    return () => {
      const currentPool = walletPoolRef.current;
      if (currentPool) {
        currentPool.cleanup().catch((error) => {
          getLogger().warn("[CedrosProvider] Wallet pool cleanup failed:", error);
        });
      }
    };
  }, []);
  useEffect2(() => {
    let cancelled = false;
    const maybeHandleStripeUrl = async (url) => {
      if (!url || cancelled) {
        return;
      }
      try {
        await handleURLCallback(url);
      } catch (error) {
        getLogger().warn("[CedrosProvider] Stripe URL callback handling failed:", error);
      }
    };
    void Linking2.getInitialURL().then(maybeHandleStripeUrl);
    const subscription = Linking2.addEventListener("url", (event) => {
      void maybeHandleStripeUrl(event.url);
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
  useEffect2(() => {
    const stripeKey = validatedConfig.stripePublicKey;
    const serverUrl = validatedConfig.serverUrl ?? "";
    const cluster = validatedConfig.solanaCluster;
    const stripeReturnUrl = validatedConfig.stripeReturnUrl;
    const endpoint = validatedConfig.solanaEndpoint;
    const allowUnknownMint = validatedConfig.dangerouslyAllowUnknownMint;
    const storeBillingConfig = validatedConfig.paymentPolicy?.storeBilling;
    return () => {
      releaseManagers(
        stripeKey,
        serverUrl,
        cluster,
        stripeReturnUrl,
        endpoint,
        allowUnknownMint,
        storeBillingConfig
      );
    };
  }, [
    validatedConfig.stripePublicKey,
    validatedConfig.serverUrl,
    validatedConfig.solanaCluster,
    validatedConfig.stripeReturnUrl,
    validatedConfig.solanaEndpoint,
    validatedConfig.dangerouslyAllowUnknownMint,
    validatedConfig.paymentPolicy?.storeBilling
  ]);
  const resolvedConfig = useMemo2(() => {
    const manualCatalog = validatedConfig.paymentPolicy?.productCatalog;
    const hasSyncedCatalog = syncedProductCatalog && Object.keys(syncedProductCatalog).length > 0;
    const hasManualCatalog = manualCatalog && Object.keys(manualCatalog).length > 0;
    if (!hasSyncedCatalog && !hasManualCatalog) {
      return validatedConfig;
    }
    return {
      ...validatedConfig,
      paymentPolicy: {
        ...validatedConfig.paymentPolicy,
        productCatalog: {
          ...hasSyncedCatalog ? syncedProductCatalog : {},
          ...hasManualCatalog ? manualCatalog : {}
        }
      }
    };
  }, [syncedProductCatalog, validatedConfig]);
  const contextValue = useMemo2(() => {
    const {
      checkoutClient,
      x402Manager,
      walletManager,
      subscriptionManager,
      subscriptionChangeManager,
      creditsManager,
      storeBillingManager
    } = getOrCreateManagers(
      resolvedConfig.stripePublicKey,
      resolvedConfig.serverUrl ?? "",
      resolvedConfig.solanaCluster,
      resolvedConfig.stripeReturnUrl,
      resolvedConfig.solanaEndpoint,
      resolvedConfig.dangerouslyAllowUnknownMint,
      resolvedConfig.paymentPolicy?.storeBilling
    );
    return {
      config: resolvedConfig,
      checkoutClient,
      x402Manager,
      walletManager,
      subscriptionManager,
      subscriptionChangeManager,
      creditsManager,
      storeBillingManager,
      walletPool: walletPoolRef.current,
      solanaError
    };
  }, [resolvedConfig, solanaError]);
  if (initError) {
    return /* @__PURE__ */ React.createElement("div", { role: "alert" }, initError);
  }
  return /* @__PURE__ */ React.createElement(CedrosContext.Provider, { value: contextValue }, /* @__PURE__ */ React.createElement(
    CedrosThemeProvider,
    {
      initialMode: validatedConfig.theme ?? "light",
      overrides: validatedConfig.themeOverrides,
      unstyled: validatedConfig.unstyled ?? false
    },
    children
  ));
}
function useCedrosContext() {
  const context = useContext2(CedrosContext);
  if (!context) {
    throw new Error("useCedrosContext must be used within CedrosProvider");
  }
  return context;
}

// src/components/NativeStoreButton.tsx
function getDefaultLabel(method) {
  return method === "apple_iap" ? "Buy with Apple" : "Buy with Google Play";
}
function NativeStoreButton({
  method,
  product,
  distributionChannel,
  checkout,
  label,
  disabled = false,
  onAttempt,
  onSuccess,
  onError,
  style,
  textStyle,
  loadingColor = "#ffffff"
}) {
  const { config, storeBillingManager } = useCedrosContext();
  const theme = useCedrosTheme();
  const [error, setError] = useState3(null);
  const [transactionId, setTransactionId] = useState3(null);
  const [isLoading, setIsLoading] = useState3(false);
  const handler = config.paymentPolicy?.nativeHandlers?.[method];
  const buttonLabel = label || handler?.label || getDefaultLabel(method);
  const executePurchase = useMemo3(
    () => async () => {
      if (!handler && config.paymentPolicy?.storeBilling?.enabled === false) {
        const missingHandlerError = method === "apple_iap" ? "Apple IAP is disabled for this build and no override handler is configured." : "Google Play Billing is disabled for this build and no override handler is configured.";
        setError(missingHandlerError);
        emitPaymentError(method, missingHandlerError, product.id);
        onError?.(missingHandlerError);
        return;
      }
      setIsLoading(true);
      setError(null);
      emitPaymentStart(method, product.id);
      onAttempt?.(method);
      emitPaymentProcessing(method, product.id);
      try {
        const result = handler ? await handler.purchase({
          product,
          distributionChannel,
          fulfillmentType: product.fulfillmentType,
          checkout
        }) : await storeBillingManager.purchase({
          method,
          product,
          distributionChannel,
          fulfillmentType: product.fulfillmentType,
          checkout
        });
        setTransactionId(result.transactionId);
        emitPaymentSuccess(method, result.transactionId, product.id);
        onSuccess?.(result.transactionId);
      } catch (purchaseError) {
        const message = purchaseError instanceof Error ? purchaseError.message : "Native store purchase failed";
        setError(message);
        emitPaymentError(method, message, product.id);
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      checkout,
      config.paymentPolicy?.storeBilling?.enabled,
      distributionChannel,
      handler,
      method,
      onAttempt,
      onError,
      onSuccess,
      product,
      storeBillingManager
    ]
  );
  const handlePress = useMemo3(
    () => createDedupedClickHandler(`${method}-${product.id}`, executePurchase),
    [executePurchase, method, product.id]
  );
  return /* @__PURE__ */ React2.createElement(View, { style: [styles.container, style] }, /* @__PURE__ */ React2.createElement(
    TouchableOpacity,
    {
      onPress: handlePress,
      disabled: disabled || isLoading,
      style: [
        styles.button,
        theme.unstyled ? null : {
          backgroundColor: method === "apple_iap" ? "#000000" : theme.tokens?.stripeBackground || "#34a853"
        },
        (disabled || isLoading) && styles.disabled
      ],
      activeOpacity: 0.8
    },
    isLoading ? /* @__PURE__ */ React2.createElement(ActivityIndicator, { color: loadingColor, size: "small" }) : /* @__PURE__ */ React2.createElement(Text, { style: [styles.buttonText, textStyle] }, buttonLabel)
  ), error ? /* @__PURE__ */ React2.createElement(
    Text,
    {
      style: [
        styles.errorText,
        { color: theme.tokens?.errorText || "#ef4444" }
      ]
    },
    error
  ) : null, transactionId ? /* @__PURE__ */ React2.createElement(
    Text,
    {
      style: [
        styles.successText,
        { color: theme.tokens?.successText || "#22c55e" }
      ]
    },
    "Payment successful"
  ) : null);
}
var styles = StyleSheet.create({
  container: {
    width: "100%"
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  },
  disabled: {
    opacity: 0.6
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center"
  },
  successText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center"
  }
});

// src/components/RestorePurchasesButton.tsx
import React3, { useMemo as useMemo4, useState as useState4 } from "react";
import {
  ActivityIndicator as ActivityIndicator2,
  StyleSheet as StyleSheet2,
  Text as Text2,
  TouchableOpacity as TouchableOpacity2,
  View as View2
} from "react-native";

// src/policy/nativeStoreSupport.ts
function resolveNativeStoreMethod(distributionChannel) {
  if (distributionChannel === "apple_app_store") {
    return "apple_iap";
  }
  if (distributionChannel === "google_play_store") {
    return "google_play_billing";
  }
  return null;
}
function isRestorableStoreProduct(product) {
  if (!product) {
    return false;
  }
  return product.storeProduct?.kind !== "consumable";
}
function isManageableStoreSubscription(product) {
  return product?.storeProduct?.kind === "auto_renewable_subscription";
}

// src/components/RestorePurchasesButton.tsx
function getDefaultRestoreLabel() {
  return "Restore Purchases";
}
function RestorePurchasesButton({
  product,
  products,
  distributionChannel,
  checkout,
  label,
  disabled = false,
  onSuccess,
  onError,
  style,
  textStyle,
  loadingColor = "#111827"
}) {
  const { config, storeBillingManager } = useCedrosContext();
  const theme = useCedrosTheme();
  const [error, setError] = useState4(null);
  const [restoredCount, setRestoredCount] = useState4(null);
  const [isLoading, setIsLoading] = useState4(false);
  const method = resolveNativeStoreMethod(distributionChannel);
  const handler = method ? config.paymentPolicy?.nativeHandlers?.[method] : void 0;
  const buttonLabel = label || getDefaultRestoreLabel();
  const restoreProducts = useMemo4(() => {
    const combined = [
      ...products ?? [],
      ...product ? [product] : []
    ];
    const seen = /* @__PURE__ */ new Set();
    return combined.filter((entry) => {
      if (!entry?.id || seen.has(entry.id) || !isRestorableStoreProduct(entry)) {
        return false;
      }
      seen.add(entry.id);
      return true;
    });
  }, [product, products]);
  const executeRestore = useMemo4(
    () => async () => {
      if (!method) {
        const unsupportedError = "Purchase restore is only available for Apple App Store and Google Play Store products.";
        setError(unsupportedError);
        onError?.(unsupportedError);
        return;
      }
      if (restoreProducts.length === 0) {
        const missingProductError = "Cedros needs at least one restorable store product definition to restore purchases safely.";
        setError(missingProductError);
        onError?.(missingProductError);
        return;
      }
      if (!handler?.restorePurchases && config.paymentPolicy?.storeBilling?.enabled === false) {
        const missingHandlerError = method === "apple_iap" ? "Apple restore is disabled for this build and no override restore handler is configured." : "Google Play restore is disabled for this build and no override restore handler is configured.";
        setError(missingHandlerError);
        onError?.(missingHandlerError);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const restored = handler?.restorePurchases ? await handler.restorePurchases({
          products: restoreProducts,
          distributionChannel,
          checkout
        }) : await storeBillingManager.restorePurchases({
          products: restoreProducts,
          distributionChannel,
          checkout
        });
        setRestoredCount(restored.length);
        onSuccess?.(restored);
      } catch (restoreError) {
        const message = restoreError instanceof Error ? restoreError.message : "Purchase restore failed";
        setError(message);
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      checkout,
      config.paymentPolicy?.storeBilling?.enabled,
      distributionChannel,
      handler,
      method,
      onError,
      onSuccess,
      restoreProducts,
      storeBillingManager
    ]
  );
  const dedupeKey = useMemo4(
    () => `restore-${distributionChannel}-${restoreProducts.map((entry) => entry.id).join("-")}`,
    [distributionChannel, restoreProducts]
  );
  const handlePress = useMemo4(
    () => createDedupedClickHandler(dedupeKey, executeRestore),
    [dedupeKey, executeRestore]
  );
  return /* @__PURE__ */ React3.createElement(View2, { style: [styles2.container, style] }, /* @__PURE__ */ React3.createElement(
    TouchableOpacity2,
    {
      onPress: handlePress,
      disabled: disabled || isLoading,
      style: [
        styles2.button,
        {
          backgroundColor: theme.tokens?.modalBackground || "#ffffff",
          borderColor: theme.tokens?.surfaceBorder || "#d1d5db"
        },
        (disabled || isLoading) && styles2.disabled
      ],
      activeOpacity: 0.8
    },
    isLoading ? /* @__PURE__ */ React3.createElement(ActivityIndicator2, { color: loadingColor, size: "small" }) : /* @__PURE__ */ React3.createElement(
      Text2,
      {
        style: [
          styles2.buttonText,
          { color: theme.tokens?.surfaceText || "#111827" },
          textStyle
        ]
      },
      buttonLabel
    )
  ), error ? /* @__PURE__ */ React3.createElement(
    Text2,
    {
      style: [
        styles2.errorText,
        { color: theme.tokens?.errorText || "#ef4444" }
      ]
    },
    error
  ) : null, restoredCount !== null ? /* @__PURE__ */ React3.createElement(
    Text2,
    {
      style: [
        styles2.successText,
        { color: theme.tokens?.successText || "#22c55e" }
      ]
    },
    restoredCount > 0 ? `Restored ${restoredCount} purchase${restoredCount === 1 ? "" : "s"}` : "No purchases available to restore"
  ) : null);
}
var styles2 = StyleSheet2.create({
  container: {
    width: "100%"
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderWidth: 1
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600"
  },
  disabled: {
    opacity: 0.6
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center"
  },
  successText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center"
  }
});

// src/components/ManageSubscriptionsButton.tsx
import React4, { useMemo as useMemo5, useState as useState5 } from "react";
import {
  ActivityIndicator as ActivityIndicator3,
  StyleSheet as StyleSheet3,
  Text as Text3,
  TouchableOpacity as TouchableOpacity3,
  View as View3
} from "react-native";
function getDefaultManageLabel() {
  return "Manage Subscription";
}
function ManageSubscriptionsButton({
  product,
  distributionChannel,
  label,
  disabled = false,
  onOpen,
  onError,
  style,
  textStyle,
  loadingColor = "#111827"
}) {
  const { config, storeBillingManager } = useCedrosContext();
  const theme = useCedrosTheme();
  const [error, setError] = useState5(null);
  const [isLoading, setIsLoading] = useState5(false);
  const method = resolveNativeStoreMethod(distributionChannel);
  const handler = method ? config.paymentPolicy?.nativeHandlers?.[method] : void 0;
  const buttonLabel = label || getDefaultManageLabel();
  const executeOpen = useMemo5(
    () => async () => {
      if (!method) {
        const unsupportedError = "Subscription management is only available for Apple App Store and Google Play Store products.";
        setError(unsupportedError);
        onError?.(unsupportedError);
        return;
      }
      if (!handler?.openManageSubscriptions && config.paymentPolicy?.storeBilling?.enabled === false) {
        const missingHandlerError = method === "apple_iap" ? "Apple subscription management is disabled for this build and no override management handler is configured." : "Google Play subscription management is disabled for this build and no override management handler is configured.";
        setError(missingHandlerError);
        onError?.(missingHandlerError);
        return;
      }
      if (product && !isManageableStoreSubscription(product)) {
        const invalidProductError = "Subscription management is only available for store-managed subscription products.";
        setError(invalidProductError);
        onError?.(invalidProductError);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        if (handler?.openManageSubscriptions) {
          await handler.openManageSubscriptions({
            product,
            distributionChannel
          });
        } else {
          await storeBillingManager.openManageSubscriptions({
            product,
            distributionChannel
          });
        }
        onOpen?.();
      } catch (openError) {
        const message = openError instanceof Error ? openError.message : "Unable to open subscription management";
        setError(message);
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      config.paymentPolicy?.storeBilling?.enabled,
      distributionChannel,
      handler,
      method,
      onError,
      onOpen,
      product,
      storeBillingManager
    ]
  );
  const dedupeKey = useMemo5(
    () => `manage-${distributionChannel}-${product?.id ?? "default"}`,
    [distributionChannel, product?.id]
  );
  const handlePress = useMemo5(
    () => createDedupedClickHandler(dedupeKey, executeOpen),
    [dedupeKey, executeOpen]
  );
  return /* @__PURE__ */ React4.createElement(View3, { style: [styles3.container, style] }, /* @__PURE__ */ React4.createElement(
    TouchableOpacity3,
    {
      onPress: handlePress,
      disabled: disabled || isLoading,
      style: [
        styles3.button,
        {
          backgroundColor: theme.tokens?.modalBackground || "#ffffff",
          borderColor: theme.tokens?.surfaceBorder || "#d1d5db"
        },
        (disabled || isLoading) && styles3.disabled
      ],
      activeOpacity: 0.8
    },
    isLoading ? /* @__PURE__ */ React4.createElement(ActivityIndicator3, { color: loadingColor, size: "small" }) : /* @__PURE__ */ React4.createElement(
      Text3,
      {
        style: [
          styles3.buttonText,
          { color: theme.tokens?.surfaceText || "#111827" },
          textStyle
        ]
      },
      buttonLabel
    )
  ), error ? /* @__PURE__ */ React4.createElement(
    Text3,
    {
      style: [
        styles3.errorText,
        { color: theme.tokens?.errorText || "#ef4444" }
      ]
    },
    error
  ) : null);
}
var styles3 = StyleSheet3.create({
  container: {
    width: "100%"
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderWidth: 1
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600"
  },
  disabled: {
    opacity: 0.6
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center"
  }
});

// src/components/SubscribeButton.tsx
import React5, { useCallback as useCallback2, useMemo as useMemo7 } from "react";
import {
  View as View4,
  Text as Text4,
  TouchableOpacity as TouchableOpacity4,
  StyleSheet as StyleSheet4,
  ActivityIndicator as ActivityIndicator4
} from "react-native";

// src/hooks/useSubscription.ts
import { useState as useState6, useCallback } from "react";
function useSubscription() {
  const { subscriptionManager } = useCedrosContext();
  const [state, setState] = useState6({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null
  });
  const processSubscription = useCallback(
    async (request) => {
      setState((prev) => ({
        ...prev,
        status: "loading",
        error: null
      }));
      const result = await subscriptionManager.processSubscription(request);
      setState((prev) => ({
        ...prev,
        status: result.success ? "success" : "error",
        error: result.success ? null : result.error || "Subscription failed",
        sessionId: result.success ? result.transactionId || null : null
      }));
      return result;
    },
    [subscriptionManager]
  );
  const processMobileSubscription = useCallback(
    async (request) => {
      setState((prev) => ({
        ...prev,
        status: "loading",
        error: null
      }));
      const result = await subscriptionManager.processMobileSubscription(request);
      setState((prev) => ({
        ...prev,
        status: result.success ? "success" : "error",
        error: result.success ? null : result.error || "Mobile subscription failed",
        sessionId: result.success ? result.transactionId || null : null
      }));
      return result;
    },
    [subscriptionManager]
  );
  const checkStatus = useCallback(
    async (request) => {
      setState((prev) => ({
        ...prev,
        status: "checking",
        error: null
      }));
      try {
        const response = await subscriptionManager.checkSubscriptionStatus(request);
        setState((prev) => ({
          ...prev,
          status: response.active ? "success" : "idle",
          subscriptionStatus: response.status,
          expiresAt: response.expiresAt || response.currentPeriodEnd || null
        }));
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to check subscription status";
        setState((prev) => ({
          ...prev,
          status: "error",
          error: errorMessage
        }));
        throw error;
      }
    },
    [subscriptionManager]
  );
  const requestQuote = useCallback(
    async (resource, interval, options) => {
      setState((prev) => ({
        ...prev,
        status: "loading",
        error: null
      }));
      try {
        const quote = await subscriptionManager.requestSubscriptionQuote(
          resource,
          interval,
          options
        );
        setState((prev) => ({
          ...prev,
          status: "idle"
        }));
        return quote;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get subscription quote";
        setState((prev) => ({
          ...prev,
          status: "error",
          error: errorMessage
        }));
        throw error;
      }
    },
    [subscriptionManager]
  );
  const reset = useCallback(() => {
    setState({
      status: "idle",
      error: null,
      sessionId: null,
      subscriptionStatus: null,
      expiresAt: null
    });
  }, []);
  return {
    ...state,
    processSubscription,
    processMobileSubscription,
    checkStatus,
    requestQuote,
    reset
  };
}

// src/i18n/useTranslation.tsx
import { useState as useState7, useEffect as useEffect3, useMemo as useMemo6 } from "react";

// src/i18n/index.ts
var TRANSLATION_MAP = {
  en: () => require_en(),
  ar: () => require_ar(),
  bn: () => require_bn(),
  de: () => require_de(),
  es: () => require_es(),
  fil: () => require_fil(),
  fr: () => require_fr(),
  he: () => require_he(),
  id: () => require_id(),
  hi: () => require_hi(),
  in: () => require_hi(),
  it: () => require_it(),
  ja: () => require_ja(),
  jp: () => require_ja(),
  ko: () => require_ko(),
  kr: () => require_ko(),
  ms: () => require_ms(),
  nl: () => require_nl(),
  pa: () => require_pa(),
  pl: () => require_pl(),
  pt: () => require_pt(),
  ru: () => require_ru(),
  ta: () => require_ta(),
  th: () => require_th(),
  tr: () => require_tr(),
  uk: () => require_uk(),
  ur: () => require_ur(),
  vi: () => require_vi(),
  vn: () => require_vi(),
  zh: () => require_zh()
};
var translationCache = /* @__PURE__ */ new Map();
function loadTranslationFile(locale) {
  if (translationCache.has(locale)) {
    return translationCache.get(locale);
  }
  const loader = TRANSLATION_MAP[locale];
  if (!loader) {
    return null;
  }
  try {
    const data = loader();
    translationCache.set(locale, data);
    translationCache.set(normalizeLocale(data.locale), data);
    return data;
  } catch {
    return null;
  }
}
function loadTranslation(locale) {
  for (const candidate of getLocaleFileCandidates(locale)) {
    const translation = loadTranslationFile(candidate);
    if (translation) {
      return translation;
    }
  }
  return null;
}
function mergeTranslations(fallback, translation) {
  return {
    ...fallback,
    ...translation,
    ui: { ...fallback.ui, ...translation.ui },
    errors: { ...fallback.errors, ...translation.errors },
    validation: { ...fallback.validation, ...translation.validation },
    wallet: { ...fallback.wallet, ...translation.wallet }
  };
}
function getEnglishTranslations() {
  const fallback = loadTranslationFile("en");
  if (!fallback) {
    throw new Error("Critical: No translation files found, not even en.json");
  }
  return fallback;
}
function getAvailableLocales() {
  return Array.from(new Set(Object.keys(TRANSLATION_MAP).map(normalizeLocale))).sort();
}
function detectLocale(deviceLocale) {
  if (deviceLocale) {
    return normalizeLocale(deviceLocale);
  }
  return getDeviceLocaleFallback();
}
function loadLocale(locale) {
  const fallback = getEnglishTranslations();
  const translation = loadTranslation(normalizeLocale(locale));
  if (translation) {
    return mergeTranslations(fallback, translation);
  }
  return fallback;
}
function lookupTranslation(translations, key) {
  const parts = key.split(".");
  let value = translations;
  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = value[part];
    } else {
      return void 0;
    }
  }
  return value;
}
function createTranslator(translations, fallbackTranslations = getEnglishTranslations()) {
  return (key, params) => {
    const value = lookupTranslation(translations, key) ?? lookupTranslation(fallbackTranslations, key);
    if (typeof value !== "string") {
      return key;
    }
    if (params) {
      return Object.entries(params).reduce(
        (str, [paramKey, paramValue]) => str.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue)),
        value
      );
    }
    return value;
  };
}
function getLocalizedError(errorCode, translations, includeAction = true) {
  const error = translations.errors[errorCode];
  if (!error) {
    const fallback = getUserFriendlyError(errorCode);
    return includeAction && fallback.action ? `${fallback.message} ${fallback.action}` : fallback.message;
  }
  if (includeAction && error.action) {
    return `${error.message} ${error.action}`;
  }
  return error.message;
}

// src/i18n/useTranslation.tsx
var import_en = __toESM(require_en());
var FALLBACK_TRANSLATIONS = import_en.default;
function useTranslation(requestedLocale) {
  const [translations, setTranslations] = useState7(null);
  const [isLoading, setIsLoading] = useState7(true);
  const locale = useMemo6(() => normalizeLocale(requestedLocale || detectLocale()), [requestedLocale]);
  useEffect3(() => {
    let cancelled = false;
    setIsLoading(true);
    try {
      const data = loadLocale(locale);
      if (!cancelled) {
        setTranslations(data);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[CedrosPay] Failed to load translations:", error);
      if (!cancelled) {
        setIsLoading(false);
      }
    }
    return () => {
      cancelled = true;
    };
  }, [locale]);
  const t = useMemo6(() => {
    if (!translations) {
      return createTranslator(FALLBACK_TRANSLATIONS);
    }
    return createTranslator(translations, FALLBACK_TRANSLATIONS);
  }, [translations]);
  return {
    t,
    locale,
    isLoading,
    translations
  };
}
function useLocalizedError(errorCode, includeAction = true) {
  const { translations } = useTranslation();
  if (!translations) {
    const fallback = getUserFriendlyError(errorCode);
    return includeAction && fallback.action ? `${fallback.message} ${fallback.action}` : fallback.message;
  }
  const error = translations.errors[errorCode];
  if (!error) {
    const fallback = getUserFriendlyError(errorCode);
    return includeAction && fallback.action ? `${fallback.message} ${fallback.action}` : fallback.message;
  }
  if (includeAction && error.action) {
    return `${error.message} ${error.action}`;
  }
  return error.message;
}

// src/i18n/useCedrosTranslation.ts
function useCedrosTranslation() {
  const context = useCedrosContext();
  return useTranslation(context.config?.locale);
}

// src/components/SubscribeButton.tsx
function SubscribeButton({
  resource,
  flow = "redirect_checkout",
  interval,
  intervalDays,
  trialDays,
  successUrl,
  cancelUrl,
  metadata,
  customerEmail,
  couponCode,
  label,
  disabled = false,
  onAttempt,
  onSuccess,
  onError,
  style,
  textStyle,
  loadingColor = "#ffffff"
}) {
  const { status, error, sessionId, processSubscription, processMobileSubscription } = useSubscription();
  const theme = useCedrosTheme();
  const { t, translations } = useCedrosTranslation();
  const buttonLabel = label || t("ui.subscribe");
  const errorCode = error && typeof error !== "string" ? error?.code ?? null : null;
  const getErrorMessage = (code) => {
    if (!code || !translations) return "";
    const errorData = translations.errors[code];
    if (!errorData) return "";
    return errorData.action ? `${errorData.message} ${errorData.action}` : errorData.message;
  };
  const localizedError = error ? typeof error === "string" ? error : getErrorMessage(errorCode) : null;
  const executeSubscription = useCallback2(async () => {
    getLogger().debug("[SubscribeButton] executeSubscription:", {
      resource,
      interval,
      intervalDays,
      trialDays,
      couponCode
    });
    emitPaymentStart("stripe", resource);
    if (onAttempt) {
      onAttempt("stripe");
    }
    emitPaymentProcessing("stripe", resource);
    const result = flow === "payment_sheet" ? await processMobileSubscription({
      resource,
      interval,
      intervalDays,
      trialDays,
      customerEmail,
      metadata,
      couponCode
    }) : await processSubscription({
      resource,
      interval,
      intervalDays,
      trialDays,
      customerEmail,
      metadata,
      couponCode,
      successUrl,
      cancelUrl
    });
    if (result.success && result.transactionId) {
      emitPaymentSuccess("stripe", result.transactionId, resource);
      if (onSuccess) {
        onSuccess(result.transactionId);
      }
    } else if (!result.success && result.error) {
      emitPaymentError("stripe", result.error, resource);
      if (onError) {
        onError(result.error);
      }
    }
  }, [
    resource,
    interval,
    intervalDays,
    trialDays,
    customerEmail,
    metadata,
    couponCode,
    flow,
    successUrl,
    cancelUrl,
    processSubscription,
    processMobileSubscription,
    onAttempt,
    onSuccess,
    onError
  ]);
  const buttonId = useMemo7(() => {
    return `subscribe-${resource}-${interval}`;
  }, [resource, interval]);
  const handlePress = useMemo7(
    () => createDedupedClickHandler(buttonId, executeSubscription),
    [buttonId, executeSubscription]
  );
  const isLoading = status === "loading";
  const isDisabled = disabled || isLoading;
  return /* @__PURE__ */ React5.createElement(View4, { style: [styles4.container, style] }, /* @__PURE__ */ React5.createElement(
    TouchableOpacity4,
    {
      onPress: handlePress,
      disabled: isDisabled,
      style: [
        styles4.button,
        theme.unstyled ? null : { backgroundColor: theme.tokens?.stripeBackground || "#635BFF" },
        isDisabled && styles4.disabled
      ],
      activeOpacity: 0.8,
      accessible: true,
      accessibilityRole: "button",
      accessibilityLabel: buttonLabel,
      accessibilityState: { disabled: isDisabled, busy: isLoading }
    },
    isLoading ? /* @__PURE__ */ React5.createElement(ActivityIndicator4, { color: loadingColor, size: "small" }) : /* @__PURE__ */ React5.createElement(Text4, { style: [styles4.buttonText, textStyle] }, buttonLabel)
  ), localizedError && /* @__PURE__ */ React5.createElement(Text4, { style: [styles4.errorText, { color: theme.tokens?.errorText || "#ef4444" }] }, localizedError), flow === "redirect_checkout" && sessionId && /* @__PURE__ */ React5.createElement(Text4, { style: [styles4.successText, { color: theme.tokens?.successText || "#22c55e" }] }, t("ui.redirecting_to_checkout")));
}
var styles4 = StyleSheet4.create({
  container: {
    width: "100%"
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  },
  disabled: {
    opacity: 0.6
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center"
  },
  successText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center"
  }
});

// src/components/CreditsSubscribeButton.tsx
import React6, { useCallback as useCallback4, useMemo as useMemo8, useEffect as useEffect4, useRef as useRef3 } from "react";
import {
  View as View5,
  Text as Text5,
  TouchableOpacity as TouchableOpacity5,
  StyleSheet as StyleSheet5,
  ActivityIndicator as ActivityIndicator5
} from "react-native";

// src/hooks/useCreditsSubscription.ts
import { useState as useState8, useCallback as useCallback3 } from "react";
function useCreditsSubscription() {
  const { subscriptionManager } = useCedrosContext();
  const { creditsManager } = useCedrosContext();
  const [state, setState] = useState8({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null,
    creditsRequirement: null
  });
  const checkStatus = useCallback3(
    async (resource, userId) => {
      setState((prev) => ({
        ...prev,
        status: "checking",
        error: null
      }));
      try {
        const response = await subscriptionManager.checkSubscriptionStatus({
          resource,
          userId
        });
        setState((prev) => ({
          ...prev,
          status: response.active ? "success" : "idle",
          subscriptionStatus: response.status,
          expiresAt: response.expiresAt || response.currentPeriodEnd || null
        }));
        return response;
      } catch (error) {
        const errorMessage = formatError(error, "Failed to check subscription status");
        setState((prev) => ({
          ...prev,
          status: "error",
          error: errorMessage
        }));
        return null;
      }
    },
    [subscriptionManager]
  );
  const requestQuote = useCallback3(
    async (resource, _interval, options) => {
      setState((prev) => ({
        ...prev,
        status: "loading",
        error: null
      }));
      try {
        const creditsRequirement = await creditsManager.requestQuote(
          resource,
          options?.couponCode
        );
        setState((prev) => ({
          ...prev,
          status: "idle",
          creditsRequirement
        }));
        return creditsRequirement;
      } catch (error) {
        const errorMessage = formatError(error, "Failed to get subscription quote");
        setState((prev) => ({
          ...prev,
          status: "error",
          error: errorMessage
        }));
        return null;
      }
    },
    [creditsManager]
  );
  const processPayment = useCallback3(
    async (resource, interval, authToken, options) => {
      if (!authToken) {
        const error = "Authentication required for credits payment";
        setState((prev) => ({ ...prev, status: "error", error }));
        return { success: false, error };
      }
      setState((prev) => ({
        ...prev,
        status: "loading",
        error: null
      }));
      try {
        const result = await creditsManager.processPayment(
          resource,
          authToken,
          options?.couponCode,
          {
            interval,
            ...options?.intervalDays && { intervalDays: String(options.intervalDays) }
          }
        );
        if (result.success) {
          setState({
            status: "success",
            error: null,
            sessionId: result.transactionId || null,
            subscriptionStatus: "active",
            expiresAt: null,
            // Will be updated on next status check
            creditsRequirement: null
          });
        } else {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: result.error || "Credits subscription payment failed"
          }));
        }
        return result;
      } catch (error) {
        const errorMessage = formatError(error, "Credits subscription payment failed");
        setState((prev) => ({
          ...prev,
          status: "error",
          error: errorMessage
        }));
        return { success: false, error: errorMessage };
      }
    },
    [creditsManager]
  );
  const reset = useCallback3(() => {
    setState({
      status: "idle",
      error: null,
      sessionId: null,
      subscriptionStatus: null,
      expiresAt: null,
      creditsRequirement: null
    });
  }, []);
  return {
    ...state,
    checkStatus,
    requestQuote,
    processPayment,
    reset
  };
}

// src/components/CreditsSubscribeButton.tsx
function CreditsSubscribeButton({
  resource,
  interval,
  intervalDays,
  authToken,
  userId,
  couponCode,
  label,
  disabled = false,
  onAttempt,
  onSuccess,
  onError,
  style,
  textStyle,
  loadingColor = "#ffffff",
  hideMessages = false,
  autoCheckStatus = false
}) {
  const {
    status,
    error,
    subscriptionStatus,
    expiresAt,
    checkStatus,
    processPayment
  } = useCreditsSubscription();
  const theme = useCedrosTheme();
  const { t, translations } = useCedrosTranslation();
  const checkStatusRef = useRef3(checkStatus);
  useEffect4(() => {
    checkStatusRef.current = checkStatus;
  }, [checkStatus]);
  useEffect4(() => {
    if (autoCheckStatus && userId) {
      getLogger().debug("[CreditsSubscribeButton] Auto-checking subscription status", {
        resource,
        userId
      });
      checkStatusRef.current(resource, userId);
    }
  }, [autoCheckStatus, userId, resource]);
  const buttonLabel = label || t("ui.subscribe_with_credits") || "Subscribe with Credits";
  const errorCode = error && typeof error !== "string" ? error?.code ?? null : null;
  const getErrorMessage = (code) => {
    if (!code || !translations) return "";
    const errorData = translations.errors[code];
    if (!errorData) return "";
    return errorData.action ? `${errorData.message} ${errorData.action}` : errorData.message;
  };
  const localizedError = error ? typeof error === "string" ? error : getErrorMessage(errorCode) : null;
  const executeSubscriptionFlow = useCallback4(async () => {
    getLogger().debug("[CreditsSubscribeButton] executeSubscriptionFlow", {
      resource,
      interval,
      intervalDays,
      hasAuthToken: !!authToken
    });
    emitPaymentStart("credits", resource);
    if (onAttempt) {
      onAttempt("credits");
    }
    if (!authToken) {
      const errorMsg = "Authentication required: please log in to subscribe with credits";
      getLogger().error("[CreditsSubscribeButton]", errorMsg);
      emitPaymentError("credits", errorMsg, resource);
      if (onError) {
        onError(errorMsg);
      }
      return;
    }
    emitPaymentProcessing("credits", resource);
    const result = await processPayment(resource, interval, authToken, {
      couponCode,
      intervalDays
    });
    if (result.success && result.transactionId) {
      emitPaymentSuccess("credits", result.transactionId, resource);
      if (onSuccess) {
        onSuccess(result.transactionId);
      }
    } else if (!result.success && result.error) {
      emitPaymentError("credits", result.error, resource);
      if (onError) {
        onError(result.error);
      }
    }
  }, [
    resource,
    interval,
    intervalDays,
    authToken,
    couponCode,
    processPayment,
    onAttempt,
    onSuccess,
    onError
  ]);
  const buttonId = useMemo8(() => {
    return `credits-subscribe-${resource}-${interval}`;
  }, [resource, interval]);
  const handlePress = useMemo8(
    () => createDedupedClickHandler(buttonId, executeSubscriptionFlow, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
    }),
    [buttonId, executeSubscriptionFlow]
  );
  const isProcessing = status === "loading" || status === "checking";
  const isSubscribed = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const isDisabled = disabled || isProcessing || isSubscribed;
  let displayLabel = buttonLabel;
  if (isProcessing) {
    displayLabel = t("ui.processing");
  } else if (isSubscribed && expiresAt) {
    const expiryDate = new Date(expiresAt).toLocaleDateString();
    displayLabel = `${t("ui.subscribed_until")} ${expiryDate}`;
  } else if (isSubscribed) {
    displayLabel = t("ui.subscribed");
  }
  return /* @__PURE__ */ React6.createElement(View5, { style: [styles5.container, style] }, /* @__PURE__ */ React6.createElement(
    TouchableOpacity5,
    {
      onPress: handlePress,
      disabled: isDisabled,
      style: [
        styles5.button,
        theme.unstyled ? null : { backgroundColor: theme.tokens?.cryptoBackground || "#14b8a6" },
        isDisabled && styles5.disabled
      ],
      activeOpacity: 0.8,
      accessible: true,
      accessibilityRole: "button",
      accessibilityLabel: displayLabel,
      accessibilityState: { disabled: isDisabled, busy: isProcessing }
    },
    isProcessing ? /* @__PURE__ */ React6.createElement(ActivityIndicator5, { color: loadingColor, size: "small" }) : /* @__PURE__ */ React6.createElement(Text5, { style: [styles5.buttonText, textStyle] }, displayLabel)
  ), !hideMessages && localizedError && /* @__PURE__ */ React6.createElement(Text5, { style: [styles5.errorText, { color: theme.tokens?.errorText || "#ef4444" }] }, localizedError), !hideMessages && isSubscribed && /* @__PURE__ */ React6.createElement(Text5, { style: [styles5.successText, { color: theme.tokens?.successText || "#22c55e" }] }, t("ui.subscription_active")));
}
var styles5 = StyleSheet5.create({
  container: {
    width: "100%"
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  },
  disabled: {
    opacity: 0.6
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center"
  },
  successText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center"
  }
});

// src/components/CryptoSubscribeButton.tsx
import React9, { useCallback as useCallback7, useEffect as useEffect6, useMemo as useMemo9 } from "react";
import {
  ActivityIndicator as ActivityIndicator6,
  StyleSheet as StyleSheet8,
  Text as Text8,
  TouchableOpacity as TouchableOpacity8,
  View as View8
} from "react-native";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet as useWallet2 } from "@solana/wallet-adapter-react";

// src/hooks/useCryptoSubscription.ts
import { useState as useState9, useCallback as useCallback5 } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
function useCryptoSubscription() {
  const { subscriptionManager } = useCedrosContext();
  const { x402Manager, walletManager } = useCedrosContext();
  const { publicKey, signTransaction } = useWallet();
  const [state, setState] = useState9({
    status: "idle",
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null
  });
  const [quote, setQuote] = useState9(null);
  const validateWalletConnection = useCallback5(() => {
    if (!publicKey) {
      const error = "Wallet not connected";
      setState((prev) => ({ ...prev, status: "error", error }));
      return { valid: false, error };
    }
    if (!signTransaction) {
      const error = "Wallet does not support signing";
      setState((prev) => ({ ...prev, status: "error", error }));
      return { valid: false, error };
    }
    return { valid: true };
  }, [publicKey, signTransaction]);
  const checkStatus = useCallback5(
    async (resource) => {
      if (!publicKey) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Wallet not connected"
        }));
        return null;
      }
      setState((prev) => ({
        ...prev,
        status: "checking",
        error: null
      }));
      try {
        const response = await subscriptionManager.checkSubscriptionStatus({
          resource,
          userId: publicKey.toString()
        });
        setState((prev) => ({
          ...prev,
          status: response.active ? "success" : "idle",
          subscriptionStatus: response.status,
          expiresAt: response.expiresAt || response.currentPeriodEnd || null
        }));
        return response;
      } catch (error) {
        const errorMessage = formatError(error, "Failed to check subscription status");
        setState((prev) => ({
          ...prev,
          status: "error",
          error: errorMessage
        }));
        return null;
      }
    },
    [publicKey, subscriptionManager]
  );
  const requestQuote = useCallback5(
    async (resource, interval, options) => {
      setState((prev) => ({
        ...prev,
        status: "loading",
        error: null
      }));
      try {
        const fetchedQuote = await subscriptionManager.requestSubscriptionQuote(
          resource,
          interval,
          options
        );
        setQuote(fetchedQuote);
        setState((prev) => ({
          ...prev,
          status: "idle"
        }));
        return fetchedQuote;
      } catch (error) {
        const errorMessage = formatError(error, "Failed to get subscription quote");
        setState((prev) => ({
          ...prev,
          status: "error",
          error: errorMessage
        }));
        return null;
      }
    },
    [subscriptionManager]
  );
  const processPayment = useCallback5(
    async (resource, interval, options) => {
      const validation = validateWalletConnection();
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      setState((prev) => ({
        ...prev,
        status: "loading",
        error: null
      }));
      try {
        const subscriptionQuote = await subscriptionManager.requestSubscriptionQuote(
          resource,
          interval,
          options
        );
        setQuote(subscriptionQuote);
        const requirement = subscriptionQuote.requirement;
        if (!x402Manager.validateRequirement(requirement)) {
          throw new Error("Invalid subscription quote received from server");
        }
        const isGasless = !!requirement.extra?.feePayer;
        let result;
        if (isGasless) {
          const { transaction: txBase64, blockhash } = await x402Manager.buildGaslessTransaction({
            resourceId: resource,
            userWallet: publicKey.toString(),
            feePayer: requirement.extra.feePayer,
            couponCode: options?.couponCode
          });
          const transaction = walletManager.deserializeTransaction(txBase64);
          const partialTx = await walletManager.partiallySignTransaction({
            transaction,
            signTransaction,
            blockhash
          });
          result = await x402Manager.submitGaslessTransaction({
            resource,
            partialTx,
            couponCode: options?.couponCode,
            resourceType: "regular",
            requirement
          });
        } else {
          const transaction = await walletManager.buildTransaction({
            requirement,
            payerPublicKey: publicKey
          });
          const signedTx = await walletManager.signTransaction({
            transaction,
            signTransaction
          });
          const paymentPayload = walletManager.buildPaymentPayload({
            requirement,
            signedTx,
            payerPublicKey: publicKey
          });
          result = await x402Manager.submitPayment({
            resource,
            payload: paymentPayload,
            couponCode: options?.couponCode,
            resourceType: "regular"
          });
        }
        if (result.success) {
          const statusResponse = await subscriptionManager.checkSubscriptionStatus({
            resource,
            userId: publicKey.toString()
          });
          setState({
            status: "success",
            error: null,
            sessionId: result.transactionId || null,
            subscriptionStatus: statusResponse.status,
            expiresAt: statusResponse.expiresAt || statusResponse.currentPeriodEnd || null
          });
        } else {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: result.error || "Subscription payment failed"
          }));
        }
        return result;
      } catch (error) {
        const errorMessage = formatError(error, "Subscription payment failed");
        setState((prev) => ({
          ...prev,
          status: "error",
          error: errorMessage
        }));
        return { success: false, error: errorMessage };
      }
    },
    [
      validateWalletConnection,
      subscriptionManager,
      x402Manager,
      walletManager,
      publicKey,
      signTransaction
    ]
  );
  const reset = useCallback5(() => {
    setState({
      status: "idle",
      error: null,
      sessionId: null,
      subscriptionStatus: null,
      expiresAt: null
    });
    setQuote(null);
  }, []);
  return {
    ...state,
    quote,
    checkStatus,
    requestQuote,
    processPayment,
    reset
  };
}

// src/components/crypto/CryptoWalletControls.tsx
import React7 from "react";
import { StyleSheet as StyleSheet6, Text as Text6, TouchableOpacity as TouchableOpacity6, View as View6 } from "react-native";
function CryptoWalletControls({
  changeLabel,
  disconnectLabel,
  onChangeWallet,
  onDisconnect
}) {
  return /* @__PURE__ */ React7.createElement(View6, { style: styles6.walletControls }, /* @__PURE__ */ React7.createElement(TouchableOpacity6, { onPress: onChangeWallet, accessible: true, accessibilityRole: "button" }, /* @__PURE__ */ React7.createElement(Text6, { style: styles6.walletControlText }, changeLabel)), /* @__PURE__ */ React7.createElement(TouchableOpacity6, { onPress: onDisconnect, accessible: true, accessibilityRole: "button" }, /* @__PURE__ */ React7.createElement(Text6, { style: styles6.walletControlText }, disconnectLabel)));
}
var styles6 = StyleSheet6.create({
  walletControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8
  },
  walletControlText: {
    fontSize: 12,
    color: "#6b7280",
    textDecorationLine: "underline"
  }
});

// src/components/crypto/CryptoWalletSelectorModal.tsx
import React8 from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet as StyleSheet7,
  Text as Text7,
  TouchableOpacity as TouchableOpacity7,
  View as View7
} from "react-native";
function CryptoWalletSelectorModal({
  visible,
  wallets,
  title,
  closeLabel,
  onSelectWallet,
  onClose
}) {
  return /* @__PURE__ */ React8.createElement(Modal, { visible, transparent: true, animationType: "fade", onRequestClose: onClose }, /* @__PURE__ */ React8.createElement(View7, { style: styles7.modalOverlay }, /* @__PURE__ */ React8.createElement(View7, { style: styles7.modalContent }, /* @__PURE__ */ React8.createElement(View7, { style: styles7.modalHeader }, /* @__PURE__ */ React8.createElement(Text7, { style: styles7.modalTitle }, title), /* @__PURE__ */ React8.createElement(
    TouchableOpacity7,
    {
      onPress: onClose,
      style: styles7.closeButton,
      accessible: true,
      accessibilityRole: "button",
      accessibilityLabel: closeLabel
    },
    /* @__PURE__ */ React8.createElement(Text7, { style: styles7.closeButtonText }, "x")
  )), /* @__PURE__ */ React8.createElement(ScrollView, { style: styles7.walletList }, wallets.map((wallet) => /* @__PURE__ */ React8.createElement(
    TouchableOpacity7,
    {
      key: wallet.adapter.name,
      onPress: () => onSelectWallet(wallet.adapter.name),
      style: styles7.walletOption,
      accessible: true,
      accessibilityRole: "button",
      accessibilityLabel: wallet.adapter.name
    },
    /* @__PURE__ */ React8.createElement(View7, { style: styles7.walletIcon }, wallet.adapter.icon ? /* @__PURE__ */ React8.createElement(
      Image,
      {
        source: { uri: wallet.adapter.icon },
        style: styles7.walletIconImage,
        resizeMode: "contain"
      }
    ) : null),
    /* @__PURE__ */ React8.createElement(Text7, { style: styles7.walletName }, wallet.adapter.name)
  ))))));
}
var styles7 = StyleSheet7.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827"
  },
  closeButton: {
    padding: 4
  },
  closeButtonText: {
    fontSize: 24,
    color: "#6b7280",
    lineHeight: 24
  },
  walletList: {
    maxHeight: 300
  },
  walletOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  walletIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  walletIconImage: {
    width: 24,
    height: 24
  },
  walletName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827"
  }
});

// src/components/crypto/useWalletConnectionFlow.ts
import { useCallback as useCallback6, useEffect as useEffect5, useRef as useRef4, useState as useState10 } from "react";
var DEFAULT_TIMEOUT_MS = 15e3;
var POLL_INTERVAL_MS = 25;
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function useWalletConnectionFlow({
  connected,
  wallet,
  publicKey,
  connect,
  disconnect,
  select,
  logPrefix,
  walletSelectionTimeoutMs = DEFAULT_TIMEOUT_MS
}) {
  const [showWalletSelector, setShowWalletSelector] = useState10(false);
  const stateRef = useRef4({ connected, wallet, publicKey, connect, disconnect, select });
  const selectionWaiterRef = useRef4(null);
  stateRef.current = { connected, wallet, publicKey, connect, disconnect, select };
  useEffect5(() => {
    return () => {
      selectionWaiterRef.current?.reject(new Error("Wallet selection cancelled"));
      selectionWaiterRef.current = null;
    };
  }, []);
  const waitForState = useCallback6(async (isReady, timeoutMessage) => {
    const startedAt = Date.now();
    while (!isReady(stateRef.current)) {
      if (Date.now() - startedAt > walletSelectionTimeoutMs) {
        throw new Error(timeoutMessage);
      }
      await delay(POLL_INTERVAL_MS);
    }
    return stateRef.current;
  }, [walletSelectionTimeoutMs]);
  const waitForWalletSelection = useCallback6(() => new Promise((resolve, reject) => {
    selectionWaiterRef.current?.reject(new Error("Wallet selection replaced"));
    selectionWaiterRef.current = { resolve, reject };
    setShowWalletSelector(true);
  }), []);
  const connectSelectedWallet = useCallback6(async () => {
    const current = stateRef.current;
    if (current.connected && current.wallet && current.publicKey) return;
    if (!current.wallet) throw new Error("No wallet selected");
    emitWalletConnect(current.wallet.adapter.name);
    await current.connect();
    const next = await waitForState(
      (state) => Boolean(state.connected && state.wallet && state.publicKey),
      "Timed out waiting for wallet connection"
    );
    if (!next.wallet || !next.publicKey) {
      throw new Error("Wallet did not finish connecting");
    }
    emitWalletConnected(next.wallet.adapter.name, next.publicKey.toString());
    getLogger().debug(`[${logPrefix}] Wallet connected`, next.wallet.adapter.name);
  }, [logPrefix, waitForState]);
  const selectWalletByName = useCallback6((walletName) => {
    setShowWalletSelector(false);
    stateRef.current.select(walletName);
    const waiter = selectionWaiterRef.current;
    if (waiter) {
      selectionWaiterRef.current = null;
      waiter.resolve(walletName);
      return;
    }
    void waitForState(
      (state) => state.wallet?.adapter.name === walletName,
      "Timed out waiting for wallet selection"
    ).then(() => connectSelectedWallet()).catch((error) => {
      const message = error instanceof Error ? error.message : "Failed to connect wallet";
      emitWalletError(message, walletName);
      getLogger().error(`[${logPrefix}] Wallet selection failed:`, error);
    });
  }, [connectSelectedWallet, logPrefix, waitForState]);
  const cancelWalletSelection = useCallback6(() => {
    setShowWalletSelector(false);
    selectionWaiterRef.current?.reject(new Error("Wallet selection cancelled"));
    selectionWaiterRef.current = null;
  }, []);
  const ensureConnectedWallet = useCallback6(async () => {
    if (stateRef.current.connected && stateRef.current.wallet && stateRef.current.publicKey) return;
    if (!stateRef.current.wallet) {
      const walletName = await waitForWalletSelection();
      await waitForState(
        (state) => state.wallet?.adapter.name === walletName,
        "Timed out waiting for wallet selection"
      );
    }
    await connectSelectedWallet();
  }, [connectSelectedWallet, waitForState, waitForWalletSelection]);
  const changeWallet = useCallback6(async () => {
    try {
      if (stateRef.current.connected) {
        await stateRef.current.disconnect();
      }
      stateRef.current.select(null);
      setShowWalletSelector(true);
    } catch (error) {
      getLogger().error(`[${logPrefix}] Failed to change wallet:`, error);
    }
  }, [logPrefix]);
  const disconnectWallet = useCallback6(async () => {
    try {
      await stateRef.current.disconnect();
    } catch (error) {
      getLogger().error(`[${logPrefix}] Failed to disconnect wallet:`, error);
    }
  }, [logPrefix]);
  return {
    showWalletSelector,
    ensureConnectedWallet,
    selectWalletByName,
    cancelWalletSelection,
    changeWallet,
    disconnectWallet
  };
}

// src/components/CryptoSubscribeButton.tsx
function CryptoSubscribeButton({
  resource,
  interval,
  intervalDays,
  couponCode,
  label,
  disabled = false,
  onAttempt,
  onSuccess,
  onError,
  style,
  textStyle,
  loadingColor = "#ffffff",
  hideMessages = false,
  autoCheckStatus = true
}) {
  const { connected, connecting, connect, disconnect, select, wallets, wallet, publicKey } = useWallet2();
  const {
    status,
    error,
    subscriptionStatus,
    expiresAt,
    checkStatus,
    processPayment
  } = useCryptoSubscription();
  const theme = useCedrosTheme();
  const { solanaError } = useCedrosContext();
  const { t, translations } = useCedrosTranslation();
  const installedWallets = useMemo9(
    () => wallets.filter(
      ({ readyState }) => readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable
    ),
    [wallets]
  );
  const {
    showWalletSelector,
    ensureConnectedWallet,
    selectWalletByName,
    cancelWalletSelection,
    changeWallet,
    disconnectWallet
  } = useWalletConnectionFlow({
    connected,
    wallet,
    publicKey,
    connect,
    disconnect,
    select: (walletName) => select(walletName),
    logPrefix: "CryptoSubscribeButton"
  });
  useEffect6(() => {
    if (autoCheckStatus && connected && publicKey) {
      getLogger().debug("[CryptoSubscribeButton] Auto-checking subscription status");
      void checkStatus(resource);
    }
  }, [autoCheckStatus, checkStatus, connected, publicKey, resource]);
  const getErrorMessage = useCallback7((code) => {
    if (!code || !translations) return "";
    const errorData = translations.errors[code];
    if (!errorData) return "";
    return errorData.action ? `${errorData.message} ${errorData.action}` : errorData.message;
  }, [translations]);
  const localizedError = error ? typeof error === "string" ? error : getErrorMessage(error?.code ?? null) : null;
  const localizedSolanaError = solanaError ? typeof solanaError === "string" ? solanaError : getErrorMessage(solanaError?.code ?? null) : null;
  const handleSubscriptionResult = useCallback7((result) => {
    if (result.success) {
      const transactionId = result.transactionId || "subscription-active";
      emitPaymentSuccess("crypto", transactionId, resource);
      onSuccess?.(transactionId);
      return;
    }
    const message = result.error || "Subscription payment failed";
    emitPaymentError("crypto", message, resource);
    onError?.(message);
  }, [onError, onSuccess, resource]);
  const executeSubscriptionFlow = useCallback7(async () => {
    emitPaymentStart("crypto", resource);
    onAttempt?.("crypto");
    if (solanaError) {
      emitPaymentError("crypto", solanaError, resource);
      onError?.(solanaError);
      return;
    }
    try {
      if (!connected) {
        if (!wallet && installedWallets.length === 0) {
          const message = "No wallets available";
          emitWalletError(message);
          emitPaymentError("crypto", message, resource);
          onError?.(message);
          return;
        }
        await ensureConnectedWallet();
      }
      emitPaymentProcessing("crypto", resource);
      const result = await processPayment(resource, interval, { couponCode, intervalDays });
      handleSubscriptionResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet";
      emitWalletError(message, wallet?.adapter.name);
      emitPaymentError("crypto", message, resource);
      onError?.(message);
    }
  }, [
    connected,
    couponCode,
    handleSubscriptionResult,
    installedWallets.length,
    interval,
    intervalDays,
    onAttempt,
    onError,
    processPayment,
    resource,
    solanaError,
    wallet,
    ensureConnectedWallet
  ]);
  const buttonId = useMemo9(() => `crypto-subscribe-${resource}-${interval}`, [interval, resource]);
  const handlePress = useMemo9(
    () => createDedupedClickHandler(buttonId, executeSubscriptionFlow, {
      cooldownMs: 200,
      deduplicationWindowMs: 0
    }),
    [buttonId, executeSubscriptionFlow]
  );
  const isProcessing = status === "loading" || status === "checking";
  const isSubscribed = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const isDisabled = disabled || isProcessing || connecting || Boolean(solanaError) || isSubscribed;
  const displayLabel = getDisplayLabel({
    baseLabel: label || t("ui.subscribe_with_crypto"),
    expiresAt,
    isProcessing,
    isSubscribed,
    t
  });
  return /* @__PURE__ */ React9.createElement(View8, { style: [styles8.container, style] }, /* @__PURE__ */ React9.createElement(
    TouchableOpacity8,
    {
      onPress: handlePress,
      disabled: isDisabled,
      style: [
        styles8.button,
        theme.unstyled ? null : { backgroundColor: theme.tokens?.cryptoBackground || "#14f195" },
        isDisabled && styles8.disabled
      ],
      activeOpacity: 0.8,
      accessible: true,
      accessibilityRole: "button",
      accessibilityLabel: displayLabel,
      accessibilityState: { disabled: isDisabled, busy: isProcessing }
    },
    isProcessing ? /* @__PURE__ */ React9.createElement(ActivityIndicator6, { color: loadingColor, size: "small" }) : /* @__PURE__ */ React9.createElement(Text8, { style: [styles8.buttonText, textStyle] }, displayLabel)
  ), /* @__PURE__ */ React9.createElement(
    CryptoWalletSelectorModal,
    {
      visible: showWalletSelector && !hideMessages,
      wallets: installedWallets,
      title: t("wallet.select_wallet"),
      closeLabel: t("ui.close"),
      onSelectWallet: selectWalletByName,
      onClose: cancelWalletSelection
    }
  ), connected && !hideMessages && !showWalletSelector ? /* @__PURE__ */ React9.createElement(
    CryptoWalletControls,
    {
      changeLabel: t("wallet.change"),
      disconnectLabel: t("ui.disconnect"),
      onChangeWallet: () => {
        void changeWallet();
      },
      onDisconnect: () => {
        void disconnectWallet();
      }
    }
  ) : null, !hideMessages && localizedSolanaError ? /* @__PURE__ */ React9.createElement(Text8, { style: [styles8.errorText, { color: theme.tokens?.errorText || "#ef4444" }] }, localizedSolanaError) : null, !hideMessages && localizedError ? /* @__PURE__ */ React9.createElement(Text8, { style: [styles8.errorText, { color: theme.tokens?.errorText || "#ef4444" }] }, localizedError) : null, !hideMessages && isSubscribed ? /* @__PURE__ */ React9.createElement(Text8, { style: [styles8.successText, { color: theme.tokens?.successText || "#22c55e" }] }, t("ui.subscription_active")) : null);
}
function getDisplayLabel({
  baseLabel,
  expiresAt,
  isProcessing,
  isSubscribed,
  t
}) {
  if (isProcessing) return t("ui.processing");
  if (isSubscribed && expiresAt) {
    return `${t("ui.subscribed_until")} ${new Date(expiresAt).toLocaleDateString()}`;
  }
  if (isSubscribed) return t("ui.subscribed");
  return baseLabel;
}
var styles8 = StyleSheet8.create({
  container: { width: "100%" },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48
  },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.6 },
  errorText: { marginTop: 8, fontSize: 14, textAlign: "center" },
  successText: { marginTop: 8, fontSize: 14, textAlign: "center" }
});

// src/components/SubscriptionManagementPanel.tsx
import React10, { useEffect as useEffect7, useCallback as useCallback9 } from "react";
import {
  View as View9,
  Text as Text9,
  TouchableOpacity as TouchableOpacity9,
  StyleSheet as StyleSheet9,
  ActivityIndicator as ActivityIndicator7,
  ScrollView as ScrollView2
} from "react-native";

// src/hooks/useSubscriptionManagement.ts
import { useState as useState11, useCallback as useCallback8, useRef as useRef5 } from "react";
import { Linking as Linking3 } from "react-native";
function useSubscriptionManagement() {
  const { subscriptionChangeManager } = useCedrosContext();
  const [state, setState] = useState11({
    status: "idle",
    error: null,
    subscription: null,
    changePreview: null,
    userId: null
  });
  const stateRef = useRef5(state);
  stateRef.current = state;
  const loadSubscription = useCallback8(
    async (resource, userId) => {
      setState((prev) => ({ ...prev, status: "loading", error: null }));
      try {
        const details = await subscriptionChangeManager.getDetails(resource, userId);
        setState((prev) => ({
          ...prev,
          status: "success",
          subscription: details,
          userId
        }));
        return details;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load subscription";
        setState((prev) => ({ ...prev, status: "error", error: errorMessage }));
        return null;
      }
    },
    [subscriptionChangeManager]
  );
  const previewChange = useCallback8(
    async (currentResource, newResource, userId, newInterval) => {
      setState((prev) => ({ ...prev, status: "loading", error: null }));
      try {
        const request = {
          currentResource,
          newResource,
          userId,
          newInterval
        };
        const preview = await subscriptionChangeManager.previewChange(request);
        setState((prev) => ({
          ...prev,
          status: "idle",
          changePreview: preview
        }));
        return preview;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to preview change";
        setState((prev) => ({ ...prev, status: "error", error: errorMessage }));
        return null;
      }
    },
    [subscriptionChangeManager]
  );
  const changeSubscription = useCallback8(
    async (options) => {
      const { subscription, userId } = stateRef.current;
      if (!subscription || !userId) {
        setState((prev) => ({ ...prev, status: "error", error: "No subscription loaded" }));
        return null;
      }
      setState((prev) => ({ ...prev, status: "loading", error: null }));
      try {
        const request = {
          currentResource: subscription.resource,
          newResource: options.newResource,
          userId,
          newInterval: options.newInterval,
          prorationBehavior: options.prorationBehavior,
          immediate: options.immediate
        };
        const response = await subscriptionChangeManager.changeSubscription(request);
        if (response.success) {
          setState((prev) => ({
            ...prev,
            status: "success",
            subscription: prev.subscription ? {
              ...prev.subscription,
              resource: response.newResource,
              interval: response.newInterval,
              status: response.status
            } : null,
            changePreview: null
          }));
        } else {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: response.error || "Failed to change subscription"
          }));
        }
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to change subscription";
        setState((prev) => ({ ...prev, status: "error", error: errorMessage }));
        return null;
      }
    },
    [subscriptionChangeManager]
  );
  const cancelSubscription = useCallback8(
    async (immediate) => {
      const { subscription, userId } = stateRef.current;
      if (!subscription || !userId) {
        setState((prev) => ({ ...prev, status: "error", error: "No subscription loaded" }));
        return null;
      }
      setState((prev) => ({ ...prev, status: "loading", error: null }));
      try {
        const request = {
          resource: subscription.resource,
          userId,
          immediate
        };
        const response = await subscriptionChangeManager.cancel(request);
        if (response.success) {
          const newStatus = immediate ? "canceled" : subscription.status;
          setState((prev) => ({
            ...prev,
            status: "success",
            subscription: prev.subscription ? {
              ...prev.subscription,
              status: newStatus,
              cancelAtPeriodEnd: !immediate
            } : null
          }));
        } else {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: response.error || "Failed to cancel subscription"
          }));
        }
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to cancel subscription";
        setState((prev) => ({ ...prev, status: "error", error: errorMessage }));
        return null;
      }
    },
    [subscriptionChangeManager]
  );
  const openBillingPortal = useCallback8(
    async (userId, returnUrl) => {
      setState((prev) => ({ ...prev, status: "loading", error: null }));
      try {
        const response = await subscriptionChangeManager.getBillingPortalUrl({
          userId,
          returnUrl
        });
        await Linking3.openURL(response.url);
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to open billing portal";
        setState((prev) => ({ ...prev, status: "error", error: errorMessage }));
        return null;
      }
    },
    [subscriptionChangeManager]
  );
  const clearPreview = useCallback8(() => {
    setState((prev) => ({ ...prev, changePreview: null }));
  }, []);
  const reset = useCallback8(() => {
    setState({
      status: "idle",
      error: null,
      subscription: null,
      changePreview: null,
      userId: null
    });
  }, []);
  return {
    ...state,
    loadSubscription,
    previewChange,
    changeSubscription,
    cancelSubscription,
    openBillingPortal,
    clearPreview,
    reset
  };
}

// src/components/SubscriptionManagementPanel.tsx
function formatAmount(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)} ${currency}`;
  }
}
function formatDate2(dateString) {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return dateString;
  }
}
function getStatusColor(status) {
  switch (status) {
    case "active":
      return "#22c55e";
    case "trialing":
      return "#3b82f6";
    case "past_due":
      return "#f59e0b";
    case "canceled":
      return "#ef4444";
    case "unpaid":
      return "#dc2626";
    default:
      return "#6b7280";
  }
}
function ProrationPreview({
  preview,
  onConfirm,
  onCancel,
  isLoading
}) {
  const theme = useCedrosTheme();
  const isCredit = preview.immediateAmount < 0;
  return /* @__PURE__ */ React10.createElement(View9, { style: styles9.prorationPreview }, /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.previewTitle, { color: theme.tokens?.surfaceText || "#111827" }] }, "Change Preview"), /* @__PURE__ */ React10.createElement(View9, { style: styles9.previewDetails }, /* @__PURE__ */ React10.createElement(View9, { style: styles9.previewRow }, /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewLabel }, "Current plan:"), /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewValue }, formatAmount(preview.currentPlanPrice, preview.currency), "/period")), /* @__PURE__ */ React10.createElement(View9, { style: styles9.previewRow }, /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewLabel }, "New plan:"), /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewValue }, formatAmount(preview.newPlanPrice, preview.currency), "/period")), /* @__PURE__ */ React10.createElement(View9, { style: styles9.previewRow }, /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewLabel }, "Days remaining:"), /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewValue }, preview.daysRemaining, " days")), preview.prorationDetails && /* @__PURE__ */ React10.createElement(React10.Fragment, null, /* @__PURE__ */ React10.createElement(View9, { style: styles9.previewRow }, /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewLabel }, "Unused credit:"), /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewValue }, "-", formatAmount(preview.prorationDetails.unusedCredit, preview.currency))), /* @__PURE__ */ React10.createElement(View9, { style: styles9.previewRow }, /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewLabel }, "New plan cost:"), /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewValue }, formatAmount(preview.prorationDetails.newPlanCost, preview.currency)))), /* @__PURE__ */ React10.createElement(View9, { style: [styles9.previewRow, styles9.previewTotal] }, /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewLabel }, isCredit ? "Credit to account:" : "Amount due now:"), /* @__PURE__ */ React10.createElement(Text9, { style: { color: isCredit ? "#22c55e" : "#ef4444", fontWeight: "600" } }, formatAmount(Math.abs(preview.immediateAmount), preview.currency))), /* @__PURE__ */ React10.createElement(View9, { style: styles9.previewRow }, /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewLabel }, "Effective date:"), /* @__PURE__ */ React10.createElement(Text9, { style: styles9.previewValue }, formatDate2(preview.effectiveDate)))), /* @__PURE__ */ React10.createElement(View9, { style: styles9.previewActions }, /* @__PURE__ */ React10.createElement(
    TouchableOpacity9,
    {
      onPress: onCancel,
      style: [styles9.button, styles9.cancelButton],
      disabled: isLoading
    },
    /* @__PURE__ */ React10.createElement(Text9, { style: styles9.cancelButtonText }, "Cancel")
  ), /* @__PURE__ */ React10.createElement(
    TouchableOpacity9,
    {
      onPress: onConfirm,
      style: [styles9.button, styles9.confirmButton],
      disabled: isLoading
    },
    isLoading ? /* @__PURE__ */ React10.createElement(ActivityIndicator7, { color: "#ffffff", size: "small" }) : /* @__PURE__ */ React10.createElement(Text9, { style: styles9.buttonText }, "Confirm Change")
  )));
}
function SubscriptionManagementPanel({
  resource,
  userId,
  availablePlans = [],
  onSubscriptionChanged,
  onSubscriptionCanceled,
  billingPortalReturnUrl,
  showBillingPortal = false,
  style
}) {
  const theme = useCedrosTheme();
  const {
    subscription,
    changePreview,
    status,
    error,
    loadSubscription,
    previewChange,
    changeSubscription,
    cancelSubscription,
    openBillingPortal,
    clearPreview
  } = useSubscriptionManagement();
  useEffect7(() => {
    loadSubscription(resource, userId);
  }, [resource, userId, loadSubscription]);
  const handlePreviewChange = useCallback9(
    async (newResource, newInterval) => {
      await previewChange(resource, newResource, userId, newInterval);
    },
    [resource, userId, previewChange]
  );
  const handleConfirmChange = useCallback9(async () => {
    if (!changePreview) return;
    const selectedPlan = availablePlans.find(
      (p) => p.price === changePreview.newPlanPrice && p.currency === changePreview.currency
    );
    const response = await changeSubscription({
      newResource: selectedPlan?.resource || resource,
      newInterval: selectedPlan?.interval,
      immediate: true
    });
    if (response?.success && selectedPlan) {
      onSubscriptionChanged?.(selectedPlan.resource, selectedPlan.interval);
    }
  }, [changePreview, availablePlans, resource, changeSubscription, onSubscriptionChanged]);
  const handleCancel = useCallback9(
    async (immediate) => {
      const response = await cancelSubscription(immediate);
      if (response?.success) {
        onSubscriptionCanceled?.();
      }
    },
    [cancelSubscription, onSubscriptionCanceled]
  );
  const handleOpenBillingPortal = useCallback9(() => {
    openBillingPortal(userId, billingPortalReturnUrl);
  }, [userId, billingPortalReturnUrl, openBillingPortal]);
  const isLoading = status === "loading";
  return /* @__PURE__ */ React10.createElement(View9, { style: [styles9.container, style] }, error && /* @__PURE__ */ React10.createElement(View9, { style: [styles9.errorContainer, { backgroundColor: theme.tokens?.errorBackground || "#fee2e2" }] }, /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.errorText, { color: theme.tokens?.errorText || "#b91c1c" }] }, error)), isLoading && !subscription && /* @__PURE__ */ React10.createElement(View9, { style: styles9.loadingContainer }, /* @__PURE__ */ React10.createElement(ActivityIndicator7, { size: "large", color: theme.tokens?.surfaceText || "#111827" }), /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.loadingText, { color: theme.tokens?.surfaceText || "#6b7280" }] }, "Loading subscription...")), subscription && /* @__PURE__ */ React10.createElement(ScrollView2, { style: styles9.content }, /* @__PURE__ */ React10.createElement(View9, { style: styles9.detailsSection }, /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.title, { color: theme.tokens?.surfaceText || "#111827" }] }, "Current Subscription"), /* @__PURE__ */ React10.createElement(View9, { style: styles9.detailRow }, /* @__PURE__ */ React10.createElement(Text9, { style: styles9.detailLabel }, "Plan:"), /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.detailValue, { color: theme.tokens?.surfaceText || "#111827" }] }, subscription.resource)), /* @__PURE__ */ React10.createElement(View9, { style: styles9.detailRow }, /* @__PURE__ */ React10.createElement(Text9, { style: styles9.detailLabel }, "Status:"), /* @__PURE__ */ React10.createElement(
    View9,
    {
      style: [
        styles9.statusBadge,
        { backgroundColor: getStatusColor(subscription.status) }
      ]
    },
    /* @__PURE__ */ React10.createElement(Text9, { style: styles9.statusText }, subscription.status)
  )), /* @__PURE__ */ React10.createElement(View9, { style: styles9.detailRow }, /* @__PURE__ */ React10.createElement(Text9, { style: styles9.detailLabel }, "Price:"), /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.detailValue, { color: theme.tokens?.surfaceText || "#111827" }] }, formatAmount(subscription.pricePerPeriod, subscription.currency), "/", subscription.interval)), /* @__PURE__ */ React10.createElement(View9, { style: styles9.detailRow }, /* @__PURE__ */ React10.createElement(Text9, { style: styles9.detailLabel }, "Current period ends:"), /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.detailValue, { color: theme.tokens?.surfaceText || "#111827" }] }, formatDate2(subscription.currentPeriodEnd))), subscription.cancelAtPeriodEnd && /* @__PURE__ */ React10.createElement(View9, { style: [styles9.cancelNotice, { backgroundColor: theme.tokens?.errorBackground || "#fee2e2" }] }, /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.cancelNoticeText, { color: theme.tokens?.errorText || "#b91c1c" }] }, "Subscription will cancel at end of current period"))), changePreview && /* @__PURE__ */ React10.createElement(
    ProrationPreview,
    {
      preview: changePreview,
      onConfirm: handleConfirmChange,
      onCancel: clearPreview,
      isLoading
    }
  ), availablePlans.length > 0 && !changePreview && /* @__PURE__ */ React10.createElement(View9, { style: styles9.plansSection }, /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.plansTitle, { color: theme.tokens?.surfaceText || "#111827" }] }, "Available Plans"), availablePlans.map((plan) => {
    const isCurrent = plan.resource === subscription.resource;
    return /* @__PURE__ */ React10.createElement(
      View9,
      {
        key: plan.resource,
        style: [
          styles9.planCard,
          isCurrent && [
            styles9.currentPlan,
            { borderColor: theme.tokens?.successBorder || "#86efac" }
          ]
        ]
      },
      /* @__PURE__ */ React10.createElement(View9, { style: styles9.planHeader }, /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.planName, { color: theme.tokens?.surfaceText || "#111827" }] }, plan.name), /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.planPrice, { color: theme.tokens?.surfaceText || "#111827" }] }, formatAmount(plan.price, plan.currency), "/", plan.interval)),
      plan.description && /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.planDescription, { color: theme.tokens?.surfaceText || "#6b7280" }] }, plan.description),
      isCurrent ? /* @__PURE__ */ React10.createElement(View9, { style: [styles9.currentBadge, { backgroundColor: theme.tokens?.successBackground || "#dcfce7" }] }, /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.currentBadgeText, { color: theme.tokens?.successText || "#166534" }] }, "Current Plan")) : /* @__PURE__ */ React10.createElement(
        TouchableOpacity9,
        {
          onPress: () => handlePreviewChange(plan.resource, plan.interval),
          style: [
            styles9.changePlanButton,
            { backgroundColor: theme.tokens?.stripeBackground || "#635BFF" }
          ],
          disabled: isLoading
        },
        /* @__PURE__ */ React10.createElement(Text9, { style: styles9.changePlanButtonText }, plan.price > subscription.pricePerPeriod ? "Upgrade" : "Downgrade")
      )
    );
  })), /* @__PURE__ */ React10.createElement(View9, { style: styles9.actions }, showBillingPortal && subscription.paymentMethod === "stripe" && /* @__PURE__ */ React10.createElement(
    TouchableOpacity9,
    {
      onPress: handleOpenBillingPortal,
      style: [styles9.portalButton, { backgroundColor: theme.tokens?.stripeBackground || "#635BFF" }],
      disabled: isLoading
    },
    /* @__PURE__ */ React10.createElement(Text9, { style: styles9.portalButtonText }, "Manage Billing")
  ), subscription.status === "active" && !subscription.cancelAtPeriodEnd && /* @__PURE__ */ React10.createElement(
    TouchableOpacity9,
    {
      onPress: () => handleCancel(false),
      style: [styles9.cancelSubscriptionButton, { borderColor: theme.tokens?.errorBorder || "#fca5a5" }],
      disabled: isLoading
    },
    /* @__PURE__ */ React10.createElement(Text9, { style: [styles9.cancelSubscriptionText, { color: theme.tokens?.errorText || "#b91c1c" }] }, "Cancel Subscription")
  ))));
}
var styles9 = StyleSheet9.create({
  container: {
    width: "100%"
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    fontSize: 14
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14
  },
  content: {
    maxHeight: 600
  },
  detailsSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280"
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500"
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize"
  },
  cancelNotice: {
    marginTop: 12,
    padding: 12,
    borderRadius: 6
  },
  cancelNoticeText: {
    fontSize: 14
  },
  prorationPreview: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12
  },
  previewDetails: {
    marginBottom: 16
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  previewLabel: {
    fontSize: 14,
    color: "#6b7280"
  },
  previewValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827"
  },
  previewTotal: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    marginTop: 8
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelButton: {
    backgroundColor: "#f3f4f6"
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600"
  },
  confirmButton: {
    backgroundColor: "#22c55e"
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600"
  },
  plansSection: {
    marginBottom: 24
  },
  plansTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12
  },
  planCard: {
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  currentPlan: {
    borderWidth: 2
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4
  },
  planName: {
    fontSize: 16,
    fontWeight: "600"
  },
  planPrice: {
    fontSize: 16,
    fontWeight: "600"
  },
  planDescription: {
    fontSize: 14,
    marginBottom: 12
  },
  currentBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: "500"
  },
  changePlanButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center"
  },
  changePlanButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600"
  },
  actions: {
    gap: 12
  },
  portalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center"
  },
  portalButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600"
  },
  cancelSubscriptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: "transparent"
  },
  cancelSubscriptionText: {
    fontSize: 14,
    fontWeight: "600"
  }
});

// src/components/ProductPrice.tsx
import React11 from "react";
import { View as View10, Text as Text10, StyleSheet as StyleSheet10 } from "react-native";
function formatAmount2(amount, currency) {
  if (["USDC", "USDT", "PYUSD", "CASH"].includes(currency.toUpperCase())) {
    const formatted = (amount / 1e6).toFixed(2);
    return `${formatted} ${currency.toUpperCase()}`;
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)} ${currency}`;
  }
}
function ProductPrice({
  amount,
  currency,
  originalAmount,
  size = "medium",
  style,
  priceStyle,
  originalPriceStyle
}) {
  const theme = useCedrosTheme();
  const getFontSize = () => {
    switch (size) {
      case "small":
        return 14;
      case "large":
        return 24;
      case "medium":
      default:
        return 18;
    }
  };
  const getOriginalFontSize = () => {
    return getFontSize() * 0.8;
  };
  const formattedPrice = formatAmount2(amount, currency);
  const hasDiscount = originalAmount && originalAmount > amount;
  return /* @__PURE__ */ React11.createElement(View10, { style: [styles10.container, style] }, hasDiscount && /* @__PURE__ */ React11.createElement(
    Text10,
    {
      style: [
        styles10.originalPrice,
        {
          fontSize: getOriginalFontSize(),
          color: theme.tokens?.surfaceText || "#6b7280"
        },
        originalPriceStyle
      ]
    },
    formatAmount2(originalAmount, currency)
  ), /* @__PURE__ */ React11.createElement(
    Text10,
    {
      style: [
        styles10.price,
        {
          fontSize: getFontSize(),
          color: theme.tokens?.surfaceText || "#111827"
        },
        priceStyle
      ]
    },
    formattedPrice
  ));
}
var styles10 = StyleSheet10.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  originalPrice: {
    textDecorationLine: "line-through",
    opacity: 0.6
  },
  price: {
    fontWeight: "600"
  }
});
var badgeStyles = StyleSheet10.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  text: {
    color: "white",
    fontSize: 14,
    fontWeight: "600"
  },
  couponCode: {
    opacity: 0.8,
    fontSize: 12,
    fontWeight: "400"
  }
});

// src/hooks/useStoreAwarePaymentPolicy.ts
import { useMemo as useMemo10 } from "react";

// src/policy/resolveAllowedPaymentMethods.ts
var STRICT_DEFAULT = true;
var STOREFRONT_DEFAULT = "unknown";
var EXTERNAL_RAIL_ORDER = [
  "stripe",
  "x402",
  "crypto",
  "credits"
];
function getExternalRails(availableAdapters) {
  return EXTERNAL_RAIL_ORDER.filter((method) => availableAdapters[method]);
}
function uniqueMethods(methods) {
  return Array.from(new Set(methods));
}
function appleUsExternalPurchaseAllowed(context) {
  return context.distributionChannel === "apple_app_store" && (context.storefrontRegion ?? STOREFRONT_DEFAULT) === "us" && context.programs?.apple?.usStorefrontExternalPurchaseLink === true;
}
function appleReaderExternalPurchaseAllowed(context) {
  const storefrontRegion = context.storefrontRegion ?? STOREFRONT_DEFAULT;
  return context.distributionChannel === "apple_app_store" && (context.programs?.apple?.readerExternalLinkAccount === true || storefrontRegion === "us");
}
function googleUserChoiceBillingAllowed(context) {
  return context.distributionChannel === "google_play_store" && (context.storefrontRegion ?? STOREFRONT_DEFAULT) !== "unknown" && context.programs?.google?.userChoiceBilling === true;
}
function googleAlternativeBillingOnlyAllowed(context) {
  return context.distributionChannel === "google_play_store" && (context.storefrontRegion ?? STOREFRONT_DEFAULT) !== "unknown" && context.programs?.google?.alternativeBillingOnly === true;
}
function googleExternalOffersAllowed(context) {
  return context.distributionChannel === "google_play_store" && (context.storefrontRegion ?? STOREFRONT_DEFAULT) !== "unknown" && context.programs?.google?.externalOffers === true;
}
function buildFailure(context, externalRails) {
  const strictMode = context.strictMode ?? STRICT_DEFAULT;
  const purchaseMode = context.purchaseMode ?? "single";
  const storefrontRegion = context.storefrontRegion ?? STOREFRONT_DEFAULT;
  const { distributionChannel, product, availableAdapters } = context;
  if (product.fulfillmentType === "digital_in_app" && purchaseMode === "cart" && (distributionChannel === "apple_app_store" || distributionChannel === "google_play_store")) {
    return {
      code: "unsupported_purchase_mode",
      message: "Cart-style native billing is not supported for store-managed digital products. Resolve a single store product instead."
    };
  }
  if (product.fulfillmentType === "digital_in_app" && distributionChannel === "unknown" && strictMode) {
    return {
      code: "distribution_channel_required",
      message: "Distribution channel is required for digital in-app products when strict mode is enabled."
    };
  }
  if ((context.programs?.apple?.usStorefrontExternalPurchaseLink === true || context.programs?.apple?.readerExternalLinkAccount === true || context.programs?.google?.userChoiceBilling === true || context.programs?.google?.alternativeBillingOnly === true || context.programs?.google?.externalOffers === true) && storefrontRegion === "unknown" && strictMode) {
    return {
      code: "storefront_region_required",
      message: "Storefront region is required when store policy programs or entitlements are configured."
    };
  }
  if (distributionChannel === "apple_app_store" && product.fulfillmentType === "digital_in_app" && !availableAdapters.apple_iap) {
    return {
      code: "native_adapter_missing",
      message: "Apple App Store digital products require an Apple In-App Purchase adapter in this build."
    };
  }
  if (distributionChannel === "google_play_store" && product.fulfillmentType === "digital_in_app" && !availableAdapters.google_play_billing) {
    return {
      code: "native_adapter_missing",
      message: "Google Play Store digital products require a Google Play Billing adapter in this build."
    };
  }
  if ((product.fulfillmentType === "reader_content" || product.fulfillmentType === "other") && strictMode && !(appleReaderExternalPurchaseAllowed(context) || googleExternalOffersAllowed(context)) && (distributionChannel === "apple_app_store" || distributionChannel === "google_play_store" || distributionChannel === "unknown")) {
    return {
      code: "policy_restricted",
      message: "This fulfillment type needs explicit store policy handling before payment methods can be exposed safely."
    };
  }
  if (distributionChannel === "apple_app_store" && product.fulfillmentType === "reader_content" && storefrontRegion !== "us" && context.programs?.apple?.readerExternalLinkAccount !== true && strictMode) {
    return {
      code: "policy_program_required",
      message: "Apple App Store reader apps need an explicit reader entitlement or United States storefront context before external purchase rails can be exposed."
    };
  }
  if (distributionChannel === "google_play_store" && (product.fulfillmentType === "digital_in_app" || product.fulfillmentType === "reader_content" || product.fulfillmentType === "other") && storefrontRegion !== "unknown" && strictMode && context.programs?.google?.userChoiceBilling !== true && context.programs?.google?.alternativeBillingOnly !== true && context.programs?.google?.externalOffers !== true && product.fulfillmentType !== "digital_in_app") {
    return {
      code: "policy_program_required",
      message: "Google Play external purchase flows require an explicit enrolled billing or external offers program before Cedros can expose external rails."
    };
  }
  if (externalRails.length === 0) {
    return {
      code: "no_allowed_payment_methods",
      message: "No allowed payment methods are available for the current policy context and enabled adapters."
    };
  }
  return {
    code: "policy_restricted",
    message: "No store-compliant payment method could be resolved for the current context."
  };
}
function resolveAllowedPaymentMethods(context) {
  const strictMode = context.strictMode ?? STRICT_DEFAULT;
  const purchaseMode = context.purchaseMode ?? "single";
  const { distributionChannel, product, availableAdapters } = context;
  const externalRails = getExternalRails(availableAdapters);
  switch (product.fulfillmentType) {
    case "digital_in_app":
      if (purchaseMode === "cart" && (distributionChannel === "apple_app_store" || distributionChannel === "google_play_store")) {
        return [];
      }
      if (distributionChannel === "apple_app_store") {
        if (!availableAdapters.apple_iap) {
          return [];
        }
        return appleUsExternalPurchaseAllowed(context) ? uniqueMethods(["apple_iap", ...externalRails]) : ["apple_iap"];
      }
      if (distributionChannel === "google_play_store") {
        if (googleAlternativeBillingOnlyAllowed(context)) {
          return externalRails;
        }
        if (googleUserChoiceBillingAllowed(context)) {
          return availableAdapters.google_play_billing ? uniqueMethods(["google_play_billing", ...externalRails]) : externalRails;
        }
        return availableAdapters.google_play_billing ? ["google_play_billing"] : [];
      }
      if (distributionChannel === "solana_dapp_store" || distributionChannel === "android_sideload" || distributionChannel === "web") {
        return externalRails;
      }
      return strictMode ? [] : externalRails;
    case "physical_goods":
    case "real_world_service":
      return externalRails;
    case "reader_content":
    case "other":
      if (distributionChannel === "apple_app_store") {
        return appleReaderExternalPurchaseAllowed(context) ? externalRails : [];
      }
      if (distributionChannel === "google_play_store") {
        return googleExternalOffersAllowed(context) || googleUserChoiceBillingAllowed(context) || googleAlternativeBillingOnlyAllowed(context) ? externalRails : [];
      }
      if (distributionChannel === "solana_dapp_store" || distributionChannel === "android_sideload" || distributionChannel === "web") {
        return externalRails;
      }
      return strictMode ? [] : externalRails;
    default:
      return strictMode ? [] : externalRails;
  }
}
function resolvePaymentPolicy(context) {
  const strictMode = context.strictMode ?? STRICT_DEFAULT;
  const externalRails = getExternalRails(context.availableAdapters);
  const allowedPaymentMethods = resolveAllowedPaymentMethods({
    ...context,
    strictMode
  });
  return {
    product: context.product,
    distributionChannel: context.distributionChannel,
    storefrontRegion: context.storefrontRegion ?? STOREFRONT_DEFAULT,
    strictMode,
    allowedPaymentMethods,
    failure: allowedPaymentMethods.length === 0 ? buildFailure({ ...context, strictMode }, externalRails) : void 0
  };
}
function collapseRenderablePaymentMethods(methods) {
  const seen = /* @__PURE__ */ new Set();
  const collapsed = [];
  methods.forEach((method) => {
    const renderKey = method === "x402" || method === "crypto" ? "crypto" : method;
    if (seen.has(renderKey)) {
      return;
    }
    seen.add(renderKey);
    collapsed.push(method);
  });
  return collapsed;
}

// src/policy/detectDistributionChannel.ts
import { Platform as Platform2 } from "react-native";
function detectDistributionChannel() {
  if (Platform2.OS === "web") {
    return "web";
  }
  return "unknown";
}

// src/hooks/useStoreAwarePaymentPolicy.ts
function resolveDistributionChannel(explicitChannel, configChannel, resolver) {
  if (explicitChannel) {
    return explicitChannel;
  }
  if (configChannel) {
    return configChannel;
  }
  try {
    const resolved = resolver?.();
    return resolved === void 0 ? detectDistributionChannel() : resolved;
  } catch {
    return detectDistributionChannel();
  }
}
function resolveStorefrontRegion(explicitRegion, configRegion, resolver) {
  if (explicitRegion) {
    return explicitRegion;
  }
  if (configRegion) {
    return configRegion;
  }
  try {
    return resolver?.() ?? "unknown";
  } catch {
    return "unknown";
  }
}
function resolveAvailableAdapters(configAdapters, overrideAdapters, hasBuiltInStoreBilling, hasAppleHandler, hasGoogleHandler) {
  const merged = {
    stripe: true,
    x402: true,
    crypto: false,
    credits: false,
    apple_iap: hasBuiltInStoreBilling,
    google_play_billing: hasBuiltInStoreBilling,
    ...configAdapters,
    ...overrideAdapters
  };
  return {
    ...merged,
    apple_iap: (hasBuiltInStoreBilling || hasAppleHandler) && merged.apple_iap !== false,
    google_play_billing: (hasBuiltInStoreBilling || hasGoogleHandler) && merged.google_play_billing !== false
  };
}
function useStoreAwarePaymentPolicy({
  product,
  policy,
  purchaseMode = "single"
}) {
  const { config } = useCedrosContext();
  return useMemo10(() => {
    const paymentPolicyConfig = config.paymentPolicy;
    const builtInStoreBillingEnabled = paymentPolicyConfig?.storeBilling?.enabled !== false;
    const availableAdapters = resolveAvailableAdapters(
      paymentPolicyConfig?.availableAdapters,
      policy?.availableAdapters,
      builtInStoreBillingEnabled,
      Boolean(paymentPolicyConfig?.nativeHandlers?.apple_iap),
      Boolean(paymentPolicyConfig?.nativeHandlers?.google_play_billing)
    );
    if (!product) {
      return {
        usesOrchestration: false,
        resolution: null,
        availableAdapters,
        renderableMethods: []
      };
    }
    const distributionChannel = resolveDistributionChannel(
      policy?.distributionChannel,
      paymentPolicyConfig?.distributionChannel,
      paymentPolicyConfig?.distributionChannelResolver
    );
    const storefrontRegion = resolveStorefrontRegion(
      policy?.storefrontRegion,
      paymentPolicyConfig?.storefrontRegion,
      paymentPolicyConfig?.storefrontRegionResolver
    );
    const strictMode = policy?.strictMode ?? paymentPolicyConfig?.strictMode ?? true;
    const resolution = resolvePaymentPolicy({
      product,
      distributionChannel,
      storefrontRegion,
      programs: policy?.programs ?? paymentPolicyConfig?.programs,
      availableAdapters,
      strictMode,
      purchaseMode
    });
    return {
      usesOrchestration: true,
      resolution,
      availableAdapters,
      renderableMethods: collapseRenderablePaymentMethods(
        resolution.allowedPaymentMethods
      )
    };
  }, [
    config.paymentPolicy,
    policy?.availableAdapters,
    policy?.distributionChannel,
    policy?.programs,
    policy?.storefrontRegion,
    policy?.strictMode,
    product,
    purchaseMode
  ]);
}

// src/hooks/useRefundVerification.ts
import { useState as useState12, useCallback as useCallback10, useRef as useRef6 } from "react";
function useRefundVerification() {
  const { x402Manager } = useCedrosContext();
  const [state, setState] = useState12({
    status: "idle",
    error: null,
    transactionId: null
  });
  const [refund, setRefund] = useState12(null);
  const isProcessingRef = useRef6(false);
  const requestRefund = useCallback10(
    async (input) => {
      if (isProcessingRef.current) {
        throw new Error("Refund request already in progress");
      }
      isProcessingRef.current = true;
      setState({ status: "loading", error: null, transactionId: null });
      try {
        const result = await x402Manager.requestRefund(input);
        setRefund(result);
        setState({ status: "success", error: null, transactionId: result.signature ?? null });
        return result;
      } catch (error) {
        setState({
          status: "error",
          error: formatError(error, "Failed to request refund"),
          transactionId: null
        });
        throw error;
      } finally {
        isProcessingRef.current = false;
      }
    },
    [x402Manager]
  );
  const refreshStatus = useCallback10(
    async (refundId) => {
      const result = await x402Manager.getRefundStatus(refundId);
      setRefund(result);
      return result;
    },
    [x402Manager]
  );
  const reset = useCallback10(() => {
    setState({ status: "idle", error: null, transactionId: null });
    setRefund(null);
  }, []);
  return { state, refund, requestRefund, refreshStatus, reset };
}

// src/utils/securityValidation.ts
function checkSecureConnection() {
  return {
    passed: true,
    severity: "info",
    message: "SSL/TLS connection security handled by React Native networking layer",
    recommendation: "Ensure SSL pinning is configured at the native iOS/Android layer for production apps."
  };
}
function checkPlatformSecurity() {
  return {
    passed: true,
    severity: "info",
    message: "Platform security managed by iOS/Android sandboxing",
    recommendation: "Ensure iOS App Transport Security (ATS) and Android Network Security Config are properly configured."
  };
}
function checkDevelopmentMode() {
  const isDevelopment = process.env.NODE_ENV === "development" || typeof __DEV__ !== "undefined" && __DEV__;
  if (!isDevelopment) {
    return {
      passed: true,
      severity: "info",
      message: "Running in production mode"
    };
  }
  return {
    passed: true,
    severity: "info",
    message: "Running in development mode (some security checks relaxed)"
  };
}
function checkStripeNativeConfiguration() {
  return {
    passed: true,
    severity: "info",
    message: "Stripe handled through the React Native Stripe SDK",
    recommendation: "Verify native Stripe SDK initialization and platform payment method configuration before release."
  };
}
function checkDebugMode() {
  const isDebugMode = typeof __DEV__ !== "undefined" && __DEV__;
  if (isDebugMode) {
    return {
      passed: false,
      severity: "warning",
      message: "Debug mode is enabled",
      recommendation: "Disable debug mode for production builds. Never ship with React Native debugging enabled."
    };
  }
  return {
    passed: true,
    severity: "info",
    message: "Debug mode disabled for production"
  };
}
function validateSecurity() {
  const checks = [
    checkSecureConnection(),
    checkPlatformSecurity(),
    checkDevelopmentMode(),
    checkStripeNativeConfiguration(),
    checkDebugMode()
  ];
  const hasErrors = checks.some((check) => check.severity === "error" && !check.passed);
  const hasWarnings = checks.some((check) => check.severity === "warning" && !check.passed);
  let overallStatus;
  let summary;
  if (hasErrors) {
    overallStatus = "vulnerable";
    summary = "Security issues detected. Review errors and apply recommendations.";
  } else if (hasWarnings) {
    overallStatus = "warnings";
    summary = "Minor security warnings detected. Consider applying recommendations.";
  } else {
    overallStatus = "secure";
    summary = "All security checks passed.";
  }
  return {
    checks,
    overallStatus,
    summary
  };
}
function logSecurityReport(report) {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  console.group("\u{1F512} Cedros Pay Security Report");
  console.log(`Status: ${report.overallStatus.toUpperCase()}`);
  console.log(`Summary: ${report.summary}`);
  console.log("");
  report.checks.forEach((check) => {
    const icon = check.passed ? "\u2705" : check.severity === "error" ? "\u274C" : "\u26A0\uFE0F";
    console.log(`${icon} ${check.message}`);
    if (check.recommendation) {
      console.log(`   \u2192 ${check.recommendation}`);
    }
  });
  console.groupEnd();
}
var SECURITY_RECOMMENDATIONS = {
  SSL_PINNING: "Configure SSL pinning at the native iOS/Android layer for API security",
  ATS: "Enable iOS App Transport Security (ATS) to enforce HTTPS connections",
  ANDROID_NETWORK_CONFIG: "Use Android Network Security Config to control cleartext traffic and certificate trust",
  DEBUG_MODE: "Never ship production apps with debug mode enabled - __DEV__ should be false",
  PACKAGE_UPDATES: "Keep @stripe/stripe-react-native and @cedros/pay-react-native updated for security patches",
  AUDIT: "Run npm audit regularly to check for known vulnerabilities",
  MONITORING: "Monitor Stripe security advisories and apply updates promptly",
  SECURE_STORAGE: "Use platform-specific secure storage (Keychain/KeyStore) for sensitive payment data"
};
export {
  CEDROS_EVENTS,
  CIRCUIT_BREAKER_PRESETS,
  CSP_PRESETS,
  CedrosProvider,
  CircuitBreakerOpenError,
  CircuitState,
  CreditsSubscribeButton,
  CryptoSubscribeButton,
  DEFAULT_COOLDOWN_MS,
  DEFAULT_DEDUP_WINDOW_MS,
  DEFAULT_FETCH_TIMEOUT_MS,
  ERROR_CATEGORIES,
  ERROR_MESSAGES,
  KNOWN_STABLECOINS,
  LogLevel,
  Logger,
  ManageSubscriptionsButton,
  NativeStoreButton,
  ProductPrice,
  RATE_LIMITER_PRESETS,
  RETRY_PRESETS,
  RPC_PROVIDERS,
  RestorePurchasesButton,
  RouteDiscoveryManager,
  SECURITY_RECOMMENDATIONS,
  StoreBillingManager,
  SubscribeButton,
  SubscriptionChangeManager,
  SubscriptionManagementPanel,
  SubscriptionManager,
  WalletPool,
  calculateDiscountPercentage,
  clearDeduplicationCache,
  collapseRenderablePaymentMethods,
  createCedrosProductCatalogFromPaywallProducts,
  createCircuitBreaker,
  createDedupedClickHandler,
  createLogger,
  createRateLimiter,
  createTranslator,
  createWalletPool,
  deduplicateRequest,
  detectDistributionChannel,
  detectLocale,
  emitPaymentError,
  emitPaymentProcessing,
  emitPaymentStart,
  emitPaymentSuccess,
  emitWalletConnect,
  emitWalletConnected,
  emitWalletError,
  fetchCedrosProductCatalog,
  fetchWithTimeout,
  formatCSP,
  formatCouponCodes,
  formatCurrencyAmount,
  formatDate,
  formatDateOnly,
  formatDateTime,
  formatDateTimeValue,
  formatError,
  formatMinorCurrencyAmount,
  formatNumberValue,
  formatUserError,
  generateCSP,
  generateCSPDirectives,
  getAvailableLocales,
  getDeduplicationStats,
  getInFlightRequest,
  getLocaleDirection,
  getLocalizedError,
  getLogger,
  getUserErrorMessage,
  getUserFriendlyError,
  isButtonInCooldown,
  isDuplicateRequest,
  isManageableStoreSubscription,
  isRestorableStoreProduct,
  isRetryableError,
  loadLocale,
  logSecurityReport,
  mapPaywallProductToCedrosProductDefinition,
  markRequestProcessed,
  mergeCedrosProductDefinition,
  normalizeLocale,
  parseCouponCodes,
  parseErrorResponse,
  resolveAllowedPaymentMethods,
  resolveNativeStoreMethod,
  resolvePaymentPolicy,
  resolveStoreProductConfiguration,
  retryWithBackoff,
  selectGooglePlayOffer,
  selectPlural,
  setButtonCooldown,
  stackCheckoutCoupons,
  trackInFlightRequest,
  useCedrosContext,
  useCedrosTheme,
  useCedrosTranslation,
  useCreditsSubscription,
  useCryptoSubscription,
  useLocalizedError,
  useRefundVerification,
  useStoreAwarePaymentPolicy,
  useSubscription,
  useSubscriptionManagement,
  useTranslation,
  validateConfig,
  validateSecurity,
  validateTokenMint
};
//# sourceMappingURL=index.js.map
