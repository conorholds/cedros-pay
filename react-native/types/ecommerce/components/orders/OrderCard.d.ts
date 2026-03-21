import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Order } from '../../types';
export interface OrderCardProps {
    order: Order;
    onView?: (order: Order) => void;
    style?: ViewStyle;
}
export declare function OrderCard({ order, onView, style }: OrderCardProps): React.JSX.Element;
//# sourceMappingURL=OrderCard.d.ts.map