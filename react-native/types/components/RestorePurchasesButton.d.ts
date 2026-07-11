import React from 'react';
import { type TextStyle, type ViewStyle } from 'react-native';
import type { CedrosProductDefinition, DistributionChannel, NativeStoreCheckoutContext, NativeStorePurchaseResult } from '../types/storePolicy';
export interface RestorePurchasesButtonProps {
    product?: CedrosProductDefinition;
    products?: CedrosProductDefinition[];
    distributionChannel: DistributionChannel;
    checkout?: NativeStoreCheckoutContext;
    label?: string;
    disabled?: boolean;
    onSuccess?: (results: NativeStorePurchaseResult[]) => void;
    onError?: (error: string) => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
    loadingColor?: string;
}
export declare function RestorePurchasesButton({ product, products, distributionChannel, checkout, label, disabled, onSuccess, onError, style, textStyle, loadingColor, }: RestorePurchasesButtonProps): React.JSX.Element;
//# sourceMappingURL=RestorePurchasesButton.d.ts.map