import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface PaginationProps {
    page: number;
    pageSize: number;
    total?: number;
    hasNextPage?: boolean;
    onPageChange: (page: number) => void;
    style?: ViewStyle;
}
export declare function Pagination({ page, pageSize, total, hasNextPage, onPageChange, style, }: PaginationProps): React.JSX.Element;
//# sourceMappingURL=Pagination.d.ts.map