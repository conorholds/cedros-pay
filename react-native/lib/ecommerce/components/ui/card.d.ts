import * as React from 'react';
import { View, Text, ViewStyle, StyleProp, TextStyle } from 'react-native';
interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}
export declare const Card: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<View>>;
interface CardHeaderProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}
export declare const CardHeader: React.ForwardRefExoticComponent<CardHeaderProps & React.RefAttributes<View>>;
interface CardTitleProps {
    children: React.ReactNode;
    style?: TextStyle;
}
export declare const CardTitle: React.ForwardRefExoticComponent<CardTitleProps & React.RefAttributes<Text>>;
interface CardDescriptionProps {
    children: React.ReactNode;
    style?: TextStyle;
}
export declare const CardDescription: React.ForwardRefExoticComponent<CardDescriptionProps & React.RefAttributes<Text>>;
interface CardContentProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}
export declare const CardContent: React.ForwardRefExoticComponent<CardContentProps & React.RefAttributes<View>>;
interface CardFooterProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}
export declare const CardFooter: React.ForwardRefExoticComponent<CardFooterProps & React.RefAttributes<View>>;
export {};
//# sourceMappingURL=card.d.ts.map