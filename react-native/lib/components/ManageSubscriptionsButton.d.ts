import { type TextStyle, type ViewStyle } from 'react-native';
import type { CedrosProductDefinition, DistributionChannel } from '../types/storePolicy';
export interface ManageSubscriptionsButtonProps {
    product?: CedrosProductDefinition;
    distributionChannel: DistributionChannel;
    label?: string;
    disabled?: boolean;
    onOpen?: () => void;
    onError?: (error: string) => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
    loadingColor?: string;
}
export declare function ManageSubscriptionsButton({ product, distributionChannel, label, disabled, onOpen, onError, style, textStyle, loadingColor, }: ManageSubscriptionsButtonProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ManageSubscriptionsButton.d.ts.map