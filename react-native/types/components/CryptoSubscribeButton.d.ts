import React from 'react';
import { TextStyle, ViewStyle } from 'react-native';
import type { BillingInterval } from '../types';
export interface CryptoSubscribeButtonProps {
    resource: string;
    interval: BillingInterval;
    intervalDays?: number;
    couponCode?: string;
    label?: string;
    disabled?: boolean;
    onAttempt?: (method: 'stripe' | 'crypto') => void;
    onSuccess?: (transactionId: string) => void;
    onError?: (error: string) => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
    loadingColor?: string;
    hideMessages?: boolean;
    autoCheckStatus?: boolean;
}
export declare function CryptoSubscribeButton({ resource, interval, intervalDays, couponCode, label, disabled, onAttempt, onSuccess, onError, style, textStyle, loadingColor, hideMessages, autoCheckStatus, }: CryptoSubscribeButtonProps): React.JSX.Element;
//# sourceMappingURL=CryptoSubscribeButton.d.ts.map