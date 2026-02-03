import { Order } from '../types';
export interface ReceiptTemplateProps {
    /** The order to display */
    order: Order;
    /** Override payment source (defaults to order.source) */
    source?: 'stripe' | 'x402' | 'credits';
    /** Override purchase ID (defaults to order.purchaseId) */
    purchaseId?: string;
    /** Override customer email (defaults to order.customerEmail) */
    customerEmail?: string;
    /** Override customer name (defaults to order.customerName) */
    customerName?: string;
    /** Additional CSS class */
    className?: string;
    /** Callback to go back */
    onBack?: () => void;
}
export declare function ReceiptTemplate({ order, source, purchaseId, customerEmail, customerName, className, onBack, }: ReceiptTemplateProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ReceiptTemplate.d.ts.map