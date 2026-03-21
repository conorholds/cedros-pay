import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Order } from '../types';
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
    /** Additional style */
    style?: ViewStyle;
    /** Callback to go back */
    onBack?: () => void;
    /** Callback when print is requested */
    onPrint?: () => void;
}
export declare function ReceiptTemplate({ order, source, purchaseId, customerEmail, customerName, style, onBack, onPrint, }: ReceiptTemplateProps): React.JSX.Element;
//# sourceMappingURL=ReceiptTemplate.d.ts.map