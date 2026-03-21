import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Order } from '../../types';
export interface PurchaseHistoryProps {
    orders: Order[];
    onSelectOrder?: (order: Order) => void;
    style?: ViewStyle;
}
export declare function PurchaseHistory({ orders, onSelectOrder, style }: PurchaseHistoryProps): React.JSX.Element;
//# sourceMappingURL=PurchaseHistory.d.ts.map