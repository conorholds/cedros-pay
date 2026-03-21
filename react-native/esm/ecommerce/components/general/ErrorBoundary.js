import * as React from 'react';
import { ErrorState } from './ErrorState';
export class ErrorBoundary extends React.Component {
    constructor() {
        super(...arguments);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
        return { error };
    }
    render() {
        if (this.state.error) {
            if (this.props.fallback)
                return this.props.fallback(this.state.error);
            return <ErrorState description={this.state.error.message}/>;
        }
        return this.props.children;
    }
}
//# sourceMappingURL=ErrorBoundary.js.map