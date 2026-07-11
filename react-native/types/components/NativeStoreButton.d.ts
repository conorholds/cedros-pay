import React from 'react';
import { type TextStyle, type ViewStyle } from 'react-native';
import type { CedrosProductDefinition, DistributionChannel, NativeStoreMethod, NativeStoreCheckoutContext } from '../types/storePolicy';
interface NativeStoreButtonProps {
    method: NativeStoreMethod;
    product: CedrosProductDefinition;
    distributionChannel: DistributionChannel;
    checkout?: NativeStoreCheckoutContext;
    label?: string;
    disabled?: boolean;
    onAttempt?: (method: NativeStoreMethod) => void;
    onSuccess?: (transactionId: string) => void;
    onError?: (error: string) => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
    loadingColor?: string;
}
export declare function NativeStoreButton({ method, product, distributionChannel, checkout, label, disabled, onAttempt, onSuccess, onError, style, textStyle, loadingColor, }: NativeStoreButtonProps): React.JSX.Element;
export {};
//# sourceMappingURL=NativeStoreButton.d.ts.map