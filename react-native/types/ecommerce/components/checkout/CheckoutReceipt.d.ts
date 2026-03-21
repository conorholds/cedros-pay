import type { CheckoutResult } from '../../hooks/useCheckoutResultFromUrl';
import { ViewStyle } from 'react-native';
interface CheckoutReceiptProps {
    result: CheckoutResult;
    onContinueShopping?: () => void;
    onViewOrders?: () => void;
    style?: ViewStyle;
}
export declare function CheckoutReceipt({ result, onContinueShopping, onViewOrders, style, }: CheckoutReceiptProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=CheckoutReceipt.d.ts.map