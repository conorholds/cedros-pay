import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Order } from '../../types';
export interface OrderListProps {
    orders: Order[];
    onView?: (order: Order) => void;
    style?: ViewStyle;
}
export declare function OrderList({ orders, onView, style }: OrderListProps): React.JSX.Element;
//# sourceMappingURL=OrderList.d.ts.map