import { CheckoutOptions, DisplayOptions, CallbackOptions, AdvancedOptions, CartItem } from '../types';
/**
 * Props for CedrosPay component
 *
 * Uses extensible options pattern for future-proof API:
 * - `checkout`: Customer info, coupons, redirects, metadata
 * - `display`: Labels, visibility, layout, className
 * - `callbacks`: Payment lifecycle event handlers
 * - `advanced`: Wallet config, testing options
 *
 * @example
 * // Single item purchase
 * <CedrosPay
 *   resource="item-1"
 *   checkout={{ customerEmail: "user@example.com", couponCode: "SAVE20" }}
 *   display={{ cardLabel: "Pay with Card", layout: "horizontal" }}
 *   callbacks={{ onPaymentSuccess: (result) => console.log(result) }}
 * />
 *
 * @example
 * // Cart checkout with multiple items
 * <CedrosPay
 *   items={[
 *     { resource: "item-1", quantity: 2 },
 *     { resource: "item-2", quantity: 1 }
 *   ]}
 *   checkout={{ customerEmail: "user@example.com" }}
 *   display={{ layout: "horizontal" }}
 * />
 *
 * @example
 * // Unified purchase button with modal
 * <CedrosPay
 *   resource="item-1"
 *   display={{ showPurchaseButton: true, purchaseLabel: "Buy Now" }}
 *   advanced={{ autoDetectWallets: true }}
 * />
 */
export interface CedrosPayProps {
    /** Single item resource ID (mutually exclusive with items) */
    resource?: string;
    /** Multiple items for cart checkout (mutually exclusive with resource) */
    items?: CartItem[];
    /** Checkout options: customer info, coupons, redirects, metadata */
    checkout?: CheckoutOptions;
    /** Display options: labels, visibility, layout, className */
    display?: DisplayOptions;
    /** Callback options: payment lifecycle event handlers */
    callbacks?: CallbackOptions;
    /** Advanced options: wallet config, testing */
    advanced?: AdvancedOptions;
}
export declare function CedrosPay(props: CedrosPayProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=CedrosPay.d.ts.map