import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface Testimonial {
    id: string;
    quote: string;
    author: string;
    role?: string;
    rating?: number;
}
export interface TestimonialsProps {
    testimonials: Testimonial[];
    title?: string;
    style?: ViewStyle;
}
export declare function Testimonials({ testimonials, title, style, }: TestimonialsProps): React.JSX.Element | null;
//# sourceMappingURL=Testimonials.d.ts.map