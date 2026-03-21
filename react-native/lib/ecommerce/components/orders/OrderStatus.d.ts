import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Order } from '../../types';
export interface OrderStatusProps {
    status: Order['status'];
    showBadge?: boolean;
    showLabel?: boolean;
    style?: ViewStyle;
}
export declare function OrderStatus({ status, showBadge, showLabel, style }: OrderStatusProps): React.JSX.Element;
//# sourceMappingURL=OrderStatus.d.ts.map