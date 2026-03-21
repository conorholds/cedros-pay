import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Order } from '../../types';
export interface ReceiptViewProps {
    order: Order;
    storeName?: string;
    onDownload?: () => void;
    style?: ViewStyle;
}
export declare function ReceiptView({ order, storeName, onDownload, style }: ReceiptViewProps): React.JSX.Element;
//# sourceMappingURL=ReceiptView.d.ts.map