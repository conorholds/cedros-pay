import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { Order } from '../../types';
export interface OrderDetailsProps {
    order: Order;
    onBack?: () => void;
    style?: ViewStyle;
}
export declare function OrderDetails({ order, onBack, style }: OrderDetailsProps): React.JSX.Element;
//# sourceMappingURL=OrderDetails.d.ts.map